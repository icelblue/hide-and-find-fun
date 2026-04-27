-- Millora handle_new_user per llegir el nom de Google (full_name / name)
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
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), ''),
    'Player'
  );
  _code := public.generate_referral_code(_display_name);

  INSERT INTO public.profiles (user_id, display_name, referral_code, last_active_at)
  VALUES (NEW.id, _display_name, _code, now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;