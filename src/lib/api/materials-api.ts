// ============================================================
// Materials i entorns: regles de bloqueig i etiquetes
import { supabase } from "@/integrations/supabase/client";
// ============================================================
// MATERIAL vs ENVIRONMENT VALIDATION
// ============================================

/** Returns a user-facing block reason if material can't go in environment, or null if OK */
export function getMaterialBlockReason(material: string, environment: string): string | null {
  if (environment === "generic") return null;

  const rules: Record<string, Record<string, string>> = {
    paper: {
      wet: "es mullaria 💧",
      submergit: "es desfaria 🌊",
      hot: "es cremaria 🔥",
    },
    cardboard: {
      wet: "es desfaria 💧",
      submergit: "es desfaria 🌊",
      hot: "es cremaria 🔥",
    },
    food: {
      dirty: "no és higiènic 🗑️",
      químic: "seria tòxic ☣️",
    },
    electronic: {
      wet: "es faria malbé 💧",
      submergit: "es faria malbé 🌊",
    },
    wood: {
      hot: "es cremaria 🔥",
      submergit: "flotaria 🌊",
    },
    fabric: {
      hot: "es cremaria 🔥",
    },
    metal: {},
    plastic: {
      hot: "es fondria 🔥",
    },
    rubber: {
      hot: "es fondria 🔥",
    },
    glass: {},
    ceramic: {},
    leather: {
      submergit: "es podriria 🌊",
      hot: "es ressecaria 🔥",
    },
    stone: {},
    generic: {},
  };

  const reason = rules[material]?.[environment];
  if (!reason) return null;
  return reason;
}

/** Display name for materials in UI — values are i18n KEYS (use t(MATERIAL_LABELS[m])) */
export const MATERIAL_LABELS: Record<string, string> = {
  generic: "game.materials.generic",
  paper: "game.materials.paper",
  glass: "game.materials.glass",
  metal: "game.materials.metal",
  plastic: "game.materials.plastic",
  fabric: "game.materials.fabric",
  wood: "game.materials.wood",
  cardboard: "game.materials.cardboard",
  rubber: "game.materials.rubber",
  ceramic: "game.materials.ceramic",
  electronic: "game.materials.electronic",
  leather: "game.materials.leather",
  stone: "game.materials.stone",
  food: "game.materials.food",
};

/** Contextual label key when an object is placed in a specific environment (use t(ENVIRONMENT_LABELS[e])) */
export const ENVIRONMENT_LABELS: Record<string, string> = {
  wet: "game.environments.wet",
  hot: "game.environments.hot",
  dirty: "game.environments.dirty",
  frozen: "game.environments.frozen",
  outdoor: "game.environments.outdoor",
  sorrenc: "game.environments.sorrenc",
  submergit: "game.environments.submergit",
  químic: "game.environments.químic",
  ventós: "game.environments.ventós",
};

/** Get contextual i18n key for an object hidden in a specific item environment */
export function getEnvironmentLabel(environment: string): string | null {
  if (environment === "generic") return null;
  return ENVIRONMENT_LABELS[environment] ?? null;
}


// ============================================
