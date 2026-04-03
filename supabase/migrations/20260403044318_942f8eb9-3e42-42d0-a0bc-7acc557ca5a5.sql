-- Add tags array to items for tag-based interactions
ALTER TABLE public.items ADD COLUMN tags text[] NOT NULL DEFAULT '{}';

-- Add tools to game_players (persists only during game)
ALTER TABLE public.game_players ADD COLUMN tools jsonb NOT NULL DEFAULT '{"drap": 0, "tornavis": 0}';

-- Remove "Obrir l'armari" interaction
DELETE FROM public.item_interactions WHERE action_name = 'obrir';

-- Remove hidden "Capsa de sabates" item
DELETE FROM public.items WHERE name = 'Capsa de sabates' AND hidden = true;

-- Tag items as dirty or breakable (logical choices)
-- Dirty: items that make sense to be dirty
UPDATE public.items SET tags = ARRAY['dirty'] WHERE name IN ('Catifa', 'Cistella', 'Paperera', 'Rentadora');
-- Breakable: fragile items
UPDATE public.items SET tags = ARRAY['breakable'] WHERE name IN ('Vitrina', 'Llum', 'Quadre');
-- Both dirty AND breakable
UPDATE public.items SET tags = ARRAY['dirty', 'breakable'] WHERE name = 'Armari mirall';