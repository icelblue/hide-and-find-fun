
-- Allow invited user to also delete/decline waiting games
DROP POLICY IF EXISTS "Delete own waiting games" ON public.games;
CREATE POLICY "Delete own waiting games" ON public.games
  FOR DELETE TO authenticated
  USING (
    status = 'waiting'::game_status
    AND (created_by = auth.uid() OR invited_user_id = auth.uid())
  );
