
-- Drop the enum types that were partially created
DROP TYPE IF EXISTS public.game_status CASCADE;
DROP TYPE IF EXISTS public.position_type CASCADE;
DROP TYPE IF EXISTS public.action_type CASCADE;
DROP TYPE IF EXISTS public.bonus_type CASCADE;
DROP TYPE IF EXISTS public.social_item_type CASCADE;
DROP TYPE IF EXISTS public.league_tier CASCADE;

-- Drop any tables that might have been created
DROP TABLE IF EXISTS public.game_social_items CASCADE;
DROP TABLE IF EXISTS public.game_moves CASCADE;
DROP TABLE IF EXISTS public.game_players CASCADE;
DROP TABLE IF EXISTS public.games CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.scenario_bonuses CASCADE;
DROP TABLE IF EXISTS public.objects CASCADE;
DROP TABLE IF EXISTS public.items CASCADE;
DROP TABLE IF EXISTS public.scenarios CASCADE;

-- Drop functions/triggers
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.game_status AS ENUM ('waiting', 'hiding', 'playing', 'finished');
CREATE TYPE public.position_type AS ENUM ('sobre', 'sota', 'dins');
CREATE TYPE public.action_type AS ENUM ('move', 'look', 'confirm');
CREATE TYPE public.bonus_type AS ENUM ('extra_token', 'hint_yes', 'hint_no');
CREATE TYPE public.social_item_type AS ENUM ('banana', 'smoke_bomb', 'false_clue', 'shield', 'message');
CREATE TYPE public.league_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- TABLES (ordered by dependencies)
-- ============================================

CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  display_order INT NOT NULL DEFAULT 0,
  UNIQUE(scenario_id, name)
);

CREATE TABLE public.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.scenario_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  position public.position_type NOT NULL,
  bonus_type public.bonus_type NOT NULL,
  value TEXT,
  UNIQUE(item_id, position)
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  elo INT NOT NULL DEFAULT 1000,
  league public.league_tier NOT NULL DEFAULT 'bronze',
  games_played INT NOT NULL DEFAULT 0,
  games_won INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  status public.game_status NOT NULL DEFAULT 'waiting',
  scenario_id UUID REFERENCES public.scenarios(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  winner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  hidden_object_id UUID REFERENCES public.objects(id),
  hidden_item_id UUID REFERENCES public.items(id),
  hidden_position public.position_type,
  has_hidden BOOLEAN NOT NULL DEFAULT false,
  current_scenario_id UUID REFERENCES public.scenarios(id),
  tokens_remaining NUMERIC(3,1) NOT NULL DEFAULT 5.0,
  tokens_last_reset DATE NOT NULL DEFAULT CURRENT_DATE,
  social_item_used_today BOOLEAN NOT NULL DEFAULT false,
  shield_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, user_id)
);

CREATE TABLE public.game_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id),
  turn_number INT NOT NULL,
  action public.action_type NOT NULL,
  token_cost NUMERIC(3,1) NOT NULL,
  target_scenario_id UUID REFERENCES public.scenarios(id),
  target_item_id UUID REFERENCES public.items(id),
  target_position public.position_type,
  found_object BOOLEAN DEFAULT false,
  found_bonus public.bonus_type,
  bonus_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.game_social_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  from_player_id UUID NOT NULL REFERENCES auth.users(id),
  to_player_id UUID NOT NULL REFERENCES auth.users(id),
  item_type public.social_item_type NOT NULL,
  message_text TEXT,
  blocked_by_shield BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_social_items ENABLE ROW LEVEL SECURITY;

-- Read-only tables
CREATE POLICY "Scenarios readable" ON public.scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Items readable" ON public.items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Objects readable" ON public.objects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bonuses readable" ON public.scenario_bonuses FOR SELECT TO authenticated USING (true);

-- Profiles
CREATE POLICY "Profiles viewable" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Games
CREATE POLICY "Games viewable" ON public.games FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create games" ON public.games FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Update own games" ON public.games FOR UPDATE TO authenticated USING (
  auth.uid() = created_by OR auth.uid() IN (SELECT user_id FROM public.game_players WHERE game_id = id)
);

-- Game Players
CREATE POLICY "View game players" ON public.game_players FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR game_id IN (SELECT gp.game_id FROM public.game_players gp WHERE gp.user_id = auth.uid())
);
CREATE POLICY "Join game" ON public.game_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own player" ON public.game_players FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Game Moves
CREATE POLICY "View moves" ON public.game_moves FOR SELECT TO authenticated USING (
  game_id IN (SELECT game_id FROM public.game_players WHERE user_id = auth.uid())
);
CREATE POLICY "Insert moves" ON public.game_moves FOR INSERT TO authenticated WITH CHECK (auth.uid() = player_id);

-- Social Items
CREATE POLICY "View social items" ON public.game_social_items FOR SELECT TO authenticated USING (
  from_player_id = auth.uid() OR to_player_id = auth.uid()
);
CREATE POLICY "Send social items" ON public.game_social_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_player_id);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_items_scenario ON public.items(scenario_id);
CREATE INDEX idx_game_players_game ON public.game_players(game_id);
CREATE INDEX idx_game_players_user ON public.game_players(user_id);
CREATE INDEX idx_game_moves_game ON public.game_moves(game_id);
CREATE INDEX idx_games_code ON public.games(code);
CREATE INDEX idx_games_status ON public.games(status);
