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
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">🔍 Deduction Duel</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.display_name} · {leagueBadge[profile?.league ?? "bronze"]} {profile?.league}
          </p>
        </div>
        <div className="flex gap-1">
          <HelpButton />
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>👤</Button>
          <Button variant="ghost" size="icon" onClick={signOut}>🚪</Button>
        </div>
      </div>

      {/* Create */}
      <Button onClick={handleCreate} className="w-full mb-4" size="lg" disabled={loading}>
        ➕ Crear partida nova
      </Button>

      {/* Join by code */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-2">Unir-se amb codi</p>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: A3B7K2"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="uppercase tracking-[0.2em] font-mono text-center text-lg"
            />
            <Button onClick={handleJoinByCode} disabled={loading || joinCode.length < 4}>
              Entrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My games */}
      {myGames.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Les meves partides
          </h2>
          <div className="space-y-2">
            {myGames.map((gp: any) => {
              const game = gp.games;
              const statusMap: Record<string, { icon: string; label: string }> = {
                waiting: { icon: "⏳", label: "Esperant rival" },
                hiding: { icon: "🫣", label: "Amaga l'objecte" },
                playing: { icon: "🎮", label: "En joc" },
                finished: { icon: "🏁", label: "Acabada" },
              };
              const s = statusMap[game.status] ?? statusMap.waiting;
              return (
                <Card
                  key={gp.game_id}
                  className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-sm"
                  onClick={() => navigate(`/game/${game.id}`)}
                >
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{s.icon}</span>
                      <div>
                        <span className="font-mono text-sm font-medium">{game.code}</span>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    </div>
                    <span className="text-muted-foreground">→</span>
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
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Partides obertes
          </h2>
          <Button variant="ghost" size="sm" onClick={loadAll}>🔄</Button>
        </div>
        {games.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-2">🏜️</div>
            <p className="text-sm text-muted-foreground">Cap partida disponible</p>
            <p className="text-xs text-muted-foreground">Crea'n una o comparteix el teu codi!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {games.map((game: any) => (
              <Card key={game.id} className="hover:border-primary/50 transition-all">
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm font-medium">{game.code}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
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
