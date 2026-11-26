DO $$
DECLARE _definition text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO _definition FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='guard_pvp_player_client_write';
 IF position('SELECT * INTO _game FROM public.games WHERE id=NEW.game_id FOR UPDATE;' IN _definition)=0 THEN RAISE EXCEPTION 'Unexpected guard structure'; END IF;
 EXECUTE replace(_definition,'SELECT * INTO _game FROM public.games WHERE id=NEW.game_id FOR UPDATE;','PERFORM pg_advisory_xact_lock(hashtext(NEW.game_id::text)); SELECT * INTO _game FROM public.games WHERE id=NEW.game_id;');
END;
$$;