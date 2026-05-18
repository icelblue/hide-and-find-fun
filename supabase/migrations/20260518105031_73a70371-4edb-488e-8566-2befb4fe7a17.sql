-- 1. Add new enum value
ALTER TYPE position_type ADD VALUE IF NOT EXISTS 'darrere';

-- 2. New per-item capability column (default true)
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS can_behind boolean NOT NULL DEFAULT true;

-- 3. Logical defaults: items where "darrere" makes no sense
UPDATE public.items SET can_behind = false
WHERE name IN ('Catifa', 'Llum', 'Hamaca', 'Barana', 'Fanal', 'Pedra');