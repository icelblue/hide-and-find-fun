
CREATE OR REPLACE FUNCTION public.count_game_players(_game_id uuid)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::int FROM game_players WHERE game_id = _game_id;
$$;
