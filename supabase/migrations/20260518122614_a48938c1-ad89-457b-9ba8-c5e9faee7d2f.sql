
-- pet_notifications table
CREATE TABLE IF NOT EXISTS public.pet_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_user_id uuid,
  notif_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pet_notifications_user_unseen
  ON public.pet_notifications(user_id, seen, created_at DESC);

ALTER TABLE public.pet_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own pet notifications"
  ON public.pet_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Update own pet notifications"
  ON public.pet_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Patch gift_consumable to log a notification for recipient
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
  _cures_event text;
  _pet record;
  _new_xp int;
  _new_max_xp int;
  _events_resolved int;
  _icon text;
BEGIN
  IF _from_user_id = _to_user_id THEN
    RAISE EXCEPTION 'Usa consumibles directament per la teva mascota';
  END IF;

  _xp_heal := CASE _consumable_name
    WHEN 'Menjar' THEN 100 WHEN 'Aigua' THEN 50 WHEN 'Vacuna' THEN 200 ELSE NULL END;
  _max_xp_boost := CASE _consumable_name
    WHEN 'Menjar' THEN 50 WHEN 'Aigua' THEN 25 WHEN 'Vacuna' THEN 100 ELSE 0 END;
  _cures_event := CASE _consumable_name
    WHEN 'Menjar' THEN 'caiguda' WHEN 'Aigua' THEN 'febre' WHEN 'Vacuna' THEN 'virus' ELSE NULL END;
  _icon := CASE _consumable_name
    WHEN 'Menjar' THEN '🍖' WHEN 'Aigua' THEN '💧' WHEN 'Vacuna' THEN '💉' ELSE '🎁' END;
  IF _xp_heal IS NULL THEN RAISE EXCEPTION 'Consumible no vàlid'; END IF;

  SELECT id INTO _consumable_id
  FROM pet_consumables
  WHERE user_id = _from_user_id AND consumable_name = _consumable_name AND used_at IS NULL
  LIMIT 1;
  IF _consumable_id IS NULL THEN
    RAISE EXCEPTION 'No tens cap % disponible!', _consumable_name;
  END IF;

  SELECT * INTO _pet FROM player_pets WHERE user_id = _to_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aquest jugador no té mascota'; END IF;

  UPDATE pet_consumables SET used_at = now() WHERE id = _consumable_id;

  _new_xp := GREATEST(0, _pet.xp - _xp_heal);
  _new_max_xp := COALESCE(_pet.max_xp, 5000) + _max_xp_boost;
  UPDATE player_pets SET xp = _new_xp, max_xp = _new_max_xp WHERE user_id = _to_user_id;

  WITH resolved AS (
    UPDATE pet_events SET resolved = true, resolved_at = now()
    WHERE user_id = _to_user_id AND resolved = false AND event_type = _cures_event
    RETURNING id
  )
  SELECT COUNT(*) INTO _events_resolved FROM resolved;

  -- Notification for recipient
  INSERT INTO pet_notifications(user_id, from_user_id, notif_type, payload)
  VALUES (
    _to_user_id, _from_user_id, 'gift_consumable',
    jsonb_build_object(
      'consumable_name', _consumable_name,
      'icon', _icon,
      'healed', _xp_heal,
      'cured_event', _events_resolved > 0
    )
  );

  RETURN jsonb_build_object(
    'healed', _xp_heal, 'new_xp', _new_xp, 'max_xp_boost', _max_xp_boost,
    'pet_name', _pet.pet_name, 'did_cure_event', _events_resolved > 0,
    'cures_event', _cures_event
  );
END;
$function$;

-- Patch gift_inventory_item to log a notification for recipient
CREATE OR REPLACE FUNCTION public.gift_inventory_item(_to_user_id uuid, _item_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _from_id uuid := auth.uid();
  _row record;
BEGIN
  IF _from_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _from_id = _to_user_id THEN RAISE EXCEPTION 'No pots regalar-te a tu mateix!'; END IF;
  IF NOT EXISTS (SELECT 1 FROM player_pets WHERE user_id = _to_user_id) THEN
    RAISE EXCEPTION 'L''altre jugador no té mascota';
  END IF;

  SELECT id, item_id, item_name, item_icon INTO _row
  FROM story_inventory
  WHERE user_id = _from_id AND item_id = _item_id
  ORDER BY obtained_at LIMIT 1;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'No tens aquest objecte!'; END IF;

  DELETE FROM story_inventory WHERE id = _row.id;
  INSERT INTO story_inventory (user_id, item_id, item_name, item_icon)
  VALUES (_to_user_id, _row.item_id, _row.item_name, _row.item_icon);

  INSERT INTO pet_notifications(user_id, from_user_id, notif_type, payload)
  VALUES (
    _to_user_id, _from_id, 'gift_item',
    jsonb_build_object(
      'item_id', _row.item_id,
      'item_name', _row.item_name,
      'icon', _row.item_icon
    )
  );

  RETURN jsonb_build_object('success', true, 'item_name', _row.item_name, 'item_icon', _row.item_icon);
END;
$function$;
