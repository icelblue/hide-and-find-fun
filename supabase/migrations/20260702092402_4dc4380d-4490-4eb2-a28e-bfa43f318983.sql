ALTER TABLE public.furniture_catalog DROP CONSTRAINT IF EXISTS furniture_catalog_category_check;
ALTER TABLE public.furniture_catalog ADD CONSTRAINT furniture_catalog_category_check
  CHECK (category = ANY (ARRAY['bed','rug','plant','decor','chair','desk','tech','music','art']));

INSERT INTO public.furniture_catalog (id, name_key, icon, category, price_coins, unlock_level, happiness_bonus) VALUES
('chair_stool', 'furniture.chair_stool', '🪑', 'chair', 20, 2, 2),
('chair_gaming', 'furniture.chair_gaming', '🎮', 'chair', 90, 6, 4),
('desk_writing', 'furniture.desk_writing', '🗄️', 'desk', 25, 2, 2),
('desk_gaming', 'furniture.desk_gaming', '🖥️', 'desk', 110, 7, 5),
('tech_tv', 'furniture.tech_tv', '📺', 'tech', 60, 5, 3),
('tech_console', 'furniture.tech_console', '🕹️', 'tech', 130, 8, 5),
('music_guitar', 'furniture.music_guitar', '🎸', 'music', 70, 5, 3),
('art_sculpture', 'furniture.art_sculpture', '🗿', 'art', 200, 10, 6)
ON CONFLICT (id) DO NOTHING;