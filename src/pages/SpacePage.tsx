// ============================================================
// SpacePage — Espai propi de la mascota (Bloc D)
// ============================================================
// Grid 4×4. Tap a moble de l'inventari → tap a slot per col·locar.
// Tap a slot ocupat → retorna a inventari.
// Botiga: compra amb bonus_tokens (= "monedes").
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const GRID_SIZE = 16; // 4×4

type CatalogItem = {
  id: string;
  name_key: string;
  category: "bed" | "rug" | "plant" | "decor";
  icon: string;
  price_coins: number;
  unlock_level: number;
  happiness_bonus: number;
};

type LayoutSlot = { slot: number; furniture_id: string };

export default function SpacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [layout, setLayout] = useState<LayoutSlot[]>([]);
  const [coins, setCoins] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);

  // ---------- Initial fetch ----------
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [cat, own, sp, prof] = await Promise.all([
        supabase.from("furniture_catalog").select("*").order("unlock_level"),
        supabase.from("player_furniture").select("furniture_id").eq("user_id", user.id),
        supabase.from("player_spaces").select("layout").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("bonus_tokens").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setCatalog((cat.data as CatalogItem[]) ?? []);
      setOwned(((own.data as Array<{ furniture_id: string }>) ?? []).map((r) => r.furniture_id));
      const rawLayout = (sp.data as { layout?: LayoutSlot[] } | null)?.layout ?? [];
      setLayout(Array.isArray(rawLayout) ? rawLayout : []);
      setCoins((prof.data as { bonus_tokens?: number } | null)?.bonus_tokens ?? 0);
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

  const placedIds = useMemo(() => new Set(layout.map((s) => s.furniture_id)), [layout]);
  const availableOwned = useMemo(
    () => owned.filter((id) => !placedIds.has(id)),
    [owned, placedIds]
  );

  const happiness = useMemo(
    () => layout.reduce((sum, s) => sum + (catalogById.get(s.furniture_id)?.happiness_bonus ?? 0), 0),
    [layout, catalogById]
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
        // Remove furniture from slot
        next = layout.filter((s) => s.slot !== slotIdx);
        setSelectedFurniture(null);
      } else if (selectedFurniture) {
        // Place selected furniture
        next = [...layout.filter((s) => s.furniture_id !== selectedFurniture), { slot: slotIdx, furniture_id: selectedFurniture }];
        setSelectedFurniture(null);
      } else {
        return;
      }
      setLayout(next);
      await persistLayout(next);
    },
    [layout, selectedFurniture, persistLayout]
  );

  const handleBuy = useCallback(
    async (item: CatalogItem) => {
      if (!user) return;
      if (coins < item.price_coins) {
        toast.error(t("space.notEnough", "No tens prou monedes"));
        return;
      }
      // Atomic-ish: decrement tokens + insert furniture
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
        // Rollback tokens
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

  return (
    <div className="min-h-screen bg-background pb-8">
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
        {selectedFurniture ? (
          <p className="text-xs text-accent text-center">
            {t("space.tapToPlace", "Toca una casella per col·locar")} {catalogById.get(selectedFurniture)?.icon}
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
            const item = slot ? catalogById.get(slot.furniture_id) : null;
            // Pet at center slots (5,6,9,10)
            const isCenter = idx === 5;
            return (
              <button
                key={idx}
                onClick={() => handleSlotClick(idx)}
                className={`aspect-square rounded-lg border transition-all flex items-center justify-center text-2xl ${
                  item
                    ? "bg-card border-accent/40 shadow-sm"
                    : selectedFurniture
                    ? "bg-accent/10 border-accent/60 border-dashed animate-pulse"
                    : "bg-background/50 border-border/40"
                }`}
                aria-label={`slot-${idx}`}
              >
                {item ? item.icon : isCenter && layout.length === 0 ? "🐾" : ""}
              </button>
            );
          })}
        </div>

        {/* Owned inventory */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-sm font-semibold">{t("space.inventory", "Inventari")}</h2>
            <Button size="sm" variant="secondary" onClick={() => setShopOpen(true)}>
              🛒 {t("space.shop", "Botiga")}
            </Button>
          </div>
          {availableOwned.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              {t("space.emptyInventory", "Tots els mobles col·locats o cap comprat encara")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableOwned.map((id) => {
                const item = catalogById.get(id);
                if (!item) return null;
                const isSelected = selectedFurniture === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedFurniture(isSelected ? null : id)}
                    className={`px-3 py-2 rounded-xl border text-2xl transition-all ${
                      isSelected
                        ? "bg-accent/20 border-accent scale-110"
                        : "bg-card border-border hover:border-accent/50"
                    }`}
                    aria-pressed={isSelected}
                  >
                    {item.icon}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Shop dialog */}
      <Dialog open={shopOpen} onOpenChange={setShopOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🛒 {t("space.shop", "Botiga")} · 🪙 {coins}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {(["bed", "rug", "plant", "decor"] as const).map((cat) => (
              <div key={cat}>
                <h3 className="text-xs font-bold uppercase text-muted-foreground mt-2 mb-1">
                  {t(`space.cat.${cat}`, cat)}
                </h3>
                <div className="space-y-1.5">
                  {catalog
                    .filter((c) => c.category === cat)
                    .map((item) => {
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
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
