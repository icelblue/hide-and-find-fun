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

export type PersonalCombatData = {
  scenarios: SynthScenario[];
  objects: SynthObject[];
  items: SynthItem[];
};

/** Helper d'una sola crida per a `GamePage`. */
export async function loadPersonalCombatData(
  hostSnapshot: unknown,
  guestSnapshot: unknown
): Promise<PersonalCombatData> {
  const catalog = await loadFurnitureCatalog();
  const merged = mergeSnapshots(parseSnapshot(hostSnapshot), parseSnapshot(guestSnapshot));
  return {
    scenarios: [synthScenario()],
    objects: synthObjects(merged, catalog),
    items: synthItems(merged, catalog),
  };
}
