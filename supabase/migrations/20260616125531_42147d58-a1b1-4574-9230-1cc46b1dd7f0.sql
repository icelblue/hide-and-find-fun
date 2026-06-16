
-- Peça A: registre explícit d'efectes per item_id (recipes + base items)
CREATE TABLE public.story_item_effects (
  item_id text PRIMARY KEY,
  kind text NOT NULL,
  d_hunger smallint NOT NULL DEFAULT 0,
  d_sleep smallint NOT NULL DEFAULT 0,
  d_fear smallint NOT NULL DEFAULT 0,
  d_bond smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.story_item_effects TO anon, authenticated;
GRANT ALL ON public.story_item_effects TO service_role;

ALTER TABLE public.story_item_effects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_item_effects readable to all"
  ON public.story_item_effects FOR SELECT
  USING (true);

-- Seed: base items
INSERT INTO public.story_item_effects (item_id, kind, d_hunger, d_sleep, d_fear, d_bond) VALUES
  ('apple',   'eat',    -40,   0,   0,   5),
  ('bread',   'eat',    -50,   0,   0,   5),
  ('meat',    'devour', -60,   0,   0,   0),
  ('fish',    'eat',    -50,   0,   0,   5),
  ('berries', 'taste',  -25,   0,   0,  10),
  ('water',   'drink',  -10, -15,   0,   0),
  ('blanket', 'rest',     0, -45, -15,   0),
  ('toy',     'play',     0,   0, -20,  25),
  ('ball',    'play',     0,   0, -15,  20),
  ('potion',  'calm',     0,   0, -50,  10),
  ('flower',  'gift',     0,   0, -10,  15),
  ('music',   'music',    0, -10, -30,   0),
  -- Recipe outputs (Peça A: cobertura explícita)
  ('amulet_seafire', 'gift',  0,   0, -25,  20),
  ('clau_obrible',   'gift',  0,   0,   0,  10),
  ('pocio_calma',    'calm',  0,   0, -60,  10),
  ('ruta_secreta',   'gift',  0,   0,   0,  15),
  -- Items mencionats a inventory existent
  ('clau_vella',     'gift',  0,   0,   0,   5),
  ('sea_pearl',      'gift',  0,   0,   0,  15),
  ('shell',          'gift',  0,   0,   0,  10);
