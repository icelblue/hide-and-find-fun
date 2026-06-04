
-- =====================================================================
-- CORE v1 — Pressió i Bluff
-- =====================================================================

-- 1) execute_tag_action: 5→4, drap consumit + bonus garantit, martell consumit, escenari al missatge
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

  CASE _action_type
    WHEN 'clean' THEN _cost := 0.3; _requires_tool := 'drap'; _consumes_tool := true;
    WHEN 'break' THEN _cost := 0.4; _requires_tool := 'martell'; _consumes_tool := true;
    WHEN 'fix'   THEN _cost := 0.3; _requires_tool := 'tornavis'; _consumes_tool := false; -- tornavís UNLIMITED
    ELSE RAISE EXCEPTION 'Acció no vàlida: %', _action_type;
  END CASE;

  IF _requires_tool IS NOT NULL AND COALESCE((_player.tools->>_requires_tool)::int, 0) <= 0 THEN
    RAISE EXCEPTION 'Necessites l''eina corresponent!';
  END IF;

  -- Reset diari 5→4
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

  -- Cobrar cost
  UPDATE game_players SET tokens_remaining = _tokens - _cost WHERE id = _player.id;

  -- Consumir eina (drap/martell) — tornavís NO
  IF _consumes_tool THEN
    _player_tools_db := _player.tools;
    _player_tools_db := jsonb_set(_player_tools_db, ARRAY[_requires_tool],
      to_jsonb(GREATEST(0, COALESCE((_player_tools_db->>_requires_tool)::int, 0) - 1)));
    UPDATE game_players SET tools = _player_tools_db WHERE id = _player.id;
  END IF;

  INSERT INTO game_moves (game_id, player_id, turn_number, action, token_cost, target_item_id, target_position, bonus_value)
  VALUES (_game_id, auth.uid(), _turn_number, 'look', _cost, _item_id, 'sobre', 'tag:' || _action_key);

  -- Bonus per netejar: GARANTIT +0.3🪙. Trencar i arreglar mantenen aleatorietat.
  IF _action_type = 'clean' THEN
    _bonus_amount := 0.3;
    UPDATE game_players SET tokens_remaining = tokens_remaining + _bonus_amount WHERE id = _player.id;
    _bonus_result := jsonb_build_object('amount', _bonus_amount, 'guaranteed', true);
  ELSIF (_action_type = 'break' AND random() < 0.3) OR (_action_type = 'fix' AND random() < 0.4) THEN
    IF random() < 0.3 THEN _bonus_amount := 0.5; ELSE _bonus_amount := 0.3; END IF;
    UPDATE game_players SET tokens_remaining = tokens_remaining + _bonus_amount WHERE id = _player.id;
    _bonus_result := jsonb_build_object('amount', _bonus_amount);
  END IF;

  -- Notificar trencada amb nom escenari
  IF _action_type = 'break' AND NOT COALESCE(_is_story, false) THEN
    SELECT user_id INTO _rival FROM game_players WHERE game_id = _game_id AND user_id != auth.uid() LIMIT 1;
    IF _rival IS NOT NULL THEN
      SELECT i.name, i.icon, s.name AS sname, s.icon AS sicon
        INTO _item
        FROM items i JOIN scenarios s ON s.id = i.scenario_id
       WHERE i.id = _item_id;
      INSERT INTO game_social_items (game_id, from_player_id, to_player_id, item_type, message_text)
      VALUES (_game_id, auth.uid(), _rival.user_id, 'message',
        '💥 El rival ha trencat ' || COALESCE(_item.icon, '') || ' ' || COALESCE(_item.name, '') ||
        ' a ' || COALESCE(_item.sicon, '') || ' ' || COALESCE(_item.sname, '') || '!');
    END IF;
  END IF;

  -- Roll d'eines (clean/fix) — manté pool i Mestre
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

-- 2) execute_toggle_light: 5→4 + consumir llanterna a outdoor on
CREATE OR REPLACE FUNCTION public.execute_toggle_light(_game_id uuid, _scenario_id uuid, _turn_off boolean, _scenario_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  _tool_threshold numeric := 0.25;
  _is_master boolean := false;
  _pool_martell int; _pool_drap int; _pool_llanterna int; _pool_tornavis int;
  _found_martell int; _found_drap int; _found_llanterna int; _found_tornavis int;
  _tools_found jsonb;
  _available_tools text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'No ets jugador'; END IF;

  _is_outdoor := _scenario_name IN ('Jardí', 'Balcó', 'Terrassa', 'Pati');

  IF _is_outdoor AND NOT _turn_off THEN
    IF COALESCE((_player.tools->>'llanterna')::int, 0) <= 0 THEN
      RAISE EXCEPTION 'Necessites una 🔦 Llanterna!';
    END IF;
  END IF;

  -- Reset diari 5→4
  IF _player.tokens_last_reset < CURRENT_DATE THEN
    UPDATE game_players SET tokens_remaining = 4.0, tokens_last_reset = CURRENT_DATE, social_item_used_today = false
    WHERE id = _player.id;
    _tokens := 4.0;
  ELSE
    _tokens := _player.tokens_remaining;
  END IF;

  IF _tokens < _cost THEN RAISE EXCEPTION 'No tens prou tokens!'; END IF;

  SELECT COUNT(*) + 1 INTO _turn_number FROM game_moves WHERE game_id = _game_id AND player_id = auth.uid();

  UPDATE game_players SET tokens_remaining = _tokens - _cost WHERE id = _player.id;

  -- Consumir llanterna si encén exterior
  IF _is_outdoor AND NOT _turn_off THEN
    _player_tools := _player.tools;
    _player_tools := jsonb_set(_player_tools, ARRAY['llanterna'],
      to_jsonb(GREATEST(0, COALESCE((_player_tools->>'llanterna')::int, 0) - 1)));
    UPDATE game_players SET tools = _player_tools WHERE id = _player.id;
  END IF;

  INSERT INTO game_moves (game_id, player_id, turn_number, action, token_cost, target_scenario_id, target_position, bonus_value)
  VALUES (_game_id, auth.uid(), _turn_number, 'look', _cost, _scenario_id, 'sobre',
    'tag:light_' || CASE WHEN _turn_off THEN 'off' ELSE 'on' END || ':' || _scenario_id);

  -- Roll d'eines
  SELECT (collection_master_at IS NOT NULL) INTO _is_master FROM profiles WHERE user_id = auth.uid();
  IF _is_master THEN _tool_threshold := 0.30; END IF;

  _tool_roll := random();
  IF _tool_roll < _tool_threshold THEN
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
      SELECT tools INTO _player_tools FROM game_players WHERE id = _player.id;
      _player_tools := jsonb_set(_player_tools, ARRAY[_tool_candidate],
        to_jsonb(COALESCE((_player_tools->>_tool_candidate)::int, 0) + 1));
      UPDATE game_players SET tools = _player_tools WHERE id = _player.id;
      _tool_found := _tool_candidate;
    END IF;
  END IF;

  UPDATE games SET status = 'playing', updated_at = now() WHERE id = _game_id AND status = 'playing';

  RETURN jsonb_build_object('tool_found', _tool_found, 'is_outdoor', _is_outdoor, 'turned_off', _turn_off);
END;
$function$;

-- 3) execute_game_move: suport caselles maleïdes amb escalat per Elo
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
  _is_master boolean := false;
  _rival_elo int := 0;
  _cursed boolean := false;
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

        -- Mestre Col·leccionista: ×2 als bonus POSITIUS
        IF _bonus_tokens > 0 THEN
          SELECT (collection_master_at IS NOT NULL) INTO _is_master
            FROM profiles WHERE user_id = auth.uid();
          IF _is_master THEN _bonus_tokens := _bonus_tokens * 2; END IF;
        END IF;

        -- Casella maleïda: escalat per Elo del rival (≥1400 → ×5/3, -0.3 → -0.5)
        IF _bonus_tokens < 0 THEN
          _cursed := true;
          SELECT COALESCE(elo_rating, 1200) INTO _rival_elo FROM profiles WHERE user_id = _rival.user_id;
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
    'tokens_remaining', GREATEST(0, _tokens - _cost + _bonus_tokens - _trap_penalty)
  );
END;
$function$;

-- 4) Caselles maleïdes: 2 per escenari (14 totals) amb -0.3
-- Seleccionem 2 items determinístics per escenari ordenats per display_order
WITH ranked AS (
  SELECT i.id, i.scenario_id, ROW_NUMBER() OVER (PARTITION BY i.scenario_id ORDER BY i.display_order, i.id) AS rn
  FROM items i
),
picks AS (
  SELECT id, scenario_id, rn,
    CASE WHEN rn IN (2,4) THEN 'sota'::position_type END AS pos
  FROM ranked
  WHERE rn IN (2, 4)
)
INSERT INTO scenario_bonuses (item_id, position, bonus_type, value)
SELECT id, pos, 'extra_token', '-0.3'
FROM picks
WHERE pos IS NOT NULL
ON CONFLICT (item_id, position) DO NOTHING;
