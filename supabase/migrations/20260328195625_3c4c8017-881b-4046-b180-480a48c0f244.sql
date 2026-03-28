
-- 1. Add bonus_tokens to profiles (for selling rewards)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_tokens NUMERIC NOT NULL DEFAULT 0;

-- 2. Rarity enum
CREATE TYPE public.item_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- 3. Reward items catalog (closed list of furniture prizes)
CREATE TABLE public.reward_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  rarity item_rarity NOT NULL,
  sell_value NUMERIC NOT NULL DEFAULT 1,
  placed_in_scenario_id UUID REFERENCES public.scenarios(id),
  placed_by UUID,
  placed_at TIMESTAMPTZ
);

ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reward items readable" ON public.reward_items FOR SELECT TO authenticated USING (true);

-- 4. Player rewards (who owns what)
CREATE TABLE public.player_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_item_id UUID NOT NULL REFERENCES public.reward_items(id),
  game_id UUID NOT NULL REFERENCES public.games(id),
  obtained_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'owned'
);

ALTER TABLE public.player_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own rewards" ON public.player_rewards FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Update own rewards" ON public.player_rewards FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_player_rewards_user ON public.player_rewards(user_id);

-- 5. Seed catalog
INSERT INTO public.reward_items (name, icon, rarity, sell_value) VALUES
-- Common (sell: 1 token)
('Cubell', '🪣', 'common', 1),
('Calces', '🧦', 'common', 1),
('Caixa de cartró', '📦', 'common', 1),
('Escombra', '🧹', 'common', 1),
('Raspall', '🪥', 'common', 1),
-- Uncommon (sell: 2 tokens)
('Gerro', '🏺', 'uncommon', 2),
('Peluix', '🧸', 'uncommon', 2),
('Motxilla', '🎒', 'uncommon', 2),
('Test amb planta', '🪴', 'uncommon', 2),
('Paperera', '🗑️', 'uncommon', 2),
-- Rare (sell: 3 tokens)
('Guitarra', '🎸', 'rare', 3),
('Quadre', '🖼️', 'rare', 3),
('Rellotge', '⏰', 'rare', 3),
('Mirall', '🪞', 'rare', 3),
-- Epic (sell: 5 tokens)
('Estàtua', '🗿', 'epic', 5),
('Piano', '🎹', 'epic', 5),
('Peses', '🏋️', 'epic', 5),
-- Legendary (sell: 8 tokens)
('Tron daurat', '👑', 'legendary', 8),
('Unicorn ceràmica', '🦄', 'legendary', 8);

-- 6. DB function: place reward in a scenario
CREATE OR REPLACE FUNCTION public.place_reward_item(
  _player_reward_id UUID,
  _scenario_id UUID
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _reward reward_items%ROWTYPE;
  _pr player_rewards%ROWTYPE;
  _max_order INTEGER;
BEGIN
  SELECT * INTO _pr FROM player_rewards WHERE id = _player_reward_id AND user_id = auth.uid() AND status = 'owned';
  IF NOT FOUND THEN RAISE EXCEPTION 'Recompensa no trobada';
  END IF;

  SELECT * INTO _reward FROM reward_items WHERE id = _pr.reward_item_id;
  IF _reward.placed_in_scenario_id IS NOT NULL THEN RAISE EXCEPTION 'Aquest moble ja està col·locat a un escenari';
  END IF;

  SELECT COALESCE(MAX(display_order), 0) INTO _max_order FROM items WHERE scenario_id = _scenario_id;

  INSERT INTO items (name, icon, scenario_id, display_order) VALUES (_reward.name, _reward.icon, _scenario_id, _max_order + 1);
  UPDATE reward_items SET placed_in_scenario_id = _scenario_id, placed_by = auth.uid(), placed_at = now() WHERE id = _reward.id;
  UPDATE player_rewards SET status = 'placed' WHERE id = _player_reward_id;
END;
$$;

-- 7. DB function: sell reward for bonus tokens
CREATE OR REPLACE FUNCTION public.sell_reward_item(_player_reward_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pr player_rewards%ROWTYPE;
  _reward reward_items%ROWTYPE;
BEGIN
  SELECT * INTO _pr FROM player_rewards WHERE id = _player_reward_id AND user_id = auth.uid() AND status = 'owned';
  IF NOT FOUND THEN RAISE EXCEPTION 'Recompensa no trobada';
  END IF;

  SELECT * INTO _reward FROM reward_items WHERE id = _pr.reward_item_id;
  UPDATE player_rewards SET status = 'sold' WHERE id = _player_reward_id;
  UPDATE profiles SET bonus_tokens = bonus_tokens + _reward.sell_value WHERE user_id = auth.uid();

  RETURN _reward.sell_value;
END;
$$;

-- 8. Update handle_game_finished to award random reward to winner
CREATE OR REPLACE FUNCTION public.handle_game_finished()
RETURNS TRIGGER AS $$
DECLARE
  _reward_id UUID;
  _rarity item_rarity;
  _roll NUMERIC;
BEGIN
  IF NEW.status = 'finished' AND OLD.status = 'playing' AND NEW.winner_id IS NOT NULL THEN
    UPDATE profiles SET
      games_played = games_played + 1, games_won = games_won + 1,
      current_streak = current_streak + 1,
      best_streak = GREATEST(best_streak, current_streak + 1),
      elo = elo + 25
    WHERE user_id = NEW.winner_id;

    UPDATE profiles SET
      games_played = games_played + 1, current_streak = 0,
      elo = GREATEST(elo - 20, 100)
    WHERE user_id IN (
      SELECT user_id FROM game_players WHERE game_id = NEW.id AND user_id != NEW.winner_id
    );

    UPDATE profiles SET league =
      CASE
        WHEN elo >= 1800 THEN 'diamond'::league_tier
        WHEN elo >= 1600 THEN 'platinum'::league_tier
        WHEN elo >= 1400 THEN 'gold'::league_tier
        WHEN elo >= 1200 THEN 'silver'::league_tier
        ELSE 'bronze'::league_tier
      END
    WHERE user_id IN (SELECT user_id FROM game_players WHERE game_id = NEW.id);

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Recreate triggers (were missing from DB)
DROP TRIGGER IF EXISTS on_game_finished ON public.games;
CREATE TRIGGER on_game_finished
  AFTER UPDATE ON public.games
  FOR EACH ROW
  WHEN (NEW.status = 'finished' AND OLD.status = 'playing')
  EXECUTE FUNCTION public.handle_game_finished();

DROP TRIGGER IF EXISTS on_games_updated ON public.games;
CREATE TRIGGER on_games_updated
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
