
-- Player inventory: items collected during games
CREATE TABLE public.player_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'extra_token', 'hint_yes', 'hint_no', or collectible names
  item_value TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  gifted_to UUID REFERENCES auth.users(id), -- null = still owned, set = gifted
  gifted_at TIMESTAMPTZ
);

ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own inventory" ON public.player_inventory FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR gifted_to = auth.uid());
CREATE POLICY "Insert own inventory" ON public.player_inventory FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own inventory" ON public.player_inventory FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_inventory_user ON public.player_inventory(user_id);
CREATE INDEX idx_inventory_game ON public.player_inventory(game_id);

-- Add processed flag to social items so they don't re-trigger
ALTER TABLE public.game_social_items ADD COLUMN processed BOOLEAN NOT NULL DEFAULT false;

-- Add UPDATE policy for game_social_items (to mark as processed)
CREATE POLICY "Update own received social items" ON public.game_social_items FOR UPDATE TO authenticated
  USING (to_player_id = auth.uid());

-- Function to update profile stats when game ends
CREATE OR REPLACE FUNCTION public.handle_game_finished()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'finished' AND OLD.status = 'playing' AND NEW.winner_id IS NOT NULL THEN
    -- Update winner
    UPDATE public.profiles SET
      games_played = games_played + 1,
      games_won = games_won + 1,
      current_streak = current_streak + 1,
      best_streak = GREATEST(best_streak, current_streak + 1),
      elo = elo + 25
    WHERE user_id = NEW.winner_id;

    -- Update loser
    UPDATE public.profiles SET
      games_played = games_played + 1,
      current_streak = 0,
      elo = GREATEST(elo - 20, 100)
    WHERE user_id IN (
      SELECT user_id FROM public.game_players
      WHERE game_id = NEW.id AND user_id != NEW.winner_id
    );

    -- Update leagues based on elo
    UPDATE public.profiles SET league = 
      CASE 
        WHEN elo >= 1800 THEN 'diamond'::league_tier
        WHEN elo >= 1600 THEN 'platinum'::league_tier
        WHEN elo >= 1400 THEN 'gold'::league_tier
        WHEN elo >= 1200 THEN 'silver'::league_tier
        ELSE 'bronze'::league_tier
      END
    WHERE user_id IN (SELECT user_id FROM public.game_players WHERE game_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_game_finished
  AFTER UPDATE ON public.games
  FOR EACH ROW
  WHEN (NEW.status = 'finished' AND OLD.status = 'playing')
  EXECUTE FUNCTION public.handle_game_finished();
