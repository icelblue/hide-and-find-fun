
-- Fix: restrict push_subscriptions policies to authenticated role only
DROP POLICY IF EXISTS "View own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Delete own subscriptions" ON public.push_subscriptions;

CREATE POLICY "View own subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Delete own subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
