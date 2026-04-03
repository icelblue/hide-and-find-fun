
-- Add hint_level to game_moves for history display
ALTER TABLE public.game_moves ADD COLUMN hint_level smallint;

-- Add 'espia' to social_item_type enum
ALTER TYPE public.social_item_type ADD VALUE 'espia';
