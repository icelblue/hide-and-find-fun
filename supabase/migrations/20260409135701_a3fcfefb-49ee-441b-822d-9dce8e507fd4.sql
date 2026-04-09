
-- Function: execute_swap — exchanges current_scenario_id between two players
CREATE OR REPLACE FUNCTION public.execute_swap(_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _caller record;
  _rival record;
  _caller_scenario uuid;
  _rival_scenario uuid;
BEGIN
  IF NOT is_player_in_game(_caller_id, _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  SELECT id, current_scenario_id INTO _caller FROM game_players WHERE game_id = _game_id AND user_id = _caller_id;
  SELECT id, current_scenario_id INTO _rival FROM game_players WHERE game_id = _game_id AND user_id != _caller_id LIMIT 1;

  IF _rival IS NULL THEN
    RAISE EXCEPTION 'Rival no trobat';
  END IF;

  _caller_scenario := _caller.current_scenario_id;
  _rival_scenario := _rival.current_scenario_id;

  UPDATE game_players SET current_scenario_id = _rival_scenario WHERE id = _caller.id;
  UPDATE game_players SET current_scenario_id = _caller_scenario WHERE id = _rival.id;

  RETURN jsonb_build_object(
    'caller_new_scenario', _rival_scenario,
    'rival_new_scenario', _caller_scenario
  );
END;
$$;

-- Function: execute_robar_tornavis — steals 1 screwdriver from rival
CREATE OR REPLACE FUNCTION public.execute_robar_tornavis(_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _caller record;
  _rival record;
  _rival_tools jsonb;
  _caller_tools jsonb;
  _rival_tornavis int;
BEGIN
  IF NOT is_player_in_game(_caller_id, _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  SELECT id, tools INTO _caller FROM game_players WHERE game_id = _game_id AND user_id = _caller_id;
  SELECT id, tools INTO _rival FROM game_players WHERE game_id = _game_id AND user_id != _caller_id LIMIT 1;

  IF _rival IS NULL THEN
    RAISE EXCEPTION 'Rival no trobat';
  END IF;

  _rival_tools := _rival.tools;
  _rival_tornavis := COALESCE((_rival_tools->>'tornavis')::int, 0);

  IF _rival_tornavis <= 0 THEN
    RAISE EXCEPTION 'El rival no té cap tornavís per robar! 🔧';
  END IF;

  -- Subtract from rival
  _rival_tools := jsonb_set(_rival_tools, '{tornavis}', to_jsonb(_rival_tornavis - 1));
  UPDATE game_players SET tools = _rival_tools WHERE id = _rival.id;

  -- Add to caller
  _caller_tools := _caller.tools;
  _caller_tools := jsonb_set(_caller_tools, '{tornavis}', to_jsonb(COALESCE((_caller_tools->>'tornavis')::int, 0) + 1));
  UPDATE game_players SET tools = _caller_tools WHERE id = _caller.id;

  RETURN jsonb_build_object(
    'stolen', true,
    'rival_remaining', _rival_tornavis - 1,
    'caller_total', COALESCE((_caller_tools->>'tornavis')::int, 0)
  );
END;
$$;
