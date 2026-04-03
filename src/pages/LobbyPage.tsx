// ============================================================
// LobbyPage.tsx — Pantalla principal (matchmaking)
// ============================================================
// Funcionalitats:
//   - Header amb nom, lliga i botons (ajuda, perfil, logout)
//   - Botó "Rival aleatori" → findRandomMatch()
//   - Botó "Crear partida" → createGame() (pública)
//   - Cerca de jugadors per nom → challengePlayer() (repte privat)
//   - Unir-se per codi de 6 caràcters
//   - Llista "Les meves partides" (inclou reptes pendents)
//   - Llista "Partides obertes" (públiques d'altres jugadors)
//
// Dades: TanStack Query amb cache (15-60s staleTime) + refetch
// Realtime: No — l'usuari refresca manualment o amb interval
// ============================================================

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import {
  createGame, getAvailableGames, joinGame, getMyGames, deleteGame,
  findRandomMatch, searchPlayers, challengePlayer,
} from "@/lib/supabase-helpers";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { HelpButton } from "@/components/HelpButton";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/lib/constants";

const leagueBadge: Record<string, string> = {
  bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "💎", diamond: "👑",
};

export default function LobbyPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const { data: games = [] } = useQuery({
    queryKey: ["lobby", "available", user?.id],
    queryFn: () => getAvailableGames(user!.id),
    enabled: !!user,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const { data: myGames = [] } = useQuery({
    queryKey: ["lobby", "myGames", user?.id],
    queryFn: () => getMyGames(user!.id),
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  const { data: profile = null } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const invalidateLobby = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["lobby"] });
  }, [queryClient]);

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const game = await createGame(user.id);
      toast.success(`Partida creada! Codi: ${game.code}`);
      navigate(`/game/${game.id}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleRandomMatch = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await findRandomMatch(user.id);
      if (result.type === "joined") {
        toast.success("Rival trobat! 🎯");
      } else {
        toast.success("Repte enviat a un rival aleatori! Espera que accepti.");
      }
      navigate(`/game/${result.gameId}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
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
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleJoinGame = async (gameId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await joinGame(gameId, user.id);
      toast.success("T'has unit a la partida!");
      navigate(`/game/${gameId}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleDeclineGame = async (gameId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await deleteGame(gameId);
      toast.success("Repte rebutjat");
      invalidateLobby();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleSearch = async () => {
    if (!user || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const results = await searchPlayers(searchQuery, user.id);
      setSearchResults(results);
      if (results.length === 0) toast.info("Cap jugador trobat");
    } catch (err: any) { toast.error(err.message); }
    finally { setSearching(false); }
  };

  const handleChallenge = async (rivalUserId: string, rivalName: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const game = await challengePlayer(user.id, rivalUserId);
      toast.success(`⚔️ Repte enviat a ${rivalName}! Codi: ${game.code}`);
      navigate(`/game/${game.id}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-20 relative">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
          <h1 className="text-xl text-neon">🔍 DEDUCTION DUEL</h1>
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

      {/* Main actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button onClick={handleRandomMatch} size="lg" disabled={loading} className="h-14">
          <span className="flex flex-col items-center">
            <span className="text-lg">🎲</span>
            <span className="text-xs mt-0.5">Rival aleatori</span>
          </span>
        </Button>
        <Button onClick={handleCreate} size="lg" disabled={loading} variant="secondary" className="h-14">
          <span className="flex flex-col items-center">
            <span className="text-lg">➕</span>
            <span className="text-xs mt-0.5">Crear partida</span>
          </span>
        </Button>
      </div>

      {/* Search rival */}
      <Card className="mb-4 glass">
        <CardContent className="pt-3 pb-3">
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Buscar jugador per nom..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-sm bg-muted/50 border-border/50"
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <Button size="sm" onClick={handleSearch} disabled={searching || searchQuery.length < 2}>
              {searching ? "..." : "🔍"}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto mt-2">
              {searchResults.map((p: any) => (
                <div key={p.user_id} className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2 border border-border/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{leagueBadge[p.league] ?? "🥉"}</span>
                    <div className="min-w-0">
                      <button
                        onClick={() => navigate(`/player/${p.user_id}`)}
                        className="text-sm font-semibold hover:text-primary transition-colors truncate block"
                      >
                        {p.display_name}
                      </button>
                      <span className="text-[10px] text-muted-foreground">Elo {p.elo}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs shrink-0"
                    onClick={() => handleChallenge(p.user_id, p.display_name)}
                    disabled={loading}>
                    ⚔️ Repte
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Join by code */}
      <Card className="mb-5 glass">
        <CardContent className="pt-3 pb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Unir-se amb codi</p>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: A3B7K2"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="uppercase tracking-[0.25em] font-mono text-center text-lg bg-muted/50 border-border/50 h-11"
            />
            <Button onClick={handleJoinByCode} disabled={loading || joinCode.length < 4} variant="secondary">
              Entrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My games (includes invites/challenges) */}
      {myGames.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Les meves partides
          </h2>
          <div className="space-y-2">
            {myGames.map((gp: any) => {
              const game = gp.games;
              const isPending = gp._pending; // Invited but not yet joined
              const statusMap: Record<string, { icon: string; label: string; color: string }> = {
                waiting: { icon: "⏳", label: "Esperant rival", color: "text-warning" },
                hiding: { icon: "🫣", label: "Amaga l'objecte", color: "text-accent" },
                playing: { icon: "🎮", label: "En joc", color: "text-primary" },
                finished: { icon: "🏁", label: "Acabada", color: "text-muted-foreground" },
              };
              const creatorName = gp._creator_name ?? "Anònim";
              const s = isPending
                ? { icon: "⚔️", label: `Repte pendent`, color: "text-accent" }
                : (statusMap[game.status] ?? statusMap.waiting);

              return (
                <Card key={gp.game_id}
                  className={`glass transition-all ${isPending ? "border-accent/40 glow-accent" : "cursor-pointer hover:border-primary/40 hover:glow-primary"}`}
                  onClick={() => !isPending && navigate(`/game/${game.id}`)}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{s.icon}</span>
                      <div>
                        {isPending && (
                          <p className="text-sm font-bold text-accent">{creatorName} et reta!</p>
                        )}
                        <span className="font-mono text-sm font-semibold tracking-wider">{game.code}</span>
                        <p className={`text-[11px] ${s.color}`}>{s.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPending && (
                        <>
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); handleJoinGame(game.id); }} disabled={loading}>
                            Acceptar
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); handleDeclineGame(game.id); }}
                            disabled={loading}>
                            ✕
                          </Button>
                        </>
                      )}
                      {!isPending && game.status === "waiting" && game.created_by === user?.id && (
                        <Button variant="ghost" size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await deleteGame(game.id);
                              toast.success("Partida eliminada");
                              invalidateLobby();
                            } catch (err: any) { toast.error(err.message); }
                          }}>🗑️</Button>
                      )}
                      {!isPending && <span className="text-muted-foreground text-xs">→</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available public games */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Partides obertes
          </h2>
          <Button variant="ghost" size="sm" onClick={invalidateLobby} className="text-xs">🔄</Button>
        </div>
        {games.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2 opacity-60">🏜️</div>
            <p className="text-sm text-muted-foreground font-medium">Cap partida disponible</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Usa 🎲 per trobar rival automàticament!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {games.map((game: any) => (
              <Card key={game.id} className="glass hover:border-secondary/40 transition-all">
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm font-semibold tracking-wider">{game.code}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">per {game.creator_name}</span>
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
      <p className="text-center text-[10px] text-muted-foreground/50 mt-4 pb-2">v{APP_VERSION}</p>
    </div>
  );
}
