
-- Track how many bonus tokens were added to each game
ALTER TABLE public.game_players ADD COLUMN bonus_tokens_added numeric NOT NULL DEFAULT 0;

-- Update game finish trigger to return unspent bonus tokens to profile
CREATE OR REPLACE FUNCTION public.handle_game_finished()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _reward_id UUID;
  _rarity item_rarity;
  _roll NUMERIC;
  _gp RECORD;
  _return_amount NUMERIC;
BEGIN
  IF NEW.status = 'finished' AND OLD.status = 'playing' AND NEW.winner_id IS NOT NULL THEN
    -- Update winner stats
    UPDATE profiles SET
      games_played = games_played + 1, games_won = games_won + 1,
      current_streak = current_streak + 1,
      best_streak = GREATEST(best_streak, current_streak + 1),
      elo = elo + 25
    WHERE user_id = NEW.winner_id;

    -- Update loser stats
    UPDATE profiles SET
      games_played = games_played + 1, current_streak = 0,
      elo = GREATEST(elo - 20, 100)
    WHERE user_id IN (
      SELECT user_id FROM game_players WHERE game_id = NEW.id AND user_id != NEW.winner_id
    );

    -- Update leagues
    UPDATE profiles SET league =
      CASE
        WHEN elo >= 1800 THEN 'diamond'::league_tier
        WHEN elo >= 1600 THEN 'platinum'::league_tier
        WHEN elo >= 1400 THEN 'gold'::league_tier
        WHEN elo >= 1200 THEN 'silver'::league_tier
        ELSE 'bronze'::league_tier
      END
    WHERE user_id IN (SELECT user_id FROM game_players WHERE game_id = NEW.id);

    -- Return unspent bonus tokens to each player's profile
    FOR _gp IN SELECT user_id, tokens_remaining, bonus_tokens_added FROM game_players WHERE game_id = NEW.id AND bonus_tokens_added > 0
    LOOP
      -- Return the lesser of: bonus added, or tokens still remaining
      _return_amount := LEAST(_gp.bonus_tokens_added, _gp.tokens_remaining);
      IF _return_amount > 0 THEN
        UPDATE profiles SET bonus_tokens = bonus_tokens + _return_amount WHERE user_id = _gp.user_id;
      END IF;
    END LOOP;

    -- Award random reward (weighted by rarity)
    _roll := random();
    _rarity := CASE
      WHEN _roll < 0.02 THEN 'legendary'::item_rarity
      WHEN _roll < 0.07 THEN 'epic'::item_rarity
      WHEN _roll < 0.20 THEN 'rare'::item_rarity
      WHEN _roll < 0.50 THEN 'uncommon'::item_rarity
      ELSE 'common'::item_rarity
    END;

    SELECT id INTO _reward_id FROM reward_items WHERE rarity = _rarity ORDER BY random() LIMIT 1;
    IF _reward_id IS NOT NULL THEN
      INSERT INTO player_rewards (user_id, reward_item_id, game_id) VALUES (NEW.winner_id, _reward_id, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
