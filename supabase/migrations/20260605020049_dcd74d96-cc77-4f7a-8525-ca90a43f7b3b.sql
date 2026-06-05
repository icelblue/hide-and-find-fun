
-- ============================================================
-- WAVE 1: Anti-bloqueig + bugs crítics
-- ============================================================

-- 1) execute_tag_action: pool llanterna 3→5, prob tools 25→30%, prioritzar tornavis+llanterna, server-side tag validation
CREATE OR REPLACE FUNCTION public.execute_tag_action(_game_id uuid, _item_id uuid, _action_key text, _player_tools jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  _item_tags text[];
  _tool_roll numeric;
  _tool_candidate text;
  _tool_threshold numeric := 0.30;
  _is_master boolean := false;
  _pool_martell int; _pool_drap int; _pool_llanterna int; _pool_tornavis int;
  _found_martell int; _found_drap int; _found_llanterna int; _found_tornavis int;
  _tools_found jsonb;
  _available_tools text[];
  _is_story boolean;
  _has_break_move boolean;
BEGIN
  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Jugador no trobat'; END IF;

  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  SELECT is_story INTO _is_story FROM games WHERE id = _game_id;
  _action_type := split_part(_action_key, ':', 1);

  CASE _action_type
    WHEN 'clean' THEN _cost := 0.2; _requires_tool := 'drap'; _consumes_tool := true;
    WHEN 'break' THEN _cost := 0.3; _requires_tool := 'martell'; _consumes_tool := true;
    WHEN 'fix'   THEN _cost := 0.2; _requires_tool := 'tornavis'; _consumes_tool := false;
    ELSE RAISE EXCEPTION 'Acció no vàlida: %', _action_type;
  END CASE;

  -- Server-side tag validation (B5)
  SELECT tags INTO _item_tags FROM items WHERE id = _item_id;
  IF _action_type = 'clean' AND NOT ('dirty' = ANY(COALESCE(_item_tags, ARRAY[]::text[]))) THEN
    RAISE EXCEPTION 'Aquest moble no està brut';
  END IF;
  IF _action_type = 'break' THEN
    IF NOT ('breakable' = ANY(COALESCE(_item_tags, ARRAY[]::text[]))) THEN
      RAISE EXCEPTION 'Aquest moble no es pot trencar';
    END IF;
    SELECT EXISTS(SELECT 1 FROM game_moves WHERE game_id = _game_id AND bonus_value = 'tag:break:' || _item_id::text) INTO _has_break_move;
    IF _has_break_move THEN RAISE EXCEPTION 'Aquest moble ja està trencat'; END IF;
  END IF;
  IF _action_type = 'fix' THEN
    SELECT EXISTS(SELECT 1 FROM game_moves WHERE game_id = _game_id AND bonus_value = 'tag:break:' || _item_id::text) INTO _has_break_move;
    IF NOT _has_break_move THEN RAISE EXCEPTION 'Aquest moble no està trencat'; END IF;
  END IF;

  IF _requires_tool IS NOT NULL AND COALESCE((_player.tools->>_requires_tool)::int, 0) <= 0 THEN
    RAISE EXCEPTION 'Necessites l''eina corresponent!';
  END IF;

  IF _player.tokens_last_reset < CURRENT_DATE THEN
    UPDATE game_players SET tokens_remaining = 4.0, tokens_last_reset = CURRENT_DATE, social_item_used_today = false,
      special_data = COALESCE(special_data, '{}'::jsonb) - 'barricada_today' - 'trampa_today'
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

  IF _action_type IN ('clean', 'fix') THEN
    SELECT (collection_master_at IS NOT NULL) INTO _is_master FROM profiles WHERE user_id = auth.uid();
    IF _is_master THEN _tool_threshold := 0.35; END IF;

    _tool_roll := random();
    IF _tool_roll < _tool_threshold THEN
      -- Distribució: tornavís+llanterna primer (anti-bloqueig)
      IF _tool_roll < 0.10 THEN _tool_candidate := 'tornavis';
      ELSIF _tool_roll < 0.20 THEN _tool_candidate := 'llanterna';
      ELSIF _tool_roll < 0.25 THEN _tool_candidate := 'drap';
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

-- 2) execute_toggle_light: pool 5, fallback llanterna garantida si bloquejat
CREATE OR REPLACE FUNCTION public.execute_toggle_light(_game_id uuid, _scenario_id uuid, _turn_off boolean, _scenario_name text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _player record;
  _cost numeric := 0.2;
  _tokens numeric;
  _turn_number int;
  _is_outdoor boolean;
  _tool_found text := NULL;
  _player_tools jsonb;
  _tool_roll numeric;
  _tool_candidate text;
  _tool_threshold numeric := 0.30;
  _is_master boolean := false;
  _pool_martell int; _pool_drap int; _pool_llanterna int; _pool_tornavis int;
  _found_martell int; _found_drap int; _found_llanterna int; _found_tornavis int;
  _tools_found jsonb;
  _available_tools text[];
  _granted_llanterna boolean := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'No ets jugador'; END IF;

  _is_outdoor := _scenario_name IN ('Jardí', 'Balcó', 'Garden', 'Balcony', 'Terrassa', 'Pati');

  -- Fallback anti-bloqueig: si vols encendre exterior i no tens llanterna, comprovem pool
  IF _is_outdoor AND NOT _turn_off AND COALESCE((_player.tools->>'llanterna')::int, 0) <= 0 THEN
    _found_llanterna := 0;
    FOR _tools_found IN SELECT tools FROM game_players WHERE game_id = _game_id LOOP
      _found_llanterna := _found_llanterna + COALESCE((_tools_found->>'llanterna')::int, 0);
    END LOOP;
    IF _found_llanterna < 5 THEN
      -- Donem llanterna gratuïta del pool perquè no quedis bloquejat
      _player_tools := _player.tools;
      _player_tools := jsonb_set(_player_tools, ARRAY['llanterna'],
        to_jsonb(COALESCE((_player_tools->>'llanterna')::int, 0) + 1));
      UPDATE game_players SET tools = _player_tools WHERE id = _player.id;
      _player.tools := _player_tools;
      _granted_llanterna := true;
    ELSE
      RAISE EXCEPTION 'Necessites una 🔦 Llanterna! El rival pot tenir-les totes.';
    END IF;
  END IF;

  IF _player.tokens_last_reset < CURRENT_DATE THEN
    UPDATE game_players SET tokens_remaining = 4.0, tokens_last_reset = CURRENT_DATE, social_item_used_today = false,
      special_data = COALESCE(special_data, '{}'::jsonb) - 'barricada_today' - 'trampa_today'
    WHERE id = _player.id;
    _tokens := 4.0;
  ELSE
    _tokens := _player.tokens_remaining;
  END IF;

  IF _tokens < _cost THEN RAISE EXCEPTION 'No tens prou tokens!'; END IF;

  SELECT COUNT(*) + 1 INTO _turn_number FROM game_moves WHERE game_id = _game_id AND player_id = auth.uid();

  UPDATE game_players SET tokens_remaining = _tokens - _cost WHERE id = _player.id;

  IF _is_outdoor AND NOT _turn_off THEN
    _player_tools := _player.tools;
    _player_tools := jsonb_set(_player_tools, ARRAY['llanterna'],
      to_jsonb(GREATEST(0, COALESCE((_player_tools->>'llanterna')::int, 0) - 1)));
    UPDATE game_players SET tools = _player_tools WHERE id = _player.id;
  END IF;

  INSERT INTO game_moves (game_id, player_id, turn_number, action, token_cost, target_scenario_id, target_position, bonus_value)
  VALUES (_game_id, auth.uid(), _turn_number, 'look', _cost, _scenario_id, 'sobre',
    'tag:light_' || CASE WHEN _turn_off THEN 'off' ELSE 'on' END || ':' || _scenario_id);

  SELECT (collection_master_at IS NOT NULL) INTO _is_master FROM profiles WHERE user_id = auth.uid();
  IF _is_master THEN _tool_threshold := 0.35; END IF;

  _tool_roll := random();
  IF _tool_roll < _tool_threshold THEN
    IF _tool_roll < 0.10 THEN _tool_candidate := 'tornavis';
    ELSIF _tool_roll < 0.20 THEN _tool_candidate := 'llanterna';
    ELSIF _tool_roll < 0.25 THEN _tool_candidate := 'drap';
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

  RETURN jsonb_build_object('tool_found', _tool_found, 'is_outdoor', _is_outdoor, 'turned_off', _turn_off, 'granted_llanterna', _granted_llanterna);
END;
$function$;

-- 3) execute_game_move: restore barricada + add tool roll on look + keep cursed/master logic
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
  _tool_threshold numeric := 0.15;
  _pool_martell int; _pool_drap int; _pool_llanterna int; _pool_tornavis int;
  _found_martell int; _found_drap int; _found_llanterna int; _found_tornavis int;
  _tools_found jsonb;
  _available_tools text[];
  _player_tools jsonb;
  _tool_found text := NULL;
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

  -- Barricada check on move
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
      RAISE EXCEPTION 'Camí barricadat! 🚧 Necessites % tokens per forçar el pas (tens %)', _cost, _tokens;
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
      SELECT bonus_type, value INTO _found_bonus, _bonus_value
      FROM scenario_bonuses
      WHERE item_id = _target_item_id AND position = _target_position
      LIMIT 1;

      IF _found_bonus = 'extra_token' THEN
        _bonus_tokens := COALESCE(_bonus_value::numeric, 0.5);

        IF _bonus_tokens > 0 THEN
          SELECT (collection_master_at IS NOT NULL) INTO _is_master
            FROM profiles WHERE user_id = auth.uid();
          IF _is_master THEN _bonus_tokens := _bonus_tokens * 2; END IF;
        END IF;

        IF _bonus_tokens < 0 THEN
          _cursed := true;
          SELECT COALESCE(elo, 1200) INTO _rival_elo FROM profiles WHERE user_id = _rival.user_id;
          IF _rival_elo >= 1400 THEN
            _bonus_tokens := _bonus_tokens * (5.0/3.0);
          END IF;
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

  -- Tool roll on look (anti-bloqueig: easier tool finding)
  IF _action = 'look' AND NOT _found_object AND NOT _is_story THEN
    SELECT (collection_master_at IS NOT NULL) INTO _is_master FROM profiles WHERE user_id = auth.uid();
    IF _is_master THEN _tool_threshold := 0.20; END IF;

    _tool_roll := random();
    IF _tool_roll < _tool_threshold THEN
      IF _tool_roll < 0.05 THEN _tool_candidate := 'tornavis';
      ELSIF _tool_roll < 0.10 THEN _tool_candidate := 'llanterna';
      ELSIF _tool_roll < 0.13 THEN _tool_candidate := 'drap';
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

-- 4) execute_grant_drap_if_available — server-side auto-drap respectant el pool
CREATE OR REPLACE FUNCTION public.execute_grant_drap_if_available(_game_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _player record;
  _player_tools jsonb;
  _found_drap int := 0;
  _tools_found jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'not_playing');
  END IF;
  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('granted', false, 'reason', 'not_player'); END IF;
  IF COALESCE((_player.tools->>'drap')::int, 0) > 0 THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_has');
  END IF;
  FOR _tools_found IN SELECT tools FROM game_players WHERE game_id = _game_id LOOP
    _found_drap := _found_drap + COALESCE((_tools_found->>'drap')::int, 0);
  END LOOP;
  IF _found_drap >= 5 THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'pool_exhausted');
  END IF;
  _player_tools := _player.tools;
  _player_tools := jsonb_set(_player_tools, ARRAY['drap'],
    to_jsonb(COALESCE((_player_tools->>'drap')::int, 0) + 1));
  UPDATE game_players SET tools = _player_tools WHERE id = _player.id;
  RETURN jsonb_build_object('granted', true);
END;
$function$;

-- 5) execute_robar_llanterna — mirror robar_tornavis (gratis, bloquejable per escut)
CREATE OR REPLACE FUNCTION public.execute_robar_llanterna(_game_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id uuid := auth.uid();
  _caller record;
  _rival record;
  _rival_tools jsonb;
  _caller_tools jsonb;
  _rival_llanterna int;
BEGIN
  IF NOT is_player_in_game(_caller_id, _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  SELECT id, tools INTO _caller FROM game_players WHERE game_id = _game_id AND user_id = _caller_id;
  SELECT id, tools, user_id, shield_active INTO _rival FROM game_players WHERE game_id = _game_id AND user_id != _caller_id LIMIT 1;
  IF _rival IS NULL THEN RAISE EXCEPTION 'Rival no trobat'; END IF;

  IF COALESCE(_rival.shield_active, false) THEN
    UPDATE game_players SET shield_active = false WHERE id = _rival.id;
    INSERT INTO game_social_items (game_id, from_player_id, to_player_id, item_type, blocked_by_shield)
    VALUES (_game_id, _caller_id, _rival.user_id, 'robar_tornavis', true);
    RETURN jsonb_build_object('stolen', false, 'blocked_by_shield', true);
  END IF;

  _rival_tools := _rival.tools;
  _rival_llanterna := COALESCE((_rival_tools->>'llanterna')::int, 0);
  IF _rival_llanterna <= 0 THEN
    RAISE EXCEPTION 'El rival no té cap llanterna per robar! 🔦';
  END IF;

  _rival_tools := jsonb_set(_rival_tools, '{llanterna}', to_jsonb(_rival_llanterna - 1));
  UPDATE game_players SET tools = _rival_tools WHERE id = _rival.id;

  _caller_tools := _caller.tools;
  _caller_tools := jsonb_set(_caller_tools, '{llanterna}', to_jsonb(COALESCE((_caller_tools->>'llanterna')::int, 0) + 1));
  UPDATE game_players SET tools = _caller_tools WHERE id = _caller.id;

  INSERT INTO game_social_items (game_id, from_player_id, to_player_id, item_type)
  VALUES (_game_id, _caller_id, _rival.user_id, 'robar_tornavis');

  RETURN jsonb_build_object('stolen', true, 'rival_remaining', _rival_llanterna - 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.execute_grant_drap_if_available(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_robar_llanterna(uuid) TO authenticated;
