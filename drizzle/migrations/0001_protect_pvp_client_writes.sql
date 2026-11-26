CREATE OR REPLACE FUNCTION public.guard_pvp_player_client_write()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE _game public.games%ROWTYPE; _count integer;
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not your player'; END IF;
  IF TG_OP='INSERT' THEN
    SELECT * INTO _game FROM public.games WHERE id=NEW.game_id FOR UPDATE;
    IF NOT FOUND OR _game.status <> 'waiting' THEN RAISE EXCEPTION 'Game is not waiting'; END IF;
    IF _game.invited_user_id IS NOT NULL AND auth.uid() NOT IN (_game.created_by,_game.invited_user_id) THEN RAISE EXCEPTION 'Private game'; END IF;
    _count := public.count_game_players(NEW.game_id);
    IF _count >= 2 THEN RAISE EXCEPTION 'Game is full'; END IF;
    NEW.tokens_remaining := 5.0;
    NEW.tokens_last_reset := CURRENT_DATE;
    NEW.has_hidden := false;
    NEW.hidden_item_id := NULL; NEW.hidden_object_id := NULL; NEW.hidden_position := NULL;
    NEW.current_scenario_id := NULL;
    NEW.tools := '{"drap":0,"tornavis":1,"martell":0,"llanterna":1,"galleda":0,"drap_mullat":0}'::jsonb;
    NEW.special_data := NULL;
    NEW.shield_active := false; NEW.social_item_used_today := false;
    RETURN NEW;
  END IF;
  IF NEW.game_id IS DISTINCT FROM OLD.game_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Player identity is immutable'; END IF;
  IF NEW.tokens_remaining IS DISTINCT FROM OLD.tokens_remaining OR NEW.tokens_last_reset IS DISTINCT FROM OLD.tokens_last_reset THEN
    IF NOT ((OLD.tokens_last_reset IS NULL OR OLD.tokens_last_reset < CURRENT_DATE) AND NEW.tokens_last_reset = CURRENT_DATE AND NEW.tokens_remaining = 5.0) THEN
      RAISE EXCEPTION 'Tokens can only be changed by game actions';
    END IF;
  END IF;
  IF NEW.tools IS DISTINCT FROM OLD.tools THEN RAISE EXCEPTION 'Tools can only be changed by game actions'; END IF;
  IF OLD.has_hidden AND (NEW.has_hidden IS DISTINCT FROM OLD.has_hidden OR NEW.hidden_item_id IS DISTINCT FROM OLD.hidden_item_id OR NEW.hidden_object_id IS DISTINCT FROM OLD.hidden_object_id OR NEW.hidden_position IS DISTINCT FROM OLD.hidden_position OR NEW.special_data IS DISTINCT FROM OLD.special_data) THEN
    RAISE EXCEPTION 'Confirmed hiding data is immutable';
  END IF;
  IF NOT OLD.has_hidden AND NEW.special_data IS DISTINCT FROM OLD.special_data AND COALESCE(NEW.special_data,'{}'::jsonb) ?| ARRAY['scenario_specials','barricada_today','trampa_today'] THEN RAISE EXCEPTION 'Reserved game metadata'; END IF;
  IF NEW.current_scenario_id IS DISTINCT FROM OLD.current_scenario_id AND OLD.current_scenario_id IS NOT NULL THEN RAISE EXCEPTION 'Use a move action'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_pvp_player_client_write_trigger BEFORE INSERT OR UPDATE ON public.game_players FOR EACH ROW EXECUTE FUNCTION public.guard_pvp_player_client_write();

CREATE OR REPLACE FUNCTION public.guard_pvp_game_client_write()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.created_by IS DISTINCT FROM auth.uid() OR NEW.status <> 'waiting' OR NEW.winner_id IS NOT NULL OR COALESCE(NEW.is_story,false) THEN RAISE EXCEPTION 'Invalid new game'; END IF;
    NEW.created_at := now();
    RETURN NEW;
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.code IS DISTINCT FROM OLD.code OR NEW.invited_user_id IS DISTINCT FROM OLD.invited_user_id OR NEW.game_mode IS DISTINCT FROM OLD.game_mode OR NEW.is_story IS DISTINCT FROM OLD.is_story OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.winner_id IS DISTINCT FROM OLD.winner_id THEN RAISE EXCEPTION 'Game settings and results are server managed'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status='waiting' AND NEW.status='hiding' AND public.count_game_players(NEW.id)=2) THEN RAISE EXCEPTION 'Use a game action to change phase'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_pvp_game_client_write_trigger BEFORE INSERT OR UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.guard_pvp_game_client_write();