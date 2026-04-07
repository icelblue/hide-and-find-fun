CREATE OR REPLACE FUNCTION public.gift_consumable(_to_user_id uuid, _consumable_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _from_user_id uuid := auth.uid();
  _consumable_id uuid;
  _xp_heal int;
  _max_xp_boost int;
  _pet record;
  _new_xp int;
  _new_max_xp int;
BEGIN
  IF _from_user_id = _to_user_id THEN
    RAISE EXCEPTION 'Usa consumibles directament per la teva mascota';
  END IF;

  -- Lookup heal amount and max xp boost
  _xp_heal := CASE _consumable_name
    WHEN 'Menjar' THEN 100
    WHEN 'Aigua' THEN 50
    WHEN 'Vacuna' THEN 200
    ELSE NULL
  END;
  _max_xp_boost := CASE _consumable_name
    WHEN 'Menjar' THEN 50
    WHEN 'Aigua' THEN 25
    WHEN 'Vacuna' THEN 100
    ELSE 0
  END;
  IF _xp_heal IS NULL THEN
    RAISE EXCEPTION 'Consumible no vàlid';
  END IF;

  -- Find unused consumable owned by sender
  SELECT id INTO _consumable_id
  FROM pet_consumables
  WHERE user_id = _from_user_id
    AND consumable_name = _consumable_name
    AND used_at IS NULL
  LIMIT 1;

  IF _consumable_id IS NULL THEN
    RAISE EXCEPTION 'No tens cap % disponible!', _consumable_name;
  END IF;

  -- Get target pet
  SELECT * INTO _pet FROM player_pets WHERE user_id = _to_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aquest jugador no té mascota';
  END IF;

  -- Mark consumable as used
  UPDATE pet_consumables SET used_at = now() WHERE id = _consumable_id;

  -- Heal target pet
  _new_xp := GREATEST(0, _pet.xp - _xp_heal);
  _new_max_xp := COALESCE(_pet.max_xp, 5000) + _max_xp_boost;
  UPDATE player_pets SET xp = _new_xp, max_xp = _new_max_xp WHERE user_id = _to_user_id;

  -- Resolve active events
  UPDATE pet_events SET resolved = true, resolved_at = now()
  WHERE user_id = _to_user_id AND resolved = false;

  RETURN jsonb_build_object(
    'healed', _xp_heal,
    'new_xp', _new_xp,
    'max_xp_boost', _max_xp_boost,
    'pet_name', _pet.pet_name
  );
END;
$function$;