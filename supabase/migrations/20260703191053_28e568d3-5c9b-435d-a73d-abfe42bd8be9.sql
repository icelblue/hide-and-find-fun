
-- Expand categories to allow 'nature' and 'pet'
ALTER TABLE public.furniture_catalog DROP CONSTRAINT IF EXISTS furniture_catalog_category_check;
ALTER TABLE public.furniture_catalog ADD CONSTRAINT furniture_catalog_category_check
  CHECK (category = ANY (ARRAY['bed','rug','plant','decor','chair','desk','tech','music','art','nature','pet']));

-- Reduce existing prices ~40%
UPDATE public.furniture_catalog SET price_coins = GREATEST(3, (price_coins * 0.6)::int);

-- Add 12 new items (INSERT ... ON CONFLICT DO NOTHING for idempotency)
INSERT INTO public.furniture_catalog (id, name_key, category, icon, price_coins, unlock_level, happiness_bonus) VALUES
  ('nature_flowers',   'furniture.nature_flowers',   'nature', '🌸', 4,   1, 1),
  ('nature_cactus',    'furniture.nature_cactus',    'nature', '🌵', 7,   2, 1),
  ('nature_mushroom',  'furniture.nature_mushroom',  'nature', '🍄', 10,  3, 2),
  ('pet_bone',         'furniture.pet_bone',         'pet',    '🦴', 5,   1, 1),
  ('pet_ball',         'furniture.pet_ball',         'pet',    '🎾', 6,   1, 1),
  ('pet_fishtank',     'furniture.pet_fishtank',     'pet',    '🐟', 25,  4, 3),
  ('tech_laptop',      'furniture.tech_laptop',      'tech',   '💻', 35,  5, 3),
  ('tech_headphones',  'furniture.tech_headphones',  'tech',   '🎧', 18,  3, 2),
  ('music_piano',      'furniture.music_piano',      'music',  '🎹', 55,  6, 4),
  ('music_drums',      'furniture.music_drums',      'music',  '🥁', 40,  5, 3),
  ('decor_mirror',     'furniture.decor_mirror',     'decor',  '🪞', 12,  2, 2),
  ('decor_candles',    'furniture.decor_candles',    'decor',  '🕯️', 5,   1, 1)
ON CONFLICT (id) DO NOTHING;
