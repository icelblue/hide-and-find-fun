
-- Allow users to delete their own waiting games
CREATE POLICY "Delete own waiting games" ON public.games
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND status = 'waiting');

-- Also allow deleting game_players when game is deleted
CREATE POLICY "Delete own game players" ON public.game_players
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR game_id IN (
      SELECT id FROM games WHERE created_by = auth.uid() AND status = 'waiting'
    )
  );
