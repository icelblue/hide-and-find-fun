
ALTER TABLE public.story_nodes ADD COLUMN IF NOT EXISTS puzzle_data jsonb;

CREATE TABLE IF NOT EXISTS public.story_puzzle_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  run_id uuid NOT NULL REFERENCES public.story_runs(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  solved_at timestamptz,
  skipped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, node_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_puzzle_attempts TO authenticated;
GRANT ALL ON public.story_puzzle_attempts TO service_role;

ALTER TABLE public.story_puzzle_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own puzzle attempts"
  ON public.story_puzzle_attempts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_story_puzzle_attempts_updated_at
  BEFORE UPDATE ON public.story_puzzle_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS story_puzzle_attempts_run_idx ON public.story_puzzle_attempts(run_id);
