// ============================================================
// SpacePage — Vista Apartament (multi-sala)
// ============================================================
// Mostra totes les sales del jugador en un mini-mapa 5×5 amb
// snap a coordenades. Botons: afegir sala, connectar sales, entrar
// a una sala per editar-la.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { toast } from "sonner";

const MAP_SIZE = 5;

type RoomTemplate = {
  id: string;
  name_key: string;
  category: string;
  icon: string;
  price_coins: number;
  unlock_level: number;
  max_doors: number;
  grid_w: number;
  grid_h: number;
  allowed_categories: string[];
  happiness_multiplier: number;
};


type PlayerRoom = {
  id: string;
  room_template_id: string;
  custom_name: string;
  layout: Array<{ slot: number; furniture_id: string }>;
  position_x: number;
  position_y: number;
};

type Connection = { id: string; room_a_id: string; room_b_id: string };

export default function SpacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [rooms, setRooms] = useState<PlayerRoom[]>([]);
  const [conns, setConns] = useState<Connection[]>([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [placingTemplate, setPlacingTemplate] = useState<RoomTemplate | null>(null);
  const [connectA, setConnectA] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [tpls, rms, cns, prof] = await Promise.all([
      supabase.from("room_catalog").select("*").order("unlock_level"),
      supabase.from("player_rooms").select("id, room_template_id, custom_name, layout, position_x, position_y").eq("user_id", user.id),
      supabase.from("room_connections").select("id, room_a_id, room_b_id").eq("user_id", user.id),
      supabase.from("profiles").select("bonus_tokens").eq("user_id", user.id).maybeSingle(),
    ]);
    setTemplates((tpls.data as RoomTemplate[]) ?? []);
    setRooms(((rms.data as unknown as PlayerRoom[]) ?? []).map((r) => ({
      ...r,
      layout: Array.isArray(r.layout) ? r.layout : [],
    })));
    setConns((cns.data as Connection[]) ?? []);
    setCoins((prof.data as { bonus_tokens?: number } | null)?.bonus_tokens ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const roomById = useMemo(() => {
    const m = new Map<string, PlayerRoom>();
    rooms.forEach((r) => m.set(r.id, r));
    return m;
  }, [rooms]);
  const templateById = useMemo(() => {
    const m = new Map<string, RoomTemplate>();
    templates.forEach((tpl) => m.set(tpl.id, tpl));
    return m;
  }, [templates]);

  const occupiedCells = useMemo(() => {
    const s = new Set<string>();
    rooms.forEach((r) => s.add(`${r.position_x}:${r.position_y}`));
    return s;
  }, [rooms]);

  const totalFurniture = useMemo(
    () => rooms.reduce((n, r) => n + r.layout.length, 0),
    [rooms]
  );

  // ---------- Actions ----------
  const startAdd = (tpl: RoomTemplate) => {
    if (coins < tpl.price_coins) { toast.error(t("space.notEnough")); return; }
    if (rooms.length >= 8) { toast.error(t("apartment.maxRooms", "Màxim 8 sales")); return; }
    setPlacingTemplate(tpl);
    setAddOpen(false);
  };

  const placeRoomAt = async (x: number, y: number) => {
    if (!user || !placingTemplate) return;
    if (occupiedCells.has(`${x}:${y}`)) { toast.error(t("apartment.cellTaken", "Casella ocupada")); return; }
    const tpl = placingTemplate;
    const newCoins = coins - tpl.price_coins;
    // Genera nom "Menjador 1", "Menjador 2"...
    const sameType = rooms.filter((r) => r.room_template_id === tpl.id).length + 1;
    const baseName = t(tpl.name_key, tpl.id);
    const name = sameType > 1 ? `${baseName} ${sameType}` : baseName;

    if (tpl.price_coins > 0) {
      const { error } = await supabase.from("profiles").update({ bonus_tokens: newCoins } as never).eq("user_id", user.id);
      if (error) { toast.error(t("space.buyError")); return; }
      setCoins(newCoins);
    }
    const { error: e2 } = await supabase.from("player_rooms").insert({
      user_id: user.id,
      room_template_id: tpl.id,
      custom_name: name,
      layout: [] as never,
      position_x: x,
      position_y: y,
    });
    if (e2) {
      const msg = e2.message?.includes("max_rooms_reached")
        ? t("apartment.maxRooms", "Màxim 8 sales")
        : t("space.buyError");
      // rollback coins
      if (tpl.price_coins > 0) await supabase.from("profiles").update({ bonus_tokens: coins } as never).eq("user_id", user.id);
      setCoins(coins);
      toast.error(msg);
      setPlacingTemplate(null);
      return;
    }
    setPlacingTemplate(null);
    toast.success(`${tpl.icon} ${name}`);
    refresh();
  };

  const handleConnect = async (roomBId: string) => {
    if (!user || !connectA) return;
    if (connectA === roomBId) { toast.error(t("apartment.samRoom", "Escull una altra sala")); return; }
    const { error } = await supabase.from("room_connections").insert({
      user_id: user.id, room_a_id: connectA, room_b_id: roomBId,
    });
    if (error) {
      const m = (error.message || "").toLowerCase();
      if (m.includes("max_doors")) toast.error(t("apartment.errMaxDoors", "Una sala ha arribat al límit de portes"));
      else if (m.includes("duplicate") || m.includes("unique")) toast.error(t("apartment.errDup", "Aquesta connexió ja existeix"));
      else toast.error(error.message);
      return;
    }
    setConnectA(null);
    setConnectOpen(false);
    toast.success("🚪 " + t("apartment.doorAdded", "Porta afegida"));
    refresh();
  };

  const deleteRoom = async (r: PlayerRoom) => {
    if (!user) return;
    if (!confirm(t("apartment.confirmDelete", "Eliminar aquesta sala i les seves portes? (perds els mobles col·locats)"))) return;
    const { error } = await supabase.from("player_rooms").delete().eq("id", r.id).eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("apartment.roomDeleted", "Sala eliminada"));
    refresh();
  };

  const deleteConn = async (c: Connection) => {
    if (!user) return;
    const { error } = await supabase.from("room_connections").delete().eq("id", c.id).eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  // ---------- Render ----------
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground animate-pulse">{t("common.loading")}</p></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <OnboardingDialog
        storageKey="onboarding:apartment:v1"
        icon="🏠"
        title={t("apartment.onboarding.title", "El teu apartament")}
        bullets={[
          t("apartment.onboarding.b1", "Compra sales (menjador, balcó, cuina…) al teu gust."),
          t("apartment.onboarding.b2", "Connecta-les amb portes (🚪) — cada sala admet fins a 2."),
          t("apartment.onboarding.b3", "Toca una sala per decorar-la amb mobles i col·lecció."),
          t("apartment.onboarding.b4", "Necessites ≥2 sales connectades i ≥4 mobles per jugar Personal PvP."),
        ]}
        ctaLabel={t("onboarding.cta", "Entesos!")}
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-3 py-2.5 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-sm">← {t("common.lobbyShort")}</Button>
        <h1 className="text-base font-bold">🏠 {t("apartment.title", "Apartament")}</h1>
        <div className="text-sm font-semibold flex items-center gap-1">🪙 {coins}</div>
      </div>

      <div className="px-3 pt-3 space-y-3">
        <Card className="glass">
          <CardContent className="py-2.5 flex items-center justify-between text-xs">
            <span>{t("apartment.rooms", "Sales")}: <span className="font-bold">{rooms.length}/8</span></span>
            <span>{t("apartment.doors", "Portes")}: <span className="font-bold">{conns.length}</span></span>
            <span className="text-muted-foreground">{t("apartment.furniture", "Mobles")}: {totalFurniture}</span>
          </CardContent>
        </Card>

        {placingTemplate && (
          <div className="rounded-xl border border-accent/50 bg-accent/10 p-3 text-center text-sm animate-pulse">
            {t("apartment.pickCell", "Toca una casella lliure per col·locar")} {placingTemplate.icon}
            <button className="ml-2 text-xs text-muted-foreground underline" onClick={() => setPlacingTemplate(null)}>
              {t("common.cancel")}
            </button>
          </div>
        )}

        {/* Mini-mapa 5×5 amb sales + línies de connexió */}
        <div className="relative w-full max-w-[360px] mx-auto aspect-square bg-muted/30 rounded-2xl border border-border p-1.5">
          {/* SVG connections layer */}
          <svg className="absolute inset-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)] pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {conns.map((c) => {
              const a = roomById.get(c.room_a_id);
              const b = roomById.get(c.room_b_id);
              if (!a || !b) return null;
              const cell = 100 / MAP_SIZE;
              const ax = (a.position_x + 0.5) * cell;
              const ay = (a.position_y + 0.5) * cell;
              const bx = (b.position_x + 0.5) * cell;
              const by = (b.position_y + 0.5) * cell;
              return (
                <g key={c.id}>
                  <line x1={ax} y1={ay} x2={bx} y2={by} stroke="hsl(var(--accent))" strokeWidth="0.8" strokeDasharray="2 1" opacity="0.7" />
                </g>
              );
            })}
          </svg>

          <div className="relative grid grid-cols-5 gap-1 h-full">
            {Array.from({ length: MAP_SIZE * MAP_SIZE }).map((_, idx) => {
              const x = idx % MAP_SIZE;
              const y = Math.floor(idx / MAP_SIZE);
              const room = rooms.find((r) => r.position_x === x && r.position_y === y);
              const tpl = room ? templateById.get(room.room_template_id) : null;
              const isPlacingHere = !!placingTemplate;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (isPlacingHere) placeRoomAt(x, y);
                    else if (room) navigate(`/space/room/${room.id}`);
                  }}
                  className={`relative rounded-lg border transition-all text-center flex flex-col items-center justify-center overflow-hidden ${
                    room
                      ? "bg-card border-accent/40 shadow-sm hover:border-accent"
                      : isPlacingHere
                      ? "bg-accent/10 border-accent/60 border-dashed animate-pulse"
                      : "bg-background/40 border-border/30"
                  }`}
                  aria-label={room ? room.custom_name : `cell-${x}-${y}`}
                >
                  {room && tpl && (
                    <>
                      <span className="text-xl leading-none">{tpl.icon}</span>
                      <span className="text-[8px] font-medium truncate w-full px-0.5 text-foreground/80">{room.custom_name}</span>
                      <span className="text-[7px] text-muted-foreground">{room.layout.length}📦</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setAddOpen(true)} disabled={rooms.length >= 8 || !!placingTemplate}>
            ➕ {t("apartment.addRoom", "Sala nova")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => { setConnectA(null); setConnectOpen(true); }}
            disabled={rooms.length < 2}
          >
            🚪 {t("apartment.connect", "Connectar")}
          </Button>
        </div>

        {/* Room list with per-room delete + door delete */}
        {rooms.length > 0 && (
          <div className="space-y-1.5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("apartment.myRooms", "Les meves sales")}
            </h2>
            {rooms.map((r) => {
              const tpl = templateById.get(r.room_template_id);
              const doors = conns.filter((c) => c.room_a_id === r.id || c.room_b_id === r.id);
              return (
                <div key={r.id} className="rounded-xl bg-card border border-border p-2.5 flex items-center gap-2">
                  <button onClick={() => navigate(`/space/room/${r.id}`)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <span className="text-2xl shrink-0">{tpl?.icon ?? "🏠"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{r.custom_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.layout.length} {t("apartment.pieces", "mobles")} · {doors.length}/{tpl?.max_doors ?? 2} 🚪
                      </p>
                    </div>
                  </button>
                  {doors.map((d) => {
                    const other = d.room_a_id === r.id ? roomById.get(d.room_b_id) : roomById.get(d.room_a_id);
                    if (!other) return null;
                    return (
                      <button
                        key={d.id}
                        onClick={() => deleteConn(d)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 hover:bg-destructive/20 hover:text-destructive transition-colors"
                        title={t("apartment.removeDoor", "Treure porta")}
                      >
                        🚪→{other.custom_name.slice(0, 6)}
                      </button>
                    );
                  })}
                  <button onClick={() => deleteRoom(r)} className="text-xs text-destructive/70 hover:text-destructive p-1" title={t("common.delete", "Eliminar")}>
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add room dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>➕ {t("apartment.addRoom", "Sala nova")}</DialogTitle>
            <DialogDescription className="text-xs">{t("apartment.addDesc", "Escull el tipus. Es col·locarà després tocant una casella lliure del mapa.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {templates.map((tpl) => {
              const canAfford = coins >= tpl.price_coins;
              return (
                <button
                  key={tpl.id}
                  onClick={() => startAdd(tpl)}
                  disabled={!canAfford}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    canAfford ? "bg-card border-border hover:border-accent/60" : "bg-muted/20 border-border/40 opacity-60"
                  }`}
                >
                  <span className="text-2xl">{tpl.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t(tpl.name_key, tpl.id)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Lv{tpl.unlock_level} · {tpl.grid_w}×{tpl.grid_h} · {tpl.max_doors}🚪
                      {Number(tpl.happiness_multiplier) > 1 && ` · ×${Number(tpl.happiness_multiplier).toFixed(2)}😊`}
                    </p>
                    {tpl.allowed_categories && tpl.allowed_categories.length > 0 && (
                      <p className="text-[9px] text-muted-foreground/70 truncate">
                        {tpl.allowed_categories.map((c) => t(`space.cat.${c}`, c)).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${canAfford ? "text-accent" : "text-muted-foreground"}`}>
                    {tpl.price_coins === 0 ? t("apartment.free", "Gratis") : `🪙 ${tpl.price_coins}`}
                  </span>

                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Connect dialog */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🚪 {t("apartment.connect", "Connectar sales")}</DialogTitle>
            <DialogDescription className="text-xs">
              {connectA
                ? t("apartment.pickSecond", "Ara escull la segona sala")
                : t("apartment.pickFirst", "Escull la primera sala")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {rooms.map((r) => {
              const tpl = templateById.get(r.room_template_id);
              const doorsUsed = conns.filter((c) => c.room_a_id === r.id || c.room_b_id === r.id).length;
              const maxDoors = tpl?.max_doors ?? 2;
              const isFull = doorsUsed >= maxDoors;
              const isSelected = connectA === r.id;
              return (
                <button
                  key={r.id}
                  disabled={isFull && !isSelected}
                  onClick={() => {
                    if (!connectA) setConnectA(r.id);
                    else handleConnect(r.id);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected ? "bg-accent/20 border-accent"
                    : isFull ? "bg-muted/20 border-border/40 opacity-60"
                    : "bg-card border-border hover:border-accent/60"
                  }`}
                >
                  <span className="text-2xl">{tpl?.icon ?? "🏠"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.custom_name}</p>
                    <p className="text-[10px] text-muted-foreground">{doorsUsed}/{maxDoors} 🚪</p>
                  </div>
                  {isSelected && <span className="text-xs text-accent">✓</span>}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
