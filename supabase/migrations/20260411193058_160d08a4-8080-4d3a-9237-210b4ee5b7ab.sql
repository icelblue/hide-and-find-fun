
-- Atomic RPC for redeeming bonus tokens (prevents race conditions)
CREATE OR REPLACE FUNCTION public.redeem_bonus_tokens(_game_id uuid, _amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _available numeric;
  _player record;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Has de triar almenys 0.5 tokens!';
  END IF;

  -- Lock the profile row to prevent concurrent reads
  SELECT bonus_tokens INTO _available
  FROM profiles
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _available IS NULL THEN
    RAISE EXCEPTION 'Perfil no trobat';
  END IF;

  IF _available < _amount THEN
    RAISE EXCEPTION 'Només tens % bonus tokens!', _available;
  END IF;

  -- Get player in game
  SELECT id, tokens_remaining, bonus_tokens_added INTO _player
  FROM game_players
  WHERE game_id = _game_id AND user_id = _user_id
  FOR UPDATE;

  IF _player.id IS NULL THEN
    RAISE EXCEPTION 'No ets a aquesta partida!';
  END IF;

  -- Deduct from profile
  UPDATE profiles SET bonus_tokens = bonus_tokens - _amount WHERE user_id = _user_id;

  -- Add to game player
  UPDATE game_players
  SET tokens_remaining = tokens_remaining + _amount,
      bonus_tokens_added = bonus_tokens_added + _amount
  WHERE id = _player.id;

  RETURN _amount;
END;
$$;

-- Allow players to delete their own trophies
CREATE POLICY "Delete own trophies"
ON public.player_inventory
FOR DELETE
USING (user_id = auth.uid() AND item_type = 'special_trophy');
