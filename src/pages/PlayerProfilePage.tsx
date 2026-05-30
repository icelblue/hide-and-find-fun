// ============================================================
// PlayerProfilePage.tsx — Perfil públic d'un altre jugador
// ============================================================
// Accessible via /player/:userId (clicat des de resultats de
// cerca, rivals, o autors de missatges al mur).
//
// Seccions:
//   - Header amb lliga i nom
//   - Stats (partides, victòries, win rate, Elo)
//   - Trofeus públics
//   - Mur interactiu: qualsevol pot escriure missatges curts
//     (≤100 chars, TTL 22h, amb emojis ràpids)
//
// Si l'usuari visita el seu propi perfil, el mur és read-only
// (per escriure al propi mur, l'altre jugador ho fa).
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getTrophyDisplayIcon, getTrophyDisplayName } from "@/lib/object-specials";
import { toast } from "sonner";
import { getMyPet, getMyAccessories, getPetEvolution, MAX_PET_XP, getActiveEvents, PET_CONSUMABLES } from "@/lib/story-helpers";
import { levelFromXp, xpToNextLevel, MAX_LEVEL } from "@/lib/story-progression";
import { PetHealthBadge } from "@/components/PetHealthBadge";
import { getRewardCatalog, RARITY_CONFIG } from "@/lib/reward-helpers";
import { getRecentVisits, type RecentVisit } from "@/lib/pet-social";
import { PetActivityFeed } from "@/components/PetActivityFeed";
import { useT } from "@/i18n/LanguageProvider";

const WALL_TTL_HOURS = 22;
const MAX_MSG_LENGTH = 100;

const QUICK_EMOJIS = ["👏", "🔥", "😂", "💪", "🎯", "👀", "🫡", "💀"];

export default function PlayerProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [profile, setProfile] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [trophies, setTrophies] = useState<any[]>([]);
  const [pet, setPet] = useState<any>(null);
  const [petAccessories, setPetAccessories] = useState<any[]>([]);
  const [petEvents, setPetEvents] = useState<any[]>([]);
  const [myConsumables, setMyConsumables] = useState<any[]>([]);
  const [giftingConsumable, setGiftingConsumable] = useState(false);
  const [myStoryInventory, setMyStoryInventory] = useState<any[]>([]);
  const [sendingVisit, setSendingVisit] = useState(false);
  const [giftingItem, setGiftingItem] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);

  const loadData = useCallback(async () => {
    if (!userId) return;
    const [{ data: prof }, { data: msgs }, { data: trophyData }, petData, accs, events] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("wall_messages")
        .select("*")
        .eq("target_user_id", userId)
        .gte("created_at", new Date(Date.now() - WALL_TTL_HOURS * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false }),
      supabase.from("player_inventory")
        .select("*")
        .eq("user_id", userId)
        .eq("item_type", "special_trophy")
        .is("gifted_to", null)
        .order("collected_at", { ascending: false }),
      getMyPet(userId).catch(() => null),
      getMyAccessories(userId).catch(() => []),
      getActiveEvents(userId).catch(() => []),
    ]);
    setProfile(prof);
    setTrophies(trophyData ?? []);
    setPet(petData);
    setPetAccessories(accs);
    setPetEvents(events);

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
    setMessages(wallMsgs);

    // Load visitor's own unused consumables (for gifting) + story inventory
    if (user && user.id !== userId) {
      const [{ data: myCons }, { data: myInv }] = await Promise.all([
        supabase.from("pet_consumables").select("*").eq("user_id", user.id).is("used_at", null),
        supabase.from("story_inventory").select("*").eq("user_id", user.id).order("obtained_at"),
      ]);
      setMyConsumables(myCons ?? []);
      setMyStoryInventory(myInv ?? []);
    }
    getRecentVisits(userId).then(setRecentVisits).catch(() => setRecentVisits([]));
  }, [userId, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGiftConsumable = async (consumableName: string) => {
    if (!user || !userId) return;
    setGiftingConsumable(true);
    try {
      const { data, error } = await supabase.rpc("gift_consumable", {
        _to_user_id: userId,
        _consumable_name: consumableName,
      });
      if (error) throw error;
      const result = data as any;
      toast.success(`Has curat ${result.pet_name}! -${result.healed} XP 💊`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGiftingConsumable(false);
    }
  };

  const handleSendVisit = async () => {
    if (!user || !userId) return;
    setSendingVisit(true);
    try {
      const { error } = await supabase.rpc("send_pet_visit" as any, { _host_user_id: userId });
      if (error) throw error;
      toast.success(`🐾 La teva mascota ha anat a jugar amb ${pet?.pet_name ?? "ell"}!`, {
        description: "Torna en una estona per veure com ha anat.",
      });
    } catch (err: any) {
      toast.error(err.message || "No s'ha pogut enviar la visita");
    } finally {
      setSendingVisit(false);
    }
  };

  const handleGiftItem = async (item: any) => {
    if (!user || !userId) return;
    setGiftingItem(item.id);
    try {
      const { error } = await supabase.rpc("gift_inventory_item" as any, {
        _to_user_id: userId,
        _item_id: item.id,
      });
      if (error) throw error;
      toast.success(`🎁 Has regalat ${item.item_icon} ${item.item_name}!`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "No s'ha pogut regalar");
    } finally {
      setGiftingItem(null);
    }
  };

  const handleSend = async () => {
    if (!user || !userId || !newMsg.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("wall_messages").insert({
        target_user_id: userId,
        author_user_id: user.id,
        message: newMsg.trim().slice(0, MAX_MSG_LENGTH),
      });
      if (error) throw error;
      setNewMsg("");
      toast.success("Missatge enviat! 💬");
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const addEmoji = (emoji: string) => {
    if (newMsg.length + emoji.length <= MAX_MSG_LENGTH) {
      setNewMsg(prev => prev + emoji);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h`;
  };

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Carregant perfil...</p>
    </div>
  );

  const leagueBadge: Record<string, string> = {
    bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "💎", diamond: "👑",
  };

  const isOwnProfile = user?.id === userId;
  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-20 relative">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-primary mb-5 block transition-colors relative z-10">
        ← Tornar
      </button>

      {/* Profile header */}
      <div className="text-center mb-5 relative z-10">
        <div className="text-5xl mb-2">{leagueBadge[profile.league] ?? "🥉"}</div>
        <h1 className="text-2xl font-bold">{profile.display_name}</h1>
        <p className="text-sm text-primary capitalize mt-0.5 font-semibold">{profile.league} League</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { val: profile.games_played, label: "Partides" },
          { val: profile.games_won, label: "Victòries" },
          { val: `${winRate}%`, label: "Win rate" },
          { val: profile.elo, label: "Elo" },
        ].map((s, i) => (
          <Card key={i} className="glass">
            <CardContent className="py-2.5 px-1 text-center">
              <div className="text-lg font-bold leading-tight">{s.val}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pet companion with evolution (same style as Story Mode) */}
      {pet && (() => {
        const xp = pet.xp ?? 0;
        const max = pet.max_xp ?? MAX_PET_XP;
        const evo = getPetEvolution(xp, max);
        const level = levelFromXp(xp);
        const { remaining } = xpToNextLevel(xp);
        const sick = petEvents.length > 0;
        return (
          <div className={`glass rounded-2xl p-4 border mb-4 relative z-10 ${sick ? "border-destructive/40" : "border-border/30"}`}>
            <div className="flex items-center gap-3">
              <div className={`relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${evo.glow} ring-2 ${sick ? "ring-destructive/50" : evo.ring}`}>
                <span className="text-5xl">{evo.isDead ? "🪦" : pet.pet_icon}</span>
                <span className="absolute -bottom-1 -right-1 bg-background border border-border rounded-full w-7 h-7 flex items-center justify-center text-[10px] font-bold">
                  {t("evolution.level", { n: level })}
                </span>
                {sick && !evo.isDead && (
                  <span className="absolute -top-1 -right-1 text-base animate-pulse">🤒</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold truncate">{pet.pet_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {evo.badge} {t(`petTier.${evo.key}`, evo.label)}
                  {evo.isDead
                    ? <span className="text-destructive font-semibold ml-1">· {t("petStatus.dead")}</span>
                    : sick
                      ? <span className="text-destructive font-semibold ml-1">· {t("petStatus.sick")}</span>
                      : <span className="text-green-500 font-semibold ml-1">· {t("petStatus.healthy")}</span>}
                </p>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${sick ? "bg-destructive" : "bg-accent"}`} style={{ width: `${Math.min((xp / max) * 100, 100)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {level >= MAX_LEVEL ? t("evolution.maxLevel") : t("evolution.xpToNext", { xp: remaining, n: level + 1 })}
                </p>
              </div>
              {petAccessories.length > 0 && (
                <div className="flex flex-col gap-1">
                  {petAccessories.map((a: any) => (
                    <span key={a.id} className="text-sm" title={a.accessory_name}>{a.accessory_icon}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Recent pet activity (visible on any profile) */}
      <div className="relative z-10">
        <PetActivityFeed visits={recentVisits} ownUserId={user?.id ?? null} isOwn={false} petName={pet?.pet_name} />
      </div>

      {/* Pet health events + gift consumables */}
      {pet && !isOwnProfile && user && (
        <div className="mb-4 relative z-10">
          {petEvents.length > 0 && (
            <PetHealthBadge activeEvents={petEvents} petName={pet?.pet_name} />
          )}
          {/* Gift consumable buttons */}
          {myConsumables.length > 0 && (
            <Card className="glass border-accent/30 mt-2">
              <CardContent className="py-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  💊 Regalar consumible a {pet.pet_name}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {PET_CONSUMABLES.map(c => {
                    const count = myConsumables.filter(mc => mc.consumable_name === c.name).length;
                    if (count === 0) return null;
                    return (
                      <Button key={c.name} size="sm" variant="outline"
                        disabled={giftingConsumable}
                        onClick={() => handleGiftConsumable(c.name)}
                        className="text-xs">
                        {c.icon} {c.name} ({count})
                      </Button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Gastes un consumible teu per curar la seva mascota</p>
              </CardContent>
            </Card>
          )}

          {/* 🐾 Visita entre mascotes */}
          <Card className="glass border-primary/30 mt-2">
            <CardContent className="py-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                🐾 Enviar la teva mascota a jugar
              </p>
              <Button
                size="sm"
                onClick={handleSendVisit}
                disabled={sendingVisit}
                className="w-full text-xs"
              >
                {sendingVisit ? "Enviant..." : `🐾 Que jugui amb ${pet.pet_name}`}
              </Button>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                La teva mascota visitarà {pet.pet_name} durant 30 min. Cooldown: 4h.
              </p>
            </CardContent>
          </Card>

          {/* 🎁 Regalar objecte de la motxilla */}
          {myStoryInventory.length > 0 && (
            <Card className="glass border-accent/30 mt-2">
              <CardContent className="py-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  🎁 Regalar un objecte de la teva motxilla
                </p>
                <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
                  {myStoryInventory.map((it: any) => (
                    <Button
                      key={it.id}
                      size="sm"
                      variant="outline"
                      disabled={giftingItem !== null}
                      onClick={() => handleGiftItem(it)}
                      className="text-xs"
                    >
                      {it.item_icon} {it.item_name}
                    </Button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  L'objecte sortirà de la teva motxilla i passarà a la seva.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Vitrina (reward collection) */}
      <PlayerVitrina userId={userId!} />

      {/* Trophies */}
      <div className="mb-5 relative z-10">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          🏆 Trofeus ({trophies.length})
        </h2>
        {trophies.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-6 text-center">
              <div className="text-3xl mb-1.5 opacity-50">🏆</div>
              <p className="text-sm text-muted-foreground">Cap trofeu encara</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {isOwnProfile ? "Troba objectes especials per guanyar trofeus!" : "Aquest jugador encara no té trofeus."}
              </p>
            </CardContent>
          </Card>
        ) : (
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative z-10">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          💬 Mur · <span className="normal-case">missatges desapareixen en {WALL_TTL_HOURS}h</span>
        </h2>

        {/* Write message (not own profile) */}
        {!isOwnProfile && user && (
          <Card className="glass mb-3">
            <CardContent className="py-3">
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {QUICK_EMOJIS.map(e => (
                  <button key={e} onClick={() => addEmoji(e)}
                    className="text-lg hover:scale-125 transition-transform active:scale-95">
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value.slice(0, MAX_MSG_LENGTH))}
                  placeholder="Escriu un missatge curt..."
                  maxLength={MAX_MSG_LENGTH}
                  className="text-sm bg-muted/50 border-border/50"
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                />
                <Button size="sm" onClick={handleSend} disabled={sending || !newMsg.trim()}>
                  💬
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-1 text-right">{newMsg.length}/{MAX_MSG_LENGTH}</p>
            </CardContent>
          </Card>
        )}

        {/* Messages list */}
        {messages.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-8 text-center">
              <div className="text-4xl mb-2 opacity-50">🤫</div>
              <p className="text-sm text-muted-foreground">Cap missatge recent</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {isOwnProfile ? "Encara ningú t'ha deixat missatge!" : "Sigues el primer a escriure!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {messages.map((m: any) => (
              <Card key={m.id} className="glass">
                <CardContent className="py-2.5 px-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-primary">
                        {m._author_name ?? "Anònim"}
                      </span>
                      <p className="text-sm mt-0.5 break-words">{m.message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                      {timeAgo(m.created_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Vitrina — shows which reward items this player has collected */
function PlayerVitrina({ userId }: { userId: string }) {
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
    <div className="mb-5 relative z-10">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        🏆 Vitrina ({ownedCount}/{catalog.length})
      </h2>
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
