
-- Fix broken RLS policy on games
DROP POLICY IF EXISTS "Update own games" ON public.games;
CREATE POLICY "Update own games" ON public.games FOR UPDATE TO authenticated USING (
  auth.uid() = created_by OR auth.uid() IN (SELECT user_id FROM public.game_players WHERE game_players.game_id = games.id)
);

-- Recreate triggers (they may not have been applied)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_games_updated_at ON public.games;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
