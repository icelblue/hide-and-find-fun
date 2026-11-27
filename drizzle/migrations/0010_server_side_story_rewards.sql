CREATE OR REPLACE FUNCTION public.pet_level_from_xp(_xp integer) RETURNS smallint
LANGUAGE sql IMMUTABLE AS $$ SELECT LEAST(10, GREATEST(1, floor(COALESCE(_xp,0) / 500.0)::int + 1))::smallint $$;

-- Guards: block client-driven progress writes
CREATE OR REPLACE FUNCTION public.guard_player_pets_client_write() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.xp := 0; NEW.level := 1; NEW.max_xp := 5000;
    RETURN NEW;
  END IF;
  IF NEW.xp IS DISTINCT FROM OLD.xp OR NEW.max_xp IS DISTINCT FROM OLD.max_xp
     OR NEW.pet_type IS DISTINCT FROM OLD.pet_type OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'pet_progress_server_only';
  END IF;
  NEW.level := public.pet_level_from_xp(NEW.xp);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_player_pets ON public.player_pets;
CREATE TRIGGER trg_guard_player_pets BEFORE INSERT OR UPDATE ON public.player_pets
FOR EACH ROW EXECUTE FUNCTION public.guard_player_pets_client_write();

DROP POLICY IF EXISTS "Own inventory" ON public.story_inventory;
CREATE POLICY "Read own inventory" ON public.story_inventory FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Remove own inventory" ON public.story_inventory FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.guard_story_runs_client_write() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM story_worlds WHERE start_node_id = NEW.current_node_id) THEN
      RAISE EXCEPTION 'invalid_start_node';
    END IF;
    NEW.path := jsonb_build_array(NEW.current_node_id);
    NEW.status := 'active'; NEW.ending_type := NULL; NEW.ended_at := NULL;
    RETURN NEW;
  END IF;
  IF NEW.current_node_id IS DISTINCT FROM OLD.current_node_id OR NEW.path IS DISTINCT FROM OLD.path
     OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.starting_world IS DISTINCT FROM OLD.starting_world THEN
    RAISE EXCEPTION 'story_progress_server_only';
  END IF;
  IF OLD.status <> 'active' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'run_already_closed';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_story_runs ON public.story_runs;
CREATE TRIGGER trg_guard_story_runs BEFORE INSERT OR UPDATE ON public.story_runs
FOR EACH ROW EXECUTE FUNCTION public.guard_story_runs_client_write();

-- Internal helpers
CREATE OR REPLACE FUNCTION public._story_add_xp(_uid uuid, _delta integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _xp int; _max int;
BEGIN
  UPDATE player_pets SET xp = LEAST(GREATEST(0, xp + _delta), max_xp)
   WHERE user_id = _uid RETURNING xp, max_xp INTO _xp, _max;
  IF _xp IS NULL THEN RETURN jsonb_build_object('xp', null, 'dead', false); END IF;
  UPDATE player_pets SET level = public.pet_level_from_xp(_xp) WHERE user_id = _uid;
  RETURN jsonb_build_object('xp', _xp, 'max_xp', _max, 'dead', _xp >= _max);
END $$;
REVOKE ALL ON FUNCTION public._story_add_xp(uuid, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._story_add_item(_uid uuid, _id text, _name text, _icon text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _id IS NULL THEN RETURN false; END IF;
  INSERT INTO story_inventory (user_id, item_id, item_name, item_icon)
  VALUES (_uid, _id, COALESCE(_name, _id), COALESCE(_icon, '🎁'));
  RETURN true;
EXCEPTION WHEN unique_violation THEN RETURN false;
END $$;
REVOKE ALL ON FUNCTION public._story_add_item(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- Apply xp/damage/item part of a choice reward
CREATE OR REPLACE FUNCTION public._story_apply_core_reward(_uid uuid, _type text, _val jsonb, _mult numeric) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb; _out jsonb := '{}'::jsonb; _xp int; _id text;
BEGIN
  IF _type = 'xp' AND jsonb_typeof(_val->'xp') = 'number' THEN
    _xp := round((_val->>'xp')::numeric * _mult);
    _r := public._story_add_xp(_uid, _xp);
    _out := jsonb_build_object('xp', _xp, 'killed', COALESCE((_r->>'dead')::boolean, false));
  ELSIF _type = 'damage' AND jsonb_typeof(_val->'damage') = 'number' THEN
    _r := public._story_add_xp(_uid, (_val->>'damage')::int);
    _out := jsonb_build_object('damage', (_val->>'damage')::int, 'killed', COALESCE((_r->>'dead')::boolean, false));
  ELSIF _type = 'item' THEN
    _id := COALESCE(_val->>'item_id', _val->>'id');
    IF public._story_add_item(_uid, _id, _val->>'name', _val->>'icon') THEN
      _out := jsonb_build_object('item', jsonb_build_object('id', _id, 'name', COALESCE(_val->>'name', _id), 'icon', COALESCE(_val->>'icon','🎁')));
    END IF;
  END IF;
  RETURN _out;
END $$;
REVOKE ALL ON FUNCTION public._story_apply_core_reward(uuid, text, jsonb, numeric) FROM PUBLIC, anon, authenticated;

-- Make a story choice (validated progression + rewards)
CREATE OR REPLACE FUNCTION public.story_make_choice(_run_id uuid, _choice_id uuid, _xp_multiplier numeric DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _run story_runs%ROWTYPE; _c story_choices%ROWTYPE;
  _mult numeric := LEAST(GREATEST(COALESCE(_xp_multiplier,1), 1), 2);
  _out jsonb; _st pet_state%ROWTYPE; _r jsonb; _killed boolean;
  _next story_nodes%ROWTYPE; _end text := NULL; _ending text := NULL;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _run FROM story_runs WHERE id = _run_id AND user_id = _uid FOR UPDATE;
  IF NOT FOUND OR _run.status <> 'active' THEN RAISE EXCEPTION 'run_not_active'; END IF;
  SELECT * INTO _c FROM story_choices WHERE id = _choice_id;
  IF NOT FOUND OR _c.node_id IS DISTINCT FROM _run.current_node_id THEN RAISE EXCEPTION 'choice_not_available'; END IF;
  IF _c.requires_items IS NOT NULL AND jsonb_typeof(_c.requires_items) = 'array' AND EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(_c.requires_items) req
    WHERE NOT EXISTS (SELECT 1 FROM story_inventory i WHERE i.user_id = _uid AND i.item_id = req)) THEN
    RAISE EXCEPTION 'missing_items';
  END IF;

  _out := public._story_apply_core_reward(_uid, _c.reward_type, _c.reward_value, _mult);
  _killed := COALESCE((_out->>'killed')::boolean, false);

  IF _c.state_delta IS NOT NULL AND jsonb_typeof(_c.state_delta) = 'object' THEN
    INSERT INTO pet_state (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
    UPDATE pet_state SET
      hunger = LEAST(100, GREATEST(0, hunger + COALESCE((_c.state_delta->>'hunger')::int, 0))),
      sleep  = LEAST(100, GREATEST(0, sleep  + COALESCE((_c.state_delta->>'sleep')::int, 0))),
      fear   = LEAST(100, GREATEST(0, fear   + COALESCE((_c.state_delta->>'fear')::int, 0))),
      bond   = LEAST(100, GREATEST(0, bond   + COALESCE((_c.state_delta->>'bond')::int, 0))),
      updated_at = now()
    WHERE user_id = _uid RETURNING * INTO _st;
    _out := _out || jsonb_build_object('stateChanged', _c.state_delta,
      'newState', jsonb_build_object('hunger', _st.hunger, 'sleep', _st.sleep, 'fear', _st.fear, 'bond', _st.bond));
    IF _st.fear >= 95 THEN
      _r := public._story_add_xp(_uid, 50);
      IF COALESCE((_r->>'dead')::boolean, false) THEN
        _killed := true;
        _out := _out || jsonb_build_object('damage', COALESCE((_out->>'damage')::int, 0) + 50);
      END IF;
    END IF;
  END IF;

  IF _c.next_node_id IS NOT NULL THEN SELECT * INTO _next FROM story_nodes WHERE id = _c.next_node_id; END IF;
  IF _killed THEN _end := 'dead'; _ending := 'death';
  ELSIF _next.id IS NOT NULL AND _next.is_ending THEN
    _end := CASE WHEN _next.ending_type = 'death' THEN 'dead' ELSE 'completed' END;
    _ending := CASE WHEN _end = 'dead' THEN 'death' ELSE _next.ending_type END;
  END IF;

  UPDATE story_runs SET
    current_node_id = COALESCE(_next.id, current_node_id),
    path = CASE WHEN _next.id IS NOT NULL THEN path || jsonb_build_array(_next.id) ELSE path END,
    status = COALESCE(_end, status),
    ending_type = CASE WHEN _end IS NOT NULL THEN _ending ELSE ending_type END,
    ended_at = CASE WHEN _end IS NOT NULL THEN now() ELSE ended_at END
  WHERE id = _run_id;

  RETURN _out || jsonb_build_object('killed', _killed, 'next_node_id', _next.id, 'run_ended', _end);
END $$;
REVOKE ALL ON FUNCTION public.story_make_choice(uuid, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.story_make_choice(uuid, uuid, numeric) TO authenticated;

-- Daily challenge
CREATE OR REPLACE FUNCTION public.story_daily_choice(_choice_id uuid, _date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _c story_choices%ROWTYPE; _out jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _date IS NULL OR _date NOT BETWEEN (now() AT TIME ZONE 'UTC')::date - 1 AND (now() AT TIME ZONE 'UTC')::date + 1 THEN
    RAISE EXCEPTION 'invalid_date';
  END IF;
  SELECT c.* INTO _c FROM story_choices c JOIN story_nodes n ON n.id = c.node_id WHERE c.id = _choice_id AND n.is_daily;
  IF NOT FOUND THEN RAISE EXCEPTION 'choice_not_available'; END IF;
  BEGIN
    INSERT INTO daily_challenge_log (user_id, challenge_date, node_id, choice_id, reward_type, reward_value)
    VALUES (_uid, _date, _c.node_id, _c.id, _c.reward_type, _c.reward_value);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('alreadyDone', true);
  END;
  _out := public._story_apply_core_reward(_uid, _c.reward_type, _c.reward_value, 1);
  RETURN _out || jsonb_build_object('alreadyDone', false);
END $$;
REVOKE ALL ON FUNCTION public.story_daily_choice(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.story_daily_choice(uuid, date) TO authenticated;

-- Puzzle
CREATE OR REPLACE FUNCTION public.story_solve_puzzle(_run_id uuid, _node_id text, _submission text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _run story_runs%ROWTYPE; _p jsonb; _att story_puzzle_attempts%ROWTYPE;
  _ok boolean; _n int; _item jsonb; _xp int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _run FROM story_runs WHERE id = _run_id AND user_id = _uid;
  IF NOT FOUND OR _run.current_node_id IS DISTINCT FROM _node_id THEN RAISE EXCEPTION 'puzzle_not_available'; END IF;
  SELECT puzzle_data INTO _p FROM story_nodes WHERE id = _node_id;
  IF _p IS NULL OR jsonb_typeof(_p->'correct_order') <> 'array' THEN RAISE EXCEPTION 'no_puzzle'; END IF;
  SELECT * INTO _att FROM story_puzzle_attempts WHERE run_id = _run_id AND node_id = _node_id FOR UPDATE;
  IF FOUND AND _att.solved_at IS NOT NULL THEN
    RETURN jsonb_build_object('solved', true, 'attempts', _att.attempts, 'already', true);
  END IF;
  _n := COALESCE(_att.attempts, 0) + 1;
  _ok := to_jsonb(COALESCE(_submission, ARRAY[]::text[])) = _p->'correct_order';
  IF FOUND THEN
    UPDATE story_puzzle_attempts SET attempts = _n, solved_at = CASE WHEN _ok THEN now() END, updated_at = now() WHERE id = _att.id;
  ELSE
    INSERT INTO story_puzzle_attempts (user_id, run_id, node_id, attempts, solved_at)
    VALUES (_uid, _run_id, _node_id, _n, CASE WHEN _ok THEN now() END);
  END IF;
  IF NOT _ok THEN RETURN jsonb_build_object('solved', false, 'attempts', _n); END IF;
  _item := COALESCE(_p->'reward_item', '{"item_id":"puzzle_reward","item_name":"Recompensa","item_icon":"🎁"}'::jsonb);
  _xp := CASE WHEN jsonb_typeof(_p->'reward_xp') = 'number' THEN (_p->>'reward_xp')::int ELSE 50 END;
  PERFORM public._story_add_item(_uid, _item->>'item_id', _item->>'item_name', _item->>'item_icon');
  IF _xp > 0 THEN PERFORM public._story_add_xp(_uid, _xp); END IF;
  RETURN jsonb_build_object('solved', true, 'attempts', _n, 'item', _item, 'xp', _xp);
END $$;
REVOKE ALL ON FUNCTION public.story_solve_puzzle(uuid, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.story_solve_puzzle(uuid, text, text[]) TO authenticated;

-- Recipe combination
CREATE OR REPLACE FUNCTION public.story_combine_recipe(_recipe_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _r story_recipes%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _r FROM story_recipes WHERE id = _recipe_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_recipe'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(_r.requires_items) req
             WHERE NOT EXISTS (SELECT 1 FROM story_inventory i WHERE i.user_id = _uid AND i.item_id = req)) THEN
    RETURN NULL;
  END IF;
  DELETE FROM story_inventory WHERE user_id = _uid
    AND item_id IN (SELECT jsonb_array_elements_text(_r.requires_items));
  PERFORM public._story_add_item(_uid, _r.result_item_id, _r.result_item_name, _r.result_item_icon);
  RETURN jsonb_build_object('item_id', _r.result_item_id, 'item_name', _r.result_item_name, 'item_icon', _r.result_item_icon);
END $$;
REVOKE ALL ON FUNCTION public.story_combine_recipe(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.story_combine_recipe(text) TO authenticated;

-- Random health event (server-rolled, at most one roll every 10 minutes)
CREATE TABLE IF NOT EXISTS public.pet_health_rolls (
  user_id uuid PRIMARY KEY,
  last_roll_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pet_health_rolls TO service_role;
ALTER TABLE public.pet_health_rolls ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.story_roll_health_event()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _last timestamptz; _pick int;
  _types text[] := ARRAY['virus','caiguda','febre'];
  _icons text[] := ARRAY['🤒','🤕','🫠'];
  _names text[] := ARRAY['Virus','Caiguda','Febre'];
  _dmg int[] := ARRAY[200,150,100];
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM player_pets WHERE user_id = _uid) THEN RETURN NULL; END IF;
  SELECT last_roll_at INTO _last FROM pet_health_rolls WHERE user_id = _uid FOR UPDATE;
  IF _last IS NOT NULL AND _last > now() - interval '10 minutes' THEN RETURN NULL; END IF;
  INSERT INTO pet_health_rolls (user_id, last_roll_at) VALUES (_uid, now())
  ON CONFLICT (user_id) DO UPDATE SET last_roll_at = now();
  IF random() > 0.25 THEN RETURN NULL; END IF;
  _pick := 1 + floor(random() * 3)::int;
  PERFORM public._story_add_xp(_uid, _dmg[_pick]);
  INSERT INTO pet_events (user_id, event_type, event_icon, event_name, xp_change)
  VALUES (_uid, _types[_pick], _icons[_pick], _names[_pick], _dmg[_pick]);
  RETURN jsonb_build_object('type', _types[_pick]);
END $$;
REVOKE ALL ON FUNCTION public.story_roll_health_event() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.story_roll_health_event() TO authenticated;

-- Consumable use
CREATE OR REPLACE FUNCTION public.story_use_consumable(_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _heal int; _boost int; _cure text; _cid uuid; _xp int; _n int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT h, b, c INTO _heal, _boost, _cure FROM (VALUES
    ('Menjar',100,50,'caiguda'),('Aigua',50,25,'febre'),('Vacuna',200,100,'virus')) v(n,h,b,c) WHERE n = _name;
  IF _heal IS NULL THEN RAISE EXCEPTION 'invalid_consumable'; END IF;
  SELECT id INTO _cid FROM pet_consumables WHERE user_id = _uid AND consumable_name = _name AND used_at IS NULL LIMIT 1 FOR UPDATE;
  IF _cid IS NULL THEN RAISE EXCEPTION 'no_consumable'; END IF;
  UPDATE pet_consumables SET used_at = now() WHERE id = _cid;
  UPDATE player_pets SET max_xp = max_xp + _boost WHERE user_id = _uid;
  _xp := (public._story_add_xp(_uid, -_heal)->>'xp')::int;
  UPDATE pet_events SET resolved = true, resolved_at = now()
   WHERE user_id = _uid AND resolved = false AND event_type = _cure;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN jsonb_build_object('healed', _heal, 'maxXpBoost', _boost, 'newXp', COALESCE(_xp,0), 'didCureEvent', _n > 0, 'curesEvent', _cure);
END $$;
REVOKE ALL ON FUNCTION public.story_use_consumable(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.story_use_consumable(text) TO authenticated;