-- ============================================================
-- Mode Història v5: Mons + Habilitats + Visites + Filtres
-- ============================================================

-- 1. Nivells a player_pets
ALTER TABLE public.player_pets ADD COLUMN IF NOT EXISTS level smallint NOT NULL DEFAULT 1;

-- 2. Habilitats persistents de la mascota
CREATE TABLE IF NOT EXISTS public.pet_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skill_id text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_id)
);
ALTER TABLE public.pet_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own skills" ON public.pet_skills FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. Catàleg de mons (lectura pública per autenticats)
CREATE TABLE IF NOT EXISTS public.story_worlds (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL,
  description text,
  start_node_id text NOT NULL,
  chapters smallint[] NOT NULL,
  display_order smallint NOT NULL DEFAULT 0,
  unlock_rule jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.story_worlds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Worlds readable" ON public.story_worlds FOR SELECT TO authenticated USING (true);

-- 4. Progrés del jugador per món
CREATE TABLE IF NOT EXISTS public.story_world_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  world_id text NOT NULL,
  visits smallint NOT NULL DEFAULT 0,
  completed_endings jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_visited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, world_id)
);
ALTER TABLE public.story_world_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own world progress" ON public.story_world_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. Visites a nodes (per branques noves segons re-visites)
CREATE TABLE IF NOT EXISTS public.story_node_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  node_id text NOT NULL,
  count smallint NOT NULL DEFAULT 1,
  last_visited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, node_id)
);
ALTER TABLE public.story_node_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own node visits" ON public.story_node_visits FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. Choices millorats: filtres per habilitat i nombre de visites
ALTER TABLE public.story_choices ADD COLUMN IF NOT EXISTS requires_skill text;
ALTER TABLE public.story_choices ADD COLUMN IF NOT EXISTS min_visits smallint;
ALTER TABLE public.story_choices ADD COLUMN IF NOT EXISTS max_visits smallint;

-- 7. Story_runs sap on comença
ALTER TABLE public.story_runs ADD COLUMN IF NOT EXISTS starting_world text;