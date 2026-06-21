
-- Catalog of available furniture
CREATE TABLE public.furniture_catalog (
  id text PRIMARY KEY,
  name_key text NOT NULL,
  category text NOT NULL CHECK (category IN ('bed','rug','plant','decor')),
  icon text NOT NULL,
  price_coins integer NOT NULL DEFAULT 0,
  unlock_level integer NOT NULL DEFAULT 1,
  happiness_bonus integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.furniture_catalog TO anon, authenticated;
GRANT ALL ON public.furniture_catalog TO service_role;
ALTER TABLE public.furniture_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "furniture_catalog_public_read" ON public.furniture_catalog FOR SELECT USING (true);

-- Furniture owned by each player
CREATE TABLE public.player_furniture (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  furniture_id text NOT NULL REFERENCES public.furniture_catalog(id) ON DELETE CASCADE,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, furniture_id)
);
GRANT SELECT, INSERT, DELETE ON public.player_furniture TO authenticated;
GRANT ALL ON public.player_furniture TO service_role;
ALTER TABLE public.player_furniture ENABLE ROW LEVEL SECURITY;
CREATE POLICY "player_furniture_owner_select" ON public.player_furniture FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "player_furniture_owner_insert" ON public.player_furniture FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "player_furniture_owner_delete" ON public.player_furniture FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Player's room layout (4x4 grid)
CREATE TABLE public.player_spaces (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.player_spaces TO authenticated;
GRANT ALL ON public.player_spaces TO service_role;
ALTER TABLE public.player_spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "player_spaces_owner_select" ON public.player_spaces FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "player_spaces_owner_insert" ON public.player_spaces FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "player_spaces_owner_update" ON public.player_spaces FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_player_spaces_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_player_spaces_updated_at
BEFORE UPDATE ON public.player_spaces
FOR EACH ROW EXECUTE FUNCTION public.touch_player_spaces_updated_at();

-- Seed initial catalog
INSERT INTO public.furniture_catalog (id, name_key, category, icon, price_coins, unlock_level, happiness_bonus) VALUES
  ('bed_basic','furniture.bed_basic','bed','🛏️',10,1,1),
  ('bed_cozy','furniture.bed_cozy','bed','🛌',40,3,3),
  ('bed_royal','furniture.bed_royal','bed','👑',150,8,5),
  ('rug_simple','furniture.rug_simple','rug','🟫',5,1,1),
  ('rug_persian','furniture.rug_persian','rug','🧶',30,3,2),
  ('rug_magic','furniture.rug_magic','rug','✨',120,8,4),
  ('plant_small','furniture.plant_small','plant','🪴',8,1,1),
  ('plant_tree','furniture.plant_tree','plant','🌳',35,4,2),
  ('plant_bonsai','furniture.plant_bonsai','plant','🎋',100,7,4),
  ('decor_lamp','furniture.decor_lamp','decor','💡',12,2,1),
  ('decor_painting','furniture.decor_painting','decor','🖼️',45,4,2),
  ('decor_crystal','furniture.decor_crystal','decor','💎',180,9,5);
