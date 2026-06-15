
-- Wave A: scenario specials per game
CREATE OR REPLACE FUNCTION public.start_game_setup(_game_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _player record;
  _hidden_scenario uuid;
  _available_scenarios uuid[];
  _random_scenario uuid;
  _specials jsonb := '[]'::jsonb;
  _pair record;
  _curse_count int := 0;
  _bonus_count int := 0;
  _curse_val numeric;
BEGIN
  IF NOT is_player_in_game(auth.uid(), _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'hiding') THEN
    RAISE EXCEPTION 'Game not in hiding phase';
  END IF;

  FOR _player IN SELECT gp.id, gp.user_id, gp.current_scenario_id, gp.hidden_item_id
                 FROM game_players gp WHERE gp.game_id = _game_id
  LOOP
    IF _player.current_scenario_id IS NULL THEN
      SELECT i.scenario_id INTO _hidden_scenario FROM items i WHERE i.id = _player.hidden_item_id;
      SELECT array_agg(s.id) INTO _available_scenarios FROM scenarios s WHERE s.id != _hidden_scenario;
      IF _available_scenarios IS NULL OR array_length(_available_scenarios, 1) = 0 THEN
        SELECT array_agg(s.id) INTO _available_scenarios FROM scenarios s;
      END IF;
      _random_scenario := _available_scenarios[1 + floor(random() * array_length(_available_scenarios, 1))::int];
      UPDATE game_players SET current_scenario_id = _random_scenario WHERE id = _player.id;
    END IF;

    SELECT i.scenario_id INTO _hidden_scenario FROM items i WHERE i.id = _player.hidden_item_id;
    IF _hidden_scenario IS NOT NULL THEN
      _specials := '[]'::jsonb;
      _curse_count := 0;
      _bonus_count := 0;
      FOR _pair IN
        SELECT i.id AS item_id, p.pos AS pos
        FROM items i
        CROSS JOIN LATERAL (
          SELECT unnest(ARRAY['sobre','sota','dins','darrere']::position_type[]) AS pos
        ) p
        WHERE i.scenario_id = _hidden_scenario
          AND NOT i.hidden
          AND NOT (i.id = _player.hidden_item_id AND p.pos = (SELECT hidden_position FROM game_players WHERE id = _player.id))
        ORDER BY random()
        LIMIT 6
      LOOP
        IF _curse_count < 3 THEN
          _curse_val := CASE WHEN random() < 0.5 THEN -0.3 ELSE -0.5 END;
          _specials := _specials || jsonb_build_object(
            'item_id', _pair.item_id,
            'position', _pair.pos,
            'type', 'curse',
            'value', _curse_val
          );
          _curse_count := _curse_count + 1;
        ELSIF _bonus_count < 3 THEN
          _specials := _specials || jsonb_build_object(
            'item_id', _pair.item_id,
            'position', _pair.pos,
            'type', 'bonus',
            'value', 1
          );
          _bonus_count := _bonus_count + 1;
        END IF;
      END LOOP;

      UPDATE game_players
      SET special_data = COALESCE(special_data, '{}'::jsonb) || jsonb_build_object('scenario_specials', _specials)
      WHERE id = _player.id;
    END IF;
  END LOOP;

  UPDATE games SET status = 'playing' WHERE id = _game_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_game_move(_game_id uuid, _action action_type, _target_scenario_id uuid, _target_item_id uuid, _target_position position_type, _is_story boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  _is_master boolean := false;
  _rival_elo int := 0;
  _cursed boolean := false;
  _barricade record;
  _barricade_hit boolean := false;
  _barricade_cost numeric := 1.0;
  _tool_roll numeric;
  _tool_candidate text;
  _tool_threshold numeric := 0.08;
  _pool_martell int; _pool_drap int; _pool_llanterna int; _pool_tornavis int;
  _found_martell int; _found_drap int; _found_llanterna int; _found_tornavis int;
  _tools_found jsonb;
  _available_tools text[];
  _player_tools jsonb;
  _tool_found text := NULL;
  _special jsonb;
  _special_value numeric;
  _special_type text;
BEGIN
  SELECT * INTO _game FROM games WHERE id = _game_id;
  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;

  IF NOT _is_story AND _player.tokens_last_reset < CURRENT_DATE THEN
    UPDATE game_players
    SET tokens_remaining = 4.0,
        tokens_last_reset = CURRENT_DATE,
        social_item_used_today = false,
        special_data = COALESCE(special_data, '{}'::jsonb) - 'barricada_today' - 'trampa_today'
    WHERE id = _player.id;
    _tokens := 4.0;
  ELSE
    _tokens := _player.tokens_remaining;
  END IF;

  _cost := CASE WHEN _action = 'look' THEN 0.3 WHEN _action = 'move' THEN 0.5 ELSE 0 END;

  IF NOT _is_story AND _action = 'move' AND _target_scenario_id IS NOT NULL THEN
    SELECT gsi.id, gsi.target_data INTO _barricade
    FROM game_social_items gsi
    WHERE gsi.game_id = _game_id
      AND gsi.to_player_id = auth.uid()
      AND gsi.item_type = 'barricada'
      AND gsi.blocked_by_shield = false
      AND COALESCE((gsi.target_data->>'remaining_moves')::int, 0) > 0
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
      SET target_data = jsonb_set(target_data, '{remaining_moves}',
        to_jsonb(GREATEST(0, COALESCE((target_data->>'remaining_moves')::int, 0) - 1)))
      WHERE id = _barricade.id;
    END IF;
  END IF;

  IF NOT _is_story AND _tokens < _cost THEN
    IF _barricade_hit THEN
      RAISE EXCEPTION 'Cami barricadat. Necessites % tokens per forcar el pas (tens %)', _cost, _tokens;
    ELSE
      RAISE EXCEPTION 'Not enough tokens';
    END IF;
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
      _found_object := true;
      _hint_level := 4;
    ELSIF _rival.hidden_item_id = _target_item_id THEN
      _hint_level := 4;
    ELSIF _target_item_scenario IS NOT NULL AND _target_item_scenario = _hidden_item_scenario THEN
      SELECT COALESCE(
        (SELECT array_length(
          ARRAY(SELECT unnest(i1.tags) INTERSECT SELECT unnest(i2.tags)), 1
        ) > 0
        FROM items i1, items i2
        WHERE i1.id = _target_item_id AND i2.id = _rival.hidden_item_id),
        false
      ) INTO _tags_overlap;
      IF _tags_overlap THEN _hint_level := 3; ELSE _hint_level := 2; END IF;
    ELSE
      IF _target_item_scenario IS NOT NULL AND _hidden_item_scenario IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM scenario_connections sc
          WHERE (sc.scenario_a = _target_item_scenario AND sc.scenario_b = _hidden_item_scenario)
             OR (sc.scenario_a = _hidden_item_scenario AND sc.scenario_b = _target_item_scenario)
        ) INTO _scenarios_connected;
      END IF;
      IF _scenarios_connected THEN _hint_level := 1; ELSE _hint_level := 0; END IF;
    END IF;

    IF NOT _found_object AND _hint_level IS NOT NULL AND random() < 0.20 THEN
      _noise_dir := CASE WHEN random() < 0.5 THEN -1 ELSE 1 END;
      _hint_level := _hint_level + _noise_dir;
      IF _hint_level < 0 THEN _hint_level := 0; END IF;
      IF _hint_level > 4 THEN _hint_level := 4; END IF;
      _hint_noisy := true;
    END IF;

    IF NOT _found_object AND _target_item_id IS NOT NULL AND _target_position IS NOT NULL THEN
      SELECT s INTO _special
      FROM jsonb_array_elements(COALESCE(_rival.special_data->'scenario_specials', '[]'::jsonb)) s
      WHERE s->>'item_id' = _target_item_id::text
        AND s->>'position' = _target_position::text
      LIMIT 1;

      IF _special IS NOT NULL THEN
        _special_type := _special->>'type';
        _special_value := (_special->>'value')::numeric;
        _found_bonus := 'extra_token';
        _bonus_value := _special_value::text;
        _bonus_tokens := _special_value;

        IF _special_type = 'curse' THEN
          _cursed := true;
          SELECT COALESCE(elo, 1200) INTO _rival_elo FROM profiles WHERE user_id = _rival.user_id;
          IF _rival_elo >= 1400 THEN
            _bonus_tokens := _bonus_tokens * (5.0/3.0);
          END IF;
        ELSE
          SELECT (collection_master_at IS NOT NULL) INTO _is_master
            FROM profiles WHERE user_id = auth.uid();
          IF _is_master THEN _bonus_tokens := _bonus_tokens * 2; END IF;
        END IF;
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

  IF _action = 'look' AND NOT _found_object AND NOT _is_story THEN
    SELECT (collection_master_at IS NOT NULL) INTO _is_master FROM profiles WHERE user_id = auth.uid();
    IF _is_master THEN _tool_threshold := 0.13; END IF;

    _tool_roll := random();
    IF _tool_roll < _tool_threshold THEN
      IF _tool_roll < 0.025 THEN _tool_candidate := 'tornavis';
      ELSIF _tool_roll < 0.045 THEN _tool_candidate := 'llanterna';
      ELSIF _tool_roll < 0.065 THEN _tool_candidate := 'drap';
      ELSE _tool_candidate := 'martell';
      END IF;

      _pool_martell := 5; _pool_drap := 5; _pool_llanterna := 5; _pool_tornavis := 5;
      _found_martell := 0; _found_drap := 0; _found_llanterna := 0; _found_tornavis := 0;
      FOR _tools_found IN SELECT tools FROM game_players WHERE game_id = _game_id LOOP
        _found_martell := _found_martell + COALESCE((_tools_found->>'martell')::int, 0);
        _found_drap := _found_drap + COALESCE((_tools_found->>'drap')::int, 0);
        _found_llanterna := _found_llanterna + COALESCE((_tools_found->>'llanterna')::int, 0);
        _found_tornavis := _found_tornavis + GREATEST(0, COALESCE((_tools_found->>'tornavis')::int, 0) - 1);
      END LOOP;

      IF (_tool_candidate = 'martell' AND _found_martell >= _pool_martell) OR
         (_tool_candidate = 'drap' AND _found_drap >= _pool_drap) OR
         (_tool_candidate = 'llanterna' AND _found_llanterna >= _pool_llanterna) OR
         (_tool_candidate = 'tornavis' AND _found_tornavis >= _pool_tornavis) THEN
        _available_tools := '{}';
        IF _found_martell < _pool_martell THEN _available_tools := _available_tools || ARRAY['martell']; END IF;
        IF _found_drap < _pool_drap THEN _available_tools := _available_tools || ARRAY['drap']; END IF;
        IF _found_llanterna < _pool_llanterna THEN _available_tools := _available_tools || ARRAY['llanterna']; END IF;
        IF _found_tornavis < _pool_tornavis THEN _available_tools := _available_tools || ARRAY['tornavis']; END IF;
        IF array_length(_available_tools, 1) > 0 THEN
          _tool_candidate := _available_tools[1 + floor(random() * array_length(_available_tools, 1))::int];
        ELSE
          _tool_candidate := NULL;
        END IF;
      END IF;

      IF _tool_candidate IS NOT NULL THEN
        SELECT tools INTO _player_tools FROM game_players WHERE id = _player.id;
        _player_tools := jsonb_set(_player_tools, ARRAY[_tool_candidate],
          to_jsonb(COALESCE((_player_tools->>_tool_candidate)::int, 0) + 1));
        UPDATE game_players SET tools = _player_tools WHERE id = _player.id;
        _tool_found := _tool_candidate;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'move_id', _move_id,
    'found_object', _found_object,
    'hint_level', _hint_level,
    'hint_noisy', _hint_noisy,
    'found_bonus', _found_bonus,
    'bonus_value', _bonus_value,
    'bonus_tokens', _bonus_tokens,
    'cursed', _cursed,
    'trap_hit', _trap_hit,
    'trap_penalty', _trap_penalty,
    'barricade_hit', _barricade_hit,
    'tool_found', _tool_found,
    'tokens_remaining', GREATEST(0, _tokens - _cost + _bonus_tokens - _trap_penalty)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_revealed_specials(_game_id uuid)
RETURNS TABLE(item_id uuid, pos position_type, type text, value numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rival record;
BEGIN
  IF NOT is_player_in_game(auth.uid(), _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  SELECT * INTO _rival FROM game_players
  WHERE game_id = _game_id AND user_id != auth.uid() LIMIT 1;
  IF _rival.id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT (s->>'item_id')::uuid,
         (s->>'position')::position_type,
         s->>'type',
         (s->>'value')::numeric
  FROM jsonb_array_elements(COALESCE(_rival.special_data->'scenario_specials', '[]'::jsonb)) s
  WHERE EXISTS (
    SELECT 1 FROM game_moves m
    WHERE m.game_id = _game_id
      AND m.player_id = auth.uid()
      AND m.action = 'look'
      AND m.target_item_id = (s->>'item_id')::uuid
      AND m.target_position = (s->>'position')::position_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_revealed_specials(uuid) TO authenticated;
