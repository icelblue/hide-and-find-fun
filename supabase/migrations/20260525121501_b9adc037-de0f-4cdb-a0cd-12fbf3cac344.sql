-- ============================================================
-- i18n: Taula translations + seed CA del contingut existent
-- ============================================================

-- 1) Columna language al perfil (default ca)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'ca'
    CHECK (language IN ('ca', 'en'));

-- 2) Taula generic de traduccions
CREATE TABLE IF NOT EXISTS public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,    -- 'story_node_title', 'story_node_narrative', 'story_choice_label', 'story_world_name', 'story_world_description', 'story_recipe_name', 'story_recipe_description', 'reward_item_name'
  entity_id text NOT NULL,      -- id de l'entitat referenciada (text per cobrir story_nodes.id text)
  lang text NOT NULL CHECK (lang IN ('ca', 'en')),
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, lang)
);

CREATE INDEX IF NOT EXISTS idx_translations_lookup
  ON public.translations (entity_type, entity_id, lang);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Translations readable"
  ON public.translations FOR SELECT
  TO authenticated
  USING (true);

-- 3) Helper per get translation amb fallback CA
CREATE OR REPLACE FUNCTION public.get_translation(
  p_entity_type text,
  p_entity_id text,
  p_lang text,
  p_fallback text
) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT value FROM public.translations
       WHERE entity_type = p_entity_type
         AND entity_id = p_entity_id
         AND lang = p_lang
       LIMIT 1),
    (SELECT value FROM public.translations
       WHERE entity_type = p_entity_type
         AND entity_id = p_entity_id
         AND lang = 'ca'
       LIMIT 1),
    p_fallback
  );
$$;

-- 4) Seed CA inicial — copiem el contingut actual a la taula translations
INSERT INTO public.translations (entity_type, entity_id, lang, value)
SELECT 'story_node_title', id, 'ca', title FROM public.story_nodes WHERE title IS NOT NULL
ON CONFLICT (entity_type, entity_id, lang) DO NOTHING;

INSERT INTO public.translations (entity_type, entity_id, lang, value)
SELECT 'story_node_narrative', id, 'ca', narrative FROM public.story_nodes WHERE narrative IS NOT NULL
ON CONFLICT (entity_type, entity_id, lang) DO NOTHING;

INSERT INTO public.translations (entity_type, entity_id, lang, value)
SELECT 'story_choice_label', id::text, 'ca', label FROM public.story_choices WHERE label IS NOT NULL
ON CONFLICT (entity_type, entity_id, lang) DO NOTHING;

INSERT INTO public.translations (entity_type, entity_id, lang, value)
SELECT 'story_world_name', id, 'ca', name FROM public.story_worlds WHERE name IS NOT NULL
ON CONFLICT (entity_type, entity_id, lang) DO NOTHING;

INSERT INTO public.translations (entity_type, entity_id, lang, value)
SELECT 'story_world_description', id, 'ca', description FROM public.story_worlds WHERE description IS NOT NULL
ON CONFLICT (entity_type, entity_id, lang) DO NOTHING;

INSERT INTO public.translations (entity_type, entity_id, lang, value)
SELECT 'story_recipe_name', id, 'ca', name FROM public.story_recipes WHERE name IS NOT NULL
ON CONFLICT (entity_type, entity_id, lang) DO NOTHING;

INSERT INTO public.translations (entity_type, entity_id, lang, value)
SELECT 'story_recipe_description', id, 'ca', description FROM public.story_recipes WHERE description IS NOT NULL
ON CONFLICT (entity_type, entity_id, lang) DO NOTHING;

INSERT INTO public.translations (entity_type, entity_id, lang, value)
SELECT 'reward_item_name', id::text, 'ca', name FROM public.reward_items WHERE name IS NOT NULL
ON CONFLICT (entity_type, entity_id, lang) DO NOTHING;