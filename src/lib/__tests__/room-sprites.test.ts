// ============================================================
// Tests de regressió del matcher de sprites (P2).
// Detecta col·lisions d'ordre a SPRITE_RULES (ex. "tauleta" caçat
// per "taula", "microones" per "forn", etc.).
// ============================================================
import { describe, it, expect } from "vitest";
import { matchSpriteRule, SPRITE_RULES } from "@/lib/room-sprites";

/** Casos reals: nom que veu l'usuari → id de regla esperada. */
const CASES: Array<[string, string]> = [
  // Ambigüitats crítiques
  ["Tauleta de nit", "nightstand"],
  ["Taula rodona", "table"],
  ["Taula de menjador", "table"],
  ["Microones", "microwave"],
  ["Forn elèctric", "stove"],
  ["Pica de cuina", "sink"],
  ["Banyera", "bath"],
  ["Vàter", "toilet"],
  // Reward items lúdics
  ["Gronxador", "swing"],
  ["Font d'aigua", "fountain"],
  ["Font daigua", "fountain"],
  ["Piscina inflable", "pool"],
  ["Castell inflable", "castle"],
  // Dormitori / sala
  ["Llit doble", "bed"],
  ["Sofà de cuir", "sofa"],
  ["Cadira gaming", "chair"],
  ["Escriptori", "desk"],
  ["Armari empotrat", "wardrobe"],
  ["Prestatgeria", "shelf"],
  ["Catifa persa", "rug"],
  // Tech
  ["TV 55 polzades", "tv"],
  ["Ordinador portàtil", "laptop"],
  ["Consola retro", "console"],
  ["Auriculars", "headphones"],
  // Decor
  ["Mirall de paret", "mirror"],
  ["Quadre modernista", "painting"],
  ["Gerro de porcellana", "vase"],
  ["Escultura", "sculpture"],
  ["Espelma aromàtica", "candle"],
  ["Cristall energètic", "crystal"],
  ["Làmpada de sostre", "lamp"],
  // Natura
  ["Arbre bonsai", "tree"], // tree pren prioritat abans que bonsai (ordre a la taula)
  ["Bonsai japonès", "bonsai"],
  ["Cactus mexicà", "cactus"],
  ["Bolet gegant", "mushroom"],
  ["Flors silvestres", "flowers"],
  ["Jardinera de fusta", "plant"],
  // Cuina extra
  ["Nevera", "fridge"],
  ["Rentadora", "washer"],
  ["Aparador", "pantry"],
  // Bany extra
  ["Tovalloler", "bath"],
  // Emmagatzematge
  ["Bagul de fusta", "chest"],
  ["Caixa de records", "chest"],
  ["Paperera", "chest"],
  ["Estenedor", "chest"],
  // Exterior
  ["Roca decorativa", "rock"],
  ["Barana de fusta", "rock"],
  ["Caseta d'eines", "rock"],
];

describe("SPRITE_RULES: sense col·lisions d'ordre", () => {
  it.each(CASES)("'%s' → %s", (name, expectedId) => {
    const rule = matchSpriteRule(name);
    expect(rule, `cap regla no matcha "${name}"`).not.toBeNull();
    expect(rule!.id).toBe(expectedId);
  });

  it("tots els ids són únics", () => {
    const ids = SPRITE_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tota regla té sprite no buit", () => {
    for (const r of SPRITE_RULES) {
      expect(r.sprite, `regla ${r.id} sense sprite`).toBeTruthy();
    }
  });
});
