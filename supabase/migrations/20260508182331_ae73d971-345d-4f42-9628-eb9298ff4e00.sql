
CREATE TABLE public.story_nodes (
  id text PRIMARY KEY,
  chapter smallint NOT NULL CHECK (chapter BETWEEN 1 AND 8),
  title text NOT NULL,
  narrative text NOT NULL,
  is_ending boolean NOT NULL DEFAULT false,
  ending_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.story_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id text NOT NULL REFERENCES public.story_nodes(id) ON DELETE CASCADE,
  choice_order smallint NOT NULL CHECK (choice_order BETWEEN 1 AND 3),
  label text NOT NULL,
  next_node_id text REFERENCES public.story_nodes(id) ON DELETE SET NULL,
  reward_type text,
  reward_value jsonb,
  UNIQUE (node_id, choice_order)
);

CREATE INDEX idx_story_choices_node ON public.story_choices(node_id);

CREATE TABLE public.story_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  current_node_id text REFERENCES public.story_nodes(id),
  path jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','dead','completed')),
  ending_type text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX idx_story_runs_user ON public.story_runs(user_id);

ALTER TABLE public.story_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story nodes readable" ON public.story_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Story choices readable" ON public.story_choices FOR SELECT TO authenticated USING (true);

CREATE POLICY "View own runs" ON public.story_runs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Create own runs" ON public.story_runs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own runs" ON public.story_runs FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Delete own runs" ON public.story_runs FOR DELETE TO authenticated USING (user_id = auth.uid());
