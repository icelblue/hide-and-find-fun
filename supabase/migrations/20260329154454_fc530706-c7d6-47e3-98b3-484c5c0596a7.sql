CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  error_message text NOT NULL,
  error_stack text,
  component text,
  url text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert errors" ON public.error_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "View own errors" ON public.error_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Insert anon errors" ON public.error_logs FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);