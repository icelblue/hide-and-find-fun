// ============================================================
// room-sprites.ts — Mapping de mobles/textures a sprites pixel art
// ============================================================
// Fase C del pla "Grid 2D Pixel Art unificat".
//
// Estratègia (decidida amb l'usuari):
//   - Batch petit de ~10 sprites clau que cobreixen les categories
//     més freqüents del catàleg. Cada categoria/paraula-clau apunta
//     al sprite adequat.
//   - Els mobles/items que no encaixen amb cap sprite conegut
//     conserven el seu emoji original com a fallback → 0 cost i
//     el sistema segueix funcionant amb qualsevol moble nou.
//   - Textures de terreny per tema: renderitzades com a fons únic
//     (cover) per evitar problemes de tileability.
// ============================================================

import texWoodLight from "@/assets/room/tex-wood-light.png";
import texWoodDark from "@/assets/room/tex-wood-dark.png";
import texKitchen from "@/assets/room/tex-kitchen.png";
import texMarble from "@/assets/room/tex-marble.png";
import texGrass from "@/assets/room/tex-grass.png";
import texStone from "@/assets/room/tex-stone.png";

import sprBed from "@/assets/room/spr-bed.png";
import sprSofa from "@/assets/room/spr-sofa.png";
import sprChair from "@/assets/room/spr-chair.png";
import sprDesk from "@/assets/room/spr-desk.png";
import sprTv from "@/assets/room/spr-tv.png";
import sprPlant from "@/assets/room/spr-plant.png";
import sprFridge from "@/assets/room/spr-fridge.png";
import sprBath from "@/assets/room/spr-bath.png";
import sprRug from "@/assets/room/spr-rug.png";
import sprLamp from "@/assets/room/spr-lamp.png";
import sprTable from "@/assets/room/spr-table.png";

import type { ThemeKey } from "./room-themes";

// -------- Textures per tema --------
export const THEME_TEXTURES: Partial<Record<ThemeKey, string>> = {
  bedroom: texWoodLight,
  dining: texWoodLight,
  livingroom: texWoodLight,
  office: texWoodDark,
  kitchen: texKitchen,
  bath: texMarble,
  hall: texMarble,
  garden: texGrass,
  balcony: texStone,
};

// -------- Sprites per categoria de moble --------
// Cobreix les categories principals del catàleg. La resta →
// fallback a emoji.
const CATEGORY_SPRITE: Record<string, string> = {
  bed: sprBed,
  chair: sprChair,
  desk: sprDesk,
  tech: sprTv,
  plant: sprPlant,
  nature: sprPlant,
  kitchen: sprFridge,
  bath: sprBath,
  rug: sprRug,
  decor: sprLamp,
  music: sprLamp,
  art: sprLamp,
};

// Override per name_key concret (opcional, per si volem que
// "space.item.sofa" utilitzi el sprite de sofà específicament)
const NAME_SPRITE: Record<string, string> = {
  "space.item.sofa": sprSofa,
  "space.item.couch": sprSofa,
  "space.item.tv": sprTv,
  "space.item.television": sprTv,
  "space.item.lamp": sprLamp,
  "space.item.floorlamp": sprLamp,
  "space.item.fridge": sprFridge,
  "space.item.refrigerator": sprFridge,
  "space.item.bathtub": sprBath,
  "space.item.table": sprTable,
  "space.item.diningtable": sprTable,
  "space.item.coffeetable": sprTable,
};

/**
 * Resol el sprite d'un moble. Prioritat:
 *   1. Override per name_key exacte
 *   2. Sprite per categoria
 *   3. null (el caller mostra emoji fallback)
 */
export function spriteForFurniture(
  category: string | undefined,
  nameKey?: string | undefined,
): string | null {
  if (nameKey && NAME_SPRITE[nameKey]) return NAME_SPRITE[nameKey];
  if (category && CATEGORY_SPRITE[category]) return CATEGORY_SPRITE[category];
  return null;
}

/**
 * Textura de fons per un tema donat. null → utilitzar patró CSS
 * del tema (comportament actual).
 */
export function textureForTheme(themeKey: ThemeKey): string | null {
  return THEME_TEXTURES[themeKey] ?? null;
}
