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
import sprWardrobe from "@/assets/room/spr-wardrobe.png";
import sprShelf from "@/assets/room/spr-shelf.png";
import sprStove from "@/assets/room/spr-stove.png";
import sprSink from "@/assets/room/spr-sink.png";
import sprToilet from "@/assets/room/spr-toilet.png";
import sprTree from "@/assets/room/spr-tree.png";
import sprChest from "@/assets/room/spr-chest.png";
import sprRock from "@/assets/room/spr-rock.png";

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

// -------- Sprites per categoria de moble (Espai Personal) --------
const CATEGORY_SPRITE: Record<string, string> = {
  bed: sprBed,
  chair: sprChair,
  desk: sprDesk,
  tech: sprTv,
  plant: sprPlant,
  nature: sprTree,
  kitchen: sprFridge,
  bath: sprBath,
  rug: sprRug,
  decor: sprLamp,
  music: sprLamp,
  art: sprLamp,
  storage: sprWardrobe,
  books: sprShelf,
};

// Override per name_key concret
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

// -------- Matcher per paraules clau (multi-idioma) --------
// S'utilitza per PvP i qualsevol moble sense category/name_key
// que tingui un nom lliure ("Sofà del saló", "Nevera vella"...).
// L'ordre importa: paraules més específiques primer.
const KEYWORD_SPRITE: Array<[RegExp, string]> = [
  [/\b(llit|cama|bed)\b/i, sprBed],
  [/\b(sof[àa]|couch|sofa)\b/i, sprSofa],
  [/\b(cadira|silla|chair|butaca|tamboret)\b/i, sprChair],
  [/\b(taula|mesa|table|escriptori|desk)\b/i, sprTable],
  [/\b(tv|televisi[óo]|television|pantalla|monitor)\b/i, sprTv],
  [/\b(planta|plant|flor|test|maceta)\b/i, sprPlant],
  [/\b(arbre|árbol|arbol|tree|bosc|bush|arbust)\b/i, sprTree],
  [/\b(nevera|frigor[ií]fic|refrigerador|fridge)\b/i, sprFridge],
  [/\b(fogons?|forn|estufa|cuina|stove|oven|hornalla)\b/i, sprStove],
  [/\b(pica|aig[üu]era|lavabo|sink|fregadero)\b/i, sprSink],
  [/\b(wc|water|inodor|toilet)\b/i, sprToilet],
  [/\b(banyera|ba[nñ]era|dutxa|shower|bath|bathtub)\b/i, sprBath],
  [/\b(catifa|alfombra|rug|carpet|estora)\b/i, sprRug],
  [/\b(l[aà]mpada|l[aà]mpara|lamp|llum|light|candela|fanal)\b/i, sprLamp],
  [/\b(armari|ropero|closet|wardrobe|calaix|comoda|c[oò]moda)\b/i, sprWardrobe],
  [/\b(prestatge|estanter[ií]a|shelf|bookshelf|biblioteca|llibres?|books?)\b/i, sprShelf],
  [/\b(bagul|cofre|chest|caixa|maleta)\b/i, sprChest],
  [/\b(roca|pedra|piedra|rock|stone)\b/i, sprRock],
];

/**
 * Resol el sprite d'un moble. Prioritat:
 *   1. Override per name_key exacte
 *   2. Sprite per categoria
 *   3. Match de paraules clau al nom (útil per PvP)
 *   4. null (el caller mostra emoji fallback)
 */
export function spriteForFurniture(
  category: string | undefined,
  nameKey?: string | undefined,
  displayName?: string | undefined,
): string | null {
  if (nameKey && NAME_SPRITE[nameKey]) return NAME_SPRITE[nameKey];
  if (category && CATEGORY_SPRITE[category]) return CATEGORY_SPRITE[category];
  const haystack = `${displayName ?? ""} ${nameKey ?? ""}`.trim();
  if (haystack) {
    for (const [re, url] of KEYWORD_SPRITE) {
      if (re.test(haystack)) return url;
    }
  }
  return null;
}

/**
 * Textura de fons per un tema donat. null → utilitzar patró CSS
 * del tema (comportament actual).
 */
export function textureForTheme(themeKey: ThemeKey): string | null {
  return THEME_TEXTURES[themeKey] ?? null;
}

