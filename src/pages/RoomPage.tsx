// ============================================================
// RoomPage — Editor d'una sala individual del meu apartament
// ============================================================
// Ruta: /space/room/:roomId
// Grid variable (segons plantilla) + inventari filtrat per
// `allowed_categories` + multiplicador de felicitat + fletxes
// per moure la sala pel mapa 5×5.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { REWARD_PREFIX } from "@/lib/personal-pvp-adapter";
import { toast } from "sonner";

const REWARD_HAPPINESS = 2;
// (MAP_SIZE viu ara a SpacePage; el moviment de sales es fa allà via drag&drop)

type CatalogItem = {
  id: string;
  name_key: string;
  category: string;
  icon: string;
  price_coins: number;
  unlock_level: number;
  happiness_bonus: number;
};
type RewardItem = { id: string; name: string; icon: string; rarity: string };
type LayoutSlot = { slot: number; furniture_id: string };
type RoomRow = {
  id: string;
  custom_name: string;
  room_template_id: string;
  layout: LayoutSlot[];
  position_x: number;
  position_y: number;
};
type RoomTemplate = {
  id: string;
  icon: string;
  name_key: string;
  grid_w: number;
  grid_h: number;
  allowed_categories: string[];
  happiness_multiplier: number;
};

const isReward = (id: string) => id.startsWith(REWARD_PREFIX);
const rewardUuid = (id: string) => id.slice(REWARD_PREFIX.length);

export default function RoomPage() {
  const { user } = useAuth();
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const t = useT();

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [template, setTemplate] = useState<RoomTemplate | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [invTab, setInvTab] = useState<"furniture" | "collection">("furniture");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  // otherRoomsOccupancy ja no cal aquí (drag & drop viu a SpacePage)
  const [placedElsewhere, setPlacedElsewhere] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !roomId) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const [rm, cat, own, prof, pr] = await Promise.all([
        supabase.from("player_rooms").select("id, custom_name, room_template_id, layout, position_x, position_y").eq("id", roomId).eq("user_id", user.id).maybeSingle(),
        supabase.from("furniture_catalog").select("*").order("unlock_level"),
        supabase.from("player_furniture").select("furniture_id").eq("user_id", user.id),
        supabase.from("profiles").select("bonus_tokens").eq("user_id", user.id).maybeSingle(),
        supabase.from("player_rewards").select("reward_item_id, reward_items(id, name, icon, rarity)").eq("user_id", user.id),
      ]);
      if (cancel) return;
      if (!rm.data) {
        toast.error(t("room.notFound", "Sala no trobada"));
        navigate("/space");
        return;
      }
      const rawLayout = (rm.data as { layout?: unknown }).layout;
      setRoom({
        id: rm.data.id,
        custom_name: rm.data.custom_name,
        room_template_id: rm.data.room_template_id,
        layout: Array.isArray(rawLayout) ? (rawLayout as LayoutSlot[]) : [],
        position_x: rm.data.position_x,
        position_y: rm.data.position_y,
      });
      setNameDraft(rm.data.custom_name);

      const { data: tpl } = await supabase
        .from("room_catalog")
        .select("id, icon, name_key, grid_w, grid_h, allowed_categories, happiness_multiplier")
        .eq("id", rm.data.room_template_id)
        .maybeSingle();
      if (tpl) setTemplate(tpl as unknown as RoomTemplate);

      setCatalog((cat.data as CatalogItem[]) ?? []);
      setOwned(((own.data as Array<{ furniture_id: string }>) ?? []).map((r) => r.furniture_id));
      setCoins((prof.data as { bonus_tokens?: number } | null)?.bonus_tokens ?? 0);
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
    return () => { cancel = true; };
  }, [user, roomId, navigate, t]);

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

  const layout = room?.layout ?? [];
  const placedIds = useMemo(() => new Set(layout.map((s) => s.furniture_id)), [layout]);

  // Mobles col·locats en altres sales + caselles ocupades del mapa
  useEffect(() => {
    if (!user || !roomId) return;
    (async () => {
      const { data } = await supabase
        .from("player_rooms")
        .select("id, position_x, position_y, layout")
        .eq("user_id", user.id)
        .neq("id", roomId);
      const furn = new Set<string>();
      const occ = new Set<string>();
      (data ?? []).forEach((r: { position_x: number; position_y: number; layout?: unknown }) => {
        occ.add(`${r.position_x}:${r.position_y}`);
        const l = Array.isArray(r.layout) ? (r.layout as LayoutSlot[]) : [];
        l.forEach((x) => furn.add(x.furniture_id));
      });
      setPlacedElsewhere(furn);
      setOtherRoomsOccupancy(occ);
    })();
  }, [user, roomId, room?.layout]);

  // Sizing derivats de la plantilla
  const gridW = template?.grid_w ?? 4;
  const gridH = template?.grid_h ?? 4;
  const gridSize = gridW * gridH;
  const allowedCats = template?.allowed_categories ?? [];
  const multiplier = Number(template?.happiness_multiplier ?? 1);

  // Inventari filtrat per categories permeses (buit = tot permès)
  const catAllowed = useCallback((cat: string) => allowedCats.length === 0 || allowedCats.includes(cat), [allowedCats]);

  const availableOwned = useMemo(
    () => owned.filter((id) => {
      if (placedIds.has(id) || placedElsewhere.has(id)) return false;
      const it = catalogById.get(id);
      return !!it && catAllowed(it.category);
    }),
    [owned, placedIds, placedElsewhere, catalogById, catAllowed]
  );
  const availableRewards = useMemo(
    () => rewards.filter((r) => {
      const k = `${REWARD_PREFIX}${r.id}`;
      if (placedIds.has(k) || placedElsewhere.has(k)) return false;
      // Rewards categoritzats com "decor" per defecte a l'espai personal
      return catAllowed("decor") || allowedCats.length === 0;
    }),
    [rewards, placedIds, placedElsewhere, catAllowed, allowedCats.length]
  );

  const happiness = useMemo(() => {
    let s = 0;
    for (const x of layout) {
      if (isReward(x.furniture_id)) {
        s += REWARD_HAPPINESS * multiplier;
      } else {
        const c = catalogById.get(x.furniture_id);
        const base = c?.happiness_bonus ?? 0;
        // Multiplicador s'aplica només si la categoria coincideix amb allowed
        const bonusMult = c && catAllowed(c.category) && allowedCats.length > 0 ? multiplier : 1;
        s += base * bonusMult;
      }
    }
    return Math.round(s);
  }, [layout, catalogById, multiplier, catAllowed, allowedCats.length]);

  const resolveEntry = useCallback((fid: string) => {
    if (isReward(fid)) {
      const r = rewardById.get(rewardUuid(fid));
      return r ? { icon: r.icon, name: r.name } : null;
    }
    const c = catalogById.get(fid);
    return c ? { icon: c.icon, name: t(c.name_key, c.id) } : null;
  }, [catalogById, rewardById, t]);

  const persistLayout = useCallback(async (next: LayoutSlot[]) => {
    if (!user || !room) return;
    setSaving(true);
    const { error } = await supabase.from("player_rooms").update({ layout: next as never }).eq("id", room.id).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(t("space.saveError", "No s'ha pogut desar"));
  }, [user, room, t]);

  const handleSlotClick = useCallback(async (idx: number) => {
    if (!room) return;
    const existing = layout.find((s) => s.slot === idx);
    let next: LayoutSlot[];
    if (existing) {
      next = layout.filter((s) => s.slot !== idx);
      setSelected(null);
    } else if (selected) {
      next = [...layout.filter((s) => s.furniture_id !== selected), { slot: idx, furniture_id: selected }];
      setSelected(null);
    } else return;
    setRoom({ ...room, layout: next });
    await persistLayout(next);
  }, [layout, selected, room, persistLayout]);

  const handleBuy = useCallback(async (item: CatalogItem) => {
    if (!user) return;
    if (coins < item.price_coins) { toast.error(t("space.notEnough")); return; }
    const newCoins = coins - item.price_coins;
    const { error: e1 } = await supabase.from("profiles").update({ bonus_tokens: newCoins } as never).eq("user_id", user.id);
    if (e1) { toast.error(t("space.buyError")); return; }
    const { error: e2 } = await supabase.from("player_furniture").insert({ user_id: user.id, furniture_id: item.id });
    if (e2) {
      await supabase.from("profiles").update({ bonus_tokens: coins } as never).eq("user_id", user.id);
      toast.error(t("space.buyError"));
      return;
    }
    setCoins(newCoins);
    setOwned((p) => [...p, item.id]);
    toast.success(t("space.bought") + " " + item.icon);
  }, [user, coins, t]);

  const saveName = useCallback(async () => {
    if (!user || !room) return;
    const trimmed = nameDraft.trim().slice(0, 40);
    if (!trimmed) return;
    setEditingName(false);
    if (trimmed === room.custom_name) return;
    const { error } = await supabase.from("player_rooms").update({ custom_name: trimmed }).eq("id", room.id).eq("user_id", user.id);
    if (error) { toast.error(t("space.saveError")); return; }
    setRoom({ ...room, custom_name: trimmed });
  }, [user, room, nameDraft, t]);

  // Moviment ara es fa arrossegant al mini-mapa (SpacePage). Codi eliminat aquí.


  if (loading || !room) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground animate-pulse">{t("common.loading")}</p></div>;
  }

  const selectedEntry = selected ? resolveEntry(selected) : null;



  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-3 py-2.5 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/space")} className="text-sm shrink-0">
          ← {t("room.apartment", "Apartament")}
        </Button>
        {editingName ? (
          <Input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setNameDraft(room.custom_name); setEditingName(false); } }}
            className="h-8 text-sm text-center max-w-[200px]"
            maxLength={40}
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 text-base font-bold truncate">
            <span>{template?.icon ?? "🏠"}</span>
            <span className="truncate">{room.custom_name}</span>
            <span className="text-xs text-muted-foreground">✏️</span>
          </button>
        )}
        <div className="text-sm font-semibold flex items-center gap-1 shrink-0">🪙 {coins}</div>
      </div>

      <div className="px-3 pt-3 space-y-3">
        {/* Metadades de plantilla: revela què fa la sala perquè hi hagi diferència real */}
        {template && (
          <Card className="glass border-accent/20">
            <CardContent className="py-2 px-3 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1">
                <span className="text-base">{template.icon}</span>
                <span className="text-muted-foreground">{t(template.name_key, template.id)}</span>
              </span>
              <span className="text-muted-foreground">{gridW}×{gridH}</span>
              {multiplier > 1 && (
                <span className="text-accent font-semibold">×{multiplier.toFixed(2)} 😊</span>
              )}
            </CardContent>
          </Card>
        )}

        {allowedCats.length > 0 && (
          <p className="text-[10px] text-center text-muted-foreground">
            {t("room.onlyCategories", "Només hi caben")}: {allowedCats.map((c) => t(`space.cat.${c}`, c)).join(" · ")}
          </p>
        )}

        <Card className="glass">
          <CardContent className="py-2.5 flex items-center justify-between text-xs">
            <span>{t("space.happiness")}: <span className="font-bold">+{happiness}</span></span>
            <span className="text-muted-foreground">{layout.length}/{gridSize}</span>
            {saving && <span className="text-muted-foreground animate-pulse">⏳</span>}
          </CardContent>
        </Card>

        {selectedEntry ? (
          <p className="text-xs text-accent text-center">{t("space.tapToPlace")} {selectedEntry.icon}</p>
        ) : (
          <p className="text-xs text-muted-foreground text-center">{t("space.hint")}</p>
        )}

        {/* Grid dinàmic amb gridTemplateColumns per suport de mides no estàndard */}
        <div
          className="w-full max-w-[360px] mx-auto bg-muted/30 rounded-2xl p-2 grid gap-2 border border-border"
          style={{
            gridTemplateColumns: `repeat(${gridW}, minmax(0, 1fr))`,
            aspectRatio: `${gridW} / ${gridH}`,
          }}
        >
          {Array.from({ length: gridSize }).map((_, idx) => {
            const slot = layout.find((s) => s.slot === idx);
            const entry = slot ? resolveEntry(slot.furniture_id) : null;
            return (
              <button
                key={idx}
                onClick={() => handleSlotClick(idx)}
                className={`aspect-square rounded-lg border transition-all flex items-center justify-center text-2xl ${
                  entry ? "bg-card border-accent/40 shadow-sm"
                  : selected ? "bg-accent/10 border-accent/60 border-dashed animate-pulse"
                  : "bg-background/50 border-border/40"
                }`}
                aria-label={`slot-${idx}`}
              >
                {entry ? entry.icon : ""}
              </button>
            );
          })}
        </div>

        {/* Moviment de sales: arrossega des del mini-mapa de l'apartament */}


        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-sm font-semibold">{t("space.inventory")}</h2>
            <Button size="sm" variant="secondary" onClick={() => setShopOpen(true)}>🛒 {t("space.shop")}</Button>
          </div>

          <Tabs value={invTab} onValueChange={(v) => setInvTab(v as typeof invTab)}>
            <TabsList className="w-full grid grid-cols-2 h-9">
              <TabsTrigger value="furniture" className="text-xs">🛋️ {t("space.tab.furniture")} ({availableOwned.length})</TabsTrigger>
              <TabsTrigger value="collection" className="text-xs">🏆 {t("space.tab.collection")} ({availableRewards.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="furniture" className="mt-2">
              {availableOwned.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  {allowedCats.length > 0
                    ? t("room.noAllowedFurniture", "No tens mobles compatibles amb aquesta sala")
                    : t("space.emptyInventory")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableOwned.map((id) => {
                    const it = catalogById.get(id);
                    if (!it) return null;
                    const sel = selected === id;
                    return (
                      <button key={id} onClick={() => setSelected(sel ? null : id)}
                        className={`px-3 py-2 rounded-xl border text-2xl transition-all ${sel ? "bg-accent/20 border-accent scale-110" : "bg-card border-border hover:border-accent/50"}`}
                        title={t(it.name_key, it.id)}>{it.icon}</button>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            <TabsContent value="collection" className="mt-2">
              {availableRewards.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  {rewards.length === 0 ? t("space.noRewards") : t("space.allRewardsPlaced")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableRewards.map((r) => {
                    const k = `${REWARD_PREFIX}${r.id}`;
                    const sel = selected === k;
                    return (
                      <button key={k} onClick={() => setSelected(sel ? null : k)}
                        className={`px-3 py-2 rounded-xl border text-2xl transition-all ${sel ? "bg-primary/20 border-primary scale-110" : "bg-card border-border hover:border-primary/50"}`}
                        title={r.name}>{r.icon}</button>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={shopOpen} onOpenChange={setShopOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>🛒 {t("space.shop")} · 🪙 {coins}</DialogTitle></DialogHeader>
          {allowedCats.length > 0 && (
            <p className="text-[11px] text-center text-muted-foreground -mt-2">
              {t("room.shopFilterHint", "Filtrat per compatibilitat amb")} {template && t(template.name_key, template.id)}
            </p>
          )}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {(["bed","rug","plant","decor","chair","desk","tech","music","art","nature","pet","kitchen","bath","dining"] as const).map((cat) => {
              const inCat = catalog.filter((c) => c.category === cat && catAllowed(c.category));
              if (!inCat.length) return null;
              return (
                <div key={cat}>
                  <h3 className="text-xs font-bold uppercase text-muted-foreground mt-2 mb-1">{t(`space.cat.${cat}`, cat)}</h3>
                  <div className="space-y-1.5">
                    {inCat.map((item) => {
                      const isOwned = owned.includes(item.id);
                      const canAfford = coins >= item.price_coins;
                      return (
                        <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                          <span className="text-2xl">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{t(item.name_key, item.id)}</p>
                            <p className="text-[11px] text-muted-foreground">+{item.happiness_bonus} · Lv{item.unlock_level}</p>
                          </div>
                          {isOwned ? <span className="text-xs text-muted-foreground px-2">✓ {t("space.owned")}</span>
                            : <Button size="sm" variant={canAfford ? "default" : "ghost"} disabled={!canAfford} onClick={() => handleBuy(item)}>🪙 {item.price_coins}</Button>}
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
