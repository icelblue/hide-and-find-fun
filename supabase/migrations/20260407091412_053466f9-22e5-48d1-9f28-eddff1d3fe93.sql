
-- Pet health events (virus, falls, fever) that increase XP rapidly
-- Consumables can cure them (reduce XP)
CREATE TABLE public.pet_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL, -- 'virus', 'caiguda', 'febre'
  event_icon text NOT NULL DEFAULT '🤒',
  event_name text NOT NULL,
  xp_change integer NOT NULL, -- positive = damage (XP increase), negative = heal
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own pet events"
  ON public.pet_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Create own pet events"
  ON public.pet_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own pet events"
  ON public.pet_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Delete own pet events"
  ON public.pet_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
