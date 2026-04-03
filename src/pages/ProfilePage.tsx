// ============================================================
// ProfilePage.tsx — Perfil propi del jugador (474 línies)
// ============================================================
// Seccions:
//   - Header amb lliga, icona i nom
//   - Stats grid: partides, victòries, win rate, ratxa
//   - Rival favorit (jugador amb més partides compartides)
//   - Barra Elo amb progrés cap a la pròxima lliga
//   - Partides actives (amb detall de l'objecte amagat)
//   - Trofeus (objectes especials trobats)
//   - Inventari de recompenses (col·locar o vendre)
//   - Mur de missatges (TTL 22h)
//   - Botó tancar sessió
//
// Modals: Col·locar moble en escenari / Confirmar venda
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getScenarios } from "@/lib/supabase-helpers";
import { getMyRewards, placeRewardItem, sellRewardItem, RARITY_CONFIG } from "@/lib/reward-helpers";
import { toast } from "sonner";
import { Tip } from "@/components/HelpButton";

const WALL_TTL_HOURS = 22;

const RARITY_BORDER: Record<string, string> = {
  common: "border-muted-foreground/30",
  uncommon: "border-green-500/40",
  rare: "border-blue-500/40",
  epic: "border-purple-500/50",
  legendary: "border-amber-400/60",
};

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [placingReward, setPlacingReward] = useState<any>(null);
  const [sellingReward, setSellingReward] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [wallMessages, setWallMessages] = useState<any[]>([]);
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [trophies, setTrophies] = useState<any[]>([]);

  const [topRival, setTopRival] = useState<{ name: string; count: number; userId: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [prof, rew, scen, { data: msgs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single().then(r => r.data),
      getMyRewards(user.id).catch(() => []),
      getScenarios().catch(() => []),
      supabase.from("wall_messages")
        .select("*")
        .eq("target_user_id", user.id)
        .gte("created_at", new Date(Date.now() - WALL_TTL_HOURS * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false }),
    ]);
    setProfile(prof);
    setRewards(rew);
    setScenarios(scen);

    // Find top rival
    const { data: myGames } = await supabase
      .from("game_players").select("game_id").eq("user_id", user.id);
    if (myGames && myGames.length > 0) {
      const gameIds = myGames.map(g => g.game_id);
      const { data: allPlayers } = await supabase
        .from("game_players").select("game_id, user_id").in("game_id", gameIds).neq("user_id", user.id);
      if (allPlayers && allPlayers.length > 0) {
        const counts: Record<string, number> = {};
        for (const p of allPlayers) {
          counts[p.user_id] = (counts[p.user_id] || 0) + 1;
        }
        const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        if (topId) {
          const { data: rivalProf } = await supabase
            .from("profiles").select("display_name").eq("user_id", topId[0]).single();
          setTopRival({ name: rivalProf?.display_name ?? "Anònim", count: topId[1], userId: topId[0] });
        }
      }
    }

    // Fetch author names
    const wallMsgs: any[] = msgs ?? [];
    if (wallMsgs.length > 0) {
      const authorIds = [...new Set(wallMsgs.map((m: any) => m.author_user_id))] as string[];
      const { data: authors } = await supabase
        .from("profiles").select("user_id, display_name").in("user_id", authorIds);
      const authorMap = new Map(authors?.map(a => [a.user_id, a.display_name]) ?? []);
      for (const m of wallMsgs) {
        m._author_name = authorMap.get(m.author_user_id) ?? "Anònim";
      }
    }
    setWallMessages(wallMsgs);

    // Load active games with hidden object info
    const { data: myGamePlayers } = await supabase
      .from("game_players")
      .select("game_id, hidden_object_id, hidden_item_id, hidden_position, has_hidden, special_data, tokens_remaining")
      .eq("user_id", user.id);
    if (myGamePlayers && myGamePlayers.length > 0) {
      const gpGameIds = myGamePlayers.map(gp => gp.game_id);
      const { data: activeGameData } = await supabase
        .from("games").select("id, code, status, created_at")
        .in("id", gpGameIds)
        .in("status", ["waiting", "hiding", "playing"])
        .order("created_at", { ascending: false });
      if (activeGameData && activeGameData.length > 0) {
        const activeGameIds = activeGameData.map(g => g.id);
        // Get object and item names + rival players
        const objIds = myGamePlayers.filter(gp => gp.hidden_object_id).map(gp => gp.hidden_object_id!);
        const itmIds = myGamePlayers.filter(gp => gp.hidden_item_id).map(gp => gp.hidden_item_id!);
        const [{ data: objs }, { data: itms }, { data: rivalPlayers }] = await Promise.all([
          objIds.length > 0 ? supabase.from("objects").select("id, name, icon").in("id", objIds) : { data: [] },
          itmIds.length > 0 ? supabase.from("items").select("id, name, icon, scenario_id").in("id", itmIds) : { data: [] },
          supabase.from("game_players").select("game_id, user_id").in("game_id", activeGameIds).neq("user_id", user.id),
        ]);
        // Resolve rival display names
        const rivalUserIds = [...new Set((rivalPlayers ?? []).map(rp => rp.user_id))];
        let rivalNameMap = new Map<string, string>();
        if (rivalUserIds.length > 0) {
          const { data: rivalProfs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", rivalUserIds);
          rivalNameMap = new Map((rivalProfs ?? []).map(p => [p.user_id, p.display_name ?? "Anònim"]));
        }
        const gameRivalMap = new Map<string, string>();
        for (const rp of rivalPlayers ?? []) {
          gameRivalMap.set(rp.game_id, rivalNameMap.get(rp.user_id) ?? "Anònim");
        }

        const objMap = new Map((objs ?? []).map((o: any) => [o.id, o] as [string, any]));
        const itmMap = new Map((itms ?? []).map((i: any) => [i.id, i] as [string, any]));
        const scenMap = new Map(scen.map((s: any) => [s.id, s] as [string, any]));

        const enriched = activeGameData.map(g => {
          const gp = myGamePlayers.find(p => p.game_id === g.id);
          const obj = gp?.hidden_object_id ? objMap.get(gp.hidden_object_id) : null;
          const itm = gp?.hidden_item_id ? itmMap.get(gp.hidden_item_id) : null;
          const scn = itm ? scenMap.get((itm as any).scenario_id) : null;
          return {
            ...g, 
            hiddenObj: obj, hiddenItem: itm, hiddenScenario: scn,
            hiddenPosition: gp?.hidden_position, hasHidden: gp?.has_hidden,
            tokens: gp?.tokens_remaining,
            rivalName: gameRivalMap.get(g.id) ?? null,
          };
        });
        setActiveGames(enriched);
      } else {
        setActiveGames([]);
      }
    }

    // Load trophies
    const { data: trophyData } = await supabase
      .from("player_inventory")
      .select("*")
      .eq("user_id", user.id)
      .eq("item_type", "special_trophy")
      .is("gifted_to", null)
      .order("collected_at", { ascending: false });
    setTrophies(trophyData ?? []);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePlace = async (scenarioId: string) => {
    if (!placingReward) return;
    setLoading(true);
    try {
      await placeRewardItem(placingReward.id, scenarioId);
      toast.success(`${placingReward.reward_items.icon} ${placingReward.reward_items.name} col·locat!`);
      setPlacingReward(null);
      await loadData();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleSell = async () => {
    if (!sellingReward) return;
    setLoading(true);
    try {
      const tokens = await sellRewardItem(sellingReward.id);
      toast.success(`+${tokens} tokens bonus! 🪙`);
      setSellingReward(null);
      await loadData();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">👤</div>
        <p className="text-muted-foreground text-sm">Carregant perfil...</p>
      </div>
    </div>
  );

  const leagueInfo: Record<string, { icon: string; next: string; eloNeeded: number; gradient: string }> = {
    bronze: { icon: "🥉", next: "Silver", eloNeeded: 1200, gradient: "from-amber-700 to-amber-600" },
    silver: { icon: "🥈", next: "Gold", eloNeeded: 1400, gradient: "from-gray-400 to-gray-300" },
    gold: { icon: "🥇", next: "Platinum", eloNeeded: 1600, gradient: "from-yellow-500 to-amber-400" },
    platinum: { icon: "💎", next: "Diamond", eloNeeded: 1800, gradient: "from-cyan-400 to-blue-400" },
    diamond: { icon: "👑", next: "—", eloNeeded: 9999, gradient: "from-purple-400 to-pink-400" },
  };

  const league = leagueInfo[profile.league] ?? leagueInfo.bronze;
  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;
  const bonusTokens = profile.bonus_tokens ?? 0;
  const eloProgress = Math.min(((profile.elo % 200) / 200) * 100, 100);

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-20 relative">
      {/* BG */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      {/* Modals */}
      {placingReward && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-md" onClick={() => setPlacingReward(null)}>
          <Card className="mx-4 max-w-sm w-full glass" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{placingReward.reward_items.icon}</div>
                <p className="font-bold">{placingReward.reward_items.name}</p>
                <p className="text-xs text-muted-foreground mt-1">On vols col·locar-lo?</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {scenarios.map((s: any) => (
                  <button key={s.id} onClick={() => handlePlace(s.id)}
                    disabled={loading}
                    className="bg-muted/50 rounded-xl p-3 text-center hover:bg-primary/10 transition-all disabled:opacity-30 active:scale-[0.97] border border-border/30">
                    <div className="text-2xl">{s.icon}</div>
                    <div className="text-xs mt-1 font-medium">{s.name}</div>
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => setPlacingReward(null)}>Cancel·lar</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {sellingReward && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-md" onClick={() => setSellingReward(null)}>
          <Card className="mx-4 max-w-sm glass" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6 text-center">
              <div className="text-4xl mb-3">{sellingReward.reward_items.icon}</div>
              <p className="font-bold mb-1">Vendre {sellingReward.reward_items.name}?</p>
              <p className="text-sm text-muted-foreground mb-4">
                Rebràs <span className="font-bold text-accent">+{sellingReward.reward_items.sell_value} tokens bonus 🪙</span>
                <br /><span className="text-[10px]">(s'afegiran al pròxim reset diari)</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSellingReward(null)}>Cancel·lar</Button>
                <Button className="flex-1" onClick={handleSell} disabled={loading}>Vendre</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-primary mb-5 block transition-colors relative z-10">
        ← Lobby
      </button>

      {/* Profile header */}
      <div className="text-center mb-6 relative z-10">
        <div className={`w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${league.gradient} flex items-center justify-center shadow-lg text-4xl`}>
          {league.icon}
        </div>
        <h1 className="text-2xl font-bold">{profile.display_name}</h1>
        <p className="text-sm font-semibold text-primary capitalize mt-0.5">{profile.league} League</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { val: profile.games_played, label: "Partides" },
          { val: profile.games_won, label: "Victòries" },
          { val: `${winRate}%`, label: "Win rate" },
          { val: `${profile.best_streak}🔥`, label: "Ratxa" },
        ].map((stat, i) => (
          <Card key={i} className="glass">
            <CardContent className="py-2.5 px-1 text-center">
              <div className="text-lg font-bold leading-tight">{stat.val}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top rival */}
      {topRival && (
        <Card className="mb-4 glass border-secondary/30">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚔️</span>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Rival favorit</p>
                <button
                  onClick={() => navigate(`/player/${topRival.userId}`)}
                  className="font-bold text-sm text-primary hover:underline"
                >
                  {topRival.name}
                </button>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg leading-tight">{topRival.count}</div>
              <div className="text-[9px] text-muted-foreground">partides</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Elo bar */}
      <Card className="mb-5 glass">
        <CardContent className="py-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Elo Rating</span>
            <span className="font-bold text-sm text-gradient">{profile.elo}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="gradient-primary h-2 rounded-full transition-all duration-500" style={{ width: `${eloProgress}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-[10px] text-muted-foreground">
              {league.eloNeeded - profile.elo > 0
                ? `${league.eloNeeded - profile.elo} per ${league.next}`
                : "Rang màxim!"}
            </p>
            {bonusTokens > 0 && (
              <p className="text-[10px] font-semibold text-accent">🪙 +{bonusTokens} bonus</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Games */}
      {activeGames.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            🎮 Partides actives ({activeGames.length})
          </h2>
          <div className="space-y-2">
            {activeGames.map((g: any) => {
              const statusLabels: Record<string, string> = { waiting: "⏳ Esperant", hiding: "🫣 Amagant", playing: "🔍 Jugant" };
              const posLabels: Record<string, string> = { sobre: "⬆️ Sobre", sota: "⬇️ Sota", dins: "📦 Dins" };
              return (
                <Card key={g.id} className="glass cursor-pointer hover:border-primary/40 transition-all" onClick={() => navigate(`/game/${g.id}`)}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold tracking-wider">{g.code}</span>
                        {g.rivalName && <span className="text-[10px] text-primary font-medium">vs {g.rivalName}</span>}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{statusLabels[g.status] ?? g.status}</span>
                    </div>
                    {g.hasHidden && g.hiddenObj ? (
                      <div className="text-[11px] text-muted-foreground">
                        <span className="text-foreground font-medium">{g.hiddenObj.icon} {g.hiddenObj.name}</span>
                        {" → "}
                        {g.hiddenScenario && <span>{g.hiddenScenario.icon} {g.hiddenScenario.name} · </span>}
                        {g.hiddenItem && <span>{g.hiddenItem.icon} {g.hiddenItem.name} · </span>}
                        {g.hiddenPosition && <span>{posLabels[g.hiddenPosition]}</span>}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">Encara no has amagat cap objecte</p>
                    )}
                    {g.status === "playing" && g.tokens != null && (
                      <p className="text-[10px] text-accent mt-0.5 font-medium">🪙 {g.tokens} tokens</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Trophies */}
      {trophies.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            🏆 Trofeus ({trophies.length})
          </h2>
          <div className="space-y-2">
            {trophies.map((t: any) => {
              const sd = t.special_data as any;
              return (
                <Card key={t.id} className="glass border-accent/30">
                  <CardContent className="py-2.5 flex items-center gap-3">
                    <span className="text-2xl">{sd?.object_icon ?? "⭐"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">
                        {sd?.custom_name ? `"${sd.custom_name}"` : sd?.object_name ?? "Trofeu"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {sd?.object_name} · {new Date(t.collected_at).toLocaleDateString("ca")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Inventory */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          🎒 Inventari ({rewards.length})
        </h2>
        <Tip>📍 Col·loca mobles en escenaris per ampliar el joc · 🪙 Ven-los per tokens bonus</Tip>
        <div className="h-2" />
        {rewards.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-8 text-center">
              <div className="text-4xl mb-2 opacity-50">📦</div>
              <p className="text-sm text-muted-foreground">Cap objecte.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Guanya partides per obtenir mobles!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {rewards.map((r: any) => {
              const item = r.reward_items;
              const rarity = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common;
              const borderClass = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.common;
              return (
                <Card key={r.id} className={`glass border ${borderClass}`}>
                  <CardContent className="py-2.5 flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {rarity.emoji} {rarity.label} · {item.sell_value}🪙
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2 rounded-lg"
                        onClick={() => setPlacingReward(r)}>📍</Button>
                      <Button size="sm" variant="ghost" className="text-xs h-7 px-2 rounded-lg"
                        onClick={() => setSellingReward(r)}>🪙</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Wall messages */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          💬 El teu mur · <span className="normal-case">missatges de {WALL_TTL_HOURS}h</span>
        </h2>
        {wallMessages.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-6 text-center">
              <div className="text-3xl mb-2 opacity-50">🤫</div>
              <p className="text-xs text-muted-foreground">Cap missatge recent</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {wallMessages.map((m: any) => {
              const mins = Math.floor((Date.now() - new Date(m.created_at).getTime()) / 60000);
              const timeStr = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h`;
              return (
                <Card key={m.id} className="glass">
                  <CardContent className="py-2 px-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => navigate(`/player/${m.author_user_id}`)}
                          className="text-xs font-semibold text-primary hover:underline">
                          {m._author_name}
                        </button>
                        <p className="text-sm break-words">{m.message}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">{timeStr}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Button variant="outline" className="w-full" onClick={signOut}>
        🚪 Tancar sessió
      </Button>
    </div>
  );
}
