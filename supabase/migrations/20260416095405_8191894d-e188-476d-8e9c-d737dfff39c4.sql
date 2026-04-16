
-- RPC: get_rival_traits — returns traits without revealing object ID
CREATE OR REPLACE FUNCTION public.get_rival_traits(_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _rival record;
  _move_count int;
  _trait1 text := null;
  _trait2 text := null;
BEGIN
  IF NOT is_player_in_game(_caller_id, _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RETURN jsonb_build_object('trait1', null, 'trait2', null);
  END IF;

  -- Get rival's hidden object (server-side, not exposed)
  SELECT hidden_object_id INTO _rival
  FROM game_players
  WHERE game_id = _game_id AND user_id != _caller_id
  LIMIT 1;

  IF _rival.hidden_object_id IS NULL THEN
    RETURN jsonb_build_object('trait1', null, 'trait2', null);
  END IF;

  -- Count caller's moves
  SELECT COUNT(*) INTO _move_count
  FROM game_moves
  WHERE game_id = _game_id AND player_id = _caller_id;

  -- Trait 1 after 2 moves
  IF _move_count >= 2 THEN
    SELECT trait_text INTO _trait1
    FROM object_traits
    WHERE object_id = _rival.hidden_object_id AND trait_number = 1
    LIMIT 1;
  END IF;

  -- Trait 2 after 5 moves
  IF _move_count >= 5 THEN
    SELECT trait_text INTO _trait2
    FROM object_traits
    WHERE object_id = _rival.hidden_object_id AND trait_number = 2
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object('trait1', _trait1, 'trait2', _trait2);
END;
$$;

-- RPC: execute_smoke_bomb — server-side smoke bomb (eliminates 6 client round-trips)
CREATE OR REPLACE FUNCTION public.execute_smoke_bomb(_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _player record;
  _current_scenario_id uuid;
  _new_scenario record;
  _new_item record;
  _new_pos position_type;
  _positions position_type[] := ARRAY['sobre','sota','dins']::position_type[];
  _valid_positions position_type[];
  _rival record;
BEGIN
  IF NOT is_player_in_game(_caller_id, _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  SELECT * INTO _player
  FROM game_players
  WHERE game_id = _game_id AND user_id = _caller_id;

  IF _player.smoke_bomb_used THEN
    RAISE EXCEPTION 'Ja has usat la bomba de fum en aquesta partida!';
  END IF;

  IF _player.social_item_used_today AND _player.tokens_last_reset >= CURRENT_DATE THEN
    RAISE EXCEPTION 'Ja has usat el teu ítem social avui!';
  END IF;

  IF _player.hidden_item_id IS NULL THEN
    RAISE EXCEPTION 'No tens objecte amagat';
  END IF;

  -- Get current scenario of hidden item
  SELECT i.scenario_id INTO _current_scenario_id
  FROM items i WHERE i.id = _player.hidden_item_id;

  -- Pick a DIFFERENT scenario
  SELECT s.id, s.name, s.icon INTO _new_scenario
  FROM scenarios s
  WHERE s.id != _current_scenario_id
  ORDER BY random()
  LIMIT 1;

  IF _new_scenario.id IS NULL THEN
    RAISE EXCEPTION 'No hi ha altres escenaris disponibles!';
  END IF;

  -- Pick random item in new scenario
  SELECT i.id, i.name, i.icon, i.inner_capacity INTO _new_item
  FROM items i
  WHERE i.scenario_id = _new_scenario.id
  ORDER BY random()
  LIMIT 1;

  IF _new_item.id IS NULL THEN
    RAISE EXCEPTION 'L''escenari destí no té mobles!';
  END IF;

  -- Filter valid positions based on capacity
  _valid_positions := ARRAY[]::position_type[];
  IF true THEN _valid_positions := _valid_positions || 'sobre'::position_type; END IF;
  IF true THEN _valid_positions := _valid_positions || 'sota'::position_type; END IF;
  IF COALESCE(_new_item.inner_capacity, 2) >= 2 THEN
    _valid_positions := _valid_positions || 'dins'::position_type;
  END IF;

  _new_pos := _valid_positions[1 + floor(random() * array_length(_valid_positions, 1))::int];

  -- Update player
  UPDATE game_players
  SET hidden_item_id = _new_item.id,
      hidden_position = _new_pos,
      smoke_bomb_used = true,
      social_item_used_today = true
  WHERE id = _player.id;

  -- Self-notification with new location
  INSERT INTO game_social_items (game_id, from_player_id, to_player_id, item_type, message_text)
  VALUES (_game_id, _caller_id, _caller_id, 'message',
    '💣 Bomba de fum! El teu objecte s''ha mogut a ' || _new_scenario.icon || ' ' || _new_scenario.name ||
    ' → ' || _new_item.icon || ' ' || _new_item.name || ' (' || _new_pos || ')');

  -- Notify rival
  SELECT user_id INTO _rival
  FROM game_players
  WHERE game_id = _game_id AND user_id != _caller_id
  LIMIT 1;

  IF _rival.user_id IS NOT NULL THEN
    INSERT INTO game_social_items (game_id, from_player_id, to_player_id, item_type)
    VALUES (_game_id, _caller_id, _rival.user_id, 'smoke_bomb');
  END IF;

  RETURN jsonb_build_object(
    'new_scenario_name', _new_scenario.icon || ' ' || _new_scenario.name,
    'new_item_name', _new_item.icon || ' ' || _new_item.name,
    'new_position', _new_pos
  );
END;
$$;
