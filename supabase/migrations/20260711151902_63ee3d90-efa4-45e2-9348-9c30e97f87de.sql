CREATE OR REPLACE FUNCTION public.finish_game_setup(_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _player record;
  _hidden_scenario uuid;
  _available_scenarios uuid[];
  _random_scenario uuid;
  _specials jsonb := '[]'::jsonb;
  _pair record;
  _curse_count int := 0;
  _bonus_count int := 0;
  _curse_val numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE id = _game_id AND status = 'hiding') THEN
    RAISE EXCEPTION 'Game not in hiding phase';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.game_players gp
    WHERE gp.game_id = _game_id
    GROUP BY gp.game_id
    HAVING COUNT(*) = 2
       AND bool_and(gp.has_hidden)
       AND bool_and(gp.hidden_item_id IS NOT NULL)
       AND bool_and(gp.hidden_object_id IS NOT NULL)
       AND bool_and(gp.hidden_position IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Both players must hide first';
  END IF;

  FOR _player IN
    SELECT gp.id, gp.current_scenario_id, gp.hidden_item_id
    FROM public.game_players gp
    WHERE gp.game_id = _game_id
  LOOP
    IF _player.current_scenario_id IS NULL THEN
      SELECT i.scenario_id INTO _hidden_scenario
      FROM public.items i
      WHERE i.id = _player.hidden_item_id;

      SELECT array_agg(s.id) INTO _available_scenarios
      FROM public.scenarios s
      WHERE s.id != _hidden_scenario;

      IF _available_scenarios IS NULL OR array_length(_available_scenarios, 1) = 0 THEN
        SELECT array_agg(s.id) INTO _available_scenarios FROM public.scenarios s;
      END IF;

      _random_scenario := _available_scenarios[1 + floor(random() * array_length(_available_scenarios, 1))::int];
      UPDATE public.game_players SET current_scenario_id = _random_scenario WHERE id = _player.id;
    END IF;

    SELECT i.scenario_id INTO _hidden_scenario
    FROM public.items i
    WHERE i.id = _player.hidden_item_id;

    IF _hidden_scenario IS NOT NULL THEN
      _specials := '[]'::jsonb;
      _curse_count := 0;
      _bonus_count := 0;

      FOR _pair IN
        SELECT i.id AS item_id, p.pos AS pos
        FROM public.items i
        CROSS JOIN LATERAL (
          SELECT unnest(ARRAY['sobre','sota','dins','darrere']::public.position_type[]) AS pos
        ) p
        WHERE i.scenario_id = _hidden_scenario
          AND NOT i.hidden
          AND NOT (i.id = _player.hidden_item_id AND p.pos = (SELECT hidden_position FROM public.game_players WHERE id = _player.id))
        ORDER BY random()
        LIMIT 6
      LOOP
        IF _curse_count < 3 THEN
          _curse_val := CASE WHEN random() < 0.5 THEN -0.3 ELSE -0.5 END;
          _specials := _specials || jsonb_build_object(
            'item_id', _pair.item_id,
            'position', _pair.pos,
            'type', 'curse',
            'value', _curse_val
          );
          _curse_count := _curse_count + 1;
        ELSIF _bonus_count < 3 THEN
          _specials := _specials || jsonb_build_object(
            'item_id', _pair.item_id,
            'position', _pair.pos,
            'type', 'bonus',
            'value', 1
          );
          _bonus_count := _bonus_count + 1;
        END IF;
      END LOOP;

      UPDATE public.game_players
      SET special_data = COALESCE(special_data, '{}'::jsonb) || jsonb_build_object('scenario_specials', _specials)
      WHERE id = _player.id;
    END IF;
  END LOOP;

  UPDATE public.games SET status = 'playing' WHERE id = _game_id AND status = 'hiding';
END;
$function$;

REVOKE ALL ON FUNCTION public.finish_game_setup(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_game_setup(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.start_game_setup(_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_player_in_game(auth.uid(), _game_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_game_id::text));
  PERFORM public.finish_game_setup(_game_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.maybe_start_game_after_hide()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP <> 'UPDATE'
     OR NEW.has_hidden IS DISTINCT FROM true
     OR COALESCE(OLD.has_hidden, false) IS true THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.games WHERE id = NEW.game_id AND status = 'hiding') THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.game_players gp
    WHERE gp.game_id = NEW.game_id
    GROUP BY gp.game_id
    HAVING COUNT(*) = 2
       AND bool_and(gp.has_hidden)
       AND bool_and(gp.hidden_item_id IS NOT NULL)
       AND bool_and(gp.hidden_object_id IS NOT NULL)
       AND bool_and(gp.hidden_position IS NOT NULL)
  ) THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.game_id::text));
  PERFORM public.finish_game_setup(NEW.game_id);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'maybe_start_game_after_hide failed for game %: %', NEW.game_id, SQLERRM;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS maybe_start_game_after_hide_trigger ON public.game_players;
CREATE TRIGGER maybe_start_game_after_hide_trigger
AFTER UPDATE OF has_hidden, hidden_item_id, hidden_object_id, hidden_position ON public.game_players
FOR EACH ROW
EXECUTE FUNCTION public.maybe_start_game_after_hide();

DO $repair_stuck_games$
DECLARE
  _game_id uuid;
BEGIN
  FOR _game_id IN
    SELECT g.id
    FROM public.games g
    JOIN public.game_players gp ON gp.game_id = g.id
    WHERE g.status = 'hiding'
    GROUP BY g.id
    HAVING COUNT(*) = 2
       AND bool_and(gp.has_hidden)
       AND bool_and(gp.hidden_item_id IS NOT NULL)
       AND bool_and(gp.hidden_object_id IS NOT NULL)
       AND bool_and(gp.hidden_position IS NOT NULL)
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext(_game_id::text));
    PERFORM public.finish_game_setup(_game_id);
  END LOOP;
END;
$repair_stuck_games$;

CREATE INDEX IF NOT EXISTS idx_game_moves_game_player_turn_desc
ON public.game_moves (game_id, player_id, turn_number DESC);

CREATE INDEX IF NOT EXISTS idx_game_moves_game_bonus_created
ON public.game_moves (game_id, bonus_value, created_at)
WHERE bonus_value IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_game_moves_game_created
ON public.game_moves (game_id, created_at);

CREATE INDEX IF NOT EXISTS idx_game_social_items_game_to_processed
ON public.game_social_items (game_id, to_player_id, processed, blocked_by_shield);