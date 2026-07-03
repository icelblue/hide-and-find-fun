
-- ============================================================
-- Bloc 1: Sales amb personalitat mecànica (grid variable,
-- categories permeses, bonus felicitat, portes per tipus).
-- ============================================================

ALTER TABLE public.room_catalog
  ADD COLUMN IF NOT EXISTS grid_w int NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS grid_h int NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS allowed_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS happiness_multiplier numeric(3,2) NOT NULL DEFAULT 1.00;

-- Valors definitius per tipus (peça tancada del puzle)
UPDATE public.room_catalog SET grid_w=4, grid_h=4, max_doors=2, allowed_categories='{}',                                  happiness_multiplier=1.00 WHERE id='bedroom';
UPDATE public.room_catalog SET grid_w=4, grid_h=2, max_doors=1, allowed_categories=ARRAY['nature','pet']::text[],          happiness_multiplier=1.30 WHERE id='balcony';
UPDATE public.room_catalog SET grid_w=5, grid_h=4, max_doors=3, allowed_categories=ARRAY['dining','music','decor']::text[], happiness_multiplier=1.20 WHERE id='dining';
UPDATE public.room_catalog SET grid_w=4, grid_h=4, max_doors=2, allowed_categories=ARRAY['kitchen','tech']::text[],        happiness_multiplier=1.50 WHERE id='kitchen';
UPDATE public.room_catalog SET grid_w=3, grid_h=3, max_doors=1, allowed_categories=ARRAY['bath']::text[],                  happiness_multiplier=1.30 WHERE id='bath';
UPDATE public.room_catalog SET grid_w=4, grid_h=3, max_doors=1, allowed_categories=ARRAY['tech','music']::text[],          happiness_multiplier=1.40 WHERE id='office';
UPDATE public.room_catalog SET grid_w=5, grid_h=4, max_doors=2, allowed_categories=ARRAY['nature','pet']::text[],          happiness_multiplier=1.30 WHERE id='garden';
UPDATE public.room_catalog SET grid_w=3, grid_h=3, max_doors=4, allowed_categories=ARRAY['decor']::text[],                 happiness_multiplier=1.10 WHERE id='hall';

-- ============================================================
-- RPC per moure una sala (validacions al backend: propietat + casella lliure)
-- ============================================================
CREATE OR REPLACE FUNCTION public.move_player_room(
  _room_id uuid,
  _new_x int,
  _new_y int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _new_x < 0 OR _new_x > 4 OR _new_y < 0 OR _new_y > 4 THEN
    RAISE EXCEPTION 'out_of_bounds';
  END IF;
  -- Ha de ser del jugador
  IF NOT EXISTS (SELECT 1 FROM public.player_rooms WHERE id=_room_id AND user_id=_uid) THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  -- Casella destí ha d'estar lliure (excepte si és la mateixa)
  IF EXISTS (
    SELECT 1 FROM public.player_rooms
    WHERE user_id=_uid AND position_x=_new_x AND position_y=_new_y AND id<>_room_id
  ) THEN
    RAISE EXCEPTION 'cell_taken';
  END IF;
  UPDATE public.player_rooms
    SET position_x=_new_x, position_y=_new_y, updated_at=now()
    WHERE id=_room_id AND user_id=_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_player_room(uuid,int,int) TO authenticated;
