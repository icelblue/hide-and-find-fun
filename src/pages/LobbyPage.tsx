import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { createGame, getAvailableGames, joinGame } from "@/lib/supabase-helpers";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function LobbyPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadGames();
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setProfile(data);
  };

  const loadGames = async () => {
    try {
      const data = await getAvailableGames();
      // Filter out own games
      setGames(data?.filter((g: any) => g.created_by !== user?.id) ?? []);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Also load active games for this user
  const [myGames, setMyGames] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    const loadMyGames = async () => {
      const { data } = await supabase
        .from("game_players")
        .select("game_id, games!inner(id, code, status, created_by)")
        .eq("user_id", user.id);
      setMyGames(data ?? []);
    };
    loadMyGames();
  }, [user]);

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
        .from("games")
        .select("id, status")
        .eq("code", joinCode.toUpperCase())
        .single();

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
    bronze: "🥉",
    silver: "🥈",
    gold: "🥇",
    platinum: "💎",
    diamond: "👑",
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">🔍 Deduction Duel</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.display_name} · {leagueBadge[profile?.league ?? "bronze"]} {profile?.league}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
            👤
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            🚪
          </Button>
        </div>
      </div>

      {/* Create Game */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <Button onClick={handleCreate} className="w-full" disabled={loading}>
            ➕ Crear partida
          </Button>
        </CardContent>
      </Card>

      {/* Join by code */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-2">Unir-se amb codi</p>
          <div className="flex gap-2">
            <Input
              placeholder="CODI 6 dígits"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="uppercase tracking-widest font-mono"
            />
            <Button onClick={handleJoinByCode} disabled={loading || joinCode.length < 4}>
              Unir-se
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My active games */}
      {myGames.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">
            Les meves partides
          </h2>
          <div className="space-y-2">
            {myGames.map((gp: any) => {
              const game = gp.games;
              return (
                <Card
                  key={gp.game_id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/game/${game.id}`)}
                >
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm">{game.code}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {game.status === "waiting" && "⏳ Esperant rival"}
                        {game.status === "hiding" && "🫣 Amagant"}
                        {game.status === "playing" && "🎮 Jugant"}
                        {game.status === "finished" && "🏁 Acabada"}
                      </span>
                    </div>
                    <span className="text-sm">→</span>
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
          <h2 className="text-sm font-semibold text-muted-foreground">
            Partides disponibles
          </h2>
          <button onClick={loadGames} className="text-xs text-primary">
            🔄 Actualitzar
          </button>
        </div>
        {games.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No hi ha partides disponibles. Crea'n una!
          </p>
        ) : (
          <div className="space-y-2">
            {games.map((game: any) => (
              <Card key={game.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm">{game.code}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      per {game.creator_name ?? "Anònim"}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => handleJoinGame(game.id)} disabled={loading}>
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
