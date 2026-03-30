DROP POLICY IF EXISTS "View own inventory" ON player_inventory;
CREATE POLICY "View own inventory" ON player_inventory FOR SELECT TO authenticated
USING (
  (user_id = auth.uid()) OR (gifted_to = auth.uid()) OR (item_type = 'special_trophy')
);