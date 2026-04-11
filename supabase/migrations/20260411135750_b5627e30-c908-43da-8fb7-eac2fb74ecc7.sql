-- Clean up any remaining duplicates across all games first
DELETE FROM player_inventory a
USING player_inventory b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.game_id = b.game_id
  AND a.item_type = b.item_type
  AND a.item_type = 'special_trophy';

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX idx_unique_trophy_per_game 
ON player_inventory (user_id, game_id, item_type) 
WHERE item_type = 'special_trophy' AND game_id IS NOT NULL;