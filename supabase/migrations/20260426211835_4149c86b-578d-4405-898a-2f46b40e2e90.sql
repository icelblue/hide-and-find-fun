CREATE OR REPLACE FUNCTION public.execute_game_move(_game_id uuid, _action action_type, _target_scenario_id uuid DEFAULT NULL::uuid, _target_item_id uuid DEFAULT NULL::uuid, _target_position position_type DEFAULT NULL::position_type, _is_story boolean DEFAULT false)
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
  _tool_found text := NULL;
  _move_id uuid;
  _rival_item_scenario uuid;
  _target_item_scenario uuid;
  _roll numeric;
  _tool_roll numeric;
  _tool_candidate text;
  _tools_found jsonb;
  _player_tools jsonb;
  _pool_martell int; _pool_drap int; _pool_llanterna int; _pool_tornavis int;
  _found_martell int; _found_drap int; _found_llanterna int; _found_tornavis int;
  _available_tools text[];
  _rival_found boolean := false;
  _trap_id uuid := NULL;
  _trap_penalty numeric := 0;
  _trap_hit boolean := false;
  _barricade record;
  _barricade_cost numeric := 1.0;
  _barricade_hit boolean := false;
BEGIN
  SELECT * INTO _game FROM games WHERE id = _game_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partida no trobada'; END IF;
  IF _game.status != 'playing' THEN RAISE EXCEPTION 'La partida no està en curs'; END IF;

  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'No ets jugador d''aquesta partida'; END IF;

  IF _is_story THEN
    _cost := 0;
    _tokens := _player.tokens_remaining;
  ELSE
    _cost := CASE _action WHEN 'move' THEN 0.5 WHEN 'look' THEN 0.3 WHEN 'confirm' THEN 0.3 END;
    IF _player.tokens_last_reset < CURRENT_DATE THEN
      UPDATE game_players SET tokens_remaining = 5.0, tokens_last_reset = CURRENT_DATE, social_item_used_today = false,
        special_data = COALESCE(special_data, '{}'::jsonb) - 'barricada_today' - 'trampa_today'
      WHERE id = _player.id;
      _tokens := 5.0;
    ELSE
      _tokens := _player.tokens_remaining;
    END IF;

    IF _action = 'move' AND _target_scenario_id IS NOT NULL THEN
      SELECT gsi.id, gsi.target_data INTO _barricade
      FROM game_social_items gsi
      WHERE gsi.game_id = _game_id
        AND gsi.to_player_id = auth.uid()
        AND gsi.item_type = 'barricada'
        AND gsi.blocked_by_shield = false
        AND (gsi.target_data->>'remaining_moves')::int > 0
        AND (
          (gsi.target_data->>'scenario_from' = _player.current_scenario_id::text AND gsi.target_data->>'scenario_to' = _target_scenario_id::text)
          OR
          (gsi.target_data->>'scenario_to' = _player.current_scenario_id::text AND gsi.target_data->>'scenario_from' = _target_scenario_id::text)
        )
      LIMIT 1;

      IF _barricade.id IS NOT NULL THEN
        _cost := _cost + _barricade_cost;
        _barricade_hit := true;
        UPDATE game_social_items
        SET target_data = jsonb_set(target_data, '{remaining_moves}', to_jsonb(0))
        WHERE id = _barricade.id;
      END IF;
    END IF;

    IF _tokens < _cost THEN
      IF _barricade_hit THEN
        RAISE EXCEPTION 'Camí barricadat! 🚧 Necessites % tokens per forçar el pas (tens %)', _cost, _tokens;
      ELSE
        RAISE EXCEPTION 'No tens prou tokens! Necessites %, tens %', _cost, _tokens;
      END IF;
    END IF;
  END IF;

  SELECT COUNT(*) + 1 INTO _turn_number FROM game_moves WHERE game_id = _game_id AND player_id = auth.uid();

  SELECT * INTO _rival FROM game_players WHERE game_id = _game_id AND user_id != auth.uid() LIMIT 1;
  _rival_found := FOUND;

  IF _action = 'look' AND _target_item_id IS NOT NULL AND NOT _is_story AND _rival_found THEN
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

  IF _action = 'look' AND _rival_found THEN
    IF _rival.hidden_item_id = _target_item_id AND _rival.hidden_position = _target_position THEN
      _found_object := true;
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

  IF _action = 'confirm' AND _rival_found THEN
    IF _rival.hidden_item_id = _target_item_id AND _rival.hidden_position = _target_position THEN
      _found_object := true;
    END IF;
  END IF;

  UPDATE game_players SET
    tokens_remaining = CASE WHEN _is_story THEN tokens_remaining ELSE GREATEST(0, _tokens - _cost + _bonus_tokens - _trap_penalty) END,
    current_scenario_id = CASE WHEN _action = 'move' THEN _target_scenario_id ELSE current_scenario_id END
  WHERE id = _player.id;

  INSERT INTO game_moves (game_id, player_id, action, turn_number, token_cost, target_scenario_id, target_item_id, target_position, found_object, found_bonus, bonus_value)
  VALUES (_game_id, auth.uid(), _action, _turn_number, _cost, _target_scenario_id, _target_item_id, _target_position, _found_object, _found_bonus, _bonus_value)
  RETURNING id INTO _move_id;

  -- FIX: any winning find (look or confirm) ends the game
  IF _found_object AND _action IN ('look','confirm') THEN
    UPDATE games SET status = 'finished', winner_id = auth.uid(), updated_at = now() WHERE id = _game_id;
  END IF;

  RETURN jsonb_build_object(
    'move_id', _move_id,
    'cost', _cost,
    'found_object', _found_object,
    'found_bonus', _found_bonus,
    'bonus_value', _bonus_value,
    'bonus_tokens', _bonus_tokens,
    'trap_hit', _trap_hit,
    'trap_penalty', _trap_penalty,
    'barricade_hit', _barricade_hit,
    'barricade_extra_cost', CASE WHEN _barricade_hit THEN _barricade_cost ELSE 0 END
  );
END;
$function$;