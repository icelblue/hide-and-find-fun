
-- Create a security definer function to check if user is in a game
CREATE OR REPLACE FUNCTION public.is_player_in_game(_user_id uuid, _game_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_players
    WHERE user_id = _user_id AND game_id = _game_id
  )
$$;

-- Fix View game players: allow seeing all players in games you're part of
DROP POLICY IF EXISTS "View game players" ON public.game_players;
CREATE POLICY "View game players" ON public.game_players
  FOR SELECT TO authenticated
  USING (
    public.is_player_in_game(auth.uid(), game_id)
  );

-- Fix View moves: allow seeing moves from games you're in
DROP POLICY IF EXISTS "View moves" ON public.game_moves;
CREATE POLICY "View moves" ON public.game_moves
  FOR SELECT TO authenticated
  USING (
    public.is_player_in_game(auth.uid(), game_id)
  );

-- Fix Update own games: allow both players to update game status
DROP POLICY IF EXISTS "Update own games" ON public.games;
CREATE POLICY "Update own games" ON public.games
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_player_in_game(auth.uid(), id)
  );
