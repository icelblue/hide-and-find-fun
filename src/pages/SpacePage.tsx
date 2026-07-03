// ============================================================
// SpacePage — Espai propi de la mascota (Bloc D)
// ============================================================
// Grid 4×4. Tap a moble de l'inventari → tap a slot per col·locar.
// Tap a slot ocupat → retorna a inventari.
// Botiga: compra amb bonus_tokens (= "monedes").
// Inventari amb 2 pestanyes:
//   - "Mobles": ítems comprats a `furniture_catalog`.
//   - "Col·lecció": items guanyats a `reward_items` (via `player_rewards`).
//     S'emmagatzemen amb prefix `reward:<uuid>` a `layout.furniture_id`.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { REWARD_PREFIX } from "@/lib/personal-pvp-adapter";
import { toast } from "sonner";

const GRID_SIZE = 16; // 4×4
const REWARD_HAPPINESS = 2;

type CatalogItem = {
  id: string;
  name_key: string;
  category: "bed" | "rug" | "plant" | "decor" | "chair" | "desk" | "tech" | "music" | "art" | "nature" | "pet";
  icon: string;
  price_coins: number;
  unlock_level: number;
  happiness_bonus: number;
};

type RewardItem = { id: string; name: string; icon: string; rarity: string };

type LayoutSlot = { slot: number; furniture_id: string };

/** Detecta si l'entrada del layout és una recompensa. */
const isReward = (furnitureId: string) => furnitureId.startsWith(REWARD_PREFIX);
const rewardUuid = (furnitureId: string) => furnitureId.slice(REWARD_PREFIX.length);

export default function SpacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [layout, setLayout] = useState<LayoutSlot[]>([]);
  const [coins, setCoins] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Selecció unificada: `<catalogId>` o `reward:<uuid>`
  const [selected, setSelected] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [invTab, setInvTab] = useState<"furniture" | "collection">("furniture");

  // ---------- Initial fetch ----------
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [cat, own, sp, prof, pr] = await Promise.all([
        supabase.from("furniture_catalog").select("*").order("unlock_level"),
        supabase.from("player_furniture").select("furniture_id").eq("user_id", user.id),
        supabase.from("player_spaces").select("layout").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("bonus_tokens").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("player_rewards")
          .select("reward_item_id, reward_items(id, name, icon, rarity)")
          .eq("user_id", user.id),
      ]);
      if (cancelled) return;
      setCatalog((cat.data as CatalogItem[]) ?? []);
      setOwned(((own.data as Array<{ furniture_id: string }>) ?? []).map((r) => r.furniture_id));
      const rawLayout = (sp.data as { layout?: LayoutSlot[] } | null)?.layout ?? [];
      setLayout(Array.isArray(rawLayout) ? rawLayout : []);
      setCoins((prof.data as { bonus_tokens?: number } | null)?.bonus_tokens ?? 0);
      // Dedupe rewards (un jugador pot guanyar el mateix ítem 2 cops, aquí només ens interessa el catàleg guanyat).
      const seen = new Set<string>();
      const rlist: RewardItem[] = [];
      ((pr.data as Array<{ reward_items: RewardItem | null }>) ?? []).forEach((row) => {
        const r = row.reward_items;
        if (!r || seen.has(r.id)) return;
        seen.add(r.id);
        rlist.push(r);
      });
      setRewards(rlist);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ---------- Derived ----------
  const catalogById = useMemo(() => {
    const m = new Map<string, CatalogItem>();
    catalog.forEach((c) => m.set(c.id, c));
    return m;
  }, [catalog]);

  const rewardById = useMemo(() => {
    const m = new Map<string, RewardItem>();
    rewards.forEach((r) => m.set(r.id, r));
    return m;
  }, [rewards]);

  const placedIds = useMemo(() => new Set(layout.map((s) => s.furniture_id)), [layout]);

  const availableOwned = useMemo(
    () => owned.filter((id) => !placedIds.has(id)),
    [owned, placedIds]
  );
  const availableRewards = useMemo(
    () => rewards.filter((r) => !placedIds.has(`${REWARD_PREFIX}${r.id}`)),
    [rewards, placedIds]
  );

  const happiness = useMemo(() => {
    let sum = 0;
    for (const s of layout) {
      if (isReward(s.furniture_id)) sum += REWARD_HAPPINESS;
      else sum += catalogById.get(s.furniture_id)?.happiness_bonus ?? 0;
    }
    return sum;
  }, [layout, catalogById]);

  /** Resol la icona + nom d'una entrada del layout (moble o recompensa). */
  const resolveEntry = useCallback(
    (furnitureId: string): { icon: string; name: string } | null => {
      if (isReward(furnitureId)) {
        const r = rewardById.get(rewardUuid(furnitureId));
        return r ? { icon: r.icon, name: r.name } : null;
      }
      const c = catalogById.get(furnitureId);
      return c ? { icon: c.icon, name: t(c.name_key, c.id) } : null;
    },
    [catalogById, rewardById, t]
  );

  // ---------- Persistence ----------
  const persistLayout = useCallback(
    async (next: LayoutSlot[]) => {
      if (!user) return;
      setSaving(true);
      const { error } = await supabase
        .from("player_spaces")
        .upsert({ user_id: user.id, layout: next as never }, { onConflict: "user_id" });
      setSaving(false);
      if (error) {
        toast.error(t("space.saveError", "No s'ha pogut desar"));
        return false;
      }
      return true;
    },
    [user, t]
  );

  // ---------- Actions ----------
  const handleSlotClick = useCallback(
    async (slotIdx: number) => {
      const existing = layout.find((s) => s.slot === slotIdx);
      let next: LayoutSlot[];
      if (existing) {
        next = layout.filter((s) => s.slot !== slotIdx);
        setSelected(null);
      } else if (selected) {
        next = [...layout.filter((s) => s.furniture_id !== selected), { slot: slotIdx, furniture_id: selected }];
        setSelected(null);
      } else {
        return;
      }
      setLayout(next);
      await persistLayout(next);
    },
    [layout, selected, persistLayout]
  );

  const handleBuy = useCallback(
    async (item: CatalogItem) => {
      if (!user) return;
      if (coins < item.price_coins) {
        toast.error(t("space.notEnough", "No tens prou monedes"));
        return;
      }
      const newCoins = coins - item.price_coins;
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ bonus_tokens: newCoins } as never)
        .eq("user_id", user.id);
      if (profErr) {
        toast.error(t("space.buyError", "No s'ha pogut comprar"));
        return;
      }
      const { error: invErr } = await supabase
        .from("player_furniture")
        .insert({ user_id: user.id, furniture_id: item.id });
      if (invErr) {
        await supabase.from("profiles").update({ bonus_tokens: coins } as never).eq("user_id", user.id);
        toast.error(t("space.buyError", "No s'ha pogut comprar"));
        return;
      }
      setCoins(newCoins);
      setOwned((prev) => [...prev, item.id]);
      toast.success(t("space.bought", "Comprat!") + " " + item.icon);
    },
    [user, coins, t]
  );

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  const selectedEntry = selected ? resolveEntry(selected) : null;

  return (
    <div className="min-h-screen bg-background pb-8">
      <OnboardingDialog
        storageKey="onboarding:space:v1"
        icon="🏠"
        title={t("onboarding.space.title", "El teu espai")}
        bullets={[
          t("onboarding.space.b1"),
          t("onboarding.space.b2"),
          t("onboarding.space.b3"),
          t("onboarding.space.b4"),
        ]}
        ctaLabel={t("onboarding.cta", "Entesos!")}
      />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-3 py-2.5 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-sm">
          {t("common.lobbyShort")}
        </Button>
        <h1 className="text-base font-bold">{t("space.title", "El meu espai")}</h1>
        <div className="text-sm font-semibold flex items-center gap-1">
          <span>🪙</span>
          <span>{coins}</span>
        </div>
      </div>

      <div className="px-3 pt-3 space-y-3">
        {/* Status */}
        <Card className="glass">
          <CardContent className="py-2.5 flex items-center justify-between text-xs">
            <span>{t("space.happiness", "Felicitat")}: <span className="font-bold">+{happiness}</span></span>
            <span className="text-muted-foreground">
              {layout.length}/{GRID_SIZE} {t("space.slotsUsed", "caselles")}
            </span>
            {saving && <span className="text-muted-foreground animate-pulse">⏳</span>}
          </CardContent>
        </Card>

        {/* Hint */}
        {selectedEntry ? (
          <p className="text-xs text-accent text-center">
            {t("space.tapToPlace", "Toca una casella per col·locar")} {selectedEntry.icon}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            {t("space.hint", "Selecciona un moble i toca una casella")}
          </p>
        )}

        {/* Grid 4×4 */}
        <div className="aspect-square w-full max-w-[360px] mx-auto bg-muted/30 rounded-2xl p-2 grid grid-cols-4 gap-2 border border-border">
          {Array.from({ length: GRID_SIZE }).map((_, idx) => {
            const slot = layout.find((s) => s.slot === idx);
            const entry = slot ? resolveEntry(slot.furniture_id) : null;
            const isCenter = idx === 5;
            return (
              <button
                key={idx}
                onClick={() => handleSlotClick(idx)}
                className={`aspect-square rounded-lg border transition-all flex items-center justify-center text-2xl ${
                  entry
                    ? "bg-card border-accent/40 shadow-sm"
                    : selected
                    ? "bg-accent/10 border-accent/60 border-dashed animate-pulse"
                    : "bg-background/50 border-border/40"
                }`}
                aria-label={`slot-${idx}`}
              >
                {entry ? entry.icon : isCenter && layout.length === 0 ? "🐾" : ""}
              </button>
            );
          })}
        </div>

        {/* Inventory tabs */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-sm font-semibold">{t("space.inventory", "Inventari")}</h2>
            <Button size="sm" variant="secondary" onClick={() => setShopOpen(true)}>
              🛒 {t("space.shop", "Botiga")}
            </Button>
          </div>

          <Tabs value={invTab} onValueChange={(v) => setInvTab(v as typeof invTab)}>
            <TabsList className="w-full grid grid-cols-2 h-9">
              <TabsTrigger value="furniture" className="text-xs">
                🛋️ {t("space.tab.furniture", "Mobles")} ({availableOwned.length})
              </TabsTrigger>
              <TabsTrigger value="collection" className="text-xs">
                🏆 {t("space.tab.collection", "Col·lecció")} ({availableRewards.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="furniture" className="mt-2">
              {availableOwned.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  {t("space.emptyInventory", "Tots els mobles col·locats o cap comprat encara")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableOwned.map((id) => {
                    const item = catalogById.get(id);
                    if (!item) return null;
                    const isSel = selected === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setSelected(isSel ? null : id)}
                        className={`px-3 py-2 rounded-xl border text-2xl transition-all ${
                          isSel
                            ? "bg-accent/20 border-accent scale-110"
                            : "bg-card border-border hover:border-accent/50"
                        }`}
                        aria-pressed={isSel}
                        title={t(item.name_key, item.id)}
                      >
                        {item.icon}
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="collection" className="mt-2">
              {availableRewards.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  {rewards.length === 0
                    ? t("space.noRewards", "Encara no tens ítems de col·lecció. Guanya partides!")
                    : t("space.allRewardsPlaced", "Tots els ítems ja col·locats")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableRewards.map((r) => {
                    const key = `${REWARD_PREFIX}${r.id}`;
                    const isSel = selected === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelected(isSel ? null : key)}
                        className={`px-3 py-2 rounded-xl border text-2xl transition-all ${
                          isSel
                            ? "bg-primary/20 border-primary scale-110"
                            : "bg-card border-border hover:border-primary/50"
                        }`}
                        aria-pressed={isSel}
                        title={r.name}
                      >
                        {r.icon}
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Shop dialog */}
      <Dialog open={shopOpen} onOpenChange={setShopOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🛒 {t("space.shop", "Botiga")} · 🪙 {coins}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {(["bed", "rug", "plant", "decor", "chair", "desk", "tech", "music", "art", "nature", "pet"] as const).map((cat) => {
              const inCat = catalog.filter((c) => c.category === cat);
              if (inCat.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="text-xs font-bold uppercase text-muted-foreground mt-2 mb-1">
                    {t(`space.cat.${cat}`, cat)}
                  </h3>
                  <div className="space-y-1.5">
                    {inCat.map((item) => {
                      const isOwned = owned.includes(item.id);
                      const canAfford = coins >= item.price_coins;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border"
                        >
                          <span className="text-2xl">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{t(item.name_key, item.id)}</p>
                            <p className="text-[11px] text-muted-foreground">
                              +{item.happiness_bonus} {t("space.happiness", "Felicitat")} · Lv{item.unlock_level}
                            </p>
                          </div>
                          {isOwned ? (
                            <span className="text-xs text-muted-foreground px-2">
                              ✓ {t("space.owned", "Tens")}
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant={canAfford ? "default" : "ghost"}
                              disabled={!canAfford}
                              onClick={() => handleBuy(item)}
                            >
                              🪙 {item.price_coins}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
