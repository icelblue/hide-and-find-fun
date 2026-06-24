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

import { useState, useCallback, useRef, useEffect } from "react";
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
import { InstallBanner } from "@/components/InstallBanner";
import { useT } from "@/i18n/LanguageProvider";
import { LanguageSwitcherCompact } from "@/i18n/LanguageSwitcher";


const DISMISSED_GAMES_KEY = "dd_dismissed_games";

const leagueBadge: Record<string, string> = {
  bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "💎", diamond: "👑",
};

/** Extracted component so we can use useState legally (not inside .map) */
function MyGameCard({ gp, userId, loading, onNavigate, onJoin, onDecline, onDelete, onDismiss }: {
  gp: any; userId?: string; loading: boolean;
  onNavigate: (id: string) => void; onJoin: (id: string) => Promise<void>;
  onDecline: (id: string) => Promise<void>; onDelete: (id: string) => Promise<void>;
  onDismiss: (id: string) => void;
}) {
  const t = useT();
  const [swiped, setSwiped] = useState(false);
  const game = gp.games;
  const isPending = gp._pending;
  const statusMap: Record<string, { icon: string; label: string; color: string }> = {
    waiting: { icon: "⏳", label: t("lobby.statusWaiting"), color: "text-warning" },
    hiding: { icon: "🫣", label: t("lobby.statusHiding"), color: "text-accent" },
    playing: { icon: "🎮", label: t("lobby.statusPlaying"), color: "text-primary" },
    finished: { icon: "🏁", label: t("lobby.statusFinished"), color: "text-muted-foreground" },
  };
  const creatorName = gp._creator_name ?? t("lobby.anonymous");
  const s = isPending
    ? { icon: "⚔️", label: t("lobby.pendingChallenge"), color: "text-accent" }
    : (statusMap[game.status] ?? statusMap.waiting);

  const isOwner = game.created_by === userId;
  const canSwipeDelete = isOwner && (game.status === "waiting" || game.status === "finished");
  const isFinished = game.status === "finished";

  return (
    <div className="relative overflow-hidden rounded-xl">
      {(canSwipeDelete || isFinished) && (
        <div data-delete-bg className="absolute inset-0 bg-destructive/20 rounded-xl flex items-center pl-4 opacity-0 transition-opacity pointer-events-none z-0">
          <span className="text-destructive text-sm font-semibold flex items-center gap-1">
            🗑️ {canSwipeDelete ? t("lobby.delete") : t("lobby.hide")}
          </span>
        </div>
      )}
      <Card
        className={`glass transition-transform ${isPending ? "border-accent/40 glow-accent" : "cursor-pointer hover:border-primary/40 hover:glow-primary"} relative z-10`}
        style={{ touchAction: (canSwipeDelete || isFinished) ? "pan-y" : undefined }}
        onClick={() => !isPending && !swiped && onNavigate(game.id)}
        onTouchStart={(e) => {
          if (!canSwipeDelete && !isFinished) return;
          const startX = e.touches[0].clientX;
          const card = e.currentTarget;
          const parent = card.parentElement!;
          const deleteIndicator = parent.querySelector('[data-delete-bg]') as HTMLElement;
          let currentDx = 0;

          const onMove = (ev: TouchEvent) => {
            const dx = ev.touches[0].clientX - startX;
            currentDx = Math.max(0, dx);
            card.style.transform = `translateX(${currentDx}px)`;
            card.style.transition = 'none';
            if (deleteIndicator) deleteIndicator.style.opacity = `${Math.min(1, currentDx / 80)}`;
          };

          const onEnd = () => {
            card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            if (currentDx > 100) {
              card.style.transform = `translateX(80px)`;
              if (deleteIndicator) deleteIndicator.style.opacity = '1';
              setSwiped(true);
              const actionLabel = canSwipeDelete ? t("lobby.deleteGame?") : t("lobby.hideGame?");
              toast(actionLabel, {
                action: {
                  label: t("lobby.confirm"),
                  onClick: async () => {
                    card.style.transform = `translateX(400px)`;
                    card.style.opacity = '0';
                    setTimeout(async () => {
                      if (canSwipeDelete) {
                        try { await onDelete(game.id); toast.success(t("lobby.gameDeleted")); }
                        catch (err: any) { toast.error(err.message); }
                      } else { onDismiss(game.id); }
                    }, 300);
                  },
                },
                cancel: {
                  label: t("lobby.undo"),

                  onClick: () => {
                    card.style.transform = '';
                    if (deleteIndicator) deleteIndicator.style.opacity = '0';
                    setSwiped(false);
                  },
                },
                duration: 5000,
                onDismiss: () => {
                  card.style.transform = '';
                  if (deleteIndicator) deleteIndicator.style.opacity = '0';
                  setSwiped(false);
                },
              });
            } else {
              card.style.transform = '';
              if (deleteIndicator) deleteIndicator.style.opacity = '0';
            }
            document.removeEventListener("touchmove", onMove);
            document.removeEventListener("touchend", onEnd);
          };

          document.addEventListener("touchmove", onMove, { passive: true });
          document.addEventListener("touchend", onEnd, { once: true });
        }}>
        <CardContent className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{s.icon}</span>
            <div>
              {isPending && <p className="text-sm font-bold text-accent">{t("lobby.challengesYou").replace("{name}", creatorName)}</p>}
              <span className="font-mono text-sm font-semibold tracking-wider">{game.code}</span>
              {!isPending && gp._rival_name && (
                <span className="ml-2 text-[11px] text-muted-foreground">vs <span className="text-foreground/70 font-medium">{gp._rival_name}</span></span>
              )}
              <p className={`text-[11px] ${s.color}`}>{s.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); onJoin(game.id); }} disabled={loading}>{t("lobby.accept")}</Button>

                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); onDecline(game.id); }} disabled={loading}>✕</Button>
              </>
            )}
            {!isPending && <span className="text-muted-foreground text-xs">→</span>}
          </div>
        </CardContent>
      </Card>
      {(canSwipeDelete || isFinished) && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/40 pointer-events-none z-0">{t("lobby.swipeHint")}</div>}
    </div>
  );
}

export default function LobbyPage() {
  const t = useT();
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

  const [showBugReport, setShowBugReport] = useState(false);
  const [bugMessage, setBugMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dismissedGames, setDismissedGames] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_GAMES_KEY) || "[]")); }
    catch { return new Set(); }
  });

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

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

  const dismissGame = (gameId: string) => {
    const next = new Set(dismissedGames);
    next.add(gameId);
    setDismissedGames(next);
    localStorage.setItem(DISMISSED_GAMES_KEY, JSON.stringify([...next]));
  };

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const game = await createGame(user.id);
      toast.success(`${t("lobby.createGame")}: ${game.code}`);
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
        toast.success(t("lobby.rivalFound"));
      } else {
        toast.success(t("lobby.challengeSentRandom"));
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
      if (!game) throw new Error(t("lobby.gameNotFound"));
      if (game.status !== "waiting") throw new Error(t("lobby.gameAlreadyStarted"));
      await joinGame(game.id, user.id);
      toast.success(t("lobby.joinedGame"));
      navigate(`/game/${game.id}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleJoinGame = async (gameId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await joinGame(gameId, user.id);
      toast.success(t("lobby.joinedGame"));
      navigate(`/game/${gameId}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleDeclineGame = async (gameId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await deleteGame(gameId);
      toast.success(t("lobby.challengeDeclined"));
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
      if (results.length === 0) toast.info(t("lobby.noPlayerFound"));
    } catch (err: any) { toast.error(err.message); }
    finally { setSearching(false); }
  };

  const handleChallenge = async (rivalUserId: string, rivalName: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const game = await challengePlayer(user.id, rivalUserId);
      toast.success(t("lobby.challengeSent").replace("{name}", rivalName).replace("{code}", game.code));
      navigate(`/game/${game.id}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handlePersonalChallenge = async (rivalUserId: string, rivalName: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_personal_game" as any, { _opponent_id: rivalUserId });
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("host_no_space")) throw new Error(t("lobby_extra.errHostNoSpace"));
        if (msg.includes("opponent_no_space")) throw new Error(t("lobby_extra.errOpponentNoSpace"));
        if (msg.includes("host_min_furniture")) throw new Error(t("lobby_extra.errHostMinFurniture"));
        if (msg.includes("opponent_min_furniture")) throw new Error(t("lobby_extra.errOpponentMinFurniture"));
        if (msg.includes("cannot_challenge_self")) throw new Error(t("lobby_extra.errCannotChallengeSelf"));
        throw error;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.game_id) throw new Error("no_game_id");
      toast.success(t("lobby_extra.personalSent").replace("{name}", rivalName));
      navigate(`/game/${row.game_id}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };


  const handleBugReport = async () => {
    if (!user || !bugMessage.trim()) return;
    try {
      await supabase.from("error_logs").insert({
        user_id: user.id,
        error_message: `[BUG REPORT] ${bugMessage.trim()}`,
        component: "UserBugReport",
        url: window.location.href,
        user_agent: navigator.userAgent.slice(0, 500),
      });
      toast.success(t("lobby.reportThanks"));
      setBugMessage("");
      setShowBugReport(false);
    } catch { toast.error(t("lobby.reportError")); }
  };


  return (
    <main className="min-h-screen bg-background p-4 max-w-md mx-auto pb-20 relative" role="main">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" aria-hidden="true" />

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
        <div className="flex items-center gap-2 relative" ref={menuRef}>
          <LanguageSwitcherCompact />
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)} className="rounded-xl" aria-label={t("lobby.menu")}>☰</Button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-50 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[180px] animate-scale-in">
              <button onClick={() => { setMenuOpen(false); navigate("/profile"); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2">{t("lobby.profileMenu")}</button>
              <button onClick={() => { setMenuOpen(false); navigate("/story"); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2">{t("lobby.storyMenu")}</button>
              <button onClick={() => { setMenuOpen(false); navigate("/space"); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2">🏠 {t("lobby.spaceMenu", "El meu espai")}</button>
              <button onClick={() => { setMenuOpen(false); setShowBugReport(true); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2">{t("lobby.reportBugMenu")}</button>
              <HelpButton variant="menu" />
              <div className="border-t border-border/30 my-1" />
              <button onClick={() => { setMenuOpen(false); signOut(); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2 text-destructive">{t("lobby.logout")}</button>

            </div>
          )}
        </div>
      </div>

      {/* Main actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button onClick={handleRandomMatch} size="lg" disabled={loading} className="h-14">
          <span className="flex flex-col items-center">
            <span className="text-lg">🎲</span>
            <span className="text-xs mt-0.5">{t("lobby.randomRival")}</span>
          </span>
        </Button>
        <Button onClick={handleCreate} size="lg" disabled={loading} variant="secondary" className="h-14">
          <span className="flex flex-col items-center">
            <span className="text-lg">➕</span>
            <span className="text-xs mt-0.5">{t("lobby.createGame")}</span>
          </span>
        </Button>

      </div>

      {/* New player recommendation */}
      {profile && profile.games_played === 0 && (
        <Card className="mb-4 glass border-accent/40 animate-fade-in">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐾</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{t("lobby.firstTime")}</p>
                <p className="text-[11px] text-muted-foreground">{t("lobby.firstTimeHint")}</p>
              </div>
              <Button size="sm" onClick={() => navigate("/story")} className="shrink-0">
                {t("lobby.goThere")}
              </Button>

            </div>
          </CardContent>
        </Card>
      )}

      {/* Search rival */}
      <Card className="mb-4 glass">
        <CardContent className="pt-3 pb-3">
          <div className="flex gap-2 mb-2">
            <Input
              placeholder={t("lobby.searchPlaceholder")}
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
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => handleChallenge(p.user_id, p.display_name)}
                      disabled={loading}>
                      {t("lobby.challengeBtn")}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2"
                      onClick={() => handlePersonalChallenge(p.user_id, p.display_name)}
                      disabled={loading}
                      title={t("lobby_extra.personalChallenge")}>
                      {t("lobby_extra.personalChallengeShort")}
                    </Button>
                  </div>

        </CardContent>
      </Card>

      {/* Join by code */}
      <Card className="mb-5 glass">
        <CardContent className="pt-3 pb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("lobby.joinByCode")}</p>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: A3B7K2"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="uppercase tracking-[0.25em] font-mono text-center text-lg bg-muted/50 border-border/50 h-11"
            />
            <Button onClick={handleJoinByCode} disabled={loading || joinCode.length < 4} variant="secondary">
              {t("lobby.enter")}
            </Button>

          </div>
        </CardContent>
      </Card>

      {/* My games (includes invites/challenges) */}
      {myGames.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            {t("lobby.myGames")}
          </h2>

          <div className="space-y-2">
            {myGames.filter((gp: any) => !dismissedGames.has(gp.game_id)).map((gp: any) => (
              <MyGameCard
                key={gp.game_id}
                gp={gp}
                userId={user?.id}
                loading={loading}
                onNavigate={(id: string) => navigate(`/game/${id}`)}
                onJoin={handleJoinGame}
                onDecline={handleDeclineGame}
                onDelete={async (id: string) => { await deleteGame(id); invalidateLobby(); }}
                onDismiss={dismissGame}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available public games */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("lobby.openGames")}
          </h2>
          <Button variant="ghost" size="sm" onClick={invalidateLobby} className="text-xs">🔄</Button>
        </div>
        {games.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2 opacity-60">🏜️</div>
            <p className="text-sm text-muted-foreground font-medium">{t("lobby.noGames")}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{t("lobby.noGamesHint")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {games.map((game: any) => (
              <Card key={game.id} className="glass hover:border-secondary/40 transition-all">
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm font-semibold tracking-wider">{game.code}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">{t("lobby.byPlayer").replace("{name}", game.creator_name)}</span>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleJoinGame(game.id)} disabled={loading}>
                    {t("lobby.join")}
                  </Button>

                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <p className="text-center text-[10px] text-muted-foreground/50 mt-4 pb-8">v{APP_VERSION}</p>

      {/* PWA Install Banner */}
      <InstallBanner />

      {/* Bug Report Modal */}
      {showBugReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("lobby.reportBug")} onClick={() => setShowBugReport(false)}>
          <Card className="mx-4 max-w-sm w-full glass" onClick={e => e.stopPropagation()}>
            <CardContent className="py-5">
              <h3 className="text-lg font-bold mb-1">🐛 {t("lobby.reportBug")}</h3>
              <p className="text-xs text-muted-foreground mb-3">{t("lobby.reportDescribe")}</p>
              <textarea
                value={bugMessage}
                onChange={e => setBugMessage(e.target.value)}
                placeholder={t("lobby.reportPlaceholder")}
                maxLength={500}
                rows={4}
                className="w-full rounded-lg bg-muted/50 border border-border/50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-[9px] text-muted-foreground/50 text-right mt-1">{bugMessage.length}/500</p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowBugReport(false)}>{t("common.cancel")}</Button>
                <Button className="flex-1" onClick={handleBugReport} disabled={!bugMessage.trim()}>{t("lobby.send")} 📩</Button>
              </div>

            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
