-- Protect player_inventory from game deletion (trophies must survive)
ALTER TABLE public.player_inventory ALTER COLUMN game_id DROP NOT NULL;

ALTER TABLE public.player_inventory DROP CONSTRAINT player_inventory_game_id_fkey;
ALTER TABLE public.player_inventory ADD CONSTRAINT player_inventory_game_id_fkey 
  FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL;
