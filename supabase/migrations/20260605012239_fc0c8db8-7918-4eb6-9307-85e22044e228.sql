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

  _is_outdoor := _scenario_name IN ('Jardí', 'Balcó', 'Garden', 'Balcony', 'Terrassa', 'Pati');

  IF _is_outdoor AND NOT _turn_off THEN
    IF COALESCE((_player.tools->>'llanterna')::int, 0) <= 0 THEN
      RAISE EXCEPTION 'Necessites una 🔦 Llanterna!';
    END IF;
  END IF;

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