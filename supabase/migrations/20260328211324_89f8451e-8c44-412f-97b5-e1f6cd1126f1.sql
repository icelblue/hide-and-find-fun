
CREATE TABLE public.wall_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wall_messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read wall messages (they're public on profiles)
CREATE POLICY "View wall messages" ON public.wall_messages
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can post messages to anyone's wall
CREATE POLICY "Post wall messages" ON public.wall_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_user_id AND author_user_id != target_user_id);

-- Authors can delete their own messages
CREATE POLICY "Delete own wall messages" ON public.wall_messages
  FOR DELETE TO authenticated
  USING (author_user_id = auth.uid());
