CREATE OR REPLACE FUNCTION public.validate_hide_object()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _obj_size smallint;
  _obj_material object_material;
  _itm_capacity smallint;
  _itm_environment item_environment;
  _block_reason text;
  _mode text;
BEGIN
  IF NEW.has_hidden = true AND OLD.has_hidden = false THEN

    IF NEW.hidden_object_id IS NULL THEN
      RAISE EXCEPTION 'Cal seleccionar un objecte per amagar';
    END IF;
    IF NEW.hidden_item_id IS NULL THEN
      RAISE EXCEPTION 'Cal seleccionar un moble';
    END IF;
    IF NEW.hidden_position IS NULL THEN
      RAISE EXCEPTION 'Cal seleccionar una posició (sobre/sota/dins)';
    END IF;

    SELECT game_mode::text INTO _mode FROM games WHERE id = NEW.game_id;

    -- Mode espai personal: mobles/objectes sintètics (no són del catàleg global)
    IF _mode = 'personal_pvp' THEN
      RETURN NEW;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM objects WHERE id = NEW.hidden_object_id) THEN
      RAISE EXCEPTION 'Objecte no vàlid';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM items WHERE id = NEW.hidden_item_id) THEN
      RAISE EXCEPTION 'Moble no vàlid';
    END IF;

    SELECT size, material INTO _obj_size, _obj_material
    FROM objects WHERE id = NEW.hidden_object_id;

    SELECT inner_capacity, environment INTO _itm_capacity, _itm_environment
    FROM items WHERE id = NEW.hidden_item_id;

    IF NEW.hidden_position = 'dins' AND _obj_size > _itm_capacity THEN
      RAISE EXCEPTION 'Objecte massa gran per amagar dins aquest moble (mida % > capacitat %)', _obj_size, _itm_capacity;
    END IF;

    _block_reason := CASE
      WHEN _itm_environment = 'generic' THEN NULL
      WHEN _obj_material = 'paper' AND _itm_environment IN ('wet', 'submergit') THEN 'El paper es mullaria'
      WHEN _obj_material = 'paper' AND _itm_environment = 'hot' THEN 'El paper es cremaria'
      WHEN _obj_material = 'cardboard' AND _itm_environment IN ('wet', 'submergit') THEN 'El cartró es desfaria'
      WHEN _obj_material = 'cardboard' AND _itm_environment = 'hot' THEN 'El cartró es cremaria'
      WHEN _obj_material = 'food' AND _itm_environment = 'dirty' THEN 'No és higiènic'
      WHEN _obj_material = 'food' AND _itm_environment = 'químic' THEN 'Seria tòxic'
      WHEN _obj_material = 'electronic' AND _itm_environment IN ('wet', 'submergit') THEN 'L''electrònic es faria malbé'
      WHEN _obj_material = 'wood' AND _itm_environment = 'hot' THEN 'La fusta es cremaria'
      WHEN _obj_material = 'wood' AND _itm_environment = 'submergit' THEN 'La fusta flotaria'
      WHEN _obj_material = 'fabric' AND _itm_environment = 'hot' THEN 'La tela es cremaria'
      WHEN _obj_material = 'plastic' AND _itm_environment = 'hot' THEN 'El plàstic es fondria'
      WHEN _obj_material = 'rubber' AND _itm_environment = 'hot' THEN 'La goma es fondria'
      WHEN _obj_material = 'leather' AND _itm_environment = 'submergit' THEN 'El cuir es podriria'
      WHEN _obj_material = 'leather' AND _itm_environment = 'hot' THEN 'El cuir es ressecaria'
      ELSE NULL
    END;

    IF _block_reason IS NOT NULL THEN
      RAISE EXCEPTION 'No es pot amagar aquí: %', _block_reason;
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;