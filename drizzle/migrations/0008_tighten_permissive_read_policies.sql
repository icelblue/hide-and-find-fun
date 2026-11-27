DROP POLICY IF EXISTS "Items readable" ON public.items;
CREATE POLICY "Items readable" ON public.items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Interactions readable" ON public.item_interactions;
CREATE POLICY "Interactions readable" ON public.item_interactions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "View all pet events" ON public.pet_events;
CREATE POLICY "View own pet events" ON public.pet_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "View all rewards" ON public.player_rewards;
CREATE POLICY "View own or showcased rewards" ON public.player_rewards FOR SELECT TO authenticated USING (auth.uid() = user_id OR status = 'owned');
DROP POLICY IF EXISTS "View all pets" ON public.player_pets;
CREATE POLICY "View own or visited pets" ON public.player_pets FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.pet_visits v
    WHERE (v.host_user_id = auth.uid() AND v.visitor_user_id = player_pets.user_id)
       OR (v.visitor_user_id = auth.uid() AND v.host_user_id = player_pets.user_id)
  )
);
DROP POLICY IF EXISTS "Games viewable" ON public.games;
CREATE POLICY "Games viewable by participants or open" ON public.games FOR SELECT TO authenticated USING (
  created_by = auth.uid()
  OR invited_user_id = auth.uid()
  OR (status = 'waiting' AND invited_user_id IS NULL)
  OR public.is_player_in_game(auth.uid(), id)
);