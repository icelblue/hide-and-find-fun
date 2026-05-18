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
import { getMyPet, getMyAccessories, getPetEvolution, MAX_PET_XP, getActiveEvents } from "@/lib/story-helpers";
import { PetHealthBadge } from "@/components/PetHealthBadge";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getTrophyDisplayIcon, getTrophyDisplayName } from "@/lib/object-specials";
import { getScenarios } from "@/lib/supabase-helpers";
import { getMyRewards, placeRewardItem, sellRewardItem, RARITY_CONFIG } from "@/lib/reward-helpers";
import { getMyReferralLink, getMyReferrals } from "@/lib/referral-helpers";
import { toast } from "sonner";
import { Tip } from "@/components/HelpButton";
import { getRewardCatalog } from "@/lib/reward-helpers";
import { getRecentVisits, type RecentVisit } from "@/lib/pet-social";
import { levelFromXp, xpToNextLevel, MAX_LEVEL } from "@/lib/story-progression";
import { PetActivityFeed } from "@/components/PetActivityFeed";

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
  const [pet, setPet] = useState<any>(null);
  const [petAccessories, setPetAccessories] = useState<any[]>([]);
  const [petEvents, setPetEvents] = useState<any[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [topRival, setTopRival] = useState<{ name: string; count: number; userId: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const handleSaveName = async () => {
    if (!user) return;
    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      toast.error("El nom ha de tenir almenys 2 caràcters");
      return;
    }
    if (trimmed.length > 20) {
      toast.error("Màxim 20 caràcters");
      return;
    }
    // Validació bàsica: només lletres, números, espais, guions, punt i emojis comuns
    if (!/^[\p{L}\p{N}\p{Emoji}\s._-]+$/u.test(trimmed)) {
      toast.error("Caràcters no vàlids");
      return;
    }
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("user_id", user.id);
    setSavingName(false);
    if (error) {
      toast.error("No s'ha pogut desar: " + error.message);
      return;
    }
    setProfile((p: any) => ({ ...p, display_name: trimmed }));
    setEditingName(false);
    toast.success("Nom actualitzat ✨");
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    const [prof, rew, scen, { data: msgs }, petData, accs, events] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single().then(r => r.data),
      getMyRewards(user.id).catch(() => []),
      getScenarios().catch(() => []),
      supabase.from("wall_messages")
        .select("*")
        .eq("target_user_id", user.id)
        .gte("created_at", new Date(Date.now() - WALL_TTL_HOURS * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false }),
      getMyPet(user.id).catch(() => null),
      getMyAccessories(user.id).catch(() => []),
      getActiveEvents(user.id).catch(() => []),
    ]);
    setProfile(prof);
    setRewards(rew);
    setScenarios(scen);
    setPet(petData);
    setPetAccessories(accs);
    setPetEvents(events);
    getRecentVisits(user.id).then(setRecentVisits).catch(() => setRecentVisits([]));

    // Find top rival (exclude CPU and anonymous)
    const CPU_ID = "00000000-0000-0000-0000-000000000001";
    const { data: myGames } = await supabase
      .from("game_players").select("game_id").eq("user_id", user.id);
    if (myGames && myGames.length > 0) {
      const gameIds = myGames.map(g => g.game_id);
      const { data: allPlayers } = await supabase.rpc("get_game_participants" as any, { _game_ids: gameIds });
      const filteredPlayers = ((allPlayers as any[]) ?? []).filter((p: any) => p.user_id !== user.id);
      if (filteredPlayers && filteredPlayers.length > 0) {
        const counts: Record<string, number> = {};
        for (const p of filteredPlayers) {
          // Skip CPU player
          if (p.user_id === CPU_ID) continue;
          counts[p.user_id] = (counts[p.user_id] || 0) + 1;
        }
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const topId = entries[0];
        if (topId) {
          const { data: rivalProf } = await supabase
            .from("profiles").select("display_name").eq("user_id", topId[0]).single();
          const rivalName = rivalProf?.display_name;
          // Only show if we have a real name (not null/empty/Anònim)
          if (rivalName && rivalName !== "Anònim" && rivalName.trim()) {
            setTopRival({ name: rivalName, count: topId[1], userId: topId[0] });
          } else {
            setTopRival(null);
          }
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
        const [{ data: objs }, { data: itms }, rivalParticipants] = await Promise.all([
          objIds.length > 0 ? supabase.from("objects").select("id, name, icon").in("id", objIds) : { data: [] },
          itmIds.length > 0 ? supabase.from("items").select("id, name, icon, scenario_id").in("id", itmIds) : { data: [] },
          supabase.rpc("get_game_participants" as any, { _game_ids: activeGameIds }),
        ]);
        const rivalPlayers = ((rivalParticipants.data as any[]) ?? []).filter((rp: any) => rp.user_id !== user.id);
        // Resolve rival display names
        const rivalUserIds = [...new Set(rivalPlayers.map((rp: any) => rp.user_id as string))];
        let rivalNameMap = new Map<string, string>();
        if (rivalUserIds.length > 0) {
          const { data: rivalProfs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", rivalUserIds);
          rivalNameMap = new Map((rivalProfs ?? []).map(p => [p.user_id, p.display_name ?? "Anònim"]));
        }
        const gameRivalMap = new Map<string, string>();
        for (const rp of rivalPlayers) {
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

      {/* Modal: editar nom */}
      {editingName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={() => !savingName && setEditingName(false)}>
          <Card className="glass max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-lg font-bold">✏️ Canvia el teu nom</h3>
              <p className="text-xs text-muted-foreground">Així et veuran els altres jugadors. Entre 2 i 20 caràcters.</p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
                maxLength={20}
                autoFocus
                placeholder="El teu àlies"
                className="w-full px-3 py-2 rounded-xl border border-border/50 bg-muted/30 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="text-[10px] text-muted-foreground text-right">{newName.trim().length}/20</div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingName(false)} disabled={savingName}>Cancel·lar</Button>
                <Button className="flex-1" onClick={handleSaveName} disabled={savingName || newName.trim().length < 2}>
                  {savingName ? "Desant…" : "Desar"}
                </Button>
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
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <button
            onClick={() => { setNewName(profile.display_name ?? ""); setEditingName(true); }}
            className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-muted/40"
            aria-label="Editar nom"
            title="Editar nom"
          >
            ✏️
          </button>
        </div>
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

      {/* Pet companion with evolution */}
      {pet && (() => {
        const evo = getPetEvolution(pet.xp ?? 0, pet.max_xp);
        return (
          <Card className={`mb-4 glass ${petEvents.length > 0 ? "border-destructive/40" : "border-accent/30"}`}>
            <CardContent className="py-3 flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${evo.glow} ring-2 ${petEvents.length > 0 ? "ring-destructive/50" : evo.ring} flex items-center justify-center relative`}>
                <span className="text-2xl">{evo.isDead ? "🪦" : pet.pet_icon}</span>
                {petEvents.length > 0 && (
                  <span className="absolute -top-1 -right-1 text-sm animate-pulse">🤒</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm flex items-center gap-1.5 flex-wrap">
                  <span>{pet.pet_name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                    Lv. {pet.level ?? 1}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">{evo.badge} {evo.label}</span>
                  {evo.isDead
                    ? <span className="text-xs text-destructive font-semibold ml-1">· Mort 🪦</span>
                    : petEvents.length > 0
                      ? <span className="text-xs text-destructive font-semibold ml-1">· Malalt! 🤒</span>
                      : <span className="text-xs text-green-500 font-semibold ml-1">· Saludable ✅</span>
                  }
                </p>
                <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                  <div className={`h-1.5 rounded-full transition-all ${petEvents.length > 0 ? "bg-destructive" : "bg-accent"}`} style={{ width: `${Math.min(((pet.xp ?? 0) / MAX_PET_XP) * 100, 100)}%` }} />
                </div>
                <p className="text-[10px] text-accent font-semibold mt-0.5">⭐ {pet.xp ?? 0} / {MAX_PET_XP} XP</p>
              </div>
              {petAccessories.length > 0 && (
                <div className="flex gap-1 flex-wrap max-w-[80px]">
                  {petAccessories.map((a: any) => (
                    <span key={a.id} className="text-sm" title={a.accessory_name}>{a.accessory_icon}</span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Pet health events */}
      {petEvents.length > 0 && (
        <div className="mb-4">
          <PetHealthBadge activeEvents={petEvents} petName={pet?.pet_name} />
        </div>
      )}

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
                    <span className="text-2xl">{getTrophyDisplayIcon(sd)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{getTrophyDisplayName(sd)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {sd?.object_name} · {new Date(t.collected_at).toLocaleDateString("ca")}
                      </div>
                      {sd?.custom_message && (
                        <div className="text-[11px] italic text-primary/80 mt-0.5">💌 "{sd.custom_message}"</div>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm("Segur que vols eliminar aquest trofeu?")) return;
                        await supabase.from("player_inventory").delete().eq("id", t.id);
                        toast.success("Trofeu eliminat");
                        loadData();
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10"
                      title="Eliminar trofeu"
                    >
                      🗑️
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Won objects (reward collection progress) */}
      <WonObjectsSection userId={user!.id} />

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

      {/* Pet activity */}
      {recentVisits.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            🐾 Activitat recent · <span className="normal-case">visites de mascotes</span>
          </h2>
          <div className="space-y-1.5">
            {recentVisits.map((v) => {
              const o = outcomeLabel(v.outcome);
              const action = v.role === "host" ? "ha vingut a jugar" : "vas enviar-la a";
              const mins = Math.floor((Date.now() - new Date(v.resolved_at).getTime()) / 60000);
              const timeStr = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;
              return (
                <Card key={v.id} className="glass">
                  <CardContent className="py-2 px-3 flex items-center gap-2">
                    <span className="text-xl">{v.other_pet_icon}</span>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/player/${v.other_user_id}`)}
                        className="text-xs font-semibold text-primary hover:underline truncate block">
                        {v.other_pet_name}
                      </button>
                      <p className="text-[11px] text-muted-foreground">
                        {action} · <span className={`font-semibold ${o.color}`}>{o.icon} {o.text}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">{timeStr}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Referrals — convida amics */}
      <ReferralsSection userId={user!.id} />

      <Button variant="outline" className="w-full" onClick={signOut}>
        🚪 Tancar sessió
      </Button>

      {/* Zona perillosa — eliminar compte */}
      <DangerZone displayName={profile?.display_name ?? ""} onDeleted={() => {
        signOut().finally(() => navigate("/auth"));
      }} />
    </div>
  );
}

/** Secció per convidar amics i veure recompenses progressives */
function ReferralsSection({ userId }: { userId: string }) {
  const [link, setLink] = useState<{ code: string; url: string } | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [l, r] = await Promise.all([
        getMyReferralLink(userId),
        getMyReferrals(userId).catch(() => []),
      ]);
      setLink(l);
      setReferrals(r);
      setLoading(false);
    })();
  }, [userId]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiat!`);
    } catch {
      toast.error("No s'ha pogut copiar");
    }
  };

  const shareViaWhatsApp = () => {
    if (!link) return;
    const text = `🕵️ Vine a jugar a Deduction Duel amb mi! Registra't amb el meu codi i guanya 5 tokens de benvinguda: ${link.url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const activeCount = referrals.filter(r => r.active_reward_given).length;
  const nextEpic = Math.max(0, 3 - activeCount);
  const nextLegendary = Math.max(0, 5 - activeCount);

  if (loading || !link) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        🎁 Convida amics
      </h2>
      <Tip>Comparteix el teu codi. Tots dos guanyeu tokens i ítems especials!</Tip>
      <div className="h-2" />

      <Card className="glass border-primary/30">
        <CardContent className="py-3 space-y-3">
          {/* Codi propi */}
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">El teu codi</div>
            <button
              onClick={() => copyToClipboard(link.code, "Codi")}
              className="text-lg font-bold text-primary tracking-wider hover:underline"
            >
              {link.code}
            </button>
          </div>

          {/* Botons compartir */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => copyToClipboard(link.url, "Enllaç")}>
              🔗 Copiar enllaç
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={shareViaWhatsApp}>
              💬 WhatsApp
            </Button>
          </div>

          {/* Recompenses esglaonades */}
          <div className="space-y-1 text-[11px] border-t border-border/30 pt-2">
            <div className="flex justify-between text-muted-foreground">
              <span>Per cada amic registrat</span>
              <span className="text-primary font-medium">+3🪙</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Si juga 1a partida</span>
              <span className="text-primary font-medium">+10🪙</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Si juga 5+ partides</span>
              <span className="text-primary font-medium">+1 ítem rar 🔵</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>3 amics actius</span>
              <span className="text-primary font-medium">+1 ítem èpic 🟣</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>5 amics actius</span>
              <span className="text-primary font-medium">+1 llegendari 🟡</span>
            </div>
          </div>

          {/* Progress */}
          {referrals.length > 0 && (
            <div className="border-t border-border/30 pt-2 space-y-1.5">
              <div className="text-[10px] text-muted-foreground">
                Amics actius: <span className="text-foreground font-bold">{activeCount}</span>
                {nextEpic > 0 && ` · ${nextEpic} per èpic`}
                {nextEpic === 0 && nextLegendary > 0 && ` · ${nextLegendary} per llegendari`}
              </div>
              <div className="space-y-1">
                {referrals.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-[11px] bg-muted/30 rounded px-2 py-1">
                    <span className="truncate">{r.display_name}</span>
                    <span className="text-muted-foreground shrink-0">
                      {r.active_reward_given ? "🔵 actiu" : r.first_game_reward_given ? "🎮 1a partida" : "✋ registrat"}
                    </span>
                  </div>
                ))}
                {referrals.length > 5 && (
                  <div className="text-[10px] text-muted-foreground text-center">+{referrals.length - 5} més</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Section showing which reward items the player has collected */
function WonObjectsSection({ userId }: { userId: string }) {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [items, { data: owned }] = await Promise.all([
        getRewardCatalog(),
        supabase.from("player_rewards")
          .select("reward_item_id")
          .eq("user_id", userId)
          .eq("status", "owned"),
      ]);
      setCatalog(items);
      setOwnedIds(new Set((owned ?? []).map((r: any) => r.reward_item_id)));
      setLoading(false);
    })();
  }, [userId]);

  if (loading || catalog.length === 0) return null;

  const ownedCount = catalog.filter(i => ownedIds.has(i.id)).length;

  const RARITY_BORDER_MAP: Record<string, string> = {
    common: "border-muted-foreground/20",
    uncommon: "border-green-500/30",
    rare: "border-blue-500/30",
    epic: "border-purple-500/40",
    legendary: "border-amber-400/50",
  };

  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        🏆 Vitrina ({ownedCount}/{catalog.length})
      </h2>
      <Tip>Mobles guanyats en partides. Els grisos encara no els tens!</Tip>
      <div className="h-2" />
      <div className="flex flex-wrap gap-2">
        {catalog.map((item: any) => {
          const has = ownedIds.has(item.id);
          const rarity = RARITY_CONFIG[item.rarity];
          const border = RARITY_BORDER_MAP[item.rarity] ?? "";
          return (
            <div key={item.id}
              className={`flex flex-col items-center gap-0.5 rounded-xl border p-2 min-w-[60px] transition-all ${
                has ? `${border} bg-muted/30` : "border-border/20 opacity-30 grayscale"
              }`}
              title={`${item.name} — ${rarity?.emoji} ${rarity?.label}`}>
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[9px] font-medium leading-tight text-center">{item.name}</span>
              <span className="text-[8px] text-muted-foreground">{rarity?.emoji}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Zona perillosa — Eliminar compte permanentment */
function DangerZone({ displayName, onDeleted }: { displayName: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const expected = displayName.trim();
  const canDelete = expected.length > 0 && confirmText.trim() === expected;

  const handleDelete = async () => {
    if (!canDelete || deleting) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error || (data && (data as any).error)) {
        throw new Error((data as any)?.error || error?.message || "Error desconegut");
      }
      toast.success("Compte eliminat. Adéu! 👋");
      setOpen(false);
      onDeleted();
    } catch (e: any) {
      toast.error(`No s'ha pogut eliminar: ${e.message ?? e}`);
      setDeleting(false);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-destructive/20">
      <h2 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">
        ⚠️ Zona perillosa
      </h2>
      <Tip>Acció irreversible. Totes les teves dades s'esborraran permanentment.</Tip>
      <div className="h-2" />
      {!open ? (
        <Button
          variant="outline"
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          🗑️ Eliminar el meu compte
        </Button>
      ) : (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-3">
          <div className="text-xs space-y-1">
            <p className="font-semibold text-destructive">S'esborrarà definitivament:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Perfil, lliga, Elo i estadístiques</li>
              <li>Mascota, accessoris i inventari</li>
              <li>Recompenses i mobles col·locats</li>
              <li>Progrés del mode història</li>
              <li>Referrals i partides en curs</li>
            </ul>
            <p className="text-muted-foreground pt-1">
              Les partides finalitzades es mantindran <strong>anonimitzades</strong> per preservar l'històric dels rivals.
            </p>
          </div>
          <div>
            <label className="text-[11px] font-medium text-foreground block mb-1">
              Escriu <span className="font-mono text-destructive">{expected || "(sense nom)"}</span> per confirmar:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-destructive/40"
              placeholder={expected}
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setOpen(false); setConfirmText(""); }}
              disabled={deleting}
            >
              Cancel·lar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={!canDelete || deleting}
            >
              {deleting ? "Eliminant..." : "Eliminar definitivament"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
