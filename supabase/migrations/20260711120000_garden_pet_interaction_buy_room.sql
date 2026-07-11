-- ============================================================
-- Jardí (plantar/collir), interacció amb mascota i compra
-- de sales validada al servidor.
-- ============================================================

-- =========================================================
-- 1. GARDEN_CATALOG: catàleg de llavors (font de veritat)
-- =========================================================
CREATE TABLE public.garden_catalog (
  id TEXT PRIMARY KEY,
  icon TEXT NOT NULL,
  seed_icon TEXT NOT NULL DEFAULT '🌱',
  name_key TEXT NOT NULL,
  growth_minutes INTEGER NOT NULL CHECK (growth_minutes > 0),
  yield_coins NUMERIC(3,1) NOT NULL CHECK (yield_coins > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.garden_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "garden_catalog is public" ON public.garden_catalog FOR SELECT USING (true);
GRANT SELECT ON public.garden_catalog TO anon, authenticated;
GRANT ALL ON public.garden_catalog TO service_role;

-- Equilibri: cicles curts donen menys; el jardí (60🪙) s'amortitza
-- en ~5-6 dies si es cuida (4 parcel·les × ~2-3🪙/dia).
INSERT INTO public.garden_catalog (id, icon, name_key, growth_minutes, yield_coins) VALUES
  ('pastanaga', '🥕', 'garden.carrot',      240,  1.0),   -- 4h  → 1🪙
  ('tomaquet',  '🍅', 'garden.tomato',      480,  2.0),   -- 8h  → 2🪙
  ('maduixa',   '🍓', 'garden.strawberry', 1440,  4.0);   -- 24h → 4🪙

-- =========================================================
-- 2. GARDEN_PLANTS: plantes en creixement
-- =========================================================
CREATE TABLE public.garden_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  room_id UUID NOT NULL REFERENCES public.player_rooms(id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot >= 0),
  plant_type TEXT NOT NULL REFERENCES public.garden_catalog(id) ON DELETE RESTRICT,
  planted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, slot)
);
CREATE INDEX idx_garden_plants_user ON public.garden_plants(user_id);
ALTER TABLE public.garden_plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own plants" ON public.garden_plants FOR SELECT USING (auth.uid() = user_id);
GRANT SELECT ON public.garden_plants TO authenticated;
GRANT ALL ON public.garden_plants TO service_role;
-- NOTA: no hi ha policy d'INSERT/UPDATE/DELETE per a authenticated:
-- tota mutació passa pels RPC (SECURITY DEFINER) de sota.

-- =========================================================
-- 3. RPC plant_seed: plantar una llavor
-- =========================================================
CREATE OR REPLACE FUNCTION public.plant_seed(_room_id UUID, _slot SMALLINT, _plant_type TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _room RECORD;
  _category TEXT;
  _plots INT;
  _plant_id UUID;
BEGIN
  SELECT pr.*, rc.category, rc.grid_w * rc.grid_h AS grid_size
    INTO _room
    FROM player_rooms pr JOIN room_catalog rc ON rc.id = pr.room_template_id
   WHERE pr.id = _room_id AND pr.user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'room_not_found'; END IF;
  IF _room.category NOT IN ('garden', 'balcony') THEN RAISE EXCEPTION 'not_a_garden'; END IF;
  IF _slot < 0 OR _slot >= _room.grid_size THEN RAISE EXCEPTION 'invalid_slot'; END IF;

  -- casella ocupada per un moble?
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(_room.layout) e
    WHERE (e->>'slot')::int = _slot
  ) THEN RAISE EXCEPTION 'slot_occupied'; END IF;

  -- màxim 4 parcel·les per sala
  SELECT count(*) INTO _plots FROM garden_plants WHERE room_id = _room_id;
  IF _plots >= 4 THEN RAISE EXCEPTION 'max_plots'; END IF;

  IF NOT EXISTS (SELECT 1 FROM garden_catalog WHERE id = _plant_type) THEN
    RAISE EXCEPTION 'unknown_plant';
  END IF;

  INSERT INTO garden_plants (user_id, room_id, slot, plant_type)
  VALUES (auth.uid(), _room_id, _slot, _plant_type)
  RETURNING id INTO _plant_id;

  RETURN jsonb_build_object('plant_id', _plant_id);
END $$;
REVOKE ALL ON FUNCTION public.plant_seed FROM public;
GRANT EXECUTE ON FUNCTION public.plant_seed TO authenticated;

-- =========================================================
-- 4. RPC harvest_plant: collir (validació de temps al servidor)
-- =========================================================
CREATE OR REPLACE FUNCTION public.harvest_plant(_plant_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _plant RECORD;
  _yield NUMERIC;
BEGIN
  SELECT gp.*, gc.growth_minutes, gc.yield_coins, gc.icon
    INTO _plant
    FROM garden_plants gp JOIN garden_catalog gc ON gc.id = gp.plant_type
   WHERE gp.id = _plant_id AND gp.user_id = auth.uid()
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'plant_not_found'; END IF;

  IF now() < _plant.planted_at + (_plant.growth_minutes || ' minutes')::interval THEN
    RAISE EXCEPTION 'not_grown_yet';
  END IF;

  _yield := _plant.yield_coins;
  UPDATE profiles SET bonus_tokens = bonus_tokens + _yield WHERE user_id = auth.uid();
  DELETE FROM garden_plants WHERE id = _plant_id;

  RETURN jsonb_build_object('yield', _yield, 'icon', _plant.icon);
END $$;
REVOKE ALL ON FUNCTION public.harvest_plant FROM public;
GRANT EXECUTE ON FUNCTION public.harvest_plant TO authenticated;

-- =========================================================
-- 5. Mascota: acariciar amb cooldown de 4h (+2 bond)
-- =========================================================
ALTER TABLE public.pet_state ADD COLUMN IF NOT EXISTS last_petted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.pet_the_pet()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _state RECORD;
  _new_bond INT;
BEGIN
  SELECT * INTO _state FROM pet_state WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO pet_state (user_id, last_petted_at, bond) VALUES (auth.uid(), now(), 42)
    RETURNING * INTO _state;
    RETURN jsonb_build_object('bond', _state.bond, 'petted', true);
  END IF;

  IF _state.last_petted_at IS NOT NULL AND now() < _state.last_petted_at + interval '4 hours' THEN
    RETURN jsonb_build_object(
      'bond', _state.bond, 'petted', false,
      'next_at', _state.last_petted_at + interval '4 hours'
    );
  END IF;

  _new_bond := LEAST(_state.bond + 2, 100);
  UPDATE pet_state SET bond = _new_bond, last_petted_at = now(), updated_at = now()
   WHERE user_id = auth.uid();
  RETURN jsonb_build_object('bond', _new_bond, 'petted', true);
END $$;
REVOKE ALL ON FUNCTION public.pet_the_pet FROM public;
GRANT EXECUTE ON FUNCTION public.pet_the_pet TO authenticated;

-- =========================================================
-- 6. SEGURETAT: compra de sales validada al servidor.
-- Abans el client restava monedes amb un UPDATE directe a
-- profiles.bonus_tokens (manipulable). Ara tot passa per RPC.
-- =========================================================
CREATE OR REPLACE FUNCTION public.buy_room(_template_id TEXT, _custom_name TEXT, _pos_x SMALLINT, _pos_y SMALLINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tpl RECORD;
  _coins NUMERIC;
  _room_id UUID;
BEGIN
  SELECT * INTO _tpl FROM room_catalog WHERE id = _template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_template'; END IF;

  SELECT bonus_tokens INTO _coins FROM profiles WHERE user_id = auth.uid() FOR UPDATE;
  IF _coins IS NULL OR _coins < _tpl.price_coins THEN RAISE EXCEPTION 'not_enough_coins'; END IF;

  -- el trigger enforce_max_rooms i la UNIQUE(user_id,pos) validen la resta
  INSERT INTO player_rooms (user_id, room_template_id, custom_name, position_x, position_y)
  VALUES (auth.uid(), _template_id, _custom_name, _pos_x, _pos_y)
  RETURNING id INTO _room_id;

  IF _tpl.price_coins > 0 THEN
    UPDATE profiles SET bonus_tokens = bonus_tokens - _tpl.price_coins WHERE user_id = auth.uid();
  END IF;

  RETURN jsonb_build_object('room_id', _room_id, 'coins_left', _coins - _tpl.price_coins);
END $$;
REVOKE ALL ON FUNCTION public.buy_room FROM public;
GRANT EXECUTE ON FUNCTION public.buy_room TO authenticated;

-- =========================================================
-- 7. EQUILIBRI: participació recompensada.
-- Guanyar només donava un ítem (venda mitjana ~1,9🪙) i les
-- sales costen 30-80🪙 (≈25-40 victòries). Ara: +2🪙 guanyador,
-- +0,5🪙 perdedor. Sala mitjana ≈ 12-20 partides + jardí.
-- =========================================================
CREATE OR REPLACE FUNCTION public.award_participation_coins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'finished' AND OLD.status = 'playing' AND NEW.winner_id IS NOT NULL THEN
    UPDATE profiles SET bonus_tokens = bonus_tokens + 2.0 WHERE user_id = NEW.winner_id;
    UPDATE profiles SET bonus_tokens = bonus_tokens + 0.5
     WHERE user_id IN (
       SELECT user_id FROM game_players WHERE game_id = NEW.id AND user_id != NEW.winner_id
     );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_award_participation_coins ON public.games;
CREATE TRIGGER trg_award_participation_coins
  AFTER UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.award_participation_coins();
