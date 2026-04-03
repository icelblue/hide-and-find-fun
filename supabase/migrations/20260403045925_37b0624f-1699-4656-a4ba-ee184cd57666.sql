-- Update default tools to include llanterna
ALTER TABLE public.game_players ALTER COLUMN tools SET DEFAULT '{"drap": 0, "tornavis": 0, "martell": 0, "llanterna": 0}'::jsonb;