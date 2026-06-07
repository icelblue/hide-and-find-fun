CREATE OR REPLACE FUNCTION public.consume_social_cost(_game_id uuid, _cost numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id uuid := auth.uid();
  _player record;
  _new_tokens numeric;
BEGIN
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT is_player_in_game(_caller_id, _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  IF _cost IS NULL OR _cost <= 0 THEN
    RETURN jsonb_build_object('deducted', 0, 'tokens_remaining', NULL);
  END IF;

  SELECT id, tokens_remaining, tokens_last_reset
    INTO _player
    FROM game_players
   WHERE game_id = _game_id AND user_id = _caller_id;

  -- Daily reset (4 tokens/dia)
  IF _player.tokens_last_reset < CURRENT_DATE THEN
    UPDATE game_players
       SET tokens_remaining = 4.0,
           tokens_last_reset = CURRENT_DATE
     WHERE id = _player.id;
    _player.tokens_remaining := 4.0;
  END IF;

  IF _player.tokens_remaining < _cost THEN
    RAISE EXCEPTION 'No tens prou tokens (necessites %🪙)', _cost;
  END IF;

  _new_tokens := _player.tokens_remaining - _cost;
  UPDATE game_players
     SET tokens_remaining = _new_tokens
   WHERE id = _player.id;

  RETURN jsonb_build_object('deducted', _cost, 'tokens_remaining', _new_tokens);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.consume_social_cost(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_social_cost(uuid, numeric) TO service_role;