-- Allow player_rewards to survive game deletion
ALTER TABLE public.player_rewards ALTER COLUMN game_id DROP NOT NULL;

-- Replace FK constraint with ON DELETE SET NULL
ALTER TABLE public.player_rewards DROP CONSTRAINT player_rewards_game_id_fkey;
ALTER TABLE public.player_rewards ADD CONSTRAINT player_rewards_game_id_fkey 
  FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL;
