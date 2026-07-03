// ============================================================
// room-sprites.ts — Mapping de mobles/textures a sprites pixel art
// ============================================================
// Cobertura completa del catàleg (32 mobles espai + 50 items PvP)
// amb 39 sprites únics + reutilització agressiva via keyword match.
// Fallback: emoji original si res coincideix.
// ============================================================

// -------- Textures de terreny --------
import { url as texWoodLight } from "@/assets/room/tex-wood-light.png.asset.json";
import { url as texWoodDark } from "@/assets/room/tex-wood-dark.png.asset.json";
import { url as texKitchen } from "@/assets/room/tex-kitchen.png.asset.json";
import { url as texMarble } from "@/assets/room/tex-marble.png.asset.json";
import { url as texGrass } from "@/assets/room/tex-grass.png.asset.json";
import { url as texStone } from "@/assets/room/tex-stone.png.asset.json";

// -------- Sprites base --------
import { url as sprBed } from "@/assets/room/spr-bed.png.asset.json";
import { url as sprSofa } from "@/assets/room/spr-sofa.png.asset.json";
import { url as sprChair } from "@/assets/room/spr-chair.png.asset.json";
import { url as sprDesk } from "@/assets/room/spr-desk.png.asset.json";
import { url as sprTv } from "@/assets/room/spr-tv.png.asset.json";
import { url as sprPlant } from "@/assets/room/spr-plant.png.asset.json";
import { url as sprFridge } from "@/assets/room/spr-fridge.png.asset.json";
import { url as sprBath } from "@/assets/room/spr-bath.png.asset.json";
import { url as sprRug } from "@/assets/room/spr-rug.png.asset.json";
import { url as sprLamp } from "@/assets/room/spr-lamp.png.asset.json";
import { url as sprTable } from "@/assets/room/spr-table.png.asset.json";
import { url as sprWardrobe } from "@/assets/room/spr-wardrobe.png.asset.json";
import { url as sprShelf } from "@/assets/room/spr-shelf.png.asset.json";
import { url as sprStove } from "@/assets/room/spr-stove.png.asset.json";
import { url as sprSink } from "@/assets/room/spr-sink.png.asset.json";
import { url as sprToilet } from "@/assets/room/spr-toilet.png.asset.json";
import { url as sprTree } from "@/assets/room/spr-tree.png.asset.json";
import { url as sprChest } from "@/assets/room/spr-chest.png.asset.json";
import { url as sprRock } from "@/assets/room/spr-rock.png.asset.json";
// -------- Sprites categoria específica --------
import { url as sprLaptop } from "@/assets/room/spr-laptop.png.asset.json";
import { url as sprConsole } from "@/assets/room/spr-console.png.asset.json";
import { url as sprHeadphones } from "@/assets/room/spr-headphones.png.asset.json";
import { url as sprCactus } from "@/assets/room/spr-cactus.png.asset.json";
import { url as sprFlowers } from "@/assets/room/spr-flowers.png.asset.json";
import { url as sprMushroom } from "@/assets/room/spr-mushroom.png.asset.json";
import { url as sprBonsai } from "@/assets/room/spr-bonsai.png.asset.json";
import { url as sprCandle } from "@/assets/room/spr-candle.png.asset.json";
import { url as sprCrystal } from "@/assets/room/spr-crystal.png.asset.json";
import { url as sprMirror } from "@/assets/room/spr-mirror.png.asset.json";
import { url as sprPainting } from "@/assets/room/spr-painting.png.asset.json";
import { url as sprGuitar } from "@/assets/room/spr-guitar.png.asset.json";
import { url as sprPiano } from "@/assets/room/spr-piano.png.asset.json";
import { url as sprDrums } from "@/assets/room/spr-drums.png.asset.json";
import { url as sprFishtank } from "@/assets/room/spr-fishtank.png.asset.json";
import { url as sprPettoy } from "@/assets/room/spr-pettoy.png.asset.json";
import { url as sprSculpture } from "@/assets/room/spr-sculpture.png.asset.json";
import { url as sprVase } from "@/assets/room/spr-vase.png.asset.json";
import { url as sprMicrowave } from "@/assets/room/spr-microwave.png.asset.json";
import { url as sprWasher } from "@/assets/room/spr-washer.png.asset.json";
import { url as sprSwing } from "@/assets/room/spr-swing.png.asset.json";
import { url as sprFountain } from "@/assets/room/spr-fountain.png.asset.json";
import { url as sprPool } from "@/assets/room/spr-pool.png.asset.json";
import { url as sprCastle } from "@/assets/room/spr-castle.png.asset.json";
import { url as sprNightstand } from "@/assets/room/spr-nightstand.png.asset.json";

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

// -------- Sprites per categoria (fallback per tota la categoria) --------
const CATEGORY_SPRITE: Record<string, string> = {
  bed: sprBed,
  chair: sprChair,
  desk: sprDesk,
  tech: sprLaptop,
  plant: sprPlant,
  nature: sprTree,
  kitchen: sprFridge,
  bath: sprBath,
  rug: sprRug,
  decor: sprLamp,
  music: sprGuitar,
  art: sprSculpture,
  pet: sprPettoy,
  storage: sprWardrobe,
  books: sprShelf,
};

// -------- Override per name_key exacte (catàleg furniture_catalog) --------
const NAME_SPRITE: Record<string, string> = {
  // beds
  "furniture.bed_basic": sprBed,
  "furniture.bed_cozy": sprBed,
  "furniture.bed_royal": sprBed,
  // chairs
  "furniture.chair_gaming": sprChair,
  "furniture.chair_stool": sprChair,
  // desks
  "furniture.desk_writing": sprDesk,
  "furniture.desk_gaming": sprDesk,
  // tech
  "furniture.tech_tv": sprTv,
  "furniture.tech_laptop": sprLaptop,
  "furniture.tech_console": sprConsole,
  "furniture.tech_headphones": sprHeadphones,
  // plants
  "furniture.plant_small": sprPlant,
  "furniture.plant_bonsai": sprBonsai,
  "furniture.plant_tree": sprTree,
  // nature
  "furniture.nature_cactus": sprCactus,
  "furniture.nature_flowers": sprFlowers,
  "furniture.nature_mushroom": sprMushroom,
  // decor
  "furniture.decor_lamp": sprLamp,
  "furniture.decor_candles": sprCandle,
  "furniture.decor_crystal": sprCrystal,
  "furniture.decor_mirror": sprMirror,
  "furniture.decor_painting": sprPainting,
  // music
  "furniture.music_guitar": sprGuitar,
  "furniture.music_piano": sprPiano,
  "furniture.music_drums": sprDrums,
  // pet
  "furniture.pet_ball": sprPettoy,
  "furniture.pet_bone": sprPettoy,
  "furniture.pet_fishtank": sprFishtank,
  // art
  "furniture.art_sculpture": sprSculpture,
  // rugs
  "furniture.rug_simple": sprRug,
  "furniture.rug_persian": sprRug,
  "furniture.rug_magic": sprRug,
  // legacy space.item.* keys mantinguts
  "space.item.sofa": sprSofa,
  "space.item.couch": sprSofa,
  "space.item.tv": sprTv,
  "space.item.lamp": sprLamp,
  "space.item.fridge": sprFridge,
  "space.item.bathtub": sprBath,
  "space.item.table": sprTable,
};

// -------- Keyword matcher per items PvP amb nom lliure --------
// Ordre important: paraules específiques primer.
const KEYWORD_SPRITE: Array<[RegExp, string]> = [
  // dormitori
  [/\b(llit|cama|bed|hamaca)\b/i, sprBed],
  [/(sof[àa]|couch|sofa)/i, sprSofa],
  [/(cadira|silla|chair|butaca|tamboret|banc|bench)/i, sprChair],
  [/(escriptori|desk)/i, sprDesk],
  // ⚠️ Tauleta ABANS que taula (no conté "taula" com a substring, però sí "taul")
  [/(tauleta|nightstand|mesita)/i, sprNightstand],
  [/(taula|mesa|table)/i, sprTable],
  // tech
  [/(televisi[óo]|television|\btv\b|pantalla|monitor)/i, sprTv],
  [/\b(ordinador|ordenador|laptop|port[aà]til|computer|pc)\b/i, sprLaptop],
  [/\b(consola|console|videojoc)\b/i, sprConsole],
  [/\b(auriculars|cascos|headphones)\b/i, sprHeadphones],
  // natura
  [/\b(arbre|árbol|arbol|tree|bosc)\b/i, sprTree],
  [/\b(cactus|c[aà]ctus)\b/i, sprCactus],
  [/\b(flor|flores|flowers|bouquet|ram)\b/i, sprFlowers],
  [/\b(bolet|seta|mushroom|fong)\b/i, sprMushroom],
  [/\b(bonsai|bons[aá]i)\b/i, sprBonsai],
  [/\b(jardinera|test|maceta|planta|plant|regadora|testos|arbust|bush)\b/i, sprPlant],
  // cuina i electrodom
  [/\b(nevera|frigor[ií]fic|refrigerador|fridge)\b/i, sprFridge],
  [/\b(microones|microondas|microwave)\b/i, sprMicrowave],
  [/\b(fogons?|forn|estufa|barbacoa|stove|oven|hornalla)\b/i, sprStove],
  [/\b(pica|aig[üu]era|sink|fregadero)\b/i, sprSink],
  [/\b(despensa|pantry|aparador|vitrina)\b/i, sprShelf],
  [/\b(rentadora|lavadora|secadora|washer|dryer)\b/i, sprWasher],
  // bany
  [/\b(v[aà]ter|wc|water|inodor|toilet)\b/i, sprToilet],
  [/\b(banyera|ba[nñ]era|dutxa|shower|bath|bathtub|tovalloler)\b/i, sprBath],
  // decor
  [/\b(catifa|alfombra|rug|carpet|estora)\b/i, sprRug],
  [/\b(l[aà]mpada|l[aà]mpara|lamp|llum|light|fanal|farola)\b/i, sprLamp],
  [/\b(candela|candles?|espelma|vela)\b/i, sprCandle],
  [/\b(cristall|crystal|gema|gem)\b/i, sprCrystal],
  [/\b(mirall|espejo|mirror)\b/i, sprMirror],
  [/\b(quadre|cuadro|painting|pintura|poster|pòster)\b/i, sprPainting],
  [/\b(gerro|jarr[óo]n|vase|amfora|[aà]mfora)\b/i, sprVase],
  [/\b(escultura|sculpture|estatua|est[aà]tua|bust|bust)\b/i, sprSculpture],
  // música
  [/\b(guitarra|guitar)\b/i, sprGuitar],
  [/\b(piano|teclat|keyboard)\b/i, sprPiano],
  [/\b(bateria|drums|tambor)\b/i, sprDrums],
  // pet
  [/\b(peixera|acuario|aquarium|fishtank|peix)\b/i, sprFishtank],
  [/\b(pilota|ball|os|hueso|bone|joguina|toy)\b/i, sprPettoy],
  // emmagatzematge
  [/\b(armari|ropero|closet|wardrobe|c[oò]moda|comoda|calaix|calaixera|arxivador)\b/i, sprWardrobe],
  [/\b(prestatg[a-z]*|estanter[ií]a|shelf|bookshelf|biblioteca|llibres?|books?)\b/i, sprShelf],
  [/\b(bagul|ba[uú]l|cofre|chest|caixa|caja|maleta|cistella|paperera|estenedor)\b/i, sprChest],
  // exterior
  // exterior / reward items lúdics
  [/(roca|pedra|piedra|rock|stone|barana|caseta)/i, sprRock],
  [/(gronxador|swing|columpio|gronx)/i, sprSwing],
  [/(font.?d.?aigua|font d'aigua|fountain|fuente)/i, sprFountain],
  [/(piscina|pool|jacuzzi|spa)/i, sprPool],
  [/(castell|castillo|castle|inflable)/i, sprCastle],
];

/**
 * Resol el sprite d'un moble. Prioritat:
 *   1. Override per name_key exacte
 *   2. Match de paraules clau al nom (display o key)
 *   3. Sprite per categoria
 *   4. null → el caller mostra emoji fallback
 */
export function spriteForFurniture(
  category: string | undefined,
  nameKey?: string | undefined,
  displayName?: string | undefined,
): string | null {
  if (nameKey && NAME_SPRITE[nameKey]) return NAME_SPRITE[nameKey];
  const haystack = `${displayName ?? ""} ${nameKey ?? ""}`.trim();
  if (haystack) {
    for (const [re, url] of KEYWORD_SPRITE) {
      if (re.test(haystack)) return url;
    }
  }
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
