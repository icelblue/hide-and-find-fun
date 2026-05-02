-- Update get_rival_traits to support custom (player-defined) objects.
-- When the rival hid the custom-sentinel object, traits live in
-- game_players.special_data.custom_trait1 / custom_trait2 instead of
-- the object_traits table.
CREATE OR REPLACE FUNCTION public.get_rival_traits(_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id uuid := auth.uid();
  _rival_object uuid;
  _rival_special jsonb;
  _move_count int;
  _trait1 text := null;
  _trait2 text := null;
  _custom_sentinel constant uuid := '000000cc-0000-0000-0000-000000000000';
BEGIN
  IF NOT is_player_in_game(_caller_id, _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RETURN jsonb_build_object('trait1', null, 'trait2', null);
  END IF;

  SELECT hidden_object_id, special_data
    INTO _rival_object, _rival_special
  FROM game_players
  WHERE game_id = _game_id AND user_id != _caller_id
  LIMIT 1;

  IF _rival_object IS NULL THEN
    RETURN jsonb_build_object('trait1', null, 'trait2', null);
  END IF;

  SELECT COUNT(*) INTO _move_count
  FROM game_moves
  WHERE game_id = _game_id AND player_id = _caller_id;

  IF _rival_object = _custom_sentinel AND (_rival_special ? 'is_custom') THEN
    -- Custom object: traits come from special_data
    IF _move_count >= 2 THEN
      _trait1 := NULLIF(_rival_special->>'custom_trait1', '');
    END IF;
    IF _move_count >= 5 THEN
      _trait2 := NULLIF(_rival_special->>'custom_trait2', '');
    END IF;
  ELSE
    IF _move_count >= 2 THEN
      SELECT trait_text INTO _trait1
      FROM object_traits
      WHERE object_id = _rival_object AND trait_number = 1
      LIMIT 1;
    END IF;
    IF _move_count >= 5 THEN
      SELECT trait_text INTO _trait2
      FROM object_traits
      WHERE object_id = _rival_object AND trait_number = 2
      LIMIT 1;
    END IF;
  END IF;

  RETURN jsonb_build_object('trait1', _trait1, 'trait2', _trait2);
END;
$function$;