-- Funció per eliminar el compte de l'usuari autenticat
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _deleted_counts jsonb := '{}'::jsonb;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Cancel·lar partides en curs (waiting/hiding/playing) on participa
  UPDATE public.games
  SET status = 'finished', winner_id = NULL, updated_at = now()
  WHERE status IN ('waiting', 'hiding', 'playing')
    AND (created_by = _user_id 
         OR invited_user_id = _user_id
         OR id IN (SELECT game_id FROM public.game_players WHERE user_id = _user_id));

  -- 2. Anonimitzar partides finalitzades (mantenir històric del rival)
  -- Si era el creador, posem creator a NULL
  UPDATE public.games
  SET created_by = '00000000-0000-0000-0000-000000000000'::uuid
  WHERE created_by = _user_id AND status = 'finished';
  
  UPDATE public.games
  SET invited_user_id = NULL
  WHERE invited_user_id = _user_id;
  
  UPDATE public.games
  SET winner_id = NULL
  WHERE winner_id = _user_id;

  -- 3. Esborrar dades pròpies de partides
  DELETE FROM public.game_players WHERE user_id = _user_id;
  DELETE FROM public.game_moves WHERE player_id = _user_id;
  DELETE FROM public.game_social_items WHERE from_player_id = _user_id OR to_player_id = _user_id;

  -- 4. Anonimitzar wall messages (mantenir text però treure autoria)
  UPDATE public.wall_messages
  SET author_user_id = '00000000-0000-0000-0000-000000000000'::uuid
  WHERE author_user_id = _user_id;
  
  -- Esborrar els missatges del propi mur (els que altres li han deixat)
  DELETE FROM public.wall_messages WHERE target_user_id = _user_id;

  -- 5. Alliberar reward_items col·locats (tornen a estar disponibles)
  UPDATE public.reward_items
  SET placed_by = NULL, placed_in_scenario_id = NULL, placed_at = NULL
  WHERE placed_by = _user_id;

  -- 6. Esborrar referrals (com a referrer o referred)
  DELETE FROM public.referrals 
  WHERE referrer_user_id = _user_id OR referred_user_id = _user_id;

  -- 7. Esborrar totes les dades pròpies
  DELETE FROM public.player_inventory WHERE user_id = _user_id OR gifted_to = _user_id;
  DELETE FROM public.player_rewards WHERE user_id = _user_id;
  DELETE FROM public.story_progress WHERE user_id = _user_id;
  DELETE FROM public.player_pets WHERE user_id = _user_id;
  DELETE FROM public.pet_accessories WHERE user_id = _user_id;
  DELETE FROM public.pet_consumables WHERE user_id = _user_id;
  DELETE FROM public.pet_events WHERE user_id = _user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = _user_id;
  DELETE FROM public.email_reminders_log WHERE user_id = _user_id;
  DELETE FROM public.error_logs WHERE user_id = _user_id;

  -- 8. Esborrar perfil (últim, per mantenir referències mentre netegem)
  DELETE FROM public.profiles WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', _user_id,
    'message', 'All user data deleted'
  );
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;