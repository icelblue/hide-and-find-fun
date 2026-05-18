CREATE OR REPLACE FUNCTION public.execute_game_move(_game_id uuid, _action action_type, _target_scenario_id uuid, _target_item_id uuid, _target_position position_type, _is_story boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _player record;
  _rival record;
  _game record;
  _cost numeric;
  _tokens numeric;
  _turn_number int;
  _found_object boolean := false;
  _found_bonus bonus_type := NULL;
  _bonus_value text := NULL;
  _bonus_tokens numeric := 0;
  _hint_level smallint := NULL;
  _hint_noisy boolean := false;
  _move_id uuid;
  _target_item_scenario uuid;
  _hidden_item_scenario uuid;
  _tags_overlap boolean := false;
  _scenarios_connected boolean := false;
  _trap_id uuid := NULL;
  _trap_penalty numeric := 0;
  _trap_hit boolean := false;
  _noise_dir int;
BEGIN
  SELECT * INTO _game FROM games WHERE id = _game_id;
  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;

  _tokens := _player.tokens_remaining;
  _cost := CASE WHEN _action = 'look' THEN 0.3 WHEN _action = 'move' THEN 0.5 ELSE 0 END;

  IF NOT _is_story AND _tokens < _cost THEN
    RAISE EXCEPTION 'Not enough tokens';
  END IF;

  SELECT COUNT(*) + 1 INTO _turn_number FROM game_moves WHERE game_id = _game_id AND player_id = auth.uid();

  SELECT * INTO _rival FROM game_players WHERE game_id = _game_id AND user_id != auth.uid() LIMIT 1;

  IF _action = 'look' AND _target_item_id IS NOT NULL AND NOT _is_story THEN
    SELECT gsi.id INTO _trap_id
    FROM game_social_items gsi
    WHERE gsi.game_id = _game_id
      AND gsi.to_player_id = auth.uid()
      AND gsi.item_type = 'trampa'
      AND gsi.blocked_by_shield = false
      AND (gsi.target_data->>'active')::boolean = true
      AND gsi.target_data->>'item_id' = _target_item_id::text
    LIMIT 1;

    IF _trap_id IS NOT NULL THEN
      _trap_hit := true;
      _trap_penalty := 1.0;
      UPDATE game_social_items
      SET target_data = jsonb_set(target_data, '{active}', 'false'::jsonb), processed = true
      WHERE id = _trap_id;
    END IF;
  END IF;

  IF _target_item_id IS NOT NULL THEN
    SELECT scenario_id INTO _target_item_scenario FROM items WHERE id = _target_item_id;
  END IF;

  IF _action = 'look' AND _rival.id IS NOT NULL AND _rival.hidden_item_id IS NOT NULL THEN
    SELECT scenario_id INTO _hidden_item_scenario FROM items WHERE id = _rival.hidden_item_id;

    IF _rival.hidden_item_id = _target_item_id AND _rival.hidden_position = _target_position THEN
      -- TROBAT (moble + posició correctes)
      _found_object := true;
      _hint_level := 4;
    ELSIF _rival.hidden_item_id = _target_item_id THEN
      -- 🔥 CALENT: moble correcte, posició incorrecta
      _hint_level := 4;
    ELSIF _target_item_scenario IS NOT NULL AND _target_item_scenario = _hidden_item_scenario THEN
      -- Mateix escenari. Comprovem tags compartits per Tebi vs Fresc.
      SELECT COALESCE(
        (SELECT array_length(
          ARRAY(SELECT unnest(i1.tags) INTERSECT SELECT unnest(i2.tags)), 1
        ) > 0
        FROM items i1, items i2
        WHERE i1.id = _target_item_id AND i2.id = _rival.hidden_item_id),
        false
      ) INTO _tags_overlap;

      IF _tags_overlap THEN
        _hint_level := 3; -- 🌡️ Tebi
      ELSE
        _hint_level := 2; -- 🌬️ Fresc
      END IF;
    ELSE
      -- Escenari diferent: Fred si connectat, Glaçat si no
      IF _target_item_scenario IS NOT NULL AND _hidden_item_scenario IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM scenario_connections sc
          WHERE (sc.scenario_a = _target_item_scenario AND sc.scenario_b = _hidden_item_scenario)
             OR (sc.scenario_a = _hidden_item_scenario AND sc.scenario_b = _target_item_scenario)
        ) INTO _scenarios_connected;
      END IF;

      IF _scenarios_connected THEN
        _hint_level := 1; -- 🥶 Fred
      ELSE
        _hint_level := 0; -- ❄️ Glaçat
      END IF;
    END IF;

    -- SOROLL 20%: ±1 nivell. Mai pot crear una victòria falsa.
    IF NOT _found_object AND _hint_level IS NOT NULL AND random() < 0.20 THEN
      _noise_dir := CASE WHEN random() < 0.5 THEN -1 ELSE 1 END;
      _hint_level := _hint_level + _noise_dir;
      -- Clamp dins [0, 4]. Mai 5+ (no existeix). Mai per sobre de 4 si no és found_object.
      IF _hint_level < 0 THEN _hint_level := 0; END IF;
      IF _hint_level > 4 THEN _hint_level := 4; END IF;
      _hint_noisy := true;
    END IF;

    IF NOT _found_object AND _target_item_id IS NOT NULL AND _target_position IS NOT NULL THEN
      SELECT bonus_type, value INTO _found_bonus, _bonus_value
      FROM scenario_bonuses
      WHERE item_id = _target_item_id AND position = _target_position
      LIMIT 1;

      IF _found_bonus = 'extra_token' THEN
        _bonus_tokens := COALESCE(_bonus_value::numeric, 0.5);
      END IF;
    END IF;
  END IF;

  IF _action = 'confirm' AND _rival.id IS NOT NULL THEN
    IF _rival.hidden_item_id = _target_item_id AND _rival.hidden_position = _target_position THEN
      _found_object := true;
    END IF;
  END IF;

  UPDATE game_players SET
    tokens_remaining = CASE WHEN _is_story THEN tokens_remaining ELSE GREATEST(0, _tokens - _cost + _bonus_tokens - _trap_penalty) END,
    current_scenario_id = CASE WHEN _action = 'move' THEN _target_scenario_id ELSE current_scenario_id END
  WHERE id = _player.id;

  INSERT INTO game_moves (game_id, player_id, action, turn_number, token_cost, target_scenario_id, target_item_id, target_position, found_object, found_bonus, bonus_value, hint_level)
  VALUES (_game_id, auth.uid(), _action, _turn_number, _cost, _target_scenario_id, _target_item_id, _target_position, _found_object, _found_bonus, _bonus_value, _hint_level)
  RETURNING id INTO _move_id;

  IF _found_object AND _action IN ('look','confirm') THEN
    UPDATE games SET status = 'finished', winner_id = auth.uid(), updated_at = now() WHERE id = _game_id;
  END IF;

  RETURN jsonb_build_object(
    'move_id', _move_id,
    'found_object', _found_object,
    'hint_level', _hint_level,
    'hint_noisy', _hint_noisy,
    'found_bonus', _found_bonus,
    'bonus_value', _bonus_value,
    'bonus_tokens', _bonus_tokens,
    'trap_hit', _trap_hit,
    'tokens_remaining', GREATEST(0, _tokens - _cost + _bonus_tokens - _trap_penalty)
  );
END;
$function$;