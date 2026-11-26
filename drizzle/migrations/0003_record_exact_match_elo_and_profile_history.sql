CREATE TABLE public.player_match_results (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 game_id uuid NOT NULL,
 game_code text NOT NULL,
 user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
 opponent_id uuid,
 result text NOT NULL CHECK (result IN ('win','loss','draw')),
 elo_before integer NOT NULL,
 elo_after integer NOT NULL,
 elo_change integer GENERATED ALWAYS AS (elo_after - elo_before) STORED,
 finished_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(game_id,user_id)
);
GRANT SELECT ON public.player_match_results TO authenticated;
GRANT ALL ON public.player_match_results TO service_role;
ALTER TABLE public.player_match_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated players can view completed match summaries" ON public.player_match_results FOR SELECT TO authenticated USING (true);
CREATE INDEX player_match_results_user_finished_idx ON public.player_match_results(user_id,finished_at DESC);

CREATE OR REPLACE FUNCTION public.handle_game_finished()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
 _reward_id UUID;
 _rarity item_rarity;
 _roll NUMERIC;
 _gp RECORD;
 _return_amount NUMERIC;
 _elo_before jsonb;
BEGIN
 IF NEW.status <> 'finished' OR OLD.status <> 'playing' THEN RETURN NEW; END IF;
 -- Lock all participant ratings in a stable order before taking the snapshot.
 PERFORM 1 FROM public.profiles p WHERE p.user_id IN (SELECT user_id FROM public.game_players WHERE game_id=NEW.id) ORDER BY p.user_id FOR UPDATE;
 SELECT jsonb_object_agg(p.user_id::text,p.elo) INTO _elo_before FROM public.profiles p JOIN public.game_players gp ON gp.user_id=p.user_id WHERE gp.game_id=NEW.id;
 IF NEW.status = 'finished' AND OLD.status = 'playing' AND NEW.winner_id IS NOT NULL THEN
  UPDATE profiles SET games_played=games_played+1,games_won=games_won+1,current_streak=current_streak+1,best_streak=GREATEST(best_streak,current_streak+1),elo=elo+25 WHERE user_id=NEW.winner_id;
  UPDATE profiles SET games_played=games_played+1,current_streak=0,elo=GREATEST(elo-20,100) WHERE user_id IN (SELECT user_id FROM game_players WHERE game_id=NEW.id AND user_id!=NEW.winner_id);
  UPDATE profiles SET league=CASE WHEN elo>=1800 THEN 'diamond'::league_tier WHEN elo>=1600 THEN 'platinum'::league_tier WHEN elo>=1400 THEN 'gold'::league_tier WHEN elo>=1200 THEN 'silver'::league_tier ELSE 'bronze'::league_tier END WHERE user_id IN (SELECT user_id FROM game_players WHERE game_id=NEW.id);
  FOR _gp IN SELECT user_id,tokens_remaining,bonus_tokens_added FROM game_players WHERE game_id=NEW.id AND bonus_tokens_added>0 LOOP
   _return_amount:=LEAST(_gp.bonus_tokens_added,_gp.tokens_remaining);
   IF _return_amount>0 THEN UPDATE profiles SET bonus_tokens=bonus_tokens+_return_amount WHERE user_id=_gp.user_id; END IF;
  END LOOP;
  _roll:=random();
  _rarity:=CASE WHEN _roll<0.02 THEN 'legendary'::item_rarity WHEN _roll<0.07 THEN 'epic'::item_rarity WHEN _roll<0.20 THEN 'rare'::item_rarity WHEN _roll<0.50 THEN 'uncommon'::item_rarity ELSE 'common'::item_rarity END;
  SELECT id INTO _reward_id FROM reward_items WHERE rarity=_rarity ORDER BY random() LIMIT 1;
  IF _reward_id IS NOT NULL THEN INSERT INTO player_rewards(user_id,reward_item_id,game_id) VALUES(NEW.winner_id,_reward_id,NEW.id); END IF;
 END IF;
 -- Archive actual changes, including zero-change draws, without backfilling guesses.
 IF NOT COALESCE(NEW.is_story,false) THEN
  INSERT INTO public.player_match_results(game_id,game_code,user_id,opponent_id,result,elo_before,elo_after,finished_at)
  SELECT NEW.id,NEW.code,p.user_id,
   (SELECT other.user_id FROM public.game_players other WHERE other.game_id=NEW.id AND other.user_id<>p.user_id ORDER BY other.user_id LIMIT 1),
   CASE WHEN NEW.winner_id IS NULL THEN 'draw' WHEN NEW.winner_id=p.user_id THEN 'win' ELSE 'loss' END,
   (_elo_before->>p.user_id::text)::integer,p.elo,now()
  FROM public.profiles p JOIN public.game_players gp ON gp.user_id=p.user_id WHERE gp.game_id=NEW.id
  ON CONFLICT(game_id,user_id) DO NOTHING;
 END IF;
 RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_player_match_history(_user_id uuid,_since timestamptz DEFAULT NULL,_limit integer DEFAULT 20,_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 WITH all_matches AS (
  SELECT r.game_id,r.game_code,r.opponent_id,r.result,r.elo_before,r.elo_after,r.elo_change,r.finished_at,(g.id IS NOT NULL) AS game_exists
  FROM public.player_match_results r LEFT JOIN public.games g ON g.id=r.game_id WHERE r.user_id=_user_id
  UNION ALL
  SELECT g.id,g.code,
   (SELECT other.user_id FROM public.game_players other WHERE other.game_id=g.id AND other.user_id<>_user_id ORDER BY other.user_id LIMIT 1),
   CASE WHEN g.winner_id IS NULL THEN 'draw' WHEN g.winner_id=_user_id THEN 'win' ELSE 'loss' END,
   NULL::integer,NULL::integer,NULL::integer,g.updated_at,true
  FROM public.games g JOIN public.game_players gp ON gp.game_id=g.id AND gp.user_id=_user_id
  WHERE g.status='finished' AND NOT COALESCE(g.is_story,false)
   AND NOT EXISTS(SELECT 1 FROM public.player_match_results r WHERE r.game_id=g.id AND r.user_id=_user_id)
 ), filtered AS (SELECT * FROM all_matches WHERE _since IS NULL OR finished_at>=_since),
 page AS (SELECT f.*,COALESCE(p.display_name,'Anònim') AS opponent_name FROM filtered f LEFT JOIN public.profiles p ON p.user_id=f.opponent_id ORDER BY f.finished_at DESC,f.game_id DESC LIMIT LEAST(GREATEST(COALESCE(_limit,20),1),50) OFFSET GREATEST(COALESCE(_offset,0),0))
 SELECT jsonb_build_object(
  'matches',COALESCE((SELECT jsonb_agg(to_jsonb(page) ORDER BY finished_at DESC,game_id DESC) FROM page),'[]'::jsonb),
  'total',(SELECT count(*) FROM filtered),
  'elo_gained',COALESCE((SELECT sum(elo_change) FROM filtered WHERE elo_change>0),0),
  'elo_lost',COALESCE((SELECT sum(elo_change) FROM filtered WHERE elo_change<0),0),
  'elo_net',COALESCE((SELECT sum(elo_change) FROM filtered),0),
  'recorded_matches',(SELECT count(*) FROM filtered WHERE elo_change IS NOT NULL),
  'legacy_matches',(SELECT count(*) FROM filtered WHERE elo_change IS NULL)
 ) INTO _result;
 RETURN _result;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_player_match_history(uuid,timestamptz,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_player_match_history(uuid,timestamptz,integer,integer) TO authenticated,service_role;