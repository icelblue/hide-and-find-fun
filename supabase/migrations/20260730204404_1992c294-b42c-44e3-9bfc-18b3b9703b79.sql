ALTER TABLE public.game_players DROP CONSTRAINT IF EXISTS game_players_hidden_item_id_fkey;
ALTER TABLE public.game_players DROP CONSTRAINT IF EXISTS game_players_hidden_object_id_fkey;
ALTER TABLE public.game_players DROP CONSTRAINT IF EXISTS game_players_current_scenario_id_fkey;
ALTER TABLE public.game_moves DROP CONSTRAINT IF EXISTS game_moves_target_item_id_fkey;
ALTER TABLE public.game_moves DROP CONSTRAINT IF EXISTS game_moves_target_scenario_id_fkey;