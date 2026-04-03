
-- Player pets table
CREATE TABLE public.player_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  pet_type text NOT NULL,
  pet_name text NOT NULL,
  pet_icon text NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.player_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View all pets" ON public.player_pets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create own pet" ON public.player_pets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own pet" ON public.player_pets FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Story progress table
CREATE TABLE public.story_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chapter smallint NOT NULL,
  status text NOT NULL DEFAULT 'locked',
  moves_used integer NOT NULL DEFAULT 0,
  best_moves integer,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter)
);

ALTER TABLE public.story_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own progress" ON public.story_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Create own progress" ON public.story_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own progress" ON public.story_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Pet accessories table
CREATE TABLE public.pet_accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accessory_name text NOT NULL,
  accessory_icon text NOT NULL,
  obtained_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, accessory_name)
);

ALTER TABLE public.pet_accessories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View all accessories" ON public.pet_accessories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert own accessories" ON public.pet_accessories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
