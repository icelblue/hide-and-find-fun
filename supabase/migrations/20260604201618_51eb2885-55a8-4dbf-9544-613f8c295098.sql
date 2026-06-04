CREATE OR REPLACE FUNCTION public.execute_tag_action(_game_id uuid, _item_id uuid, _action_key text, _player_tools jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _player record;
  _action_type text;
  _cost numeric;
  _requires_tool text;
  _consumes_tool boolean := false;
  _tokens numeric;
  _turn_number int;
  _bonus_result jsonb := NULL;
  _tool_found text := NULL;
  _tornavis_spawned boolean := false;
  _bonus_amount numeric;
  _player_tools_db jsonb;
  _rival record;
  _item record;
  _scenario_name text;
  _tool_roll numeric;
  _tool_candidate text;
  _tool_threshold numeric := 0.25;
  _is_master boolean := false;
  _pool_martell int; _pool_drap int; _pool_llanterna int; _pool_tornavis int;
  _found_martell int; _found_drap int; _found_llanterna int; _found_tornavis int;
  _tools_found jsonb;
  _available_tools text[];
  _is_story boolean;
BEGIN
  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Jugador no trobat'; END IF;

  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  SELECT is_story INTO _is_story FROM games WHERE id = _game_id;
  _action_type := split_part(_action_key, ':', 1);

  -- 🔒 CRITICAL: REG-016 — costs SINCRONITZATS amb TAG_ACTIONS a src/lib/supabase-helpers.ts.
  -- Si canvies aquests valors, actualitza TAMBÉ TAG_ACTIONS.cost i el test src/test/tag-costs-sync.test.ts.
  CASE _action_type
    WHEN 'clean' THEN _cost := 0.2; _requires_tool := 'drap'; _consumes_tool := true;
    WHEN 'break' THEN _cost := 0.3; _requires_tool := 'martell'; _consumes_tool := true;
    WHEN 'fix'   THEN _cost := 0.2; _requires_tool := 'tornavis'; _consumes_tool := false;
    ELSE RAISE EXCEPTION 'Acció no vàlida: %', _action_type;
  END CASE;

  IF _requires_tool IS NOT NULL AND COALESCE((_player.tools->>_requires_tool)::int, 0) <= 0 THEN
    RAISE EXCEPTION 'Necessites l''eina corresponent!';
  END IF;

  IF _player.tokens_last_reset < CURRENT_DATE THEN
    UPDATE game_players SET tokens_remaining = 4.0, tokens_last_reset = CURRENT_DATE, social_item_used_today = false
    WHERE id = _player.id;
    _tokens := 4.0;
  ELSE
    _tokens := _player.tokens_remaining;
  END IF;

  IF _tokens < _cost THEN RAISE EXCEPTION 'No tens prou tokens! Necessites %', _cost; END IF;

  SELECT COUNT(*) + 1 INTO _turn_number FROM game_moves WHERE game_id = _game_id AND player_id = auth.uid();
  IF _action_type = 'break' THEN _tornavis_spawned := true; END IF;

  UPDATE game_players SET tokens_remaining = _tokens - _cost WHERE id = _player.id;

  IF _consumes_tool THEN
    _player_tools_db := _player.tools;
    _player_tools_db := jsonb_set(_player_tools_db, ARRAY[_requires_tool],
      to_jsonb(GREATEST(0, COALESCE((_player_tools_db->>_requires_tool)::int, 0) - 1)));
    UPDATE game_players SET tools = _player_tools_db WHERE id = _player.id;
  END IF;

  INSERT INTO game_moves (game_id, player_id, turn_number, action, token_cost, target_item_id, target_position, bonus_value)
  VALUES (_game_id, auth.uid(), _turn_number, 'look', _cost, _item_id, 'sobre', 'tag:' || _action_key);

  IF _action_type = 'clean' THEN
    _bonus_amount := 0.3;
    UPDATE game_players SET tokens_remaining = tokens_remaining + _bonus_amount WHERE id = _player.id;
    _bonus_result := jsonb_build_object('amount', _bonus_amount, 'guaranteed', true);
  ELSIF (_action_type = 'break' AND random() < 0.3) OR (_action_type = 'fix' AND random() < 0.4) THEN
    IF random() < 0.3 THEN _bonus_amount := 0.5; ELSE _bonus_amount := 0.3; END IF;
    UPDATE game_players SET tokens_remaining = tokens_remaining + _bonus_amount WHERE id = _player.id;
    _bonus_result := jsonb_build_object('amount', _bonus_amount);
  END IF;

  IF _action_type = 'break' AND NOT COALESCE(_is_story, false) THEN
    SELECT * INTO _rival FROM game_players WHERE game_id = _game_id AND user_id != auth.uid() LIMIT 1;
    IF _rival.user_id IS NOT NULL THEN
      SELECT i.name AS iname, i.icon AS iicon, s.name AS sname, s.icon AS sicon
        INTO _item
        FROM items i JOIN scenarios s ON s.id = i.scenario_id
       WHERE i.id = _item_id;
      INSERT INTO game_social_items (game_id, from_player_id, to_player_id, item_type, message_text)
      VALUES (_game_id, auth.uid(), _rival.user_id, 'message',
        '💥 El rival ha trencat ' || COALESCE(_item.iicon, '') || ' ' || COALESCE(_item.iname, '') ||
        ' a ' || COALESCE(_item.sicon, '') || ' ' || COALESCE(_item.sname, '') || '!');
    END IF;
  END IF;

  -- Roll d'eines (clean/fix). Pool llanterna 1→3 (REG-016 — exterior més jugable amb consumibles).
  IF _action_type IN ('clean', 'fix') THEN
    SELECT (collection_master_at IS NOT NULL) INTO _is_master FROM profiles WHERE user_id = auth.uid();
    IF _is_master THEN _tool_threshold := 0.30; END IF;

    _tool_roll := random();
    IF _tool_roll < _tool_threshold THEN
      IF _tool_roll < 0.10 THEN _tool_candidate := 'martell';
      ELSIF _tool_roll < 0.18 THEN _tool_candidate := 'drap';
      ELSIF _tool_roll < 0.22 THEN _tool_candidate := 'tornavis';
      ELSE _tool_candidate := 'llanterna';
      END IF;

      _pool_martell := 5; _pool_drap := 5; _pool_llanterna := 3; _pool_tornavis := 5;
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
        SELECT tools INTO _player_tools_db FROM game_players WHERE id = _player.id;
        _player_tools_db := jsonb_set(_player_tools_db, ARRAY[_tool_candidate],
          to_jsonb(COALESCE((_player_tools_db->>_tool_candidate)::int, 0) + 1));
        UPDATE game_players SET tools = _player_tools_db WHERE id = _player.id;
        _tool_found := _tool_candidate;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'bonus_result', _bonus_result,
    'tornavis_spawned', _tornavis_spawned,
    'tool_found', _tool_found,
    'action_type', _action_type
  );
END;
$function$;