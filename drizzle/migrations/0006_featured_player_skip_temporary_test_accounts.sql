CREATE OR REPLACE FUNCTION public.get_featured_player()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('user_id', r.user_id, 'display_name', p.display_name, 'elo', p.elo, 'league', p.league,
    'elo_change', r.elo_change, 'game_code', r.game_code, 'finished_at', r.finished_at, 'opponent_name', op.display_name)
  FROM player_match_results r
  JOIN profiles p ON p.user_id = r.user_id
  LEFT JOIN profiles op ON op.user_id = r.opponent_id
  WHERE r.result = 'win' AND r.elo_change IS NOT NULL AND auth.uid() IS NOT NULL
    AND coalesce(p.display_name, '') NOT LIKE 'agent-test+%'
  ORDER BY r.elo_change DESC, r.finished_at ASC LIMIT 1
$$;