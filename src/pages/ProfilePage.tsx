// ============================================================
// ProfilePage.tsx — Perfil del jugador (amb pestanyes)
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { asError } from "@/lib/errors";
import { getMyPet, getMyAccessories, getPetEvolution, MAX_PET_XP, getActiveEvents } from "@/lib/story-helpers";
import { PetHealthBadge } from "@/components/PetHealthBadge";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useLanguage, useT, type Lang } from "@/i18n/LanguageProvider";

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
  const t = useT();
  const { lang } = useLanguage();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [rewards, setRewards] = useState<Record<string, unknown>[]>([]);
  const [scenarios, setScenarios] = useState<Record<string, unknown>[]>([]);
  const [placingReward, setPlacingReward] = useState<Record<string, unknown> | null>(null);
  const [sellingReward, setSellingReward] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [wallMessages, setWallMessages] = useState<Record<string, unknown>[]>([]);
  const [activeGames, setActiveGames] = useState<Record<string, unknown>[]>([]);
  const [trophies, setTrophies] = useState<Record<string, unknown>[]>([]);
  const [pet, setPet] = useState<Record<string, unknown> | null>(null);
  const [petAccessories, setPetAccessories] = useState<Record<string, unknown>[]>([]);
  const [petEvents, setPetEvents] = useState<Record<string, unknown>[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [topRival, setTopRival] = useState<{ name: string; count: number; userId: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const handleSaveName = async () => {
    if (!user) return;
    const trimmed = newName.trim();
    if (trimmed.length < 2) { toast.error(t("profile.editName.minError")); return; }
    if (trimmed.length > 20) { toast.error(t("profile.editName.maxError")); return; }
    if (!/^[\p{L}\p{N}\p{Emoji}\s._-]+$/u.test(trimmed)) { toast.error(t("profile.editName.invalidChars")); return; }
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ display_name: trimmed }).eq("user_id", user.id);
    setSavingName(false);
    if (error) { toast.error(t("profile.editName.saveError") + error.message); return; }
    setProfile((p) => ({ ...(p as object), display_name: trimmed }));
    setEditingName(false);
    toast.success(t("profile.editName.savedToast"));
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    const [prof, rew, scen, { data: msgs }, petData, accs, events] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single().then(r => r.data),
      getMyRewards(user.id).catch(() => []),
      getScenarios().catch(() => []),
      supabase.from("wall_messages").select("*").eq("target_user_id", user.id)
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

    const CPU_ID = "00000000-0000-0000-0000-000000000001";
    const { data: myGames } = await supabase.from("game_players").select("game_id").eq("user_id", user.id);
    if (myGames && myGames.length > 0) {
      const gameIds = myGames.map(g => g.game_id);
      const { data: allPlayers } = await supabase.rpc("get_game_participants", { _game_ids: gameIds });
      const filteredPlayers = ((allPlayers as Record<string, unknown>[]) ?? []).filter((p) => p.user_id !== user.id);
      if (filteredPlayers && filteredPlayers.length > 0) {
        const counts: Record<string, number> = {};
        for (const p of filteredPlayers) {
          if (p.user_id === CPU_ID) continue;
          counts[p.user_id] = (counts[p.user_id] || 0) + 1;
        }
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const topId = entries[0];
        if (topId) {
          const { data: rivalProf } = await supabase.from("profiles").select("display_name").eq("user_id", topId[0]).single();
          const rivalName = rivalProf?.display_name;
          if (rivalName && rivalName !== t("common.anonymous") && rivalName.trim()) {
            setTopRival({ name: rivalName, count: topId[1], userId: topId[0] });
          } else { setTopRival(null); }
        }
      }
    }

    const wallMsgs: Record<string, unknown>[] = (msgs ?? []) as Record<string, unknown>[];
    if (wallMsgs.length > 0) {
      const authorIds = [...new Set(wallMsgs.map((m) => m.author_user_id))] as string[];
      const { data: authors } = await supabase.from("profiles").select("user_id, display_name").in("user_id", authorIds);
      const authorMap = new Map(authors?.map(a => [a.user_id, a.display_name]) ?? []);
      for (const m of wallMsgs) { m._author_name = authorMap.get(m.author_user_id) ?? t("common.anonymous"); }
    }
    setWallMessages(wallMsgs);

    const { data: myGamePlayers } = await supabase.from("game_players")
      .select("game_id, hidden_object_id, hidden_item_id, hidden_position, has_hidden, special_data, tokens_remaining")
      .eq("user_id", user.id);
    if (myGamePlayers && myGamePlayers.length > 0) {
      const gpGameIds = myGamePlayers.map(gp => gp.game_id);
      const { data: activeGameData } = await supabase.from("games").select("id, code, status, created_at")
        .in("id", gpGameIds).in("status", ["waiting", "hiding", "playing"]).order("created_at", { ascending: false });
      if (activeGameData && activeGameData.length > 0) {
        const activeGameIds = activeGameData.map(g => g.id);
        const objIds = myGamePlayers.filter(gp => gp.hidden_object_id).map(gp => gp.hidden_object_id!);
        const itmIds = myGamePlayers.filter(gp => gp.hidden_item_id).map(gp => gp.hidden_item_id!);
        const [{ data: objs }, { data: itms }, rivalParticipants] = await Promise.all([
          objIds.length > 0 ? supabase.from("objects").select("id, name, icon").in("id", objIds) : { data: [] },
          itmIds.length > 0 ? supabase.from("items").select("id, name, icon, scenario_id").in("id", itmIds) : { data: [] },
          supabase.rpc("get_game_participants", { _game_ids: activeGameIds }),
        ]);
        const rivalPlayers = ((rivalParticipants.data as Record<string, unknown>[]) ?? []).filter((rp) => rp.user_id !== user.id);
        const rivalUserIds = [...new Set(rivalPlayers.map((rp) => rp.user_id as string))];
        let rivalNameMap = new Map<string, string>();
        if (rivalUserIds.length > 0) {
          const { data: rivalProfs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", rivalUserIds);
          rivalNameMap = new Map((rivalProfs ?? []).map(p => [p.user_id, p.display_name ?? t("common.anonymous")]));
        }
        const gameRivalMap = new Map<string, string>();
        for (const rp of rivalPlayers) { gameRivalMap.set(rp.game_id, rivalNameMap.get(rp.user_id) ?? t("common.anonymous")); }

        // Translate object/item/scenario names via supabase-helpers? They go via direct queries here.
        // Apply lightweight translation via translateRows for consistency.
        const { translateRows } = await import("@/i18n/translate-data");
        const tObjs = await translateRows((objs ?? []) as Record<string, unknown>[], "pvp_object_name", "id", "name");
        const tItms = await translateRows((itms ?? []) as Record<string, unknown>[], "pvp_item_name", "id", "name");
        const tScen = await translateRows(scen as Record<string, unknown>[], "pvp_scenario_name", "id", "name");

        const objMap = new Map(tObjs.map((o) => [o.id, o] as [string, unknown]));
        const itmMap = new Map(tItms.map((i) => [i.id, i] as [string, unknown]));
        const scenMap = new Map(tScen.map((s) => [s.id, s] as [string, unknown]));

        const enriched = activeGameData.map(g => {
          const gp = myGamePlayers.find(p => p.game_id === g.id);
          const obj = gp?.hidden_object_id ? objMap.get(gp.hidden_object_id) : null;
          const itm = gp?.hidden_item_id ? itmMap.get(gp.hidden_item_id) : null;
          const scn = itm ? scenMap.get(itm.scenario_id) : null;
          return {
            ...g, hiddenObj: obj, hiddenItem: itm, hiddenScenario: scn,
            hiddenPosition: gp?.hidden_position, hasHidden: gp?.has_hidden,
            tokens: gp?.tokens_remaining, rivalName: gameRivalMap.get(g.id) ?? null,
          };
        });
        setActiveGames(enriched);
      } else { setActiveGames([]); }
    }

    const { data: trophyData } = await supabase.from("player_inventory").select("*")
      .eq("user_id", user.id).eq("item_type", "special_trophy").is("gifted_to", null)
      .order("collected_at", { ascending: false });
    setTrophies(trophyData ?? []);
  }, [user, lang]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePlace = async (scenarioId: string) => {
    if (!placingReward) return;
    setLoading(true);
    try {
      await placeRewardItem(placingReward.id, scenarioId);
      toast.success(`${placingReward.reward_items.icon} ${placingReward.reward_items.name} ${t("profile.placeReward.placedToast")}`);
      setPlacingReward(null);
      await loadData();
    } catch (_raw_err) { const err = asError(_raw_err); toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleSell = async () => {
    if (!sellingReward) return;
    setLoading(true);
    try {
      const tokens = await sellRewardItem(sellingReward.id);
      toast.success(`+${tokens} ${t("profile.sellReward.soldToast")}`);
      setSellingReward(null);
      await loadData();
    } catch (_raw_err) { const err = asError(_raw_err); toast.error(err.message); }
    finally { setLoading(false); }
  };

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">👤</div>
        <p className="text-muted-foreground text-sm">{t("profile.loading")}</p>
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
  const winRate = profile.games_played > 0 ? Math.round((profile.games_won / profile.games_played) * 100) : 0;
  const bonusTokens = profile.bonus_tokens ?? 0;
  const eloProgress = Math.min(((profile.elo % 200) / 200) * 100, 100);

  const posKey = (p: string) => p === "sobre" ? t("profile.activeGames.posSobre") : p === "sota" ? t("profile.activeGames.posSota") : p === "dins" ? t("profile.activeGames.posDins") : p;
  const statusLabel = (s: string) => s === "waiting" ? t("profile.activeGames.statusWaiting") : s === "hiding" ? t("profile.activeGames.statusHiding") : s === "playing" ? t("profile.activeGames.statusPlaying") : s;

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-20 relative">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      {/* Place modal */}
      {placingReward && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-md" onClick={() => setPlacingReward(null)}>
          <Card className="mx-4 max-w-sm w-full glass" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{placingReward.reward_items.icon}</div>
                <p className="font-bold">{placingReward.reward_items.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("profile.placeReward.where")}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {scenarios.map((s) => (
                  <button key={s.id} onClick={() => handlePlace(s.id)} disabled={loading}
                    className="bg-muted/50 rounded-xl p-3 text-center hover:bg-primary/10 transition-all disabled:opacity-30 active:scale-[0.97] border border-border/30">
                    <div className="text-2xl">{s.icon}</div>
                    <div className="text-xs mt-1 font-medium">{s.name}</div>
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => setPlacingReward(null)}>{t("profile.placeReward.cancel")}</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sell modal */}
      {sellingReward && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-md" onClick={() => setSellingReward(null)}>
          <Card className="mx-4 max-w-sm glass" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6 text-center">
              <div className="text-4xl mb-3">{sellingReward.reward_items.icon}</div>
              <p className="font-bold mb-1">{t("profile.sellReward.confirm")} {sellingReward.reward_items.name}?</p>
              <p className="text-sm text-muted-foreground mb-4">
                {t("profile.sellReward.willReceive")} <span className="font-bold text-accent">+{sellingReward.reward_items.sell_value} {t("profile.sellReward.bonusTokens")} 🪙</span>
                <br /><span className="text-[10px]">{t("profile.sellReward.bonusNote")}</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSellingReward(null)}>{t("profile.sellReward.cancel")}</Button>
                <Button className="flex-1" onClick={handleSell} disabled={loading}>{t("profile.sellReward.sell")}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit name modal */}
      {editingName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={() => !savingName && setEditingName(false)}>
          <Card className="glass max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-lg font-bold">{t("profile.editName.title")}</h3>
              <p className="text-xs text-muted-foreground">{t("profile.editName.hint")}</p>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
                maxLength={20} autoFocus placeholder={t("profile.editName.placeholder")}
                className="w-full px-3 py-2 rounded-xl border border-border/50 bg-muted/30 text-base focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <div className="text-[10px] text-muted-foreground text-right">{newName.trim().length}/20</div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingName(false)} disabled={savingName}>{t("profile.editName.cancel")}</Button>
                <Button className="flex-1" onClick={handleSaveName} disabled={savingName || newName.trim().length < 2}>
                  {savingName ? t("profile.editName.saving") : t("profile.editName.save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-primary mb-5 block transition-colors relative z-10">
        {t("common.lobbyShort")}
      </button>

      {/* Profile header (always visible) */}
      <div className="text-center mb-4 relative z-10">
        <div className={`w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${league.gradient} flex items-center justify-center shadow-lg text-4xl`}>
          {league.icon}
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <button onClick={() => { setNewName(profile.display_name ?? ""); setEditingName(true); }}
            className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-muted/40"
            aria-label={t("profile.editNameAria")} title={t("profile.editNameAria")}>✏️</button>
        </div>
        <p className="text-sm font-semibold text-primary capitalize mt-0.5">{profile.league} {t("profile.leagueSuffix")}</p>
        {profile.collection_master_at && (
          <div
            className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold shadow-sm"
            title={t("profile.collectionMasterTooltip")}
          >
            <span>👑</span>
            <span>{t("profile.collectionMasterTitle")}</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="relative z-10">
        <TabsList className="grid grid-cols-5 w-full mb-4">
          <TabsTrigger value="overview" className="text-[11px] px-1">{t("profile.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="games" className="text-[11px] px-1">{t("profile.tabs.games")}</TabsTrigger>
          <TabsTrigger value="collection" className="text-[11px] px-1">{t("profile.tabs.collection")}</TabsTrigger>
          <TabsTrigger value="social" className="text-[11px] px-1">{t("profile.tabs.social")}</TabsTrigger>
          <TabsTrigger value="settings" className="text-[11px] px-1">{t("profile.tabs.settings")}</TabsTrigger>
        </TabsList>

        {/* ───── OVERVIEW ───── */}
        <TabsContent value="overview" className="space-y-4 mt-0">
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: profile.games_played, label: t("profile.statsLabels.played") },
              { val: profile.games_won, label: t("profile.statsLabels.won") },
              { val: `${winRate}%`, label: t("profile.statsLabels.winRate") },
              { val: `${profile.best_streak}🔥`, label: t("profile.statsLabels.streak") },
            ].map((stat, i) => (
              <Card key={i} className="glass">
                <CardContent className="py-2.5 px-1 text-center">
                  <div className="text-lg font-bold leading-tight">{stat.val}</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {pet && (() => {
            const xp = pet.xp ?? 0;
            const max = pet.max_xp ?? MAX_PET_XP;
            const evo = getPetEvolution(xp, max);
            const level = levelFromXp(xp);
            const { remaining } = xpToNextLevel(xp);
            const sick = petEvents.length > 0;
            return (
              <div className={`glass rounded-2xl p-4 border ${sick ? "border-destructive/40" : "border-border/30"}`}>
                <div className="flex items-center gap-3">
                  <div className={`relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${evo.glow} ring-2 ${sick ? "ring-destructive/50" : evo.ring}`}>
                    <span className="text-5xl">{evo.isDead ? "🪦" : pet.pet_icon}</span>
                    <span className="absolute -bottom-1 -right-1 bg-background border border-border rounded-full w-7 h-7 flex items-center justify-center text-[10px] font-bold">Lv{level}</span>
                    {sick && !evo.isDead && (<span className="absolute -top-1 -right-1 text-base animate-pulse">🤒</span>)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold truncate">{pet.pet_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {evo.badge} {evo.label}
                      {evo.isDead ? <span className="text-destructive font-semibold ml-1">{t("profile.pet.dead")}</span>
                        : sick ? <span className="text-destructive font-semibold ml-1">{t("profile.pet.sick")}</span>
                        : <span className="text-green-500 font-semibold ml-1">{t("profile.pet.healthy")}</span>}
                    </p>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1.5">
                      <div className={`h-1.5 rounded-full transition-all duration-500 ${sick ? "bg-destructive" : "bg-accent"}`} style={{ width: `${Math.min((xp / max) * 100, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {level >= MAX_LEVEL ? t("profile.pet.maxLevel") : `${remaining} ${t("profile.pet.xpToNext")}${level + 1}`}
                    </p>
                  </div>
                  {petAccessories.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {petAccessories.map((a) => (<span key={a.id} className="text-sm" title={a.accessory_name}>{a.accessory_icon}</span>))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {petEvents.length > 0 && (<PetHealthBadge activeEvents={petEvents} petName={pet?.pet_name} />)}

          <PetActivityFeed visits={recentVisits} ownUserId={user?.id ?? null} isOwn={true} />

          {topRival && (
            <Card className="glass border-secondary/30">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚔️</span>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{t("profile.topRival.label")}</p>
                    <button onClick={() => navigate(`/player/${topRival.userId}`)} className="font-bold text-sm text-primary hover:underline">{topRival.name}</button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg leading-tight">{topRival.count}</div>
                  <div className="text-[9px] text-muted-foreground">{t("profile.topRival.games")}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass">
            <CardContent className="py-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("profile.eloCard.label")}</span>
                <span className="font-bold text-sm text-gradient">{profile.elo}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="gradient-primary h-2 rounded-full transition-all duration-500" style={{ width: `${eloProgress}%` }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <p className="text-[10px] text-muted-foreground">
                  {league.eloNeeded - profile.elo > 0 ? `${league.eloNeeded - profile.elo} ${t("profile.eloCard.toNext")} ${league.next}` : t("profile.eloCard.maxRank")}
                </p>
                {bonusTokens > 0 && (<p className="text-[10px] font-semibold text-accent">🪙 +{bonusTokens} {t("profile.eloCard.bonus")}</p>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───── GAMES ───── */}
        <TabsContent value="games" className="space-y-6 mt-0">
          {activeGames.length > 0 ? (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t("profile.activeGames.title")} ({activeGames.length})
              </h2>
              <div className="space-y-2">
                {activeGames.map((g) => (
                  <Card key={g.id} className="glass cursor-pointer hover:border-primary/40 transition-all" onClick={() => navigate(`/game/${g.id}`)}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold tracking-wider">{g.code}</span>
                          {g.rivalName && <span className="text-[10px] text-primary font-medium">{t("profile.activeGames.vs")} {g.rivalName}</span>}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{statusLabel(g.status)}</span>
                      </div>
                      {g.hasHidden && g.hiddenObj ? (
                        <div className="text-[11px] text-muted-foreground">
                          <span className="text-foreground font-medium">{g.hiddenObj.icon} {g.hiddenObj.name}</span>
                          {" → "}
                          {g.hiddenScenario && <span>{g.hiddenScenario.icon} {g.hiddenScenario.name} · </span>}
                          {g.hiddenItem && <span>{g.hiddenItem.icon} {g.hiddenItem.name} · </span>}
                          {g.hiddenPosition && <span>{posKey(g.hiddenPosition)}</span>}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">{t("profile.activeGames.notHidden")}</p>
                      )}
                      {g.status === "playing" && g.tokens != null && (
                        <p className="text-[10px] text-accent mt-0.5 font-medium">🪙 {g.tokens} {t("profile.activeGames.tokens")}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          {trophies.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t("profile.trophies.title")} ({trophies.length})
              </h2>
              <div className="space-y-2">
                {trophies.map((tr) => {
                  const sd = tr.special_data as Record<string, unknown> | null;
                  return (
                    <Card key={tr.id} className="glass border-accent/30">
                      <CardContent className="py-2.5 flex items-center gap-3">
                        <span className="text-2xl">{getTrophyDisplayIcon(sd)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{getTrophyDisplayName(sd)}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {sd?.object_name} · {new Date(tr.collected_at).toLocaleDateString(lang === "en" ? "en" : "ca")}
                          </div>
                          {sd?.custom_message && (<div className="text-[11px] italic text-primary/80 mt-0.5">💌 "{sd.custom_message}"</div>)}
                        </div>
                        <button onClick={async () => {
                          if (!confirm(t("profile.trophies.confirmDelete"))) return;
                          await supabase.from("player_inventory").delete().eq("id", tr.id);
                          toast.success(t("profile.trophies.deletedToast"));
                          loadData();
                        }} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10"
                          title={t("profile.trophies.deleteTitle")}>🗑️</button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {activeGames.length === 0 && trophies.length === 0 && (
            <Card className="glass"><CardContent className="py-8 text-center">
              <div className="text-4xl mb-2 opacity-50">🎮</div>
              <p className="text-sm text-muted-foreground">—</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ───── COLLECTION ───── */}
        <TabsContent value="collection" className="space-y-6 mt-0">
          <WonObjectsSection userId={user!.id} />

          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("profile.inventory.title")} ({rewards.length})
            </h2>
            <Tip>{t("profile.inventory.tip")}</Tip>
            <div className="h-2" />
            {rewards.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-8 text-center">
                  <div className="text-4xl mb-2 opacity-50">📦</div>
                  <p className="text-sm text-muted-foreground">{t("profile.inventory.empty")}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{t("profile.inventory.emptyHint")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {rewards.map((r) => {
                  const item = r.reward_items;
                  const rarity = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common;
                  const borderClass = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.common;
                  return (
                    <Card key={r.id} className={`glass border ${borderClass}`}>
                      <CardContent className="py-2.5 flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{item.name}</div>
                          <div className="text-[11px] text-muted-foreground">{rarity.emoji} {rarity.label} · {item.sell_value}🪙</div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2 rounded-lg" onClick={() => setPlacingReward(r)}>📍</Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7 px-2 rounded-lg" onClick={() => setSellingReward(r)}>🪙</Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ───── SOCIAL ───── */}
        <TabsContent value="social" className="space-y-6 mt-0">
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t("profile.wall.title")} · <span className="normal-case">{t("profile.wall.subtitle")}</span>
            </h2>
            {wallMessages.length === 0 ? (
              <Card className="glass"><CardContent className="py-6 text-center">
                <div className="text-3xl mb-2 opacity-50">🤫</div>
                <p className="text-xs text-muted-foreground">{t("profile.wall.empty")}</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-1.5">
                {wallMessages.map((m) => {
                  const mins = Math.floor((Date.now() - new Date(m.created_at).getTime()) / 60000);
                  const timeStr = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h`;
                  return (
                    <Card key={m.id} className="glass">
                      <CardContent className="py-2 px-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <button onClick={() => navigate(`/player/${m.author_user_id}`)} className="text-xs font-semibold text-primary hover:underline">{m._author_name}</button>
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

          <ReferralsSection userId={user!.id} />
        </TabsContent>

        {/* ───── SETTINGS ───── */}
        <TabsContent value="settings" className="space-y-4 mt-0">
          <LanguageSection />
          <Button variant="outline" className="w-full" onClick={signOut}>{t("profile.signOut")}</Button>
          <DangerZone displayName={profile?.display_name ?? ""} onDeleted={() => { signOut().finally(() => navigate("/auth")); }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Referrals — invite friends */
function ReferralsSection({ userId }: { userId: string }) {
  const t = useT();
  const [link, setLink] = useState<{ code: string; url: string } | null>(null);
  const [referrals, setReferrals] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [l, r] = await Promise.all([getMyReferralLink(userId), getMyReferrals(userId).catch(() => [])]);
      setLink(l); setReferrals(r); setLoading(false);
    })();
  }, [userId]);

  const copyToClipboard = async (text: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(kind === "code" ? t("profile.referrals.copiedCode") : t("profile.referrals.copiedLink"));
    } catch { toast.error(t("profile.referrals.copyError")); }
  };

  const shareViaWhatsApp = () => {
    if (!link) return;
    const text = `${t("profile.referrals.shareMsg")} ${link.url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const activeCount = referrals.filter(r => r.active_reward_given).length;
  const nextEpic = Math.max(0, 3 - activeCount);
  const nextLegendary = Math.max(0, 5 - activeCount);

  if (loading || !link) return null;

  return (
    <div>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("profile.referrals.title")}</h2>
      <Tip>{t("profile.referrals.tip")}</Tip>
      <div className="h-2" />
      <Card className="glass border-primary/30">
        <CardContent className="py-3 space-y-3">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("profile.referrals.yourCode")}</div>
            <button onClick={() => copyToClipboard(link.code, "code")} className="text-lg font-bold text-primary tracking-wider hover:underline">{link.code}</button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => copyToClipboard(link.url, "link")}>{t("profile.referrals.copyLink")}</Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={shareViaWhatsApp}>{t("profile.referrals.whatsapp")}</Button>
          </div>
          <div className="space-y-1 text-[11px] border-t border-border/30 pt-2">
            <div className="flex justify-between text-muted-foreground"><span>{t("profile.referrals.perFriend")}</span><span className="text-primary font-medium">+3🪙</span></div>
            <div className="flex justify-between text-muted-foreground"><span>{t("profile.referrals.firstGame")}</span><span className="text-primary font-medium">+10🪙</span></div>
            <div className="flex justify-between text-muted-foreground"><span>{t("profile.referrals.fivePlus")}</span><span className="text-primary font-medium">{t("profile.referrals.rewardRare")}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>{t("profile.referrals.threeActive")}</span><span className="text-primary font-medium">{t("profile.referrals.rewardEpic")}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>{t("profile.referrals.fiveActive")}</span><span className="text-primary font-medium">{t("profile.referrals.rewardLegendary")}</span></div>
          </div>
          {referrals.length > 0 && (
            <div className="border-t border-border/30 pt-2 space-y-1.5">
              <div className="text-[10px] text-muted-foreground">
                {t("profile.referrals.activeFriends")} <span className="text-foreground font-bold">{activeCount}</span>
                {nextEpic > 0 && ` · ${nextEpic} ${t("profile.referrals.forEpic")}`}
                {nextEpic === 0 && nextLegendary > 0 && ` · ${nextLegendary} ${t("profile.referrals.forLegendary")}`}
              </div>
              <div className="space-y-1">
                {referrals.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-[11px] bg-muted/30 rounded px-2 py-1">
                    <span className="truncate">{r.display_name}</span>
                    <span className="text-muted-foreground shrink-0">
                      {r.active_reward_given ? t("profile.referrals.statusActive") : r.first_game_reward_given ? t("profile.referrals.statusFirstGame") : t("profile.referrals.statusRegistered")}
                    </span>
                  </div>
                ))}
                {referrals.length > 5 && (<div className="text-[10px] text-muted-foreground text-center">+{referrals.length - 5} {t("profile.referrals.more")}</div>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Display case — won reward items */
function WonObjectsSection({ userId }: { userId: string }) {
  const t = useT();
  const { lang } = useLanguage();
  const [catalog, setCatalog] = useState<Record<string, unknown>[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [items, { data: owned }] = await Promise.all([
        getRewardCatalog(),
        supabase.from("player_rewards").select("reward_item_id").eq("user_id", userId).eq("status", "owned"),
      ]);
      setCatalog(items);
      setOwnedIds(new Set((owned ?? []).map((r) => r.reward_item_id)));
      setLoading(false);
    })();
  }, [userId, lang]);

  if (loading || catalog.length === 0) return null;

  const ownedCount = catalog.filter(i => ownedIds.has(i.id)).length;
  const RARITY_BORDER_MAP: Record<string, string> = {
    common: "border-muted-foreground/20", uncommon: "border-green-500/30",
    rare: "border-blue-500/30", epic: "border-purple-500/40", legendary: "border-amber-400/50",
  };

  return (
    <div>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("profile.vitrina.title")} ({ownedCount}/{catalog.length})</h2>
      <Tip>{t("profile.vitrina.tip")}</Tip>
      <div className="h-2" />
      <div className="flex flex-wrap gap-2">
        {catalog.map((item) => {
          const has = ownedIds.has(item.id);
          const rarity = RARITY_CONFIG[item.rarity];
          const border = RARITY_BORDER_MAP[item.rarity] ?? "";
          return (
            <div key={item.id}
              className={`flex flex-col items-center gap-0.5 rounded-xl border p-2 min-w-[60px] transition-all ${has ? `${border} bg-muted/30` : "border-border/20 opacity-30 grayscale"}`}
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

/** Danger zone — Account deletion */
function DangerZone({ displayName, onDeleted }: { displayName: string; onDeleted: () => void }) {
  const t = useT();
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
      if (error || (data && data.error)) {
        throw new Error(data?.error || error?.message || "Error");
      }
      toast.success(t("profile.danger.deletedToast"));
      setOpen(false);
      onDeleted();
    } catch (_raw_e) { const e = asError(_raw_e);
      toast.error(`${t("profile.danger.deleteError")} ${e.message ?? e}`);
      setDeleting(false);
    }
  };

  return (
    <div className="mt-4 pt-6 border-t border-destructive/20">
      <h2 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">{t("profile.danger.title")}</h2>
      <Tip>{t("profile.danger.tip")}</Tip>
      <div className="h-2" />
      {!open ? (
        <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setOpen(true)}>
          {t("profile.danger.deleteBtn")}
        </Button>
      ) : (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-3">
          <div className="text-xs space-y-1">
            <p className="font-semibold text-destructive">{t("profile.danger.willDelete")}</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>{t("profile.danger.item1")}</li>
              <li>{t("profile.danger.item2")}</li>
              <li>{t("profile.danger.item3")}</li>
              <li>{t("profile.danger.item4")}</li>
              <li>{t("profile.danger.item5")}</li>
            </ul>
            <p className="text-muted-foreground pt-1">
              {t("profile.danger.anonNote")} <strong>{t("profile.danger.anonNoteBold")}</strong> {t("profile.danger.anonNoteEnd")}
            </p>
          </div>
          <div>
            <label className="text-[11px] font-medium text-foreground block mb-1">
              {t("profile.danger.confirmLabel")} <span className="font-mono text-destructive">{expected || t("profile.danger.noName")}</span> {t("profile.danger.confirmEnd")}
            </label>
            <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} disabled={deleting}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-destructive/40"
              placeholder={expected} autoComplete="off" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setOpen(false); setConfirmText(""); }} disabled={deleting}>{t("profile.danger.cancel")}</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={!canDelete || deleting}>
              {deleting ? t("profile.danger.deleting") : t("profile.danger.confirmDelete")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Language selector */
function LanguageSection() {
  const { lang, setLang } = useLanguage();
  const t = useT();
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm">🌐 {t("profile.languagePreference")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("profile.languageHint")}</p>
        </div>
        <div className="flex gap-2">
          {(["ca", "en"] as Lang[]).map((l) => (
            <Button key={l} size="sm" variant={lang === l ? "default" : "outline"} onClick={() => setLang(l)} className="flex-1">
              {t(`lang.${l}`)}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
