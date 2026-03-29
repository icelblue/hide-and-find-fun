
-- Predefined traits for each object (2 per object)
CREATE TABLE public.object_traits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  trait_number smallint NOT NULL CHECK (trait_number IN (1, 2)),
  trait_text text NOT NULL,
  UNIQUE (object_id, trait_number)
);

ALTER TABLE public.object_traits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Traits readable" ON public.object_traits FOR SELECT TO authenticated
  USING (true);

-- Remove manual clue columns (no longer needed)
ALTER TABLE public.game_players DROP COLUMN IF EXISTS hidden_clue_1;
ALTER TABLE public.game_players DROP COLUMN IF EXISTS hidden_clue_2;
