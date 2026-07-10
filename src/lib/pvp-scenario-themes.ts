// ============================================================
// pvp-scenario-themes.ts — Configuració unificada d'escenaris PvP
// ------------------------------------------------------------
// Una única font de veritat per escenari (tema, layout, backdrops,
// fallback cells). Helpers `cell(col,row)` per evitar índexs màgics.
// ============================================================
import { ROOM_THEMES, type RoomTheme } from "@/lib/room-themes";
import { url as bgCounter } from "@/assets/room/bg-counter.png.asset.json";
import { url as bgDeskSurface } from "@/assets/room/bg-desk-surface.png.asset.json";
import { url as bgTiledWall } from "@/assets/room/bg-tiled-wall.png.asset.json";
import { url as bgFence } from "@/assets/room/bg-fence.png.asset.json";
import { url as bgCurtain } from "@/assets/room/bg-curtain.png.asset.json";
import { url as bgRailing } from "@/assets/room/bg-railing.png.asset.json";
import { url as bgWallWood } from "@/assets/room/bg-wall-wood.png.asset.json";
import { url as bgRugLarge } from "@/assets/room/bg-rug-large.png.asset.json";
import { url as bgBacksplash } from "@/assets/room/bg-backsplash.png.asset.json";
import { url as bgSkyline } from "@/assets/room/bg-skyline.png.asset.json";
import { url as bgBalconyFloor } from "@/assets/room/bg-balcony-floor.png.asset.json";

// ---------- Grid ----------
export const PVP_GRID_W = 6;
export const PVP_GRID_H = 5;
export const PVP_GRID_CELLS = PVP_GRID_W * PVP_GRID_H;

/** Converteix (col,row) → cell index. Evita hardcodejar 15, 22, etc. */
export const cell = (col: number, row: number): number => row * PVP_GRID_W + col;

export interface PvPGridSlot {
  itemId: string;
  cellIndex: number;
}

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

type CellRule = { pattern: RegExp; cell: number };

interface ScenarioConfig {
  /** Alies/normalitzats que fan match amb aquest escenari */
  aliases: string[];
  theme: RoomTheme;
  layout: CellRule[];
  backdrops: ScenarioBackdrop[];
  /** Cel·les preferides per items sense regla — han d'evitar zones tapades pel backdrop */
  fallbackCells: number[];
}

function normScenarioKey(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ============================================================
// SCENARIO_CONFIG — única font de veritat per escenari
// Layout: idx = row*6 + col. Fila 0 = paret superior.
// ============================================================
const SCENARIO_CONFIG: Record<string, ScenarioConfig> = {
  cuina: {
    aliases: ["cuina", "kitchen"],
    theme: ROOM_THEMES.kitchen,
    layout: [
      { pattern: /nevera|fridge/i, cell: cell(0, 0) },
      { pattern: /forn|stove|oven/i, cell: cell(1, 0) },
      { pattern: /microones|microwave/i, cell: cell(2, 0) },
      { pattern: /pica|sink/i, cell: cell(3, 0) },
      { pattern: /calaix|drawer/i, cell: cell(4, 0) },
      { pattern: /despensa|pantry/i, cell: cell(5, 0) },
      { pattern: /taula|table/i, cell: cell(2, 2) },
      { pattern: /cadira|chair/i, cell: cell(3, 2) },
    ],
    backdrops: [
      { sprite: bgCounter, col: 0, row: 0, spanCols: 6, spanRows: 1, cover: true },
      { sprite: bgBacksplash, col: 0, row: 1, spanCols: 6, spanRows: 1, cover: true, opacity: 0.55 },
    ],
    // Evitem fila 0 (encimera) i fila 1 (backsplash opac)
    fallbackCells: [cell(1, 2), cell(4, 2), cell(0, 3), cell(2, 3), cell(4, 3), cell(0, 4), cell(2, 4), cell(4, 4), cell(5, 4)],
  },
  lavabo: {
    aliases: ["lavabo", "bath"],
    theme: ROOM_THEMES.bath,
    layout: [
      { pattern: /mirall|mirror/i, cell: cell(1, 0) },
      { pattern: /prestatg/i, cell: cell(4, 0) },
      { pattern: /pica|sink/i, cell: cell(1, 1) },
      { pattern: /tovalloler|towel/i, cell: cell(4, 1) },
      { pattern: /v[aà]ter|wc|toilet/i, cell: cell(5, 1) },
      { pattern: /calaix|drawer/i, cell: cell(2, 1) },
      { pattern: /banyera|dutxa|bath/i, cell: cell(0, 3) },
      { pattern: /cistella|paperera|basket/i, cell: cell(2, 3) },
      { pattern: /rentadora|washer|lavadora/i, cell: cell(4, 3) },
      { pattern: /secadora|dryer/i, cell: cell(5, 3) },
    ],
    backdrops: [
      { sprite: bgTiledWall, col: 0, row: 0, spanCols: 6, spanRows: 2, cover: true, opacity: 0.55 },
      { sprite: bgCounter, col: 0, row: 1, spanCols: 3, spanRows: 1, cover: true, opacity: 0.9 },
    ],
    fallbackCells: [cell(0, 2), cell(2, 2), cell(4, 2), cell(1, 4), cell(3, 4), cell(5, 4)],
  },
  habitacio: {
    aliases: ["habitac", "bedroom", "dorm"],
    theme: ROOM_THEMES.bedroom,
    layout: [
      { pattern: /armari|wardrobe/i, cell: cell(0, 0) },
      { pattern: /prestatg/i, cell: cell(1, 0) },
      { pattern: /c[oò]moda/i, cell: cell(4, 0) },
      { pattern: /calaixera/i, cell: cell(5, 0) },
      { pattern: /llit|bed|hamaca/i, cell: cell(2, 1) },
      { pattern: /tauleta|nightstand/i, cell: cell(4, 1) },
      { pattern: /escriptori|desk/i, cell: cell(0, 3) },
      { pattern: /catifa|rug/i, cell: cell(3, 3) },
      { pattern: /caixa|box/i, cell: cell(5, 3) },
    ],
    backdrops: [
      { sprite: bgWallWood, col: 1, row: 0, spanCols: 4, spanRows: 2, cover: true, opacity: 0.55 },
      { sprite: bgRugLarge, col: 1, row: 2, spanCols: 4, spanRows: 2, opacity: 0.8 },
    ],
    // Fila 4 lliure + cantonades no cobertes
    fallbackCells: [cell(0, 4), cell(1, 4), cell(2, 4), cell(3, 4), cell(4, 4), cell(5, 4), cell(0, 2), cell(5, 2)],
  },
  despatx: {
    aliases: ["despatx", "office"],
    theme: ROOM_THEMES.office,
    layout: [
      { pattern: /prestatg/i, cell: cell(0, 0) },
      { pattern: /arxivador|filing/i, cell: cell(5, 0) },
      { pattern: /llum|lamp/i, cell: cell(1, 1) },
      { pattern: /escriptori|desk/i, cell: cell(2, 1) },
      { pattern: /ordinador|laptop|computer/i, cell: cell(3, 1) },
      { pattern: /calaix|drawer/i, cell: cell(5, 1) },
      { pattern: /cadira|chair/i, cell: cell(2, 2) },
      { pattern: /paperera|bin|trash/i, cell: cell(0, 3) },
    ],
    backdrops: [
      { sprite: bgDeskSurface, col: 1, row: 1, spanCols: 4, spanRows: 2 },
    ],
    fallbackCells: [cell(2, 0), cell(3, 0), cell(0, 4), cell(2, 4), cell(4, 4), cell(5, 4), cell(0, 2), cell(5, 3)],
  },
  menjador: {
    aliases: ["menjador", "dining"],
    theme: ROOM_THEMES.dining,
    layout: [
      { pattern: /vitrina/i, cell: cell(0, 0) },
      { pattern: /quadre|painting/i, cell: cell(2, 0) },
      { pattern: /televisi|\btv\b/i, cell: cell(3, 0) },
      { pattern: /llum|lamp/i, cell: cell(4, 0) },
      { pattern: /aparador/i, cell: cell(5, 0) },
      { pattern: /sof[àa]|couch/i, cell: cell(3, 2) },
      { pattern: /taula|table/i, cell: cell(2, 3) },
      { pattern: /cadira|chair/i, cell: cell(4, 3) },
      { pattern: /catifa|rug/i, cell: cell(2, 4) },
    ],
    backdrops: [
      { sprite: bgWallWood, col: 0, row: 0, spanCols: 6, spanRows: 1, cover: true, opacity: 0.7 },
      { sprite: bgRugLarge, col: 1, row: 2, spanCols: 4, spanRows: 3, opacity: 0.75 },
    ],
    fallbackCells: [cell(0, 2), cell(5, 2), cell(0, 3), cell(5, 3), cell(0, 4), cell(5, 4), cell(1, 1), cell(4, 1)],
  },
  jardi: {
    aliases: ["jardi", "garden"],
    theme: ROOM_THEMES.garden,
    layout: [
      { pattern: /arbre|tree/i, cell: cell(0, 0) },
      { pattern: /caseta|shed/i, cell: cell(5, 0) },
      { pattern: /hamaca/i, cell: cell(2, 1) },
      { pattern: /jardinera|planter/i, cell: cell(5, 1) },
      { pattern: /banc|bench/i, cell: cell(3, 2) },
      { pattern: /pedra|rock|stone/i, cell: cell(0, 3) },
      { pattern: /barbacoa|bbq|grill/i, cell: cell(1, 3) },
      { pattern: /regadora|watering/i, cell: cell(3, 3) },
      { pattern: /ba[uú]l|chest/i, cell: cell(5, 3) },
    ],
    backdrops: [
      { sprite: bgFence, col: 0, row: 0, spanCols: 6, spanRows: 1, cover: true, opacity: 0.9 },
      { sprite: bgFence, col: 0, row: 4, spanCols: 6, spanRows: 1, cover: true, opacity: 0.9 },
    ],
    // Evitem files 0 i 4 (tanques opaques)
    fallbackCells: [cell(1, 1), cell(3, 1), cell(0, 2), cell(1, 2), cell(4, 2), cell(5, 2), cell(2, 3), cell(4, 3)],
  },
  balco: {
    aliases: ["balco", "balcony"],
    theme: ROOM_THEMES.balcony,
    layout: [
      { pattern: /jardinera|planter/i, cell: cell(0, 3) },
      { pattern: /testos|plant|maceta/i, cell: cell(0, 4) },
      { pattern: /estenedor|clothesline/i, cell: cell(1, 3) },
      { pattern: /fanal|lantern|lamp/i, cell: cell(2, 3) },
      { pattern: /taula|table/i, cell: cell(3, 3) },
      { pattern: /gerro|vase/i, cell: cell(4, 3) },
      { pattern: /catifa|rug/i, cell: cell(2, 4) },
      { pattern: /cadira|chair/i, cell: cell(3, 4) },
      { pattern: /caixa|box/i, cell: cell(4, 4) },
    ],
    backdrops: [
      { sprite: bgSkyline, col: 0, row: 0, spanCols: 6, spanRows: 2, cover: true },
      { sprite: bgBalconyFloor, col: 0, row: 3, spanCols: 6, spanRows: 2, cover: true, opacity: 0.85 },
      { sprite: bgRailing, col: 0, row: 2, spanCols: 6, spanRows: 1, cover: true },
    ],
    // Fila 0-2 són cel + barana (no s'hi posen mobles). Ompler només fila 3-4.
    fallbackCells: [cell(5, 3), cell(1, 4), cell(5, 4), cell(0, 3), cell(0, 4)],
  },
  sala: {
    aliases: ["sala", "living"],
    theme: ROOM_THEMES.livingroom,
    layout: [],
    backdrops: [],
    fallbackCells: [],
  },
};

// Fallback global (per escenaris sense config o quan la per-escenari s'esgota)
const DEFAULT_FALLBACK_CELLS = [
  cell(1, 2), cell(4, 2), cell(2, 3), cell(4, 3),
  cell(1, 1), cell(4, 1), cell(1, 4), cell(4, 4),
  cell(0, 2), cell(5, 2), cell(0, 3), cell(5, 3),
];

// Fallback per escenaris sense layout — distribució uniforme
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

/** Resol la config d'un escenari a partir del seu nom (o null). */
function configForScenario(scenarioName?: string | null): ScenarioConfig | null {
  if (!scenarioName) return null;
  const key = normScenarioKey(scenarioName);
  for (const cfg of Object.values(SCENARIO_CONFIG)) {
    if (cfg.aliases.some((a) => key.includes(a))) return cfg;
  }
  return null;
}

/**
 * Resol la config d'un escenari usant primer un hint explícit (ex. room_template_id
 * de l'Espai Personal: "kitchen", "bath"…) i, si no hi ha match, provant amb el nom.
 */
function resolveConfig(scenarioName?: string | null, hint?: string | null): ScenarioConfig | null {
  return configForScenario(hint) ?? configForScenario(scenarioName);
}

/** Retorna el tema visual d'un escenari PvP a partir del seu nom (o hint de plantilla). */
export function themeForScenarioName(name: string | null | undefined, hint?: string | null): RoomTheme {
  return resolveConfig(name, hint)?.theme ?? ROOM_THEMES.hall;
}

/** Retorna els backdrops d'un escenari (buit si no en té). */
export function backdropsForScenario(scenarioName?: string | null, hint?: string | null): ScenarioBackdrop[] {
  return resolveConfig(scenarioName, hint)?.backdrops ?? [];
}

/**
 * Auto-layout d'items en la graella PvP. Si l'escenari té un layout semàntic
 * definit, col·loca cada moble a la cel·la lògica pel seu tipus. La resta cau
 * a cel·les de fallback específiques (que eviten zones tapades pel backdrop).
 */
export function autoLayoutForItems(
  items: Array<{ id: string; name?: string; name_key?: string }>,
  scenarioName?: string | null,
  hint?: string | null,
): PvPGridSlot[] {

  if (items.length === 0) return [];

  const cfg = configForScenario(scenarioName);

  if (cfg && cfg.layout.length > 0) {
    const used = new Set<number>();
    const result: PvPGridSlot[] = [];
    const unmatched: typeof items = [];
    for (const it of items) {
      const hay = `${it.name ?? ""} ${it.name_key ?? ""}`;
      const rule = cfg.layout.find((r) => r.pattern.test(hay) && !used.has(r.cell));
      if (rule) {
        used.add(rule.cell);
        result.push({ itemId: it.id, cellIndex: rule.cell });
      } else {
        unmatched.push(it);
      }
    }
    const fallbacks = [...cfg.fallbackCells, ...DEFAULT_FALLBACK_CELLS];
    for (const it of unmatched) {
      const c =
        fallbacks.find((k) => !used.has(k)) ??
        [...Array(PVP_GRID_CELLS).keys()].find((k) => !used.has(k)) ??
        0;
      used.add(c);
      result.push({ itemId: it.id, cellIndex: c });
    }
    return result;
  }

  // Fallback genèric per escenaris desconeguts
  const n = items.length;
  const cells = PRESET_LAYOUTS[n] ?? PRESET_LAYOUTS[Math.min(12, n)];
  return items.slice(0, cells.length).map((it, i) => ({ itemId: it.id, cellIndex: cells[i] }));
}

// bgCurtain queda importat per si un futur escenari (ex. sala) el reutilitza.
void bgCurtain;
