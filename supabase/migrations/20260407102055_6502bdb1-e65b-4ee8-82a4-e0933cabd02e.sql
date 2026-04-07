
-- 1. Restrict game_players SELECT to own rows only
DROP POLICY IF EXISTS "View game players" ON public.game_players;
CREATE POLICY "View own game player"
  ON public.game_players
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. check_both_hidden RPC
CREATE OR REPLACE FUNCTION public.check_both_hidden(_game_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_player_in_game(auth.uid(), _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  RETURN (
    SELECT COUNT(*) = 2 AND bool_and(has_hidden)
    FROM game_players
    WHERE game_id = _game_id
  );
END;
$$;

-- 3. start_game_setup RPC — assigns random start scenarios server-side
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
BEGIN
  -- Verify caller is in the game
  IF NOT is_player_in_game(auth.uid(), _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  -- Verify game is in hiding phase
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'hiding') THEN
    RAISE EXCEPTION 'Game not in hiding phase';
  END IF;

  FOR _player IN SELECT gp.id, gp.user_id, gp.current_scenario_id, gp.hidden_item_id 
                 FROM game_players gp WHERE gp.game_id = _game_id
  LOOP
    IF _player.current_scenario_id IS NOT NULL THEN
      CONTINUE;
    END IF;

    -- Get the scenario of the hidden item
    SELECT i.scenario_id INTO _hidden_scenario
    FROM items i WHERE i.id = _player.hidden_item_id;

    -- Pick a random different scenario
    SELECT array_agg(s.id) INTO _available_scenarios
    FROM scenarios s WHERE s.id != _hidden_scenario;

    IF _available_scenarios IS NULL OR array_length(_available_scenarios, 1) = 0 THEN
      -- Fallback: use any scenario
      SELECT array_agg(s.id) INTO _available_scenarios FROM scenarios s;
    END IF;

    _random_scenario := _available_scenarios[1 + floor(random() * array_length(_available_scenarios, 1))::int];

    UPDATE game_players SET current_scenario_id = _random_scenario
    WHERE id = _player.id;
  END LOOP;

  -- Start the game
  UPDATE games SET status = 'playing' WHERE id = _game_id;
END;
$$;

-- 4. get_game_participants RPC — for lobby/profile, returns only game_id + user_id
CREATE OR REPLACE FUNCTION public.get_game_participants(_game_ids uuid[])
  RETURNS TABLE(game_id uuid, user_id uuid)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT gp.game_id, gp.user_id
  FROM game_players gp
  WHERE gp.game_id = ANY(_game_ids);
$$;
