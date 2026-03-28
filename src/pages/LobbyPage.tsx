import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { createGame, getAvailableGames, joinGame, getMyGames } from "@/lib/supabase-helpers";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { HelpButton } from "@/components/HelpButton";
import { supabase } from "@/integrations/supabase/client";

export default function LobbyPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<any[]>([]);
  const [myGames, setMyGames] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [available, mine, prof] = await Promise.all([
      getAvailableGames(user.id).catch(() => []),
      getMyGames(user.id),
      supabase.from("profiles").select("*").eq("user_id", user.id).single().then(r => r.data),
    ]);
    setGames(available);
    setMyGames(mine);
    setProfile(prof);
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const game = await createGame(user.id);
      toast.success(`Partida creada! Codi: ${game.code}`);
      navigate(`/game/${game.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!user || !joinCode) return;
    setLoading(true);
    try {
      const { data: game } = await supabase
        .from("games").select("id, status")
        .eq("code", joinCode.toUpperCase()).single();
      if (!game) throw new Error("Partida no trobada");
      if (game.status !== "waiting") throw new Error("Aquesta partida ja ha començat");
      await joinGame(game.id, user.id);
      toast.success("T'has unit a la partida!");
      navigate(`/game/${game.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await joinGame(gameId, user.id);
      toast.success("T'has unit a la partida!");
      navigate(`/game/${gameId}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const leagueBadge: Record<string, string> = {
    bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "💎", diamond: "👑",
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-20 relative">
      {/* BG glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
          <h1 className="text-xl font-bold text-gradient">🔍 Deduction Duel</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profile?.display_name && (
              <span className="text-foreground/80 font-medium">{profile.display_name}</span>
            )}
            {profile?.league && (
              <span className="ml-1.5">{leagueBadge[profile.league]} <span className="capitalize">{profile.league}</span></span>
            )}
          </p>
        </div>
        <div className="flex gap-1">
          <HelpButton />
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className="rounded-xl">👤</Button>
          <Button variant="ghost" size="icon" onClick={signOut} className="rounded-xl">🚪</Button>
        </div>
      </div>

      {/* Create */}
      <Button onClick={handleCreate} className="w-full mb-4" size="lg" disabled={loading}>
        ➕ Crear partida nova
      </Button>

      {/* Join by code */}
      <Card className="mb-6 glass">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Unir-se amb codi</p>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: A3B7K2"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="uppercase tracking-[0.25em] font-mono text-center text-lg bg-muted/50 border-border/50 h-11"
            />
            <Button onClick={handleJoinByCode} disabled={loading || joinCode.length < 4} variant="secondary">
              Entrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My games */}
      {myGames.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Les meves partides
          </h2>
          <div className="space-y-2">
            {myGames.map((gp: any) => {
              const game = gp.games;
              const statusMap: Record<string, { icon: string; label: string; color: string }> = {
                waiting: { icon: "⏳", label: "Esperant rival", color: "text-warning" },
                hiding: { icon: "🫣", label: "Amaga l'objecte", color: "text-accent" },
                playing: { icon: "🎮", label: "En joc", color: "text-primary" },
                finished: { icon: "🏁", label: "Acabada", color: "text-muted-foreground" },
              };
              const s = statusMap[game.status] ?? statusMap.waiting;
              return (
                <Card
                  key={gp.game_id}
                  className="cursor-pointer glass hover:border-primary/40 transition-all hover:glow-primary"
                  onClick={() => navigate(`/game/${game.id}`)}
                >
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{s.icon}</span>
                      <div>
                        <span className="font-mono text-sm font-semibold tracking-wider">{game.code}</span>
                        <p className={`text-[11px] ${s.color}`}>{s.label}</p>
                      </div>
                    </div>
                    <span className="text-muted-foreground text-xs">→</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available games */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Partides obertes
          </h2>
          <Button variant="ghost" size="sm" onClick={loadAll} className="text-xs">🔄</Button>
        </div>
        {games.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3 opacity-60">🏜️</div>
            <p className="text-sm text-muted-foreground font-medium">Cap partida disponible</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Crea'n una o comparteix el teu codi!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {games.map((game: any) => (
              <Card key={game.id} className="glass hover:border-secondary/40 transition-all">
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm font-semibold tracking-wider">{game.code}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      per {game.creator_name}
                    </span>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleJoinGame(game.id)} disabled={loading}>
                    Unir-se
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
