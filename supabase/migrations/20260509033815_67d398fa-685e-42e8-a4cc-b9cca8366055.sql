ALTER TABLE public.story_nodes ADD COLUMN IF NOT EXISTS is_daily boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.daily_challenge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_date date NOT NULL,
  node_id text NOT NULL,
  choice_id uuid NOT NULL,
  reward_type text,
  reward_value jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_date)
);

ALTER TABLE public.daily_challenge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own daily log" ON public.daily_challenge_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Insert own daily log" ON public.daily_challenge_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_daily_challenge_log_user_date ON public.daily_challenge_log(user_id, challenge_date DESC);