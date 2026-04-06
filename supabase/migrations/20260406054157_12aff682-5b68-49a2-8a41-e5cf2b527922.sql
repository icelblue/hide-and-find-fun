
-- Server-side validation trigger for hiding objects
CREATE OR REPLACE FUNCTION public.validate_hide_object()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _obj_size smallint;
  _obj_material object_material;
  _itm_capacity smallint;
  _itm_environment item_environment;
  _block_reason text;
BEGIN
  -- Only validate when has_hidden changes from false to true
  IF NEW.has_hidden = true AND OLD.has_hidden = false THEN
    
    -- Verify object exists
    IF NEW.hidden_object_id IS NULL THEN
      RAISE EXCEPTION 'Cal seleccionar un objecte per amagar';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM objects WHERE id = NEW.hidden_object_id) THEN
      RAISE EXCEPTION 'Objecte no vàlid';
    END IF;

    -- Verify item (furniture) exists
    IF NEW.hidden_item_id IS NULL THEN
      RAISE EXCEPTION 'Cal seleccionar un moble';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM items WHERE id = NEW.hidden_item_id) THEN
      RAISE EXCEPTION 'Moble no vàlid';
    END IF;

    -- Verify position is set
    IF NEW.hidden_position IS NULL THEN
      RAISE EXCEPTION 'Cal seleccionar una posició (sobre/sota/dins)';
    END IF;

    -- Get object and item properties
    SELECT size, material INTO _obj_size, _obj_material
    FROM objects WHERE id = NEW.hidden_object_id;

    SELECT inner_capacity, environment INTO _itm_capacity, _itm_environment
    FROM items WHERE id = NEW.hidden_item_id;

    -- Validate size vs capacity for "dins"
    IF NEW.hidden_position = 'dins' AND _obj_size > _itm_capacity THEN
      RAISE EXCEPTION 'Objecte massa gran per amagar dins aquest moble (mida % > capacitat %)', _obj_size, _itm_capacity;
    END IF;

    -- Validate material vs environment compatibility
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
$$;

-- Create the trigger
CREATE TRIGGER validate_hide_object_trigger
  BEFORE UPDATE ON public.game_players
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_hide_object();
