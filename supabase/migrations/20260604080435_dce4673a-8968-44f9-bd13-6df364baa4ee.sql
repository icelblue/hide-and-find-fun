-- Bug B (1/2): Infraestructura del distintiu "Mestre Col·leccionista"

-- Marca permanent al perfil
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS collection_master_at TIMESTAMPTZ;

-- Comprova si l'usuari té els 50 reward_items i atorga el distintiu (atòmic + idempotent)
CREATE OR REPLACE FUNCTION public.check_collection_master(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _already TIMESTAMPTZ;
  _total INT;
  _owned INT;
BEGIN
  SELECT collection_master_at INTO _already FROM public.profiles WHERE user_id = _user_id;
  IF _already IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*) INTO _total FROM public.reward_items;
  SELECT COUNT(DISTINCT reward_item_id) INTO _owned
  FROM public.player_rewards
  WHERE user_id = _user_id;

  IF _total > 0 AND _owned >= _total THEN
    UPDATE public.profiles
      SET collection_master_at = now()
      WHERE user_id = _user_id AND collection_master_at IS NULL;
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;

-- Trigger AFTER INSERT a player_rewards
CREATE OR REPLACE FUNCTION public.trg_check_collection_master()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.check_collection_master(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS player_rewards_collection_master ON public.player_rewards;
CREATE TRIGGER player_rewards_collection_master
AFTER INSERT ON public.player_rewards
FOR EACH ROW
EXECUTE FUNCTION public.trg_check_collection_master();

-- Backfill: si algú JA té els 50 d'abans d'aquesta migració
DO $$
DECLARE _u RECORD;
BEGIN
  FOR _u IN SELECT user_id FROM public.profiles WHERE collection_master_at IS NULL
  LOOP
    PERFORM public.check_collection_master(_u.user_id);
  END LOOP;
END $$;