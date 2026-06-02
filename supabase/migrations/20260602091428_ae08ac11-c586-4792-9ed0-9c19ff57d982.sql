CREATE OR REPLACE FUNCTION public.join_game_by_link(_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _game record;
  _player_count int;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id, status, created_by, invited_user_id, is_story
    INTO _game
  FROM public.games
  WHERE id = _game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game_not_found';
  END IF;

  IF _game.is_story THEN
    RAISE EXCEPTION 'cannot_join_story';
  END IF;

  -- Already a participant → just navigate
  IF EXISTS (SELECT 1 FROM public.game_players WHERE game_id = _game_id AND user_id = _user_id) THEN
    RETURN jsonb_build_object('joined', false, 'already_in', true, 'game_id', _game_id);
  END IF;

  IF _game.status NOT IN ('waiting') THEN
    RAISE EXCEPTION 'game_not_joinable';
  END IF;

  IF _game.invited_user_id IS NOT NULL AND _game.invited_user_id <> _user_id THEN
    RAISE EXCEPTION 'game_is_private';
  END IF;

  SELECT COUNT(*)::int INTO _player_count FROM public.game_players WHERE game_id = _game_id;
  IF _player_count >= 2 THEN
    RAISE EXCEPTION 'game_full';
  END IF;

  INSERT INTO public.game_players (game_id, user_id) VALUES (_game_id, _user_id);

  UPDATE public.games SET status = 'hiding' WHERE id = _game_id AND status = 'waiting';

  RETURN jsonb_build_object('joined', true, 'already_in', false, 'game_id', _game_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.join_game_by_link(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.join_game_by_link(uuid) FROM anon, public;