
-- Add invited_user_id to games for direct challenges
ALTER TABLE public.games ADD COLUMN invited_user_id uuid DEFAULT NULL;
