
-- 1. PROFILES: Restrict UPDATE to only display_name and avatar_url
-- Drop old broad policy
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;

-- Revoke general UPDATE, grant only on safe columns
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;

-- Re-create restricted update policy
CREATE POLICY "Update own profile display"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. GAME_PLAYERS: Hide opponent hidden fields via a secure view approach
-- Replace SELECT policy: own rows = full access, opponent rows = mask hidden fields
-- Since RLS can't do column-level filtering, we use a SECURITY DEFINER function

-- Create function to safely get game players (masks opponent hidden data)
CREATE OR REPLACE FUNCTION public.get_safe_game_players(_game_id uuid)
RETURNS TABLE (
  id uuid,
  game_id uuid,
  user_id uuid,
  current_scenario_id uuid,
  has_hidden boolean,
  tokens_remaining numeric,
  tokens_last_reset date,
  bonus_tokens_added numeric,
  tools jsonb,
  shield_active boolean,
  smoke_bomb_used boolean,
  social_item_used_today boolean,
  special_data jsonb,
  created_at timestamptz,
  hidden_object_id uuid,
  hidden_item_id uuid,
  hidden_position position_type
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _game_status game_status;
BEGIN
  -- Check caller is in the game
  IF NOT is_player_in_game(auth.uid(), _game_id) THEN
    RAISE EXCEPTION 'Not a participant in this game';
  END IF;

  -- Get game status
  SELECT g.status INTO _game_status FROM games g WHERE g.id = _game_id;

  RETURN QUERY
  SELECT
    gp.id, gp.game_id, gp.user_id, gp.current_scenario_id,
    gp.has_hidden, gp.tokens_remaining, gp.tokens_last_reset,
    gp.bonus_tokens_added, gp.tools, gp.shield_active,
    gp.smoke_bomb_used, gp.social_item_used_today,
    gp.special_data, gp.created_at,
    -- Only show hidden fields for own rows OR when game is finished
    CASE WHEN gp.user_id = auth.uid() OR _game_status = 'finished' 
         THEN gp.hidden_object_id ELSE NULL END,
    CASE WHEN gp.user_id = auth.uid() OR _game_status = 'finished'
         THEN gp.hidden_item_id ELSE NULL END,
    CASE WHEN gp.user_id = auth.uid() OR _game_status = 'finished'
         THEN gp.hidden_position ELSE NULL END
  FROM game_players gp
  WHERE gp.game_id = _game_id;
END;
$$;

-- 3. STORAGE: Add RLS policies for backups bucket (service_role only)
CREATE POLICY "Service role only - select backups"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'backups' AND (SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role only - insert backups"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'backups' AND (SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role only - delete backups"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'backups' AND (SELECT auth.role()) = 'service_role');

-- 4. ERROR_LOGS: Remove anon insert policy to prevent log flooding
DROP POLICY IF EXISTS "Insert anon errors" ON public.error_logs;
