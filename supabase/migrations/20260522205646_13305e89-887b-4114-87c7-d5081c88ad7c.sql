-- FASE 1: Sistema de personalitat híbrida (espècie + estat)

-- 1. Taula de traits base per espècie
CREATE TABLE public.pet_species_traits (
  pet_type text PRIMARY KEY,
  curious smallint NOT NULL DEFAULT 5,
  loyal smallint NOT NULL DEFAULT 5,
  brave smallint NOT NULL DEFAULT 5,
  gluttonous smallint NOT NULL DEFAULT 5,
  calm smallint NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_species_traits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Species traits readable"
  ON public.pet_species_traits
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Columnes a story_choices per condicionar i recompensar segons traits
ALTER TABLE public.story_choices
  ADD COLUMN IF NOT EXISTS requires_traits jsonb,
  ADD COLUMN IF NOT EXISTS trait_reward_multiplier jsonb;

COMMENT ON COLUMN public.story_choices.requires_traits IS 'JSON {trait_name: min_value} ex: {"curious": 6} — opció només visible si la mascota té aquest trait';
COMMENT ON COLUMN public.story_choices.trait_reward_multiplier IS 'JSON {trait_name: multiplier} ex: {"brave": 1.5} — multiplica reward XP segons trait';

-- 3. Llavor de traits per les espècies existents (valors 0-10, base = 5)
INSERT INTO public.pet_species_traits (pet_type, curious, loyal, brave, gluttonous, calm) VALUES
  ('cat',     8, 4, 6, 5, 7),
  ('Lion',    6, 5, 9, 7, 4),
  ('Wolf',    7, 8, 8, 6, 4),
  ('Monky',   9, 5, 6, 8, 3),
  ('turtle',  4, 7, 3, 4, 9),
  ('dog',     5, 9, 7, 6, 5),
  ('rabbit',  6, 5, 3, 5, 7),
  ('fox',     8, 4, 7, 5, 5),
  ('bear',    4, 6, 8, 8, 5)
ON CONFLICT (pet_type) DO NOTHING;