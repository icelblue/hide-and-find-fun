
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
BEGIN
  -- Get game
  SELECT * INTO _game FROM games WHERE id = _game_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partida no trobada'; END IF;
  IF _game.status != 'playing' THEN RAISE EXCEPTION 'La partida no està en curs'; END IF;

  -- Get player
  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'No ets jugador d''aquesta partida'; END IF;

  -- Token cost
  IF _is_story THEN
    _cost := 0;
    _tokens := _player.tokens_remaining;
  ELSE
    _cost := CASE _action WHEN 'move' THEN 0.5 WHEN 'look' THEN 0.3 WHEN 'confirm' THEN 0.3 END;
    
    -- Daily token reset check
    IF _player.tokens_last_reset < CURRENT_DATE THEN
      UPDATE game_players SET tokens_remaining = 5.0, tokens_last_reset = CURRENT_DATE, social_item_used_today = false
      WHERE id = _player.id;
      _tokens := 5.0;
    ELSE
      _tokens := _player.tokens_remaining;
    END IF;
    
    IF _tokens < _cost THEN
      RAISE EXCEPTION 'No tens prou tokens! Necessites %, tens %', _cost, _tokens;
    END IF;
  END IF;

  -- Turn number
  SELECT COUNT(*) + 1 INTO _turn_number FROM game_moves WHERE game_id = _game_id AND player_id = auth.uid();

  -- Get rival for hint calculation (use user_id IS NOT NULL instead of record IS NOT NULL)
  SELECT * INTO _rival FROM game_players WHERE game_id = _game_id AND user_id != auth.uid() LIMIT 1;
  _rival_found := FOUND;

  -- Hint calculation for "look" action
  IF _action = 'look' AND _target_item_id IS NOT NULL AND _target_position IS NOT NULL AND _rival_found THEN
    SELECT scenario_id INTO _rival_item_scenario FROM items WHERE id = _rival.hidden_item_id;
    SELECT scenario_id INTO _target_item_scenario FROM items WHERE id = _target_item_id;

    IF _rival_item_scenario IS NOT NULL AND _target_item_scenario IS NOT NULL THEN
      IF _target_item_scenario != _rival_item_scenario THEN
        _hint_level := 0; -- wrong scenario
      ELSIF _target_item_id != _rival.hidden_item_id THEN
        _hint_level := 1; -- right scenario, wrong item
      ELSIF _target_position != _rival.hidden_position THEN
        _hint_level := 2; -- right item, wrong position
      ELSE
        _found_object := true;
        _hint_level := 3; -- found it!
      END IF;
    END IF;
  END IF;

  -- Random bonus (skip in story mode)
  IF NOT _is_story AND (_action = 'look' OR _action = 'confirm') AND _target_item_id IS NOT NULL AND _target_position IS NOT NULL THEN
    _roll := random();
    IF _roll < 0.15 THEN
      IF _roll < 0.05 THEN
        _bonus_value := '1';
      ELSE
        _bonus_value := '0.5';
      END IF;
      _found_bonus := 'extra_token';
      _bonus_tokens := _bonus_value::numeric;

      INSERT INTO player_inventory (user_id, game_id, item_type, item_value)
      VALUES (auth.uid(), _game_id, 'extra_token', _bonus_value);
    END IF;

    -- Tool roll (~20% chance)
    _tool_roll := random();
    IF _tool_roll < 0.2 THEN
      IF _tool_roll < 0.05 THEN _tool_candidate := 'martell';
      ELSIF _tool_roll < 0.1 THEN _tool_candidate := 'tornavis';
      ELSIF _tool_roll < 0.15 THEN _tool_candidate := 'drap';
      ELSE _tool_candidate := 'llanterna';
      END IF;

      -- Check shared pool limits
      _pool_martell := 5; _pool_drap := 2; _pool_llanterna := 1; _pool_tornavis := 5;
      _found_martell := 0; _found_drap := 0; _found_llanterna := 0; _found_tornavis := 0;
      
      FOR _tools_found IN SELECT tools FROM game_players WHERE game_id = _game_id LOOP
        _found_martell := _found_martell + COALESCE((_tools_found->>'martell')::int, 0);
        _found_drap := _found_drap + COALESCE((_tools_found->>'drap')::int, 0);
        _found_llanterna := _found_llanterna + COALESCE((_tools_found->>'llanterna')::int, 0);
        _found_tornavis := _found_tornavis + GREATEST(0, COALESCE((_tools_found->>'tornavis')::int, 0) - 1);
      END LOOP;

      -- Check if candidate is available
      IF (_tool_candidate = 'martell' AND _found_martell >= _pool_martell) OR
         (_tool_candidate = 'drap' AND _found_drap >= _pool_drap) OR
         (_tool_candidate = 'llanterna' AND _found_llanterna >= _pool_llanterna) OR
         (_tool_candidate = 'tornavis' AND _found_tornavis >= _pool_tornavis) THEN
        -- Try alternatives
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

  -- Handle "move" action: validate connection and update scenario
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
  END IF;

  -- Update tokens
  IF NOT _is_story THEN
    UPDATE game_players SET tokens_remaining = _tokens - _cost + _bonus_tokens WHERE id = _player.id;
  END IF;

  -- Insert the move
  INSERT INTO game_moves (game_id, player_id, turn_number, action, token_cost,
    target_scenario_id, target_item_id, target_position, found_object,
    found_bonus, bonus_value, hint_level)
  VALUES (_game_id, auth.uid(), _turn_number, _action, _cost,
    _target_scenario_id, _target_item_id, _target_position, _found_object,
    _found_bonus, _bonus_value, _hint_level)
  RETURNING id INTO _move_id;

  -- Finish game if object found
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
    'tokens_remaining', _tokens - _cost + _bonus_tokens,
    'hint_level', _hint_level,
    'tool_found', _tool_found,
    'turn_number', _turn_number
  );
END;
$function$;
