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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { REWARD_PREFIX } from "@/lib/personal-pvp-adapter";
import { generateTerrain, preferredTerrainForCategory, TERRAIN_BONUS } from "@/lib/terrain";
import PixelRoomGrid, { type PixelCell } from "@/components/room/PixelRoomGrid";
import { themeForCategory } from "@/lib/room-themes";
import { spriteForFurniture } from "@/lib/room-sprites";
import { toast } from "sonner";

const REWARD_HAPPINESS = 2;
type Rotation = 0 | 90 | 180 | 270;

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
// `rot` opcional per retrocompatibilitat: layouts antics (sense rot) = 0
type LayoutSlot = { slot: number; furniture_id: string; rot?: Rotation };
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
  category: string;
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
  const [pet, setPet] = useState<{ pet_icon: string; pet_name: string } | null>(null);
  const [isPetHere, setIsPetHere] = useState(false);
  // Fase C · UX: action sheet + mode moure + animació d'entrada
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [moveFromSlot, setMoveFromSlot] = useState<number | null>(null);
  const [justPlacedSlot, setJustPlacedSlot] = useState<number | null>(null);

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
        .select("id, icon, name_key, category, grid_w, grid_h, allowed_categories, happiness_multiplier")
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

  // Mobles col·locats en altres sales + càlcul de si la mascota viu aquí
  // (mateixa lògica que SpacePage: dormitori si existeix, sinó primera per posició)
  useEffect(() => {
    if (!user || !roomId) return;
    let cancel = false;
    (async () => {
      const [allRooms, petRes] = await Promise.all([
        supabase
          .from("player_rooms")
          .select("id, position_x, position_y, layout, room_template_id")
          .eq("user_id", user.id),
        supabase
          .from("player_pets")
          .select("pet_icon, pet_name")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancel) return;
      const rows = (allRooms.data ?? []) as Array<{
        id: string; position_x: number; position_y: number;
        layout?: unknown; room_template_id: string;
      }>;

      // Furn en altres sales (per no duplicar)
      const furn = new Set<string>();
      rows.filter((r) => r.id !== roomId).forEach((r) => {
        const l = Array.isArray(r.layout) ? (r.layout as LayoutSlot[]) : [];
        l.forEach((x) => furn.add(x.furniture_id));
      });
      setPlacedElsewhere(furn);

      // Determinar sala on viu la mascota
      const petData = petRes.data as { pet_icon: string; pet_name: string } | null;
      setPet(petData);
      if (petData && rows.length > 0) {
        const tplIds = Array.from(new Set(rows.map((r) => r.room_template_id)));
        const { data: tpls } = await supabase
          .from("room_catalog")
          .select("id, category")
          .in("id", tplIds);
        if (cancel) return;
        const catById = new Map(((tpls ?? []) as Array<{ id: string; category: string }>).map((t) => [t.id, t.category]));
        const bedroom = rows.find((r) => catById.get(r.room_template_id) === "bedroom");
        const petRoomId = bedroom?.id
          ?? [...rows].sort((a, b) => (a.position_y * 100 + a.position_x) - (b.position_y * 100 + b.position_x))[0]?.id;
        setIsPetHere(petRoomId === roomId);
      } else {
        setIsPetHere(false);
      }
    })();
    return () => { cancel = true; };
  }, [user, roomId]);


  // Sizing derivats de la plantilla
  const gridW = template?.grid_w ?? 4;
  const gridH = template?.grid_h ?? 4;
  const gridSize = gridW * gridH;
  const allowedCats = template?.allowed_categories ?? [];
  const multiplier = Number(template?.happiness_multiplier ?? 1);

  // Bonus terreny: si la sala està sobre el seu terreny preferit al mapa 5×5, +10%
  const terrainBonus = useMemo(() => {
    if (!template || !room || !user) return 0;
    const pref = preferredTerrainForCategory(template.category);
    if (!pref) return 0;
    const grid = generateTerrain(user.id);
    const cell = grid[room.position_y]?.[room.position_x];
    return cell === pref ? TERRAIN_BONUS : 0;
  }, [template, room, user]);

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
    const terrainMult = 1 + terrainBonus;
    for (const x of layout) {
      if (isReward(x.furniture_id)) {
        s += REWARD_HAPPINESS * multiplier * terrainMult;
      } else {
        const c = catalogById.get(x.furniture_id);
        const base = c?.happiness_bonus ?? 0;
        const bonusMult = c && catAllowed(c.category) && allowedCats.length > 0 ? multiplier : 1;
        s += base * bonusMult * terrainMult;
      }
    }
    return Math.round(s);
  }, [layout, catalogById, multiplier, catAllowed, allowedCats.length, terrainBonus]);

  const resolveEntry = useCallback((fid: string) => {
    if (isReward(fid)) {
      const r = rewardById.get(rewardUuid(fid));
      return r ? { icon: r.icon, name: r.name, category: "decor", nameKey: undefined as string | undefined } : null;
    }
    const c = catalogById.get(fid);
    return c ? { icon: c.icon, name: t(c.name_key, c.id), category: c.category, nameKey: c.name_key } : null;
  }, [catalogById, rewardById, t]);

  const persistLayout = useCallback(async (next: LayoutSlot[], prev: LayoutSlot[]) => {
    if (!user || !room) return;
    setSaving(true);
    const { error } = await supabase.from("player_rooms").update({ layout: next as never }).eq("id", room.id).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      // Rollback UI si falla el DB — evita que el moble "desaparegui"
      setRoom((r) => (r ? { ...r, layout: prev } : r));
      toast.error(t("space.saveError", "No s'ha pogut desar"));
    }
  }, [user, room, t]);

  // Efímera: marca casella com "just placed" i neteja al cap d'una estona
  const flashPlaced = useCallback((slot: number) => {
    setJustPlacedSlot(slot);
    window.setTimeout(() => setJustPlacedSlot((s) => (s === slot ? null : s)), 350);
  }, []);

  const handleSlotClick = useCallback(async (idx: number) => {
    if (!room) return;
    const prev = layout;
    const existing = layout.find((s) => s.slot === idx);

    // Prioritat 1: mode "moure" actiu → traslladar (o intercanviar) i sortir del mode
    if (moveFromSlot !== null) {
      if (moveFromSlot === idx) { setMoveFromSlot(null); return; }
      const src = layout.find((s) => s.slot === moveFromSlot);
      if (!src) { setMoveFromSlot(null); return; }
      const filtered = layout.filter((s) => s.slot !== moveFromSlot && s.slot !== idx);
      const next: LayoutSlot[] = [...filtered, { ...src, slot: idx }];
      if (existing) next.push({ ...existing, slot: moveFromSlot }); // swap
      setRoom({ ...room, layout: next });
      setMoveFromSlot(null);
      flashPlaced(idx);
      await persistLayout(next, prev);
      return;
    }

    // Prioritat 2: casella amb moble → obrir action sheet (girar/moure/treure)
    if (existing) {
      setActiveSlot(idx);
      return;
    }

    // Prioritat 3: hi ha un moble seleccionat de l'inventari → col·locar
    if (selected) {
      const next: LayoutSlot[] = [
        ...layout.filter((s) => s.furniture_id !== selected),
        { slot: idx, furniture_id: selected, rot: 0 },
      ];
      setSelected(null);
      setRoom({ ...room, layout: next });
      flashPlaced(idx);
      await persistLayout(next, prev);
    }
  }, [layout, selected, room, moveFromSlot, persistLayout, flashPlaced]);

  // Accions del sheet — cadascuna amb rollback via persistLayout
  const rotateAtSlot = useCallback(async (idx: number) => {
    if (!room) return;
    const prev = layout;
    const item = layout.find((s) => s.slot === idx);
    if (!item) return;
    const nextRot = (((item.rot ?? 0) + 90) % 360) as Rotation;
    const next = layout.map((s) => (s.slot === idx ? { ...s, rot: nextRot } : s));
    setRoom({ ...room, layout: next });
    await persistLayout(next, prev);
  }, [layout, room, persistLayout]);

  const removeAtSlot = useCallback(async (idx: number) => {
    if (!room) return;
    const prev = layout;
    const next = layout.filter((s) => s.slot !== idx);
    setRoom({ ...room, layout: next });
    setActiveSlot(null);
    await persistLayout(next, prev);
  }, [layout, room, persistLayout]);




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
              {terrainBonus > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold"
                  title={t("apartment.terrainBonusTip", "Sala en el seu terreny preferit: +10% felicitat")}
                >
                  🌱 +{Math.round(terrainBonus * 100)}%
                </span>
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

        {moveFromSlot !== null ? (
          <p className="text-xs text-accent text-center font-medium animate-pulse">
            ↔️ {t("room.pickTarget", "Toca on vols col·locar-lo")}
            <button className="ml-2 underline" onClick={() => setMoveFromSlot(null)}>
              {t("common.cancel", "Cancel·la")}
            </button>
          </p>
        ) : selectedEntry ? (
          <p className="text-xs text-accent text-center">{t("space.tapToPlace")} {selectedEntry.icon}</p>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            {t("room.tapHint", "Toca una casella buida per posar · toca un moble per accions")}
          </p>
        )}

        {/* Grid pixel-art temàtic (Fase A/C — sprites + textures) */}
        {(() => {
          const theme = themeForCategory(template?.category);
          const cells: PixelCell[] = Array.from({ length: gridSize }).map((_, idx) => {
            const slot = layout.find((s) => s.slot === idx);
            const entry = slot ? resolveEntry(slot.furniture_id) : null;
            const sprite = entry ? spriteForFurniture(entry.category, entry.nameKey, entry.name) : null;
            return {
              slot: idx,
              icon: entry?.icon,
              spriteUrl: sprite ?? undefined,
              label: entry?.name ?? `casella ${idx + 1}`,
              filled: !!entry,
              highlighted: (!!selected && !entry) || (moveFromSlot !== null && !entry),
              selectedCell: moveFromSlot === idx,
              rotation: (slot?.rot ?? 0) as 0 | 90 | 180 | 270,
              justPlaced: justPlacedSlot === idx,
            };
          });
          return (
            <div className="relative">
              <PixelRoomGrid
                theme={theme}
                gridW={gridW}
                gridH={gridH}
                cells={cells}
                seed={room.id}
                onCellClick={handleSlotClick}
                ariaLabelPrefix="slot"
              />
              {isPetHere && pet && (
                <div
                  className="absolute pointer-events-none z-20 flex flex-col items-center animate-bounce"
                  style={{ left: "10%", bottom: "10%" }}
                  aria-label={t("apartment.petHere", "La teva mascota és aquí")}
                  title={`${pet.pet_icon} ${pet.pet_name}`}
                >
                  <span className="relative text-4xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                    {/* Halo pulsant Fase D */}
                    <span
                      className="absolute inset-0 -z-10 rounded-full animate-ping"
                      style={{ background: "hsl(var(--accent) / 0.35)", filter: "blur(6px)" }}
                    />
                    {pet.pet_icon}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background/90 border border-accent/40 font-semibold mt-0.5 shadow">
                    {pet.pet_name}
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Sheet d'accions per moble col·locat (Fase C · UX) */}
        <Sheet open={activeSlot !== null} onOpenChange={(o) => !o && setActiveSlot(null)}>
          <SheetContent side="bottom" className="pb-8">
            {activeSlot !== null && (() => {
              const item = layout.find((s) => s.slot === activeSlot);
              const entry = item ? resolveEntry(item.furniture_id) : null;
              const sprite = entry ? spriteForFurniture(entry.category, entry.nameKey) : null;
              return (
                <>
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 text-base">
                      {sprite
                        ? <img src={sprite} alt="" className="w-8 h-8 object-contain" style={{ imageRendering: "pixelated" }} />
                        : <span className="text-2xl">{entry?.icon ?? "•"}</span>}
                      <span className="truncate">{entry?.name ?? t("common.item", "Element")}</span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <Button variant="secondary" onClick={() => rotateAtSlot(activeSlot!)} className="flex-col h-auto py-3 gap-1">
                      <span className="text-2xl">🔄</span>
                      <span className="text-[11px]">{t("room.rotate", "Girar")}</span>
                    </Button>
                    <Button variant="secondary" onClick={() => { setMoveFromSlot(activeSlot); setActiveSlot(null); }} className="flex-col h-auto py-3 gap-1">
                      <span className="text-2xl">↔️</span>
                      <span className="text-[11px]">{t("room.move", "Moure")}</span>
                    </Button>
                    <Button variant="destructive" onClick={() => removeAtSlot(activeSlot!)} className="flex-col h-auto py-3 gap-1">
                      <span className="text-2xl">🗑️</span>
                      <span className="text-[11px]">{t("room.remove", "Treure")}</span>
                    </Button>
                  </div>
                </>
              );
            })()}
          </SheetContent>
        </Sheet>


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
