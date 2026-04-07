-- Allow all authenticated users to view pet events (so they can see if others' pets are sick)
DROP POLICY IF EXISTS "View own pet events" ON public.pet_events;
CREATE POLICY "View all pet events"
  ON public.pet_events FOR SELECT
  TO authenticated
  USING (true);