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
import { toast } from "sonner";
import { getMyPet, getMyAccessories, getPetEvolution, MAX_PET_XP, getActiveEvents } from "@/lib/story-helpers";
import { PetHealthBadge } from "@/components/PetHealthBadge";
import { getRewardCatalog, RARITY_CONFIG } from "@/lib/reward-helpers";

const WALL_TTL_HOURS = 22;
const MAX_MSG_LENGTH = 100;

const QUICK_EMOJIS = ["👏", "🔥", "😂", "💪", "🎯", "👀", "🫡", "💀"];

export default function PlayerProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [trophies, setTrophies] = useState<any[]>([]);
  const [pet, setPet] = useState<any>(null);
  const [petAccessories, setPetAccessories] = useState<any[]>([]);
  const [petEvents, setPetEvents] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);

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
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

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

      {/* Pet companion with evolution */}
      {pet && (() => {
        const evo = getPetEvolution(pet.xp ?? 0);
        return (
          <Card className="mb-4 glass border-accent/30 relative z-10">
            <CardContent className="py-3 flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${evo.glow} ring-2 ${evo.ring} flex items-center justify-center`}>
                <span className="text-2xl">{pet.pet_icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{pet.pet_name} <span className="text-xs font-normal text-muted-foreground">{evo.badge} {evo.label}</span></p>
                <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                  <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${Math.min(((pet.xp ?? 0) / MAX_PET_XP) * 100, 100)}%` }} />
                </div>
                <p className="text-[10px] text-accent font-semibold mt-0.5">⭐ {pet.xp ?? 0} / {MAX_PET_XP} XP</p>
              </div>
              {petAccessories.length > 0 && (
                <div className="flex gap-1">
                  {petAccessories.map((a: any) => (
                    <span key={a.id} className="text-sm" title={a.accessory_name}>{a.accessory_icon}</span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

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
                    <span className="text-2xl">{sd?.object_icon ?? "⭐"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">
                        {sd?.custom_name ? `"${sd.custom_name}"` : sd?.variant_label ? `${sd.variant_label}` : sd?.object_name ?? "Trofeu"}
                      </div>
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
