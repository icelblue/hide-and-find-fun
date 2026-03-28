import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  if (!profile) return null;

  const leagueInfo: Record<string, { icon: string; color: string; next: string; eloNeeded: number }> = {
    bronze: { icon: "🥉", color: "text-orange-600", next: "Silver", eloNeeded: 1200 },
    silver: { icon: "🥈", color: "text-gray-400", next: "Gold", eloNeeded: 1400 },
    gold: { icon: "🥇", color: "text-yellow-500", next: "Platinum", eloNeeded: 1600 },
    platinum: { icon: "💎", color: "text-blue-400", next: "Diamond", eloNeeded: 1800 },
    diamond: { icon: "👑", color: "text-purple-500", next: "—", eloNeeded: 9999 },
  };

  const league = leagueInfo[profile.league] ?? leagueInfo.bronze;
  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <button onClick={() => navigate("/")} className="text-sm text-muted-foreground mb-4">
        ← Lobby
      </button>

      <div className="text-center mb-6">
        <div className="text-6xl mb-2">{league.icon}</div>
        <h1 className="text-2xl font-bold">{profile.display_name}</h1>
        <p className={`text-sm font-semibold ${league.color} capitalize`}>
          {profile.league} League
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold">{profile.games_played}</div>
            <div className="text-xs text-muted-foreground">Partides</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold">{profile.games_won}</div>
            <div className="text-xs text-muted-foreground">Victòries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold">{winRate}%</div>
            <div className="text-xs text-muted-foreground">Win rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold">{profile.best_streak}🔥</div>
            <div className="text-xs text-muted-foreground">Millor ratxa</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Elo</span>
            <span className="font-bold">{profile.elo}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${Math.min(((profile.elo % 200) / 200) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {league.eloNeeded - profile.elo > 0
              ? `${league.eloNeeded - profile.elo} Elo per pujar a ${league.next}`
              : "Rang màxim!"}
          </p>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={signOut}>
        🚪 Tancar sessió
      </Button>
    </div>
  );
}
