-- ============================================================
-- Wave C+E: Seed 3 puzzles + PvP Personal infrastructure
-- ============================================================

-- 1) SEED PUZZLES (capítols 3, 6, 8) -------------------------
UPDATE public.story_nodes
SET puzzle_data = jsonb_build_object(
  'type', 'ingredient_order',
  'slots', 3,
  'valid_items', jsonb_build_array('flour','egg','milk','butter','sugar'),
  'correct_order', jsonb_build_array('flour','egg','milk'),
  'reward_item', jsonb_build_object('item_id','sweet_bread','item_name','Pa dolç','item_icon','🍞'),
  'reward_xp', 50,
  'hint_key', 'puzzle.hint.kitchen'
)
WHERE id = 'c3_kitchen_feed';

UPDATE public.story_nodes
SET puzzle_data = jsonb_build_object(
  'type', 'ingredient_order',
  'slots', 3,
  'valid_items', jsonb_build_array('candle','salt','feather','bone','herb'),
  'correct_order', jsonb_build_array('salt','candle','feather'),
  'reward_item', jsonb_build_object('item_id','ghost_charm','item_name','Amulet fantasma','item_icon','👻'),
  'reward_xp', 75,
  'hint_key', 'puzzle.hint.ritual'
)
WHERE id = 'haunted_courtyard';

UPDATE public.story_nodes
SET puzzle_data = jsonb_build_object(
  'type', 'ingredient_order',
  'slots', 4,
  'valid_items', jsonb_build_array('moonwater','stardust','dreamleaf','silver','iron'),
  'correct_order', jsonb_build_array('moonwater','dreamleaf','stardust','silver'),
  'reward_item', jsonb_build_object('item_id','dream_elixir','item_name','Elixir dels somnis','item_icon','🌙'),
  'reward_xp', 100,
  'hint_key', 'puzzle.hint.dreams'
)
WHERE id = 'dreams_choice';

-- 2) PvP PERSONAL — columnes a games --------------------------
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS game_mode text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS host_space_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS guest_space_snapshot jsonb;

-- check_constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'games_game_mode_check'
  ) THEN
    ALTER TABLE public.games
      ADD CONSTRAINT games_game_mode_check
      CHECK (game_mode IN ('standard','personal_pvp'));
  END IF;
END $$;

-- 3) RPC: create_personal_game --------------------------------
CREATE OR REPLACE FUNCTION public.create_personal_game(_opponent_id uuid)
RETURNS TABLE(game_id uuid, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _host_layout jsonb;
  _opp_layout jsonb;
  _host_count int;
  _opp_count int;
  _new_id uuid;
  _new_code text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _opponent_id = _user_id THEN
    RAISE EXCEPTION 'cannot_challenge_self';
  END IF;

  SELECT layout INTO _host_layout FROM public.player_spaces WHERE user_id = _user_id;
  SELECT layout INTO _opp_layout  FROM public.player_spaces WHERE user_id = _opponent_id;

  IF _host_layout IS NULL THEN
    RAISE EXCEPTION 'host_no_space';
  END IF;
  IF _opp_layout IS NULL THEN
    RAISE EXCEPTION 'opponent_no_space';
  END IF;

  SELECT jsonb_array_length(_host_layout) INTO _host_count;
  SELECT jsonb_array_length(_opp_layout)  INTO _opp_count;

  IF _host_count < 4 THEN RAISE EXCEPTION 'host_min_furniture'; END IF;
  IF _opp_count  < 4 THEN RAISE EXCEPTION 'opponent_min_furniture'; END IF;

  _new_code := upper(substring(md5(random()::text || clock_timestamp()::text) for 6));

  INSERT INTO public.games (code, created_by, invited_user_id, status, game_mode, host_space_snapshot, guest_space_snapshot)
  VALUES (_new_code, _user_id, _opponent_id, 'waiting', 'personal_pvp', _host_layout, _opp_layout)
  RETURNING id INTO _new_id;

  RETURN QUERY SELECT _new_id, _new_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_personal_game(uuid) TO authenticated;
