
-- ============================================================
-- MODE HISTÒRIA v4 — schema additions + cleanup
-- ============================================================

-- 1. PET_STATE (gana/son/por/vincle 0-100)
CREATE TABLE public.pet_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  hunger smallint NOT NULL DEFAULT 30 CHECK (hunger >= 0 AND hunger <= 100),
  sleep smallint NOT NULL DEFAULT 30 CHECK (sleep >= 0 AND sleep <= 100),
  fear smallint NOT NULL DEFAULT 20 CHECK (fear >= 0 AND fear <= 100),
  bond smallint NOT NULL DEFAULT 40 CHECK (bond >= 0 AND bond <= 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pet_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own pet state" ON public.pet_state FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. STORY_INVENTORY
CREATE TABLE public.story_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id text NOT NULL,
  item_name text NOT NULL,
  item_icon text NOT NULL DEFAULT '🎒',
  obtained_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);
ALTER TABLE public.story_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own inventory" ON public.story_inventory FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_story_inventory_user ON public.story_inventory(user_id);

-- 3. STORY_RECIPES (catàleg)
CREATE TABLE public.story_recipes (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '🧪',
  description text,
  requires_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_item_id text NOT NULL,
  result_item_name text NOT NULL,
  result_item_icon text NOT NULL DEFAULT '✨',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.story_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recipes readable" ON public.story_recipes FOR SELECT TO authenticated USING (true);

-- 4. STORY_RECIPE_BOOK (receptes descobertes per usuari)
CREATE TABLE public.story_recipe_book (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id text NOT NULL REFERENCES public.story_recipes(id) ON DELETE CASCADE,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);
ALTER TABLE public.story_recipe_book ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own recipe book" ON public.story_recipe_book FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. STORY_CHOICES — nous camps
ALTER TABLE public.story_choices
  ADD COLUMN state_delta jsonb,
  ADD COLUMN requires_items jsonb,
  ADD COLUMN requires_bond smallint;

-- 6. STORY_NODES — puzzles
ALTER TABLE public.story_nodes
  ADD COLUMN puzzle_type text,
  ADD COLUMN puzzle_data jsonb;

-- ============================================================
-- CLEANUP
-- ============================================================

-- Drop obsolete RPCs
DROP FUNCTION IF EXISTS public.create_story_game CASCADE;
DROP FUNCTION IF EXISTS public.finish_story_game CASCADE;

-- Drop obsolete table
DROP TABLE IF EXISTS public.story_progress CASCADE;

-- Drop obsolete columns from games (delete rows first)
DELETE FROM public.games WHERE is_story = true;
ALTER TABLE public.games DROP COLUMN IF EXISTS is_story;
ALTER TABLE public.games DROP COLUMN IF EXISTS story_chapter;

-- ============================================================
-- SEED RECIPES (3 inicials)
-- ============================================================

INSERT INTO public.story_recipes (id, name, icon, description, requires_items, result_item_id, result_item_name, result_item_icon) VALUES
  ('rec_clau_obrible', 'Clau Obrible', '🗝️', 'Una clau vella greixada que obre panys rovellats.',
   '["clau_vella","oli"]'::jsonb, 'clau_obrible', 'Clau Obrible', '🗝️'),
  ('rec_ruta_secreta', 'Ruta Secreta', '🗺️', 'El mapa marca el camí amagat al bosc.',
   '["mapa","brúixola"]'::jsonb, 'ruta_secreta', 'Ruta Secreta', '🧭'),
  ('rec_pocio_calma', 'Poció de Calma', '🧪', 'Una infusió que calma la por de {pet}.',
   '["herba","aigua"]'::jsonb, 'pocio_calma', 'Poció de Calma', '🌿');
