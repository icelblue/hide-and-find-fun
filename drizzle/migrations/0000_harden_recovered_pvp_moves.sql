ALTER TABLE public.game_players ALTER COLUMN tokens_remaining SET DEFAULT 5.0;

CREATE OR REPLACE FUNCTION public.start_game_setup(_game_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_player_in_game(auth.uid(), _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_game_id::text));
  IF EXISTS (SELECT 1 FROM public.games WHERE id = _game_id AND status = 'playing') THEN
    RETURN;
  END IF;
  PERFORM public.finish_game_setup(_game_id);
END;
$$;
REVOKE ALL ON FUNCTION public.start_game_setup(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_game_setup(uuid) TO authenticated, service_role;

DO $migration$
DECLARE
  _definition text;
  _anchor text := E'BEGIN\n  SELECT * INTO _game FROM games WHERE id = _game_id;';
  _guard text := $guard$BEGIN
  IF _is_story THEN
    RAISE EXCEPTION 'Story actions are not supported by the PvP move endpoint';
  END IF;
  SELECT * INTO _game FROM public.games WHERE id = _game_id FOR UPDATE;
  IF NOT FOUND OR _game.status <> 'playing' THEN
    RAISE EXCEPTION 'Game is not playing';
  END IF;
  IF _game.created_at <= now() - interval '7 days' THEN
    RAISE EXCEPTION 'Game has expired';
  END IF;
  SELECT * INTO _player FROM public.game_players
  WHERE game_id = _game_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not a participant'; END IF;
  IF _action IS NULL OR _action NOT IN ('look','move') THEN
    RAISE EXCEPTION 'Unsupported action';
  END IF;
  IF _game.game_mode IS DISTINCT FROM 'personal_pvp' THEN
    IF _action = 'look' AND (
      _target_position IS NULL OR _target_item_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.items WHERE id = _target_item_id AND scenario_id = _player.current_scenario_id
      )
    ) THEN RAISE EXCEPTION 'Item is not in your current scenario'; END IF;
    IF _action = 'move' AND (_target_scenario_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.scenario_connections WHERE
        (scenario_a = _player.current_scenario_id AND scenario_b = _target_scenario_id)
        OR (scenario_b = _player.current_scenario_id AND scenario_a = _target_scenario_id)
    )) THEN RAISE EXCEPTION 'Scenarios are not connected'; END IF;
  END IF;
  SELECT * INTO _game FROM games WHERE id = _game_id;$guard$;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO _definition
  FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='execute_game_move';
  IF _definition IS NULL OR position(_anchor IN _definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected move function structure; no changes applied';
  END IF;
  _definition := replace(_definition, _anchor, _guard);
  _definition := replace(_definition, '_player.tokens_last_reset < CURRENT_DATE', '(_player.tokens_last_reset IS NULL OR _player.tokens_last_reset < CURRENT_DATE)');
  _definition := replace(_definition, 'tokens_remaining = 4.0', 'tokens_remaining = 5.0');
  _definition := replace(_definition, '_tokens := 4.0', '_tokens := 5.0');
  EXECUTE _definition;
END;
$migration$;
REVOKE ALL ON FUNCTION public.execute_game_move(uuid, public.action_type, uuid, uuid, public.position_type, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_game_move(uuid, public.action_type, uuid, uuid, public.position_type, boolean) TO authenticated, service_role;