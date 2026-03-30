-- 1. Fix stuck game QE2BUY: assign starting scenario to player without one
UPDATE game_players 
SET current_scenario_id = 'ee0d1a9a-d8bd-434f-8b65-e564ea86b0aa'
WHERE game_id = '39a3edc3-fb4e-46d6-82bd-11db5358d36d' 
  AND user_id = 'fe4d0f7b-4ec0-435f-bf97-14c124772c78' 
  AND current_scenario_id IS NULL;

-- 2. Add material to objects (for compatibility restrictions)
DO $$ BEGIN
  CREATE TYPE public.object_material AS ENUM ('generic', 'paper', 'glass', 'metal', 'plastic', 'fabric');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE objects ADD COLUMN IF NOT EXISTS material object_material NOT NULL DEFAULT 'generic';

-- 3. Add environment to items (for compatibility restrictions)
DO $$ BEGIN
  CREATE TYPE public.item_environment AS ENUM ('generic', 'wet', 'hot');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE items ADD COLUMN IF NOT EXISTS environment item_environment NOT NULL DEFAULT 'generic';

-- 4. Set materials for objects
UPDATE objects SET material = 'paper' WHERE name IN ('Carta');
UPDATE objects SET material = 'glass' WHERE name IN ('Rellotge');
UPDATE objects SET material = 'metal' WHERE name IN ('Clau', 'Moneda', 'Anell', 'Cullera', 'Xapa');
UPDATE objects SET material = 'plastic' WHERE name IN ('Joguina', 'Pilota', 'Dau', 'Botó', 'Xiulet');
UPDATE objects SET material = 'fabric' WHERE name IN ('Sabatilla');

-- 5. Set environments for wet/hot items
UPDATE items SET environment = 'wet' WHERE name IN ('Pica', 'Banyera', 'Regadora');
UPDATE items SET environment = 'hot' WHERE name IN ('Forn', 'Barbacoa', 'Microones');

-- 6. Object specials table
CREATE TABLE IF NOT EXISTS object_specials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  special_type text NOT NULL, -- 'custom_message', 'custom_name', 'choose_variant'
  prompt_on text NOT NULL, -- 'hide' or 'find'
  prompt_text text NOT NULL,
  variants jsonb, -- for choose_variant: [{"value":"futbol","icon":"⚽"},...]
  UNIQUE(object_id)
);

ALTER TABLE object_specials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Specials readable" ON object_specials FOR SELECT TO authenticated USING (true);

-- 7. Insert special objects data
INSERT INTO object_specials (object_id, special_type, prompt_on, prompt_text, variants) VALUES
  ((SELECT id FROM objects WHERE name = 'Carta'), 'custom_message', 'hide', 'Escriu un missatge curt per al qui trobi la carta:', NULL),
  ((SELECT id FROM objects WHERE name = 'Joguina'), 'custom_name', 'find', 'Has trobat una joguina! Posa-li nom:', NULL),
  ((SELECT id FROM objects WHERE name = 'Anell'), 'custom_name', 'find', 'Has trobat un anell! Posa-li nom:', NULL),
  ((SELECT id FROM objects WHERE name = 'Pilota'), 'choose_variant', 'hide', 'Quin tipus de pilota amagues?', '[{"value":"futbol","icon":"⚽","label":"Futbol"},{"value":"basket","icon":"🏀","label":"Bàsquet"},{"value":"tennis","icon":"🎾","label":"Tennis"}]'::jsonb);

-- 8. Add special_data column to game_players for storing hide-time special data
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS special_data jsonb;

-- 9. Add special_data to player_inventory for trophies
ALTER TABLE player_inventory ADD COLUMN IF NOT EXISTS special_data jsonb;