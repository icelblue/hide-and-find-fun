// ============================================================
// 🔒 CRITICAL — custom-object.ts
// Validació + display d'objectes personalitzats. Tocar amb pre-flight.
// Tests: src/test/custom-object.test.ts + REG-013, REG-014
// ============================================================
// Permet als jugadors crear el seu propi objecte (icona + nom +
// mida + material) sense canviar l'esquema. S'utilitza un objecte
// "sentinella" a la taula `objects` i els detalls reals es desen
// al camp jsonb `special_data` de `game_players`.

/** UUID de l'objecte sentinella inserit a la taula `objects`. */
export const CUSTOM_OBJECT_SENTINEL_ID = "000000cc-0000-0000-0000-000000000000";

/** Materials vàlids (ha de coincidir amb l'enum `object_material`). */
export const CUSTOM_OBJECT_MATERIALS = [
  "generic",
  "paper",
  "glass",
  "metal",
  "plastic",
  "fabric",
  "wood",
  "cardboard",
  "rubber",
  "ceramic",
  "electronic",
  "leather",
  "stone",
  "food",
] as const;

export type CustomObjectMaterial = (typeof CUSTOM_OBJECT_MATERIALS)[number];

/** Mides vàlides (coincideix amb el rang habitual de `objects.size`). */
export const CUSTOM_OBJECT_SIZES = [1, 2, 3] as const;
export type CustomObjectSize = (typeof CUSTOM_OBJECT_SIZES)[number];

export interface CustomObjectInput {
  icon: string;
  name: string;
  size: CustomObjectSize;
  material: CustomObjectMaterial;
  trait1: string;
  trait2: string;
}

export interface CustomObjectSpecialData {
  is_custom: true;
  custom_icon: string;
  custom_name: string;
  custom_size: CustomObjectSize;
  custom_material: CustomObjectMaterial;
  custom_trait1: string;
  custom_trait2: string;
}

/**
 * Comprova si la cadena és exactament 1 emoji (cap text, cap espai,
 * cap seqüència múltiple).
 *
 * Utilitza la propietat Unicode `Extended_Pictographic` combinada
 * amb modificadors i ZWJ per acceptar emojis compostos (família,
 * to de pell, etc.) com a UN sol "caràcter visible".
 */
export function isSingleEmoji(s: string): boolean {
  if (typeof s !== "string") return false;
  const trimmed = s.trim();
  if (trimmed.length === 0) return false;

  // 1 grafema emoji = 1 pictogràfic base + opcionalment VS16/skin tone,
  // possiblement seguit de ZWJ + (pictogràfic + opcionals) repetit.
  // Acceptem també emojis regionals (banderes) com a 2 indicadors.
  const singleEmojiRegex = new RegExp(
    "^(?:" +
      // banderes: 2 regional indicators
      "[\\u{1F1E6}-\\u{1F1FF}]{2}" +
      "|" +
      // base pictogràfic + modificadors + (ZWJ + pictogràfic + modificadors)*
      "\\p{Extended_Pictographic}[\\u{1F3FB}-\\u{1F3FF}\\uFE0F\\u20E3]*" +
      "(?:\\u200D\\p{Extended_Pictographic}[\\u{1F3FB}-\\u{1F3FF}\\uFE0F\\u20E3]*)*" +
      ")$",
    "u",
  );

  return singleEmojiRegex.test(trimmed);
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

const MAX_NAME_LENGTH = 20;
const MAX_TRAIT_LENGTH = 60;

/**
 * Valida l'objecte personalitzat. Retorna `{ok:true}` si tot és correcte
 * o `{ok:false, error}` amb el missatge d'error per mostrar a l'usuari.
 */
export function validateCustomObject(input: Partial<CustomObjectInput>): ValidationResult {
  if (!input.icon || !isSingleEmoji(input.icon)) {
    return { ok: false, error: "La icona ha de ser exactament 1 emoji" };
  }
  const name = (input.name ?? "").trim();
  if (name.length === 0) {
    return { ok: false, error: "El nom no pot estar buit" };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `El nom ha de tenir ${MAX_NAME_LENGTH} caràcters o menys` };
  }
  if (!input.size || !CUSTOM_OBJECT_SIZES.includes(input.size as CustomObjectSize)) {
    return { ok: false, error: "Mida no vàlida" };
  }
  if (!input.material || !CUSTOM_OBJECT_MATERIALS.includes(input.material as CustomObjectMaterial)) {
    return { ok: false, error: "Material no vàlid" };
  }
  const trait1 = (input.trait1 ?? "").trim();
  const trait2 = (input.trait2 ?? "").trim();
  if (trait1.length === 0 || trait2.length === 0) {
    return { ok: false, error: "Has d'escriure les 2 pistes" };
  }
  if (trait1.length > MAX_TRAIT_LENGTH || trait2.length > MAX_TRAIT_LENGTH) {
    return { ok: false, error: `Cada pista ha de tenir ${MAX_TRAIT_LENGTH} caràcters o menys` };
  }
  return { ok: true };
}

/**
 * Construeix el bloc `special_data` per a un objecte personalitzat,
 * llest per fusionar-lo amb la resta de `special_data` del jugador.
 */
export function buildCustomObjectSpecialData(input: CustomObjectInput): CustomObjectSpecialData {
  return {
    is_custom: true,
    custom_icon: input.icon.trim(),
    custom_name: input.name.trim(),
    custom_size: input.size,
    custom_material: input.material,
    custom_trait1: input.trait1.trim(),
    custom_trait2: input.trait2.trim(),
  };
}

/** True si el `special_data` correspon a un objecte personalitzat. */
export function isCustomObjectSpecialData(specialData: unknown): boolean {
  return Boolean(specialData && specialData.is_custom === true && typeof specialData.custom_icon === "string");
}
