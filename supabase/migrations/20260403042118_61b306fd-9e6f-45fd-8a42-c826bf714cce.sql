
-- Add hidden flag to items
ALTER TABLE public.items ADD COLUMN hidden boolean NOT NULL DEFAULT false;

-- Add hidden items that get revealed by interactions
-- Habitació: hidden item revealed by opening Armari
INSERT INTO public.items (name, icon, scenario_id, display_order, inner_capacity, hidden)
SELECT 'Capsa de sabates', '📦', s.id, 20, 3, true
FROM scenarios s WHERE s.name = 'Habitació';

-- Menjador: hidden item revealed by turning on Llum  
INSERT INTO public.items (name, icon, scenario_id, display_order, inner_capacity, hidden)
SELECT 'Racó fosc', '🌑', s.id, 20, 2, true
FROM scenarios s WHERE s.name = 'Menjador';
