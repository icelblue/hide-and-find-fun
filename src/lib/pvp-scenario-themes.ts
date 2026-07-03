// ============================================================
// pvp-scenario-themes.ts — Mapping escenari PvP → tema + layout
// ============================================================
import { ROOM_THEMES, type RoomTheme } from "@/lib/room-themes";
import bgCounter from "@/assets/room/bg-counter.png";
import bgDeskSurface from "@/assets/room/bg-desk-surface.png";
import bgTiledWall from "@/assets/room/bg-tiled-wall.png";
import bgFence from "@/assets/room/bg-fence.png";
import bgWindow from "@/assets/room/bg-window.png";
import bgCurtain from "@/assets/room/bg-curtain.png";
import bgRailing from "@/assets/room/bg-railing.png";
import bgWallWood from "@/assets/room/bg-wall-wood.png";
import bgRugLarge from "@/assets/room/bg-rug-large.png";
import bgBacksplash from "@/assets/room/bg-backsplash.png";
import bgSkyline from "@/assets/room/bg-skyline.png";
import bgBalconyFloor from "@/assets/room/bg-balcony-floor.png";

/** Retorna el tema visual d'un escenari PvP a partir del seu nom. */
export function themeForScenarioName(name: string | null | undefined): RoomTheme {
  if (!name) return ROOM_THEMES.hall;
  const n = normScenarioKey(name);
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

export interface PvPGridSlot {
  itemId: string;
  cellIndex: number;
}

export const PVP_GRID_W = 6;
export const PVP_GRID_H = 5;

function normScenarioKey(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ============================================================
// Layouts semàntics per escenari (grid 6×5 = 30 cel·les)
// Indexació: idx = row * 6 + col. Fila 0 = paret superior.
// Cada regla mapeja un patró de nom → cel·la ideal. Els mobles
// sense match cauen als "fallback" per omplir sense superposar.
// ============================================================
type CellRule = { pattern: RegExp; cell: number };

const SCENARIO_LAYOUTS: Record<string, CellRule[]> = {
  // LAVABO: banyera a la paret llarga, WC en cantonada, pica sota mirall
  lavabo: [
    { pattern: /mirall|mirror/i, cell: 1 },       // paret sobre pica
    { pattern: /prestatg/i, cell: 4 },            // paret dreta amunt
    { pattern: /pica|sink/i, cell: 7 },           // sota mirall
    { pattern: /tovalloler|towel/i, cell: 10 },   // costat
    { pattern: /v[aà]ter|wc|toilet/i, cell: 11 }, // cantonada dreta
    { pattern: /calaix|drawer/i, cell: 8 },
    { pattern: /banyera|dutxa|bath/i, cell: 18 }, // paret baixa esq
    { pattern: /cistella|paperera|basket/i, cell: 20 },
    { pattern: /rentadora|washer|lavadora/i, cell: 22 },
    { pattern: /secadora|dryer/i, cell: 23 },     // al costat rentadora
  ],
  // CUINA: electrodomèstics alineats a paret, taula al centre
  cuina: [
    { pattern: /nevera|fridge/i, cell: 0 },
    { pattern: /forn|stove|oven/i, cell: 1 },
    { pattern: /microones|microwave/i, cell: 2 },
    { pattern: /pica|sink/i, cell: 3 },
    { pattern: /calaix|drawer/i, cell: 4 },
    { pattern: /despensa|pantry/i, cell: 5 },
    { pattern: /taula|table/i, cell: 14 },        // centre
    { pattern: /cadira|chair/i, cell: 15 },       // al costat taula
  ],
  // HABITACIÓ: llit centrat, armari a paret, escriptori cantonada
  habitacio: [
    { pattern: /armari|wardrobe/i, cell: 0 },
    { pattern: /prestatg/i, cell: 1 },
    { pattern: /c[oò]moda/i, cell: 4 },
    { pattern: /calaixera/i, cell: 5 },
    { pattern: /llit|bed|hamaca/i, cell: 8 },     // centre-esq
    { pattern: /tauleta|nightstand/i, cell: 10 }, // costat llit
    { pattern: /escriptori|desk/i, cell: 18 },
    { pattern: /catifa|rug/i, cell: 21 },         // terra centre
    { pattern: /caixa|box/i, cell: 23 },
  ],
  // DESPATX: escriptori centre, cadira al costat, arxius a paret
  despatx: [
    { pattern: /prestatg/i, cell: 0 },
    { pattern: /arxivador|filing/i, cell: 5 },
    { pattern: /llum|lamp/i, cell: 7 },
    { pattern: /escriptori|desk/i, cell: 8 },
    { pattern: /ordinador|laptop|computer/i, cell: 9 }, // sobre escriptori
    { pattern: /calaix|drawer/i, cell: 11 },
    { pattern: /cadira|chair/i, cell: 14 },        // davant escriptori
    { pattern: /paperera|bin|trash/i, cell: 18 },
  ],
  // MENJADOR: TV a paret superior, sofà DAVANT la TV (mateixa columna), taula/cadires a un costat
  menjador: [
    { pattern: /vitrina/i, cell: 0 },
    { pattern: /quadre|painting/i, cell: 2 },
    { pattern: /televisi|\btv\b/i, cell: 3 },
    { pattern: /llum|lamp/i, cell: 4 },
    { pattern: /aparador/i, cell: 5 },
    { pattern: /sof[àa]|couch/i, cell: 15 },   // davant la TV
    { pattern: /taula|table/i, cell: 20 },
    { pattern: /cadira|chair/i, cell: 22 },
    { pattern: /catifa|rug/i, cell: 26 },
  ],
  // JARDÍ: arbre a un costat, caseta a l'altre, elements dispersos
  jardi: [
    { pattern: /arbre|tree/i, cell: 0 },
    { pattern: /caseta|shed/i, cell: 5 },
    { pattern: /hamaca/i, cell: 8 },
    { pattern: /jardinera|planter/i, cell: 11 },
    { pattern: /banc|bench/i, cell: 15 },
    { pattern: /pedra|rock|stone/i, cell: 18 },
    { pattern: /barbacoa|bbq|grill/i, cell: 19 },
    { pattern: /regadora|watering/i, cell: 21 },
    { pattern: /ba[uú]l|chest/i, cell: 23 },
  ],
  // BALCÓ: cel + skyline fila 0-1 (buides visualment), barana fila 2, mobles a terra fila 3-4
  balco: [
    { pattern: /jardinera|planter/i, cell: 18 },
    { pattern: /testos|plant|maceta/i, cell: 24 },
    { pattern: /estenedor|clothesline/i, cell: 19 },
    { pattern: /fanal|lantern|lamp/i, cell: 20 },
    { pattern: /taula|table/i, cell: 21 },
    { pattern: /gerro|vase/i, cell: 22 },
    { pattern: /catifa|rug/i, cell: 26 },
    { pattern: /cadira|chair/i, cell: 27 },
    { pattern: /caixa|box/i, cell: 28 },
  ],
};

// Fallback per escenaris sense layout — distribució en balconet
const PRESET_LAYOUTS: Record<number, number[]> = {
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

// Ordre preferent per omplir mobles sense regla (evita paret superior i cantonades ja usades)
const FALLBACK_CELLS = [13, 16, 20, 22, 7, 10, 25, 26, 27, 28, 9, 12, 6, 17, 3, 4, 2];

/**
 * Auto-layout d'items en la graella PvP. Si l'escenari té un layout semàntic
 * definit, col·loca cada moble a la cel·la lògica pel seu tipus (banyera al
 * lloc de la banyera, nevera a la cuina, etc). La resta cau a cel·les lliures.
 */
export function autoLayoutForItems(
  items: Array<{ id: string; name?: string; name_key?: string }>,
  scenarioName?: string | null,
): PvPGridSlot[] {
  if (items.length === 0) return [];

  const scenKey = scenarioName ? normScenarioKey(scenarioName) : "";
  const layoutKey = Object.keys(SCENARIO_LAYOUTS).find((k) => scenKey.includes(k));
  const rules = layoutKey ? SCENARIO_LAYOUTS[layoutKey] : null;

  if (rules) {
    const used = new Set<number>();
    const result: PvPGridSlot[] = [];
    const unmatched: typeof items = [];
    for (const it of items) {
      const hay = `${it.name ?? ""} ${it.name_key ?? ""}`;
      const rule = rules.find((r) => r.pattern.test(hay) && !used.has(r.cell));
      if (rule) {
        used.add(rule.cell);
        result.push({ itemId: it.id, cellIndex: rule.cell });
      } else {
        unmatched.push(it);
      }
    }
    for (const it of unmatched) {
      const cell = FALLBACK_CELLS.find((c) => !used.has(c)) ?? [...Array(30).keys()].find((c) => !used.has(c)) ?? 0;
      used.add(cell);
      result.push({ itemId: it.id, cellIndex: cell });
    }
    return result;
  }

  // Fallback genèric per escenaris desconeguts
  const n = items.length;
  const cells = PRESET_LAYOUTS[n] ?? PRESET_LAYOUTS[Math.min(12, n)];
  return items.slice(0, cells.length).map((it, i) => ({ itemId: it.id, cellIndex: cells[i] }));
}

// ============================================================
// BACKDROPS — capa decorativa (mobiliari base) per escenari
// Cada backdrop cobreix un rectangle del grid [col, row, spanCols, spanRows]
// i es pinta SOTA els mobles interactius. No captura clicks.
// ============================================================
export interface ScenarioBackdrop {
  sprite: string;
  col: number;
  row: number;
  spanCols: number;
  spanRows: number;
  /** 0-1, opacitat opcional (per elements de fons molt suaus) */
  opacity?: number;
  /** true = sense object-contain, ocupa tota la cel·la (parets, tanques) */
  cover?: boolean;
}

const SCENARIO_BACKDROPS: Record<string, ScenarioBackdrop[]> = {
  cuina: [
    // Encimera contínua fila 0
    { sprite: bgCounter, col: 0, row: 0, spanCols: 6, spanRows: 1, cover: true },
    // Rajola "backsplash" a la fila 1 (paret sobre l'encimera) — dóna profunditat
    { sprite: bgBacksplash, col: 0, row: 1, spanCols: 6, spanRows: 1, cover: true, opacity: 0.55 },
  ],
  lavabo: [
    { sprite: bgTiledWall, col: 0, row: 0, spanCols: 6, spanRows: 2, cover: true, opacity: 0.55 },
    { sprite: bgCounter, col: 0, row: 1, spanCols: 3, spanRows: 1, cover: true, opacity: 0.9 },
  ],
  despatx: [
    { sprite: bgDeskSurface, col: 1, row: 1, spanCols: 4, spanRows: 2 },
    { sprite: bgWindow, col: 4, row: 0, spanCols: 2, spanRows: 1, opacity: 0.9 },
  ],
  habitacio: [
    // Paret de fusta darrere la zona del llit (fila 0-1) — capçalera visual
    { sprite: bgWallWood, col: 1, row: 0, spanCols: 4, spanRows: 2, cover: true, opacity: 0.55 },
    // Catifa gran centrada sota el llit i la tauleta
    { sprite: bgRugLarge, col: 1, row: 2, spanCols: 4, spanRows: 2, opacity: 0.8 },
  ],
  menjador: [
    // Paret de fusta amb TV al centre (fila 0)
    { sprite: bgWallWood, col: 0, row: 0, spanCols: 6, spanRows: 1, cover: true, opacity: 0.7 },
    // Catifa gran davall de sofà + taula (files 2-4)
    { sprite: bgRugLarge, col: 1, row: 2, spanCols: 4, spanRows: 3, opacity: 0.75 },
  ],
  jardi: [
    { sprite: bgFence, col: 0, row: 0, spanCols: 6, spanRows: 1, cover: true, opacity: 0.9 },
    { sprite: bgFence, col: 0, row: 4, spanCols: 6, spanRows: 1, cover: true, opacity: 0.9 },
  ],
  balco: [
    // Cel amb skyline al fons (files 0-1)
    { sprite: bgSkyline, col: 0, row: 0, spanCols: 6, spanRows: 2, cover: true },
    // Terra de terracota (files 3-4)
    { sprite: bgBalconyFloor, col: 0, row: 3, spanCols: 6, spanRows: 2, cover: true, opacity: 0.85 },
    // Barana de forja a la fila 2 (línia horitzó separa cel de terra)
    { sprite: bgRailing, col: 0, row: 2, spanCols: 6, spanRows: 1, cover: true },
  ],
};

/** Retorna els backdrops d'un escenari (buit si no en té). */
export function backdropsForScenario(scenarioName?: string | null): ScenarioBackdrop[] {
  if (!scenarioName) return [];
  const key = normScenarioKey(scenarioName);
  const match = Object.keys(SCENARIO_BACKDROPS).find((k) => key.includes(k));
  return match ? SCENARIO_BACKDROPS[match] : [];
}
