
-- Server-side validation trigger for game_moves
CREATE OR REPLACE FUNCTION public.validate_game_move()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _game_status game_status;
  _tokens_remaining numeric;
  _is_player boolean;
BEGIN
  -- Verify player is in the game
  SELECT EXISTS (
    SELECT 1 FROM game_players WHERE game_id = NEW.game_id AND user_id = NEW.player_id
  ) INTO _is_player;
  
  IF NOT _is_player THEN
    RAISE EXCEPTION 'No ets jugador d''aquesta partida';
  END IF;

  -- Verify game is in playing status
  SELECT status INTO _game_status FROM games WHERE id = NEW.game_id;
  IF _game_status != 'playing' THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  -- Validate token_cost is in valid range (0.1 to 2.0)
  IF NEW.token_cost < 0.1 OR NEW.token_cost > 2.0 THEN
    RAISE EXCEPTION 'Cost de tokens invàlid: %', NEW.token_cost;
  END IF;

  -- Validate found_object can only be true on "confirm" action
  IF NEW.found_object = true AND NEW.action != 'confirm' THEN
    RAISE EXCEPTION 'Només es pot trobar l''objecte amb una acció de confirmació';
  END IF;

  -- Check player has enough tokens
  SELECT tokens_remaining INTO _tokens_remaining
  FROM game_players 
  WHERE game_id = NEW.game_id AND user_id = NEW.player_id;
  
  IF _tokens_remaining < NEW.token_cost THEN
    RAISE EXCEPTION 'No tens prou tokens (tens %, necessites %)', _tokens_remaining, NEW.token_cost;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_game_move_trigger
  BEFORE INSERT ON public.game_moves
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_game_move();
