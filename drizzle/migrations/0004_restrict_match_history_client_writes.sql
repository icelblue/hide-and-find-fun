REVOKE INSERT,UPDATE,DELETE ON public.player_match_results FROM authenticated,anon;
REVOKE SELECT ON public.player_match_results FROM anon;
GRANT SELECT ON public.player_match_results TO authenticated;
GRANT ALL ON public.player_match_results TO service_role;