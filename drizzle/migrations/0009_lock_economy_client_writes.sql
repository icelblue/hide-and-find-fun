REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (display_name, avatar_url, language, last_active_at) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS player_furniture_owner_insert ON public.player_furniture;
DROP POLICY IF EXISTS "insert own rooms" ON public.player_rooms;
DROP POLICY IF EXISTS "Update own rewards" ON public.player_rewards;

CREATE OR REPLACE FUNCTION public.buy_furniture(_furniture_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _price integer;
  _new numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT price_coins INTO _price FROM furniture_catalog WHERE id = _furniture_id;
  IF _price IS NULL THEN RAISE EXCEPTION 'unknown_furniture'; END IF;
  IF EXISTS (SELECT 1 FROM player_furniture WHERE user_id = _uid AND furniture_id = _furniture_id) THEN
    RAISE EXCEPTION 'already_owned';
  END IF;
  UPDATE profiles SET bonus_tokens = bonus_tokens - _price
   WHERE user_id = _uid AND bonus_tokens >= _price
   RETURNING bonus_tokens INTO _new;
  IF _new IS NULL THEN RAISE EXCEPTION 'not_enough_coins'; END IF;
  INSERT INTO player_furniture (user_id, furniture_id) VALUES (_uid, _furniture_id);
  RETURN jsonb_build_object('coins', _new);
END;
$$;
REVOKE ALL ON FUNCTION public.buy_furniture(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_furniture(text) TO authenticated;