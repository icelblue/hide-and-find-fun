DROP POLICY IF EXISTS "View social items" ON public.game_social_items;

CREATE POLICY "View social items"
ON public.game_social_items
FOR SELECT
TO authenticated
USING (
  from_player_id = auth.uid()
  OR (
    to_player_id = auth.uid()
    AND (
      item_type <> 'trampa'
      OR processed = true
    )
  )
);