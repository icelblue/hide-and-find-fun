
-- 1. Add is_story and story_chapter to games
ALTER TABLE public.games ADD COLUMN is_story boolean NOT NULL DEFAULT false;
ALTER TABLE public.games ADD COLUMN story_chapter smallint;

-- 2. Fixed CPU UUID
-- We use '00000000-0000-0000-0000-000000000001' as the CPU player ID

-- 3. Create story game function (SECURITY DEFINER to bypass RLS for CPU rows)
CREATE OR REPLACE FUNCTION public.create_story_game(
  _user_id uuid,
  _chapter smallint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _game_id uuid;
  _scenario_id uuid;
  _cpu_id uuid := '00000000-0000-0000-0000-000000000001';
  _random_item_id uuid;
  _random_object_id uuid;
  _random_position position_type;
  _game_code text;
  _positions position_type[] := ARRAY['sobre','sota','dins']::position_type[];
BEGIN
  -- Pick a random scenario
  SELECT id INTO _scenario_id FROM scenarios ORDER BY random() LIMIT 1;
  IF _scenario_id IS NULL THEN
    RAISE EXCEPTION 'No hi ha escenaris disponibles';
  END IF;

  -- Pick random item from that scenario for CPU hiding
  SELECT id INTO _random_item_id FROM items WHERE scenario_id = _scenario_id ORDER BY random() LIMIT 1;
  
  -- Pick random object
  SELECT id INTO _random_object_id FROM objects ORDER BY random() LIMIT 1;
  
  -- Pick random position
  _random_position := _positions[1 + floor(random() * 3)::int];

  -- Generate unique game code
  _game_code := 'STORY-' || substr(gen_random_uuid()::text, 1, 8);

  -- Create game
  INSERT INTO games (id, code, created_by, status, scenario_id, is_story, story_chapter)
  VALUES (gen_random_uuid(), _game_code, _user_id, 'playing', _scenario_id, true, _chapter)
  RETURNING id INTO _game_id;

  -- Create player entry (real user) - starts on the game scenario, 99 tokens for story
  INSERT INTO game_players (game_id, user_id, current_scenario_id, tokens_remaining, has_hidden, hidden_item_id, hidden_object_id, hidden_position)
  VALUES (_game_id, _user_id, _scenario_id, 99, true, _random_item_id, _random_object_id, _random_position);

  -- Create CPU player entry - CPU has already hidden its object
  INSERT INTO game_players (game_id, user_id, current_scenario_id, tokens_remaining, has_hidden, hidden_item_id, hidden_object_id, hidden_position)
  VALUES (_game_id, _cpu_id, _scenario_id, 99, true, _random_item_id, _random_object_id, _random_position);

  RETURN _game_id;
END;
$$;

-- 4. Update handle_game_finished to skip story games
CREATE OR REPLACE FUNCTION public.handle_game_finished()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reward_id UUID;
  _rarity item_rarity;
  _roll NUMERIC;
  _gp RECORD;
  _return_amount NUMERIC;
BEGIN
  IF NEW.status = 'finished' AND OLD.status = 'playing' AND NEW.winner_id IS NOT NULL THEN

    -- SKIP Elo/league/rewards for story mode games
    IF NEW.is_story = true THEN
      RETURN NEW;
    END IF;

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

    -- Return unspent bonus tokens
    FOR _gp IN SELECT user_id, tokens_remaining, bonus_tokens_added FROM game_players WHERE game_id = NEW.id AND bonus_tokens_added > 0
    LOOP
      _return_amount := LEAST(_gp.bonus_tokens_added, _gp.tokens_remaining);
      IF _return_amount > 0 THEN
        UPDATE profiles SET bonus_tokens = bonus_tokens + _return_amount WHERE user_id = _gp.user_id;
      END IF;
    END LOOP;

    -- Award random reward
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
$$;

-- 5. Update RLS: allow viewing game_players where opponent is CPU
-- The existing is_player_in_game function already handles this since the user IS a player.
-- But we need to allow the CPU's game_players rows to be visible too.
-- Actually is_player_in_game checks if auth.uid() is in game_players for that game, which works fine.

-- 6. Allow inserting game_moves for story games (CPU moves inserted by the user's client)
-- The existing INSERT policy checks auth.uid() = player_id, so CPU moves need SECURITY DEFINER.
-- Create a helper function for CPU moves:
CREATE OR REPLACE FUNCTION public.insert_cpu_move(
  _game_id uuid,
  _turn_number integer,
  _action action_type,
  _token_cost numeric,
  _target_scenario_id uuid DEFAULT NULL,
  _target_item_id uuid DEFAULT NULL,
  _target_position position_type DEFAULT NULL,
  _found_object boolean DEFAULT false,
  _hint_level smallint DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cpu_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Verify the caller is actually in this game and it's a story game
  IF NOT EXISTS (
    SELECT 1 FROM games g
    JOIN game_players gp ON gp.game_id = g.id
    WHERE g.id = _game_id AND g.is_story = true AND gp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No autoritzat';
  END IF;

  INSERT INTO game_moves (game_id, player_id, turn_number, action, token_cost, target_scenario_id, target_item_id, target_position, found_object, hint_level)
  VALUES (_game_id, _cpu_id, _turn_number, _action, _token_cost, _target_scenario_id, _target_item_id, _target_position, _found_object, _hint_level);
END;
$$;

-- 7. Function to finish story game (set winner, bypassing RLS for CPU)
CREATE OR REPLACE FUNCTION public.finish_story_game(
  _game_id uuid,
  _winner_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM games WHERE id = _game_id AND is_story = true
  ) THEN
    RAISE EXCEPTION 'No és una partida de història';
  END IF;

  UPDATE games SET status = 'finished', winner_id = _winner_id WHERE id = _game_id;
END;
$$;
