ALTER TABLE public.game_players 
ALTER COLUMN tools SET DEFAULT '{"drap": 0, "tornavis": 1, "martell": 0, "llanterna": 0}'::jsonb;