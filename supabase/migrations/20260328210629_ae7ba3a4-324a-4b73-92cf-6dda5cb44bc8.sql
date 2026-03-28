
-- Fix infinite recursion in game_players SELECT policy
DROP POLICY IF EXISTS "View game players" ON public.game_players;

CREATE POLICY "View game players" ON public.game_players
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR game_id IN (
      SELECT g.id FROM games g WHERE g.created_by = auth.uid()
    )
  );

-- Fix "View moves" policy which references game_players
DROP POLICY IF EXISTS "View moves" ON public.game_moves;

CREATE POLICY "View moves" ON public.game_moves
  FOR SELECT TO authenticated
  USING (
    player_id = auth.uid()
    OR game_id IN (
      SELECT g.id FROM games g WHERE g.created_by = auth.uid()
    )
  );

-- Fix "Update own games" policy which also references game_players
DROP POLICY IF EXISTS "Update own games" ON public.games;

CREATE POLICY "Update own games" ON public.games
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT gp.game_id FROM game_players gp WHERE gp.user_id = auth.uid()
    )
  );
