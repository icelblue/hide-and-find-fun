
CREATE INDEX IF NOT EXISTS idx_games_status_invited ON public.games (status, invited_user_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_game ON public.game_players (user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_game_player ON public.game_moves (game_id, player_id);
CREATE INDEX IF NOT EXISTS idx_game_social_items_game_to ON public.game_social_items (game_id, to_player_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_user ON public.player_inventory (user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
