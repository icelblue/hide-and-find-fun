
-- Update execute_barricada to allow 2 per day using special_data counter
CREATE OR REPLACE FUNCTION public.execute_barricada(_game_id uuid, _scenario_from uuid, _scenario_to uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id uuid := auth.uid();
  _player record;
  _rival record;
  _connection_exists boolean;
  _scenario_from_name text;
  _scenario_to_name text;
  _used_count int;
  _special jsonb;
BEGIN
  IF NOT is_player_in_game(_caller_id, _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = _caller_id;

  -- Check daily count (max 2)
  _special := COALESCE(_player.special_data, '{}'::jsonb);
  IF _player.tokens_last_reset >= CURRENT_DATE THEN
    _used_count := COALESCE((_special->>'barricada_today')::int, 0);
  ELSE
    _used_count := 0;
  END IF;

  IF _used_count >= 2 THEN
    RAISE EXCEPTION 'Ja has usat les 2 barricades d''avui!';
  END IF;

  -- Verify connection exists
  SELECT EXISTS (
    SELECT 1 FROM scenario_connections
    WHERE (scenario_a = _scenario_from AND scenario_b = _scenario_to)
       OR (scenario_a = _scenario_to AND scenario_b = _scenario_from)
  ) INTO _connection_exists;

  IF NOT _connection_exists THEN
    RAISE EXCEPTION 'Aquesta connexió no existeix!';
  END IF;

  SELECT user_id INTO _rival FROM game_players WHERE game_id = _game_id AND user_id != _caller_id LIMIT 1;

  -- Check if rival has shield
  IF EXISTS (SELECT 1 FROM game_players WHERE game_id = _game_id AND user_id = _rival.user_id AND shield_active) THEN
    UPDATE game_players SET shield_active = false WHERE game_id = _game_id AND user_id = _rival.user_id;
    -- Still count the use
    _special := jsonb_set(_special, '{barricada_today}', to_jsonb(_used_count + 1));
    UPDATE game_players SET special_data = _special WHERE id = _player.id;
    INSERT INTO game_social_items (game_id, from_player_id, to_player_id, item_type, blocked_by_shield)
    VALUES (_game_id, _caller_id, _rival.user_id, 'barricada', true);
    RETURN jsonb_build_object('blocked', true, 'remaining', 2 - _used_count - 1);
  END IF;

  SELECT icon || ' ' || name INTO _scenario_from_name FROM scenarios WHERE id = _scenario_from;
  SELECT icon || ' ' || name INTO _scenario_to_name FROM scenarios WHERE id = _scenario_to;

  _special := jsonb_set(_special, '{barricada_today}', to_jsonb(_used_count + 1));
  UPDATE game_players SET special_data = _special WHERE id = _player.id;

  INSERT INTO game_social_items (game_id, from_player_id, to_player_id, item_type, target_data)
  VALUES (_game_id, _caller_id, _rival.user_id, 'barricada',
    jsonb_build_object(
      'scenario_from', _scenario_from,
      'scenario_to', _scenario_to,
      'remaining_moves', 3
    ));

  RETURN jsonb_build_object(
    'blocked', false,
    'from_name', _scenario_from_name,
    'to_name', _scenario_to_name,
    'remaining', 2 - _used_count - 1
  );
END;
$function$;

-- Update execute_trampa to allow 2 per day using special_data counter
CREATE OR REPLACE FUNCTION public.execute_trampa(_game_id uuid, _item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id uuid := auth.uid();
  _player record;
  _rival record;
  _item record;
  _used_count int;
  _special jsonb;
BEGIN
  IF NOT is_player_in_game(_caller_id, _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = _caller_id;

  -- Check daily count (max 2)
  _special := COALESCE(_player.special_data, '{}'::jsonb);
  IF _player.tokens_last_reset >= CURRENT_DATE THEN
    _used_count := COALESCE((_special->>'trampa_today')::int, 0);
  ELSE
    _used_count := 0;
  END IF;

  IF _used_count >= 2 THEN
    RAISE EXCEPTION 'Ja has usat les 2 trampes d''avui!';
  END IF;

  SELECT id, name, icon INTO _item FROM items WHERE id = _item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Moble no trobat'; END IF;

  SELECT user_id INTO _rival FROM game_players WHERE game_id = _game_id AND user_id != _caller_id LIMIT 1;

  _special := jsonb_set(_special, '{trampa_today}', to_jsonb(_used_count + 1));
  UPDATE game_players SET special_data = _special WHERE id = _player.id;

  INSERT INTO game_social_items (game_id, from_player_id, to_player_id, item_type, target_data)
  VALUES (_game_id, _caller_id, _rival.user_id, 'trampa',
    jsonb_build_object('item_id', _item_id, 'item_name', _item.icon || ' ' || _item.name, 'active', true));

  RETURN jsonb_build_object(
    'item_name', _item.icon || ' ' || _item.name,
    'remaining', 2 - _used_count - 1
  );
END;
$function$;

-- Update execute_game_move to reset barricada/trampa counters on new day
-- We add special_data reset in the daily token reset block
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
  _trap_record record;
  _trap_penalty numeric := 0;
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

    -- Check barricade on move
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
        SET target_data = jsonb_set(target_data, '{remaining_moves}',
          to_jsonb(GREATEST(0, (target_data->>'remaining_moves')::int - 1)))
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

  -- Check trap on look
  IF _action = 'look' AND _target_item_id IS NOT NULL AND NOT _is_story AND _rival_found THEN
    SELECT gsi.id INTO _trap_record
    FROM game_social_items gsi
    WHERE gsi.game_id = _game_id
      AND gsi.to_player_id = auth.uid()
      AND gsi.item_type = 'trampa'
      AND gsi.blocked_by_shield = false
      AND (gsi.target_data->>'active')::boolean = true
      AND gsi.target_data->>'item_id' = _target_item_id::text
    LIMIT 1;

    IF _trap_record.id IS NOT NULL THEN
      _trap_penalty := LEAST(0.2, _tokens - _cost);
      IF _trap_penalty < 0 THEN _trap_penalty := 0; END IF;
      UPDATE game_social_items
      SET target_data = jsonb_set(target_data, '{active}', 'false'::jsonb)
      WHERE id = _trap_record.id;
      INSERT INTO game_social_items (game_id, from_player_id, to_player_id, item_type, message_text)
      VALUES (_game_id, _rival.user_id, auth.uid(), 'message', '🪤 Has caigut en una trampa! -' || _trap_penalty || ' tokens');
    END IF;
  END IF;

  IF _action = 'look' AND _target_item_id IS NOT NULL AND _target_position IS NOT NULL AND _rival_found THEN
    SELECT scenario_id INTO _rival_item_scenario FROM items WHERE id = _rival.hidden_item_id;
    SELECT scenario_id INTO _target_item_scenario FROM items WHERE id = _target_item_id;
    IF _rival_item_scenario IS NOT NULL AND _target_item_scenario IS NOT NULL THEN
      IF _target_item_scenario != _rival_item_scenario THEN
        _hint_level := 0;
      ELSIF _target_item_id != _rival.hidden_item_id THEN
        _hint_level := 1;
      ELSIF _target_position != _rival.hidden_position THEN
        _hint_level := 2;
      ELSE
        _found_object := true;
        _hint_level := 3;
      END IF;
    END IF;
  END IF;

  IF NOT _is_story AND (_action = 'look' OR _action = 'confirm') AND _target_item_id IS NOT NULL AND _target_position IS NOT NULL THEN
    _roll := random();
    IF _roll < 0.15 THEN
      IF _roll < 0.05 THEN _bonus_value := '1'; ELSE _bonus_value := '0.5'; END IF;
      _found_bonus := 'extra_token';
      _bonus_tokens := _bonus_value::numeric;
      INSERT INTO player_inventory (user_id, game_id, item_type, item_value)
      VALUES (auth.uid(), _game_id, 'extra_token', _bonus_value);
    END IF;

    _tool_roll := random();
    IF _tool_roll < 0.25 THEN
      IF _tool_roll < 0.10 THEN _tool_candidate := 'martell';
      ELSIF _tool_roll < 0.18 THEN _tool_candidate := 'drap';
      ELSIF _tool_roll < 0.22 THEN _tool_candidate := 'tornavis';
      ELSE _tool_candidate := 'llanterna';
      END IF;

      _pool_martell := 5; _pool_drap := 5; _pool_llanterna := 1; _pool_tornavis := 5;
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
        _player_tools := _player.tools;
        _player_tools := jsonb_set(_player_tools, ARRAY[_tool_candidate],
          to_jsonb(COALESCE((_player_tools->>_tool_candidate)::int, 0) + 1));
        UPDATE game_players SET tools = _player_tools WHERE id = _player.id;
        _tool_found := _tool_candidate;
        IF _found_bonus IS NULL THEN
          _found_bonus := 'extra_token';
          _bonus_value := 'tool:' || _tool_candidate;
        END IF;
      END IF;
    END IF;
  END IF;

  IF _action = 'move' AND _target_scenario_id IS NOT NULL THEN
    IF NOT _is_story THEN
      IF NOT EXISTS (
        SELECT 1 FROM scenario_connections
        WHERE (scenario_a = _player.current_scenario_id AND scenario_b = _target_scenario_id)
           OR (scenario_a = _target_scenario_id AND scenario_b = _player.current_scenario_id)
      ) THEN
        RAISE EXCEPTION 'No pots anar a aquesta habitació des d''aquí!';
      END IF;
    END IF;
    UPDATE game_players SET current_scenario_id = _target_scenario_id WHERE id = _player.id;

    UPDATE game_social_items
    SET target_data = jsonb_set(target_data, '{remaining_moves}',
      to_jsonb(GREATEST(0, (target_data->>'remaining_moves')::int - 1)))
    WHERE game_id = _game_id
      AND to_player_id = auth.uid()
      AND item_type = 'barricada'
      AND blocked_by_shield = false
      AND (target_data->>'remaining_moves')::int > 0;
  END IF;

  IF NOT _is_story THEN
    UPDATE game_players SET tokens_remaining = _tokens - _cost + _bonus_tokens - _trap_penalty WHERE id = _player.id;
  END IF;

  INSERT INTO game_moves (game_id, player_id, turn_number, action, token_cost,
    target_scenario_id, target_item_id, target_position, found_object,
    found_bonus, bonus_value, hint_level)
  VALUES (_game_id, auth.uid(), _turn_number, _action, _cost,
    _target_scenario_id, _target_item_id, _target_position, _found_object,
    _found_bonus, _bonus_value, _hint_level)
  RETURNING id INTO _move_id;

  IF _found_object THEN
    IF _is_story THEN
      PERFORM finish_story_game(_game_id, auth.uid());
    ELSE
      UPDATE games SET status = 'finished', winner_id = auth.uid() WHERE id = _game_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'move_id', _move_id,
    'found_object', _found_object,
    'found_bonus', _found_bonus,
    'bonus_value', _bonus_value,
    'tokens_remaining', _tokens - _cost + _bonus_tokens - _trap_penalty,
    'hint_level', _hint_level,
    'tool_found', _tool_found,
    'turn_number', _turn_number,
    'trap_hit', _trap_record.id IS NOT NULL,
    'trap_penalty', _trap_penalty,
    'barricade_hit', _barricade_hit,
    'barricade_extra_cost', CASE WHEN _barricade_hit THEN _barricade_cost ELSE 0 END
  );
END;
$function$;

-- Add fun reward items
INSERT INTO reward_items (name, icon, rarity, sell_value) VALUES
  ('Piscina inflable', '🏊', 'legendary', 8),
  ('Jacuzzi', '🛁', 'epic', 5),
  ('Castell inflable', '🏰', 'epic', 5),
  ('Hamaca', '🪢', 'rare', 3),
  ('Barbacoa', '🔥', 'rare', 3),
  ('Font d''aigua', '⛲', 'uncommon', 2),
  ('Gronxador', '🪁', 'uncommon', 2);
