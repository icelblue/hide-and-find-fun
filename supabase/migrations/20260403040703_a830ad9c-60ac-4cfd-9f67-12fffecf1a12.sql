
-- Add max_items to scenarios
ALTER TABLE public.scenarios ADD COLUMN max_items smallint NOT NULL DEFAULT 20;

-- Create item_interactions table
CREATE TABLE public.item_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  action_name text NOT NULL,
  action_icon text NOT NULL DEFAULT '⚡',
  action_label text NOT NULL,
  cost numeric NOT NULL DEFAULT 0.2,
  effect_type text NOT NULL,
  effect_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  requires jsonb DEFAULT NULL,
  one_time boolean NOT NULL DEFAULT true,
  display_order smallint NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.item_interactions ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users
CREATE POLICY "Interactions readable"
  ON public.item_interactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Add constraint for effect_type values
ALTER TABLE public.item_interactions
  ADD CONSTRAINT valid_effect_type
  CHECK (effect_type IN ('reveal_items', 'enable_position', 'give_hint', 'reveal_content'));

-- Update max_items per scenario based on size
UPDATE public.scenarios SET max_items = 15 WHERE name IN ('Cuina', 'Jardí', 'Habitació', 'Menjador', 'Despatx');
UPDATE public.scenarios SET max_items = 12 WHERE name IN ('Balcó', 'Lavabo');
