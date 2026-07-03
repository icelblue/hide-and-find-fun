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
// L'ordre importa: patrons més específics ABANS que els genèrics
// (ex. "tauleta" abans que "taula", "microones" abans que "forn").
// Cada regla té un `id` estable per a tests de regressió.
export interface SpriteRule {
  id: string;
  pattern: RegExp;
  sprite: string;
}

export const SPRITE_RULES: SpriteRule[] = [
  // dormitori
  { id: "bed", pattern: /\b(llit|cama|bed|hamaca)\b/i, sprite: sprBed },
  { id: "sofa", pattern: /(sof[àa]|couch|sofa)/i, sprite: sprSofa },
  { id: "chair", pattern: /(cadira|silla|chair|butaca|tamboret|banc|bench)/i, sprite: sprChair },
  { id: "desk", pattern: /(escriptori|desk)/i, sprite: sprDesk },
  // ⚠️ Tauleta ABANS que taula
  { id: "nightstand", pattern: /(tauleta|nightstand|mesita)/i, sprite: sprNightstand },
  { id: "table", pattern: /(taula|mesa|table)/i, sprite: sprTable },
  // tech
  { id: "tv", pattern: /(televisi[óo]|television|\btv\b|pantalla|monitor)/i, sprite: sprTv },
  { id: "laptop", pattern: /\b(ordinador|ordenador|laptop|port[aà]til|computer|pc)\b/i, sprite: sprLaptop },
  { id: "console", pattern: /\b(consola|console|videojoc)\b/i, sprite: sprConsole },
  { id: "headphones", pattern: /\b(auriculars|cascos|headphones)\b/i, sprite: sprHeadphones },
  // natura (arbre ABANS que altres plantes)
  { id: "tree", pattern: /\b(arbre|árbol|arbol|tree|bosc)\b/i, sprite: sprTree },
  { id: "cactus", pattern: /\b(cactus|c[aà]ctus)\b/i, sprite: sprCactus },
  { id: "flowers", pattern: /\b(flor|flores|flowers|bouquet|ram)\b/i, sprite: sprFlowers },
  { id: "mushroom", pattern: /\b(bolet|seta|mushroom|fong)\b/i, sprite: sprMushroom },
  { id: "bonsai", pattern: /\b(bonsai|bons[aá]i)\b/i, sprite: sprBonsai },
  { id: "plant", pattern: /\b(jardinera|test|maceta|planta|plant|regadora|testos|arbust|bush)\b/i, sprite: sprPlant },
  // cuina i electrodom (microones ABANS que forn per evitar "microforn")
  { id: "fridge", pattern: /\b(nevera|frigor[ií]fic|refrigerador|fridge)\b/i, sprite: sprFridge },
  { id: "microwave", pattern: /\b(microones|microondas|microwave)\b/i, sprite: sprMicrowave },
  { id: "stove", pattern: /\b(fogons?|forn|estufa|barbacoa|stove|oven|hornalla)\b/i, sprite: sprStove },
  { id: "sink", pattern: /\b(pica|aig[üu]era|sink|fregadero)\b/i, sprite: sprSink },
  { id: "pantry", pattern: /\b(despensa|pantry|aparador|vitrina)\b/i, sprite: sprShelf },
  { id: "washer", pattern: /\b(rentadora|lavadora|secadora|washer|dryer)\b/i, sprite: sprWasher },
  // bany
  { id: "toilet", pattern: /\b(v[aà]ter|wc|water|inodor|toilet)\b/i, sprite: sprToilet },
  { id: "bath", pattern: /\b(banyera|ba[nñ]era|dutxa|shower|bath|bathtub|tovalloler)\b/i, sprite: sprBath },
  // decor
  { id: "rug", pattern: /\b(catifa|alfombra|rug|carpet|estora)\b/i, sprite: sprRug },
  { id: "lamp", pattern: /\b(l[aà]mpada|l[aà]mpara|lamp|llum|light|fanal|farola)\b/i, sprite: sprLamp },
  { id: "candle", pattern: /\b(candela|candles?|espelma|vela)\b/i, sprite: sprCandle },
  { id: "crystal", pattern: /\b(cristall|crystal|gema|gem)\b/i, sprite: sprCrystal },
  { id: "mirror", pattern: /\b(mirall|espejo|mirror)\b/i, sprite: sprMirror },
  { id: "painting", pattern: /\b(quadre|cuadro|painting|pintura|poster|pòster)\b/i, sprite: sprPainting },
  { id: "vase", pattern: /\b(gerro|jarr[óo]n|vase|amfora|[aà]mfora)\b/i, sprite: sprVase },
  { id: "sculpture", pattern: /\b(escultura|sculpture|estatua|est[aà]tua|bust)\b/i, sprite: sprSculpture },
  // música
  { id: "guitar", pattern: /\b(guitarra|guitar)\b/i, sprite: sprGuitar },
  { id: "piano", pattern: /\b(piano|teclat|keyboard)\b/i, sprite: sprPiano },
  { id: "drums", pattern: /\b(bateria|drums|tambor)\b/i, sprite: sprDrums },
  // pet
  { id: "fishtank", pattern: /\b(peixera|acuario|aquarium|fishtank|peix)\b/i, sprite: sprFishtank },
  { id: "pettoy", pattern: /\b(pilota|ball|os|hueso|bone|joguina|toy)\b/i, sprite: sprPettoy },
  // emmagatzematge
  { id: "wardrobe", pattern: /\b(armari|ropero|closet|wardrobe|c[oò]moda|comoda|calaix|calaixera|arxivador)\b/i, sprite: sprWardrobe },
  { id: "shelf", pattern: /\b(prestatg[a-z]*|estanter[ií]a|shelf|bookshelf|biblioteca|llibres?|books?)\b/i, sprite: sprShelf },
  { id: "chest", pattern: /\b(bagul|ba[uú]l|cofre|chest|caixa|caja|maleta|cistella|paperera|estenedor)\b/i, sprite: sprChest },
  // exterior / reward items lúdics
  { id: "rock", pattern: /(roca|pedra|piedra|rock|stone|barana|caseta)/i, sprite: sprRock },
  { id: "swing", pattern: /(gronxador|swing|columpio|gronx)/i, sprite: sprSwing },
  { id: "fountain", pattern: /(font.?d.?aigua|fountain|fuente)/i, sprite: sprFountain },
  { id: "pool", pattern: /(piscina|pool|jacuzzi|spa)/i, sprite: sprPool },
  { id: "castle", pattern: /(castell|castillo|castle|inflable)/i, sprite: sprCastle },
];

/** Match d'un nom lliure a una regla de sprite. Exposat per a tests. */
export function matchSpriteRule(name: string): SpriteRule | null {
  for (const rule of SPRITE_RULES) {
    if (rule.pattern.test(name)) return rule;
  }
  return null;
}

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
    const rule = matchSpriteRule(haystack);
    if (rule) return rule.sprite;
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
