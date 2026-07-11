REVOKE ALL ON FUNCTION public.finish_game_setup(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_game_setup(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.maybe_start_game_after_hide() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maybe_start_game_after_hide() TO service_role;

REVOKE ALL ON FUNCTION public.start_game_setup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_game_setup(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_game_setup(uuid) TO service_role;