
-- =========================================================
-- room_catalog: plantilles de sales
-- =========================================================
CREATE TABLE public.room_catalog (
  id TEXT PRIMARY KEY,
  name_key TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bedroom','kitchen','dining','bath','garden','balcony','office','hall')),
  icon TEXT NOT NULL,
  price_coins INTEGER NOT NULL DEFAULT 50 CHECK (price_coins >= 0),
  unlock_level INTEGER NOT NULL DEFAULT 1 CHECK (unlock_level >= 1),
  max_doors SMALLINT NOT NULL DEFAULT 2 CHECK (max_doors BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.room_catalog TO anon, authenticated;
GRANT ALL ON public.room_catalog TO service_role;

ALTER TABLE public.room_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room_catalog is public"
  ON public.room_catalog FOR SELECT USING (true);

INSERT INTO public.room_catalog (id, name_key, category, icon, price_coins, unlock_level) VALUES
  ('bedroom',  'room.bedroom',  'bedroom',  '🛏️', 0,   1),
  ('dining',   'room.dining',   'dining',   '🍽️', 50,  2),
  ('balcony',  'room.balcony',  'balcony',  '🌇', 40,  2),
  ('office',   'room.office',   'office',   '💼', 40,  3),
  ('kitchen',  'room.kitchen',  'kitchen',  '🍳', 80,  3),
  ('bath',     'room.bath',     'bath',     '🛁', 80,  4),
  ('garden',   'room.garden',   'garden',   '🌳', 60,  4),
  ('hall',     'room.hall',     'hall',     '🚪', 30,  1);

-- =========================================================
-- player_rooms: instàncies de sala
-- =========================================================
CREATE TABLE public.player_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  room_template_id TEXT NOT NULL REFERENCES public.room_catalog(id) ON DELETE RESTRICT,
  custom_name TEXT NOT NULL,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  position_x SMALLINT NOT NULL DEFAULT 0 CHECK (position_x BETWEEN 0 AND 4),
  position_y SMALLINT NOT NULL DEFAULT 0 CHECK (position_y BETWEEN 0 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, position_x, position_y)
);
CREATE INDEX idx_player_rooms_user ON public.player_rooms(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_rooms TO authenticated;
GRANT SELECT ON public.player_rooms TO anon;
GRANT ALL ON public.player_rooms TO service_role;

ALTER TABLE public.player_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own rooms" ON public.player_rooms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "read rooms of personal-pvp opponents" ON public.player_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.game_players gp ON gp.game_id = g.id
      WHERE g.game_mode = 'personal_pvp'
        AND gp.user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.game_players gp2
          WHERE gp2.game_id = g.id AND gp2.user_id = player_rooms.user_id
        )
    )
  );
CREATE POLICY "insert own rooms" ON public.player_rooms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own rooms" ON public.player_rooms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own rooms" ON public.player_rooms FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_player_rooms_updated
  BEFORE UPDATE ON public.player_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Límit dur: 8 sales per jugador
CREATE OR REPLACE FUNCTION public.enforce_max_rooms()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _n int;
BEGIN
  SELECT COUNT(*) INTO _n FROM public.player_rooms WHERE user_id = NEW.user_id;
  IF _n >= 8 THEN RAISE EXCEPTION 'max_rooms_reached'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_player_rooms_max
  BEFORE INSERT ON public.player_rooms
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_rooms();

-- =========================================================
-- room_connections: portes
-- =========================================================
CREATE TABLE public.room_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  room_a_id UUID NOT NULL REFERENCES public.player_rooms(id) ON DELETE CASCADE,
  room_b_id UUID NOT NULL REFERENCES public.player_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (room_a_id <> room_b_id)
);
-- Uniqueness independent de l'ordre A/B
CREATE UNIQUE INDEX ux_room_conn_pair
  ON public.room_connections (user_id, LEAST(room_a_id, room_b_id), GREATEST(room_a_id, room_b_id));
CREATE INDEX idx_room_connections_user ON public.room_connections(user_id);

GRANT SELECT, INSERT, DELETE ON public.room_connections TO authenticated;
GRANT SELECT ON public.room_connections TO anon;
GRANT ALL ON public.room_connections TO service_role;

ALTER TABLE public.room_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own connections" ON public.room_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "read connections of personal-pvp opponents" ON public.room_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.game_players gp ON gp.game_id = g.id
      WHERE g.game_mode = 'personal_pvp'
        AND gp.user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.game_players gp2
          WHERE gp2.game_id = g.id AND gp2.user_id = room_connections.user_id
        )
    )
  );
CREATE POLICY "insert own connections" ON public.room_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own connections" ON public.room_connections FOR DELETE USING (auth.uid() = user_id);

-- Trigger: max_doors per sala i evitar duplicats/mateix nucli
CREATE OR REPLACE FUNCTION public.enforce_room_doors()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _max_a smallint; _max_b smallint;
  _cur_a int; _cur_b int;
  _owner_a uuid; _owner_b uuid;
BEGIN
  -- Les dues sales han de ser del mateix propietari (l'usuari)
  SELECT user_id INTO _owner_a FROM public.player_rooms WHERE id = NEW.room_a_id;
  SELECT user_id INTO _owner_b FROM public.player_rooms WHERE id = NEW.room_b_id;
  IF _owner_a IS DISTINCT FROM NEW.user_id OR _owner_b IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'room_owner_mismatch';
  END IF;

  SELECT max_doors INTO _max_a FROM public.room_catalog rc JOIN public.player_rooms pr ON pr.room_template_id = rc.id WHERE pr.id = NEW.room_a_id;
  SELECT max_doors INTO _max_b FROM public.room_catalog rc JOIN public.player_rooms pr ON pr.room_template_id = rc.id WHERE pr.id = NEW.room_b_id;

  SELECT COUNT(*) INTO _cur_a FROM public.room_connections
    WHERE user_id = NEW.user_id AND (room_a_id = NEW.room_a_id OR room_b_id = NEW.room_a_id);
  SELECT COUNT(*) INTO _cur_b FROM public.room_connections
    WHERE user_id = NEW.user_id AND (room_a_id = NEW.room_b_id OR room_b_id = NEW.room_b_id);

  IF _cur_a >= _max_a THEN RAISE EXCEPTION 'max_doors_room_a'; END IF;
  IF _cur_b >= _max_b THEN RAISE EXCEPTION 'max_doors_room_b'; END IF;

  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_room_connections_enforce
  BEFORE INSERT ON public.room_connections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_room_doors();

-- =========================================================
-- Migració retrocompat: player_spaces → player_rooms
-- =========================================================
DO $$
DECLARE _row record; _new_id uuid; _slot record;
BEGIN
  FOR _row IN SELECT user_id, layout FROM public.player_spaces WHERE layout IS NOT NULL AND jsonb_typeof(layout) = 'array' AND jsonb_array_length(layout) > 0 LOOP
    -- Evitar duplicats si es reexecuta
    IF EXISTS(SELECT 1 FROM public.player_rooms WHERE user_id = _row.user_id) THEN CONTINUE; END IF;
    INSERT INTO public.player_rooms (user_id, room_template_id, custom_name, layout, position_x, position_y)
    VALUES (_row.user_id, 'bedroom', 'Habitació', _row.layout, 0, 0)
    RETURNING id INTO _new_id;
  END LOOP;
END $$;

-- =========================================================
-- create_personal_game v2: comprova model multi-sala
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_personal_game(_opponent_id uuid)
 RETURNS TABLE(game_id uuid, code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _host_rooms int; _opp_rooms int;
  _host_conns int; _opp_conns int;
  _host_furn  int; _opp_furn  int;
  _new_id uuid; _new_code text;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _opponent_id = _user_id THEN RAISE EXCEPTION 'cannot_challenge_self'; END IF;

  SELECT COUNT(*) INTO _host_rooms FROM public.player_rooms WHERE user_id = _user_id;
  SELECT COUNT(*) INTO _opp_rooms  FROM public.player_rooms WHERE user_id = _opponent_id;
  SELECT COUNT(*) INTO _host_conns FROM public.room_connections WHERE user_id = _user_id;
  SELECT COUNT(*) INTO _opp_conns  FROM public.room_connections WHERE user_id = _opponent_id;

  SELECT COALESCE(SUM(jsonb_array_length(layout)), 0) INTO _host_furn FROM public.player_rooms WHERE user_id = _user_id;
  SELECT COALESCE(SUM(jsonb_array_length(layout)), 0) INTO _opp_furn  FROM public.player_rooms WHERE user_id = _opponent_id;

  IF _host_rooms = 0 THEN RAISE EXCEPTION 'host_no_space'; END IF;
  IF _opp_rooms  = 0 THEN RAISE EXCEPTION 'opponent_no_space'; END IF;

  IF _host_rooms < 2 OR _host_conns < 1 THEN RAISE EXCEPTION 'host_min_rooms'; END IF;
  IF _opp_rooms  < 2 OR _opp_conns  < 1 THEN RAISE EXCEPTION 'opponent_min_rooms'; END IF;

  IF _host_furn < 4 THEN RAISE EXCEPTION 'host_min_furniture'; END IF;
  IF _opp_furn  < 4 THEN RAISE EXCEPTION 'opponent_min_furniture'; END IF;

  _new_code := upper(substring(md5(random()::text || clock_timestamp()::text) for 6));

  INSERT INTO public.games (code, created_by, invited_user_id, status, game_mode)
  VALUES (_new_code, _user_id, _opponent_id, 'waiting', 'personal_pvp')
  RETURNING id INTO _new_id;

  RETURN QUERY SELECT _new_id, _new_code;
END;
$function$;
