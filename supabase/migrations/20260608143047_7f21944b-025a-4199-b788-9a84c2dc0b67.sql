-- 1) Tag fillable als mobles amb aixeta
UPDATE public.items
   SET tags = array_append(COALESCE(tags, ARRAY[]::text[]), 'fillable')
 WHERE name IN ('Banyera', 'Pica', 'Rentadora')
   AND NOT ('fillable' = ANY(COALESCE(tags, ARRAY[]::text[])));

-- 2) execute_fill_water: galleda + drap → drap mullat
CREATE OR REPLACE FUNCTION public.execute_fill_water(_game_id uuid, _item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id uuid := auth.uid();
  _player record;
  _tools jsonb;
  _item_tags text[];
  _galleda int; _drap int; _drap_mullat int;
  _cost numeric := 0.3;
BEGIN
  IF NOT is_player_in_game(_caller_id, _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  SELECT tags INTO _item_tags FROM items WHERE id = _item_id;
  IF _item_tags IS NULL OR NOT ('fillable' = ANY(_item_tags)) THEN
    RAISE EXCEPTION 'Aquest moble no té aixeta';
  END IF;

  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = _caller_id;

  -- Daily reset
  IF _player.tokens_last_reset < CURRENT_DATE THEN
    UPDATE game_players SET tokens_remaining = 4.0, tokens_last_reset = CURRENT_DATE WHERE id = _player.id;
    _player.tokens_remaining := 4.0;
  END IF;

  IF _player.tokens_remaining < _cost THEN
    RAISE EXCEPTION 'No tens prou tokens (necessites 0.3🪙)';
  END IF;

  _tools := COALESCE(_player.tools, '{}'::jsonb);
  _galleda := COALESCE((_tools->>'galleda')::int, 0);
  _drap := COALESCE((_tools->>'drap')::int, 0);
  _drap_mullat := COALESCE((_tools->>'drap_mullat')::int, 0);

  IF _galleda <= 0 THEN RAISE EXCEPTION 'No tens cap galleda 🪣'; END IF;
  IF _drap <= 0 THEN RAISE EXCEPTION 'No tens cap drap 🧹 per mullar'; END IF;

  _tools := jsonb_set(_tools, '{galleda}', to_jsonb(_galleda - 1));
  _tools := jsonb_set(_tools, '{drap}', to_jsonb(_drap - 1));
  _tools := jsonb_set(_tools, '{drap_mullat}', to_jsonb(_drap_mullat + 1));

  UPDATE game_players
     SET tools = _tools,
         tokens_remaining = tokens_remaining - _cost
   WHERE id = _player.id;

  RETURN jsonb_build_object(
    'ok', true,
    'tools', _tools,
    'tokens_remaining', _player.tokens_remaining - _cost
  );
END;
$function$;

-- 3) execute_polish: drap mullat → +2🪙
CREATE OR REPLACE FUNCTION public.execute_polish(_game_id uuid, _item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id uuid := auth.uid();
  _player record;
  _tools jsonb;
  _drap_mullat int;
  _is_broken boolean;
  _bonus numeric := 2.0;
BEGIN
  IF NOT is_player_in_game(_caller_id, _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM games WHERE id = _game_id AND status = 'playing') THEN
    RAISE EXCEPTION 'La partida no està en curs';
  END IF;

  -- Block polish on currently broken items (must be fixed first)
  SELECT EXISTS(
    SELECT 1 FROM game_moves
     WHERE game_id = _game_id
       AND bonus_value = 'tag:break:' || _item_id::text
       AND NOT EXISTS (
         SELECT 1 FROM game_moves m2
          WHERE m2.game_id = _game_id
            AND m2.bonus_value = 'tag:fix:' || _item_id::text
            AND m2.created_at > game_moves.created_at
       )
  ) INTO _is_broken;
  IF _is_broken THEN
    RAISE EXCEPTION 'Aquest moble està trencat — arregla''l primer';
  END IF;

  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = _caller_id;
  _tools := COALESCE(_player.tools, '{}'::jsonb);
  _drap_mullat := COALESCE((_tools->>'drap_mullat')::int, 0);

  IF _drap_mullat <= 0 THEN RAISE EXCEPTION 'No tens cap drap mullat ✨'; END IF;

  _tools := jsonb_set(_tools, '{drap_mullat}', to_jsonb(_drap_mullat - 1));

  UPDATE game_players
     SET tools = _tools,
         tokens_remaining = tokens_remaining + _bonus
   WHERE id = _player.id;

  -- Log so item can't be polished twice in same scenario without re-dirty
  INSERT INTO game_moves (game_id, player_id, action, target_item_id, bonus_value, scenario_id, position, tokens_cost, turn_number)
  VALUES (_game_id, _player.id, 'look', _item_id, 'tag:polish:' || _item_id::text, _player.current_scenario_id, NULL, 0, COALESCE((SELECT MAX(turn_number) FROM game_moves WHERE game_id = _game_id), 0) + 1);

  RETURN jsonb_build_object(
    'ok', true,
    'bonus', _bonus,
    'tokens_remaining', _player.tokens_remaining + _bonus
  );
END;
$function$;

-- 4) roll_galleda_drop: 5% chance after clean/fix, pool partida = 2
CREATE OR REPLACE FUNCTION public.roll_galleda_drop(_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id uuid := auth.uid();
  _player record;
  _tools jsonb;
  _galleda int;
  _found_galleda int := 0;
  _pool_galleda int := 2;
  _roll numeric;
BEGIN
  IF NOT is_player_in_game(_caller_id, _game_id) THEN
    RETURN jsonb_build_object('dropped', false);
  END IF;

  -- Count galleda already collected in this game (both players)
  SELECT COALESCE(SUM(COALESCE((tools->>'galleda')::int, 0)), 0)
    INTO _found_galleda
    FROM game_players
   WHERE game_id = _game_id;

  IF _found_galleda >= _pool_galleda THEN
    RETURN jsonb_build_object('dropped', false, 'reason', 'pool_empty');
  END IF;

  _roll := random();
  IF _roll >= 0.05 THEN
    RETURN jsonb_build_object('dropped', false);
  END IF;

  SELECT * INTO _player FROM game_players WHERE game_id = _game_id AND user_id = _caller_id;
  _tools := COALESCE(_player.tools, '{}'::jsonb);
  _galleda := COALESCE((_tools->>'galleda')::int, 0);
  _tools := jsonb_set(_tools, '{galleda}', to_jsonb(_galleda + 1));

  UPDATE game_players SET tools = _tools WHERE id = _player.id;

  RETURN jsonb_build_object('dropped', true, 'tools', _tools);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.execute_fill_water(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_fill_water(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_polish(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_polish(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.roll_galleda_drop(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roll_galleda_drop(uuid) TO service_role;