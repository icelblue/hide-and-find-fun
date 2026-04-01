-- New environments
ALTER TYPE public.item_environment ADD VALUE IF NOT EXISTS 'frozen';
ALTER TYPE public.item_environment ADD VALUE IF NOT EXISTS 'sorrenc';
ALTER TYPE public.item_environment ADD VALUE IF NOT EXISTS 'ventós';
ALTER TYPE public.item_environment ADD VALUE IF NOT EXISTS 'submergit';
ALTER TYPE public.item_environment ADD VALUE IF NOT EXISTS 'químic';

-- New materials
ALTER TYPE public.object_material ADD VALUE IF NOT EXISTS 'wood';
ALTER TYPE public.object_material ADD VALUE IF NOT EXISTS 'cardboard';
ALTER TYPE public.object_material ADD VALUE IF NOT EXISTS 'rubber';
ALTER TYPE public.object_material ADD VALUE IF NOT EXISTS 'ceramic';
ALTER TYPE public.object_material ADD VALUE IF NOT EXISTS 'electronic';
ALTER TYPE public.object_material ADD VALUE IF NOT EXISTS 'leather';
ALTER TYPE public.object_material ADD VALUE IF NOT EXISTS 'stone';