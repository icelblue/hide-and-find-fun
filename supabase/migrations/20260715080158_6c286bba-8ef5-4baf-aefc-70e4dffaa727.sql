
CREATE OR REPLACE FUNCTION public.create_personal_game(_opponent_id uuid)
 RETURNS TABLE(game_id uuid, code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _host_rooms int;
  _host_conns int;
  _host_furn  int;
  _new_id uuid; _new_code text;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _opponent_id = _user_id THEN RAISE EXCEPTION 'cannot_challenge_self'; END IF;

  SELECT COUNT(*) INTO _host_rooms FROM public.player_rooms WHERE user_id = _user_id;
  SELECT COUNT(*) INTO _host_conns FROM public.room_connections WHERE user_id = _user_id;
  SELECT COALESCE(SUM(jsonb_array_length(layout)), 0) INTO _host_furn FROM public.player_rooms WHERE user_id = _user_id;

  IF _host_rooms = 0 THEN RAISE EXCEPTION 'host_no_space'; END IF;
  IF _host_rooms < 2 OR _host_conns < 1 THEN RAISE EXCEPTION 'host_min_rooms'; END IF;
  IF _host_furn < 4 THEN RAISE EXCEPTION 'host_min_furniture'; END IF;

  _new_code := upper(substring(md5(random()::text || clock_timestamp()::text) for 6));

  INSERT INTO public.games (code, created_by, invited_user_id, status, game_mode)
  VALUES (_new_code, _user_id, _opponent_id, 'waiting', 'personal_pvp')
  RETURNING id INTO _new_id;

  -- FIX: afegir l'amfitrió a game_players (si no, GamePage es queda carregant infinit)
  INSERT INTO public.game_players (game_id, user_id)
  VALUES (_new_id, _user_id)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT _new_id, _new_code;
END;
$function$;

-- Repara partides personals antigues que van quedar sense fila d'amfitrió
INSERT INTO public.game_players (game_id, user_id)
SELECT g.id, g.created_by
FROM public.games g
WHERE g.game_mode = 'personal_pvp'
  AND NOT EXISTS (
    SELECT 1 FROM public.game_players gp
    WHERE gp.game_id = g.id AND gp.user_id = g.created_by
  )
ON CONFLICT DO NOTHING;
