// ============================================================
// personal-pvp-adapter.ts
// ============================================================
// Tradueix un snapshot d'espai propi (grid 4×4) a les estructures
// que GamePage ja consumeix: scenarios, objects, items, connections.
//
// Decisions tancades:
//  - 1 sola "sala" sintètica per mode personal_pvp.
//  - Cada moble del snapshot = 1 objecte + 1 item col·locable.
//  - Sense object_specials, item_interactions, dirty/breakable, fosca.
//  - Sense connexions (cap escenari veí).
// ============================================================
import { supabase } from "@/integrations/supabase/client";

export type LayoutSlot = { slot: number; furniture_id: string };

export type FurnitureCatalogItem = {
  id: string;
  name_key: string;
  icon: string;
  category: string;
};

export type SynthScenario = {
  id: string;
  name: string;
  icon: string;
  display_order: number;
};

export type SynthObject = {
  id: string;
  name: string;
  icon: string;
  display_order: number;
  is_special: false;
};

export type SynthItem = {
  id: string;
  scenario_id: string;
  name: string;
  icon: string;
  hidden: false;
  display_order: number;
};

export const PERSONAL_SCENARIO_ID = "personal-room";

/** Normalitza el camp `layout` de `games.{host,guest}_space_snapshot` a LayoutSlot[]. */
export function parseSnapshot(raw: unknown): LayoutSlot[] {
  if (!raw) return [];
  // Acceptem tant l'array directe com l'objecte {layout: [...]}.
  const arr = Array.isArray(raw)
    ? raw
    : (raw as { layout?: unknown }).layout;
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (s): s is LayoutSlot =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as LayoutSlot).slot === "number" &&
        typeof (s as LayoutSlot).furniture_id === "string"
    )
    .map((s) => ({ slot: s.slot, furniture_id: s.furniture_id }));
}

/** Una sola sala sintètica. ownerName apareix al label per UX. */
export function synthScenario(ownerName?: string | null): SynthScenario {
  return {
    id: PERSONAL_SCENARIO_ID,
    name: ownerName ? `🏠 ${ownerName}` : "🏠 Habitació personal",
    icon: "🏠",
    display_order: 0,
  };
}

/** Mobles del snapshot → objectes amagables (un per moble únic, ordenats per slot). */
export function synthObjects(
  snapshot: LayoutSlot[],
  catalog: Map<string, FurnitureCatalogItem>
): SynthObject[] {
  const seen = new Set<string>();
  const out: SynthObject[] = [];
  for (const s of snapshot.slice().sort((a, b) => a.slot - b.slot)) {
    if (seen.has(s.furniture_id)) continue;
    const cat = catalog.get(s.furniture_id);
    if (!cat) continue;
    seen.add(s.furniture_id);
    out.push({
      id: `pf:${s.furniture_id}`,
      name: cat.name_key,
      icon: cat.icon,
      display_order: s.slot,
      is_special: false,
    });
  }
  return out;
}

/** Mobles del snapshot → items visibles a la sala personal. */
export function synthItems(
  snapshot: LayoutSlot[],
  catalog: Map<string, FurnitureCatalogItem>
): SynthItem[] {
  const seen = new Set<string>();
  const out: SynthItem[] = [];
  for (const s of snapshot.slice().sort((a, b) => a.slot - b.slot)) {
    if (seen.has(s.furniture_id)) continue;
    const cat = catalog.get(s.furniture_id);
    if (!cat) continue;
    seen.add(s.furniture_id);
    out.push({
      id: `pf:${s.furniture_id}`,
      scenario_id: PERSONAL_SCENARIO_ID,
      name: cat.name_key,
      icon: cat.icon,
      hidden: false,
      display_order: s.slot,
    });
  }
  return out;
}

/** Sempre buit: només una sala. */
export function synthConnections(): SynthScenario[] {
  return [];
}

/** Prefix used to store `reward_items` uuids inside `player_spaces.layout.furniture_id`. */
export const REWARD_PREFIX = "reward:";

/** Carrega el catàleg complet de mobles (id → item). Inclou reward_items amb prefix `reward:<uuid>`. */
export async function loadFurnitureCatalog(): Promise<Map<string, FurnitureCatalogItem>> {
  const [fc, ri] = await Promise.all([
    supabase.from("furniture_catalog").select("id, name_key, icon, category"),
    supabase.from("reward_items").select("id, name, icon"),
  ]);
  if (fc.error) throw fc.error;
  const m = new Map<string, FurnitureCatalogItem>();
  (fc.data ?? []).forEach((row) => m.set(row.id, row as FurnitureCatalogItem));
  // Reward items exposats com a pseudo-mobles amb ID `reward:<uuid>`
  if (!ri.error) {
    (ri.data ?? []).forEach((row: { id: string; name: string; icon: string }) => {
      const key = `${REWARD_PREFIX}${row.id}`;
      m.set(key, { id: key, name_key: row.name, icon: row.icon, category: "reward" });
    });
  }
  return m;
}

/**
 * Resol quin snapshot ha de carregar el motor segons el rol del usuari a la partida.
 * El que **busca** veu el snapshot del **rival** (no pot saber on ha amagat l'altre,
 * però el "tauler de joc" actiu és la seva pròpia sala). Decisió: cada jugador juga
 * sobre la **seva pròpia sala** (amaga al seu espai, l'altre busca al seu espai).
 *
 * Per simetria amb el mode estàndard on tots dos veuen els mateixos escenaris,
 * unim els dos snapshots en una sola sala que conté tots els mobles únics dels dos.
 */
export function mergeSnapshots(
  host: LayoutSlot[],
  guest: LayoutSlot[]
): LayoutSlot[] {
  const seen = new Set<string>();
  const out: LayoutSlot[] = [];
  let slotCounter = 0;
  for (const s of [...host, ...guest]) {
    if (seen.has(s.furniture_id)) continue;
    seen.add(s.furniture_id);
    out.push({ slot: slotCounter++, furniture_id: s.furniture_id });
  }
  return out;
}

export type SynthConnection = { scenario_a: string; scenario_b: string };

export type PersonalCombatData = {
  scenarios: SynthScenario[];
  objects: SynthObject[];
  items: SynthItem[];
  /** Multi-sala v2: connexions entre escenaris (unió host+guest). */
  connections: SynthConnection[];
  /** Multi-sala v2: mapa scenarioId → items d'aquell escenari. */
  itemsByScenario: Map<string, SynthItem[]>;
};

/** Helper legacy (compatibilitat de tests): 1 sola sala des dels snapshots antics. */
export async function loadPersonalCombatData(
  hostSnapshot: unknown,
  guestSnapshot: unknown
): Promise<PersonalCombatData> {
  const catalog = await loadFurnitureCatalog();
  const merged = mergeSnapshots(parseSnapshot(hostSnapshot), parseSnapshot(guestSnapshot));
  const items = synthItems(merged, catalog);
  const itemsByScenario = new Map<string, SynthItem[]>();
  itemsByScenario.set(PERSONAL_SCENARIO_ID, items);
  return {
    scenarios: [synthScenario()],
    objects: synthObjects(merged, catalog),
    items,
    connections: [],
    itemsByScenario,
  };
}

// ============================================================
// Multi-sala v2 — nou model basat en `player_rooms` + `room_connections`
// ============================================================

type PlayerRoomRow = {
  id: string;
  user_id: string;
  room_template_id: string;
  custom_name: string;
  layout: LayoutSlot[] | unknown;
};
type RoomConnectionRow = { id: string; room_a_id: string; room_b_id: string };
type RoomTemplateRow = { id: string; icon: string; name_key: string };

/**
 * Carrega la unió multi-sala de host+guest.
 * Cada sala d'un jugador es converteix en 1 escenari sintètic (id = `room:<uuid>`).
 * Les connexions són bidireccionals (l'engine assumeix bidireccional).
 * Els mobles de cada sala generen items propis d'aquell escenari, i cada moble
 * únic (per `furniture_id`) genera un objecte amagable a nivell global.
 */
export async function loadPersonalCombatDataFromRooms(
  hostUserId: string,
  guestUserId: string
): Promise<PersonalCombatData> {
  const [furnitureCatalog, roomsRes, connsRes, tplRes] = await Promise.all([
    loadFurnitureCatalog(),
    supabase
      .from("player_rooms")
      .select("id, user_id, room_template_id, custom_name, layout")
      .in("user_id", [hostUserId, guestUserId]),
    supabase
      .from("room_connections")
      .select("id, room_a_id, room_b_id")
      .in("user_id", [hostUserId, guestUserId]),
    supabase.from("room_catalog").select("id, icon, name_key"),
  ]);

  const rooms = (roomsRes.data as PlayerRoomRow[] | null) ?? [];
  const conns = (connsRes.data as RoomConnectionRow[] | null) ?? [];
  const templates = new Map<string, RoomTemplateRow>();
  ((tplRes.data as RoomTemplateRow[] | null) ?? []).forEach((r) => templates.set(r.id, r));

  const scenarios: SynthScenario[] = [];
  const itemsByScenario = new Map<string, SynthItem[]>();
  const allItems: SynthItem[] = [];
  const seenFurniture = new Set<string>();
  const objects: SynthObject[] = [];

  rooms.forEach((room, idx) => {
    const tpl = templates.get(room.room_template_id);
    const scenarioId = `room:${room.id}`;
    scenarios.push({
      id: scenarioId,
      name: room.custom_name,
      icon: tpl?.icon ?? "🏠",
      display_order: idx,
    });

    const layout = Array.isArray(room.layout) ? (room.layout as LayoutSlot[]) : [];
    const roomItems: SynthItem[] = [];
    layout.forEach((slot) => {
      const cat = furnitureCatalog.get(slot.furniture_id);
      if (!cat) return;
      // Item propi de l'escenari — id únic per (sala, moble)
      const itemId = `pf:${room.id}:${slot.furniture_id}`;
      const item: SynthItem = {
        id: itemId,
        scenario_id: scenarioId,
        name: cat.name_key,
        icon: cat.icon,
        hidden: false,
        display_order: slot.slot,
      };
      roomItems.push(item);
      allItems.push(item);

      // Objecte amagable — un per furniture_id únic a tota l'apartament
      if (!seenFurniture.has(slot.furniture_id)) {
        seenFurniture.add(slot.furniture_id);
        objects.push({
          id: `pf:${slot.furniture_id}`,
          name: cat.name_key,
          icon: cat.icon,
          display_order: objects.length,
          is_special: false,
        });
      }
    });
    itemsByScenario.set(scenarioId, roomItems);
  });

  const connections: SynthConnection[] = conns.map((c) => ({
    scenario_a: `room:${c.room_a_id}`,
    scenario_b: `room:${c.room_b_id}`,
  }));

  return { scenarios, objects, items: allItems, connections, itemsByScenario };
}

/** Helper: veïns d'un escenari donada la llista de connexions. */
export function neighborsOf(
  scenarioId: string,
  connections: SynthConnection[],
  scenariosById: Map<string, SynthScenario>
): SynthScenario[] {
  const out: SynthScenario[] = [];
  for (const c of connections) {
    if (c.scenario_a === scenarioId) {
      const s = scenariosById.get(c.scenario_b);
      if (s) out.push(s);
    } else if (c.scenario_b === scenarioId) {
      const s = scenariosById.get(c.scenario_a);
      if (s) out.push(s);
    }
  }
  return out;
}
