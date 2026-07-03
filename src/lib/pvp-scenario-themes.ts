// ============================================================
// pvp-scenario-themes.ts — Mapping escenari PvP → tema pixel art
// ============================================================
// Els escenaris PvP tenen el mateix nom que les categories de room_catalog
// però per si canvia, mantenim un mapping explícit per nom d'escenari.
// ============================================================
import { ROOM_THEMES, type RoomTheme } from "@/lib/room-themes";

/** Retorna el tema visual d'un escenari PvP a partir del seu nom. */
export function themeForScenarioName(name: string | null | undefined): RoomTheme {
  if (!name) return ROOM_THEMES.hall;
  const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (n.includes("cuina") || n.includes("kitchen")) return ROOM_THEMES.kitchen;
  if (n.includes("habitac") || n.includes("bedroom") || n.includes("dorm")) return ROOM_THEMES.bedroom;
  if (n.includes("lavabo") || n.includes("bath")) return ROOM_THEMES.bath;
  if (n.includes("menjador") || n.includes("dining")) return ROOM_THEMES.dining;
  if (n.includes("despatx") || n.includes("office")) return ROOM_THEMES.office;
  if (n.includes("jardi") || n.includes("garden")) return ROOM_THEMES.garden;
  if (n.includes("balco") || n.includes("balcony")) return ROOM_THEMES.balcony;
  if (n.includes("sala") || n.includes("living")) return ROOM_THEMES.livingroom;
  return ROOM_THEMES.hall;
}

/**
 * Auto-layout d'items en una graella. Determinista per scenarioId de manera que
 * la mateixa cambra sempre col·loca els mobles a les mateixes caselles.
 *
 * Estratègia: distribueix els mobles uniformement en un 6×5 (o més gran si cal),
 * deixant marges i evitant que dos mobles es toquin. Assumeix que el nombre
 * d'items per escenari està entre 4 i 20.
 */
export interface PvPGridSlot {
  itemId: string;
  cellIndex: number;   // posició al grid (row*gridW + col)
}

const PRESET_LAYOUTS: Record<number, number[]> = {
  // nombre d'items → índexs de cel·la triats en un 6×5 (30 cel·les)
  // Distribució visual "en balconet" — deixem la fila 0 lliure per pistes/decor.
  4:  [8, 11, 20, 23],
  5:  [7, 10, 13, 20, 23],
  6:  [7, 10, 13, 19, 22, 25],
  7:  [7, 10, 13, 19, 22, 25, 28],
  8:  [6, 8, 10, 12, 18, 20, 22, 24],
  9:  [6, 8, 10, 12, 18, 20, 22, 24, 27],
  10: [6, 8, 10, 12, 18, 20, 22, 24, 26, 28],
  11: [6, 8, 10, 12, 14, 18, 20, 22, 24, 26, 28],
  12: [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28],
};

export const PVP_GRID_W = 6;
export const PVP_GRID_H = 5;

export function autoLayoutForItems(items: Array<{ id: string }>): PvPGridSlot[] {
  const n = items.length;
  if (n === 0) return [];
  const cells = PRESET_LAYOUTS[n] ?? PRESET_LAYOUTS[Math.min(12, n)];
  return items.slice(0, cells.length).map((it, i) => ({
    itemId: it.id,
    cellIndex: cells[i],
  }));
}
