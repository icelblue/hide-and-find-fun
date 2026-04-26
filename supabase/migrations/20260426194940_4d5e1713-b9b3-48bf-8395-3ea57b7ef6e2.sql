
-- ============================================================
-- 1. Afegir columnes a profiles
-- ============================================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active_at);

-- ============================================================
-- 2. Funció: generar codi de referral únic
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_referral_code(_display_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base TEXT;
  _suffix TEXT;
  _code TEXT;
  _attempts INT := 0;
BEGIN
  -- Base: primeres 6 lletres del display_name (alfanumèriques majúscules)
  _base := UPPER(REGEXP_REPLACE(COALESCE(_display_name, 'PLAYER'), '[^a-zA-Z0-9]', '', 'g'));
  IF LENGTH(_base) < 3 THEN _base := 'PLAYER'; END IF;
  _base := SUBSTRING(_base, 1, 6);
  
  -- Provar fins a 10 cops amb sufix aleatori
  LOOP
    _suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 4));
    _code := _base || '-' || _suffix;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = _code) THEN
      RETURN _code;
    END IF;
    
    _attempts := _attempts + 1;
    EXIT WHEN _attempts >= 10;
  END LOOP;
  
  -- Fallback amb timestamp
  RETURN _base || '-' || SUBSTRING(EXTRACT(EPOCH FROM now())::TEXT, 7, 4);
END;
$$;

-- ============================================================
-- 3. Backfill: assignar codi a usuaris existents
-- ============================================================
UPDATE public.profiles
SET referral_code = public.generate_referral_code(display_name)
WHERE referral_code IS NULL;

-- ============================================================
-- 4. Trigger handle_new_user actualitzat per assignar codi
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _display_name TEXT;
  _code TEXT;
BEGIN
  _display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    SPLIT_PART(NEW.email, '@', 1),
    'Player'
  );
  _code := public.generate_referral_code(_display_name);
  
  INSERT INTO public.profiles (user_id, display_name, referral_code, last_active_at)
  VALUES (NEW.id, _display_name, _code, now())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. Taula referrals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'signed_up',
  -- 'signed_up' | 'first_game' | 'active' (5+ partides) | 'rewarded_final'
  signup_reward_given BOOLEAN NOT NULL DEFAULT false,
  first_game_reward_given BOOLEAN NOT NULL DEFAULT false,
  active_reward_given BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_user_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own referrals (as referrer or referred)"
ON public.referrals FOR SELECT TO authenticated
USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

-- Insert/update només via funcions security definer

-- ============================================================
-- 6. Taula email_reminders_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_reminders_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reminder_type TEXT NOT NULL, -- 'inactive_30d' | 'inactive_90d' | 'inactive_180d'
  bonus_tokens INT NOT NULL DEFAULT 0,
  bonus_reward_rarity TEXT, -- 'rare' | 'epic' | NULL
  claim_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.email_reminders_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_token ON public.email_reminders_log(claim_token);

ALTER TABLE public.email_reminders_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own reminders"
ON public.email_reminders_log FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- 7. Funció: registrar un referral (cridada des del client després del signup)
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_referral(_referral_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referred_user_id UUID := auth.uid();
  _referrer_user_id UUID;
  _existing_referral UUID;
BEGIN
  IF _referred_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  
  -- Buscar referrer pel codi
  SELECT user_id INTO _referrer_user_id 
  FROM public.profiles 
  WHERE referral_code = UPPER(_referral_code);
  
  IF _referrer_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_code');
  END IF;
  
  -- No es pot referenciar a si mateix
  IF _referrer_user_id = _referred_user_id THEN
    RETURN jsonb_build_object('error', 'self_referral');
  END IF;
  
  -- Comprovar si ja existeix
  SELECT id INTO _existing_referral 
  FROM public.referrals 
  WHERE referred_user_id = _referred_user_id;
  
  IF _existing_referral IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'already_referred');
  END IF;
  
  -- Crear referral i atorgar tokens benvinguda al convidat (+5)
  INSERT INTO public.referrals (referrer_user_id, referred_user_id, referral_code, signup_reward_given)
  VALUES (_referrer_user_id, _referred_user_id, UPPER(_referral_code), true);
  
  -- +5 tokens al convidat
  UPDATE public.profiles 
  SET bonus_tokens = bonus_tokens + 5 
  WHERE user_id = _referred_user_id;
  
  -- +3 tokens al referrer
  UPDATE public.profiles 
  SET bonus_tokens = bonus_tokens + 3 
  WHERE user_id = _referrer_user_id;
  
  RETURN jsonb_build_object('success', true, 'referrer_id', _referrer_user_id);
END;
$$;

-- ============================================================
-- 8. Funció: comprovar milestones quan un convidat juga
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_referral_milestones(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _games_played INT;
  _referral RECORD;
  _active_count INT;
  _legendary_id UUID;
  _epic_id UUID;
  _rare_id UUID;
  _common_id UUID;
BEGIN
  -- Quants jocs ha jugat aquest usuari?
  SELECT games_played INTO _games_played 
  FROM public.profiles WHERE user_id = _user_id;
  
  -- Veure si està referenciat
  SELECT * INTO _referral 
  FROM public.referrals WHERE referred_user_id = _user_id;
  
  IF _referral IS NULL THEN RETURN; END IF;
  
  -- Milestone 1: primera partida (+10 tokens al referrer, +1 ítem comú al convidat)
  IF _games_played >= 1 AND NOT _referral.first_game_reward_given THEN
    UPDATE public.profiles 
    SET bonus_tokens = bonus_tokens + 10 
    WHERE user_id = _referral.referrer_user_id;
    
    -- Ítem comú al convidat
    SELECT id INTO _common_id FROM public.reward_items WHERE rarity = 'common' ORDER BY RANDOM() LIMIT 1;
    IF _common_id IS NOT NULL THEN
      INSERT INTO public.player_rewards (user_id, reward_item_id, status)
      VALUES (_user_id, _common_id, 'owned');
    END IF;
    
    UPDATE public.referrals 
    SET first_game_reward_given = true, status = 'first_game', updated_at = now()
    WHERE id = _referral.id;
  END IF;
  
  -- Milestone 2: 5+ partides (+1 ítem rar al referrer)
  IF _games_played >= 5 AND NOT _referral.active_reward_given THEN
    SELECT id INTO _rare_id FROM public.reward_items WHERE rarity = 'rare' ORDER BY RANDOM() LIMIT 1;
    IF _rare_id IS NOT NULL THEN
      INSERT INTO public.player_rewards (user_id, reward_item_id, status)
      VALUES (_referral.referrer_user_id, _rare_id, 'owned');
    END IF;
    
    UPDATE public.referrals 
    SET active_reward_given = true, status = 'active', updated_at = now()
    WHERE id = _referral.id;
    
    -- Comprovar milestones de quantitat per al referrer
    SELECT COUNT(*) INTO _active_count 
    FROM public.referrals 
    WHERE referrer_user_id = _referral.referrer_user_id 
      AND active_reward_given = true;
    
    -- 3 amics actius → èpic
    IF _active_count = 3 THEN
      SELECT id INTO _epic_id FROM public.reward_items WHERE rarity = 'epic' ORDER BY RANDOM() LIMIT 1;
      IF _epic_id IS NOT NULL THEN
        INSERT INTO public.player_rewards (user_id, reward_item_id, status)
        VALUES (_referral.referrer_user_id, _epic_id, 'owned');
      END IF;
    END IF;
    
    -- 5 amics actius → llegendari
    IF _active_count = 5 THEN
      SELECT id INTO _legendary_id FROM public.reward_items WHERE rarity = 'legendary' ORDER BY RANDOM() LIMIT 1;
      IF _legendary_id IS NOT NULL THEN
        INSERT INTO public.player_rewards (user_id, reward_item_id, status)
        VALUES (_referral.referrer_user_id, _legendary_id, 'owned');
      END IF;
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- 9. Trigger: actualitzar last_active_at i comprovar milestones quan partida acaba
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_game_finished_referral_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _player RECORD;
BEGIN
  -- Només quan passa a 'finished'
  IF NEW.status = 'finished' AND (OLD.status IS DISTINCT FROM 'finished') THEN
    FOR _player IN 
      SELECT user_id FROM public.game_players WHERE game_id = NEW.id
    LOOP
      -- Actualitzar last_active_at
      UPDATE public.profiles 
      SET last_active_at = now() 
      WHERE user_id = _player.user_id;
      
      -- Comprovar milestones de referral
      PERFORM public.check_referral_milestones(_player.user_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_game_finished_referral ON public.games;
CREATE TRIGGER trg_on_game_finished_referral
AFTER UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.on_game_finished_referral_check();

-- ============================================================
-- 10. Funció: reclamar bonus de recordatori (via token)
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_reminder_bonus(_claim_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reminder RECORD;
  _user_id UUID := auth.uid();
  _reward_id UUID;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  
  SELECT * INTO _reminder 
  FROM public.email_reminders_log 
  WHERE claim_token = _claim_token AND user_id = _user_id;
  
  IF _reminder IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;
  
  IF _reminder.claimed THEN
    RETURN jsonb_build_object('error', 'already_claimed');
  END IF;
  
  IF _reminder.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;
  
  -- Atorgar bonus tokens
  UPDATE public.profiles 
  SET bonus_tokens = bonus_tokens + _reminder.bonus_tokens 
  WHERE user_id = _user_id;
  
  -- Atorgar ítem opcional segons rarity
  IF _reminder.bonus_reward_rarity IS NOT NULL THEN
    SELECT id INTO _reward_id 
    FROM public.reward_items 
    WHERE rarity::TEXT = _reminder.bonus_reward_rarity 
    ORDER BY RANDOM() LIMIT 1;
    
    IF _reward_id IS NOT NULL THEN
      INSERT INTO public.player_rewards (user_id, reward_item_id, status)
      VALUES (_user_id, _reward_id, 'owned');
    END IF;
  END IF;
  
  -- Marcar com reclamat
  UPDATE public.email_reminders_log 
  SET claimed = true, claimed_at = now() 
  WHERE id = _reminder.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'tokens', _reminder.bonus_tokens,
    'reward_rarity', _reminder.bonus_reward_rarity
  );
END;
$$;

-- ============================================================
-- 11. Funció: obtenir candidats per rebre recordatori (cridada des d'edge function)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_inactive_users_for_reminder()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  days_inactive INT,
  reminder_type TEXT,
  bonus_tokens INT,
  bonus_reward_rarity TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    EXTRACT(DAY FROM (now() - p.last_active_at))::INT AS days_inactive,
    CASE 
      WHEN now() - p.last_active_at >= INTERVAL '180 days' THEN 'inactive_180d'
      WHEN now() - p.last_active_at >= INTERVAL '90 days' THEN 'inactive_90d'
      WHEN now() - p.last_active_at >= INTERVAL '30 days' THEN 'inactive_30d'
    END AS reminder_type,
    CASE 
      WHEN now() - p.last_active_at >= INTERVAL '180 days' THEN 20
      WHEN now() - p.last_active_at >= INTERVAL '90 days' THEN 10
      ELSE 5
    END AS bonus_tokens,
    CASE 
      WHEN now() - p.last_active_at >= INTERVAL '180 days' THEN 'epic'
      WHEN now() - p.last_active_at >= INTERVAL '90 days' THEN 'rare'
      ELSE NULL
    END AS bonus_reward_rarity
  FROM public.profiles p
  WHERE p.last_active_at < (now() - INTERVAL '30 days')
    AND (p.last_reminder_sent_at IS NULL OR p.last_reminder_sent_at < (now() - INTERVAL '60 days'));
END;
$$;
