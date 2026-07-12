// ============================================================
// pet-personality.ts — Sistema híbrid de personalitat (FASE 1)
// ============================================================
// 🔒 INDEPENDENT del PvP. Només Mode Història.
//
// Personalitat = traits base (espècie) + modificadors (estat pet_state)
// Resultat: 5 valors 0-10 → curious, loyal, brave, gluttonous, calm
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { PetState } from "./story-state";

export const TRAITS = ["curious", "loyal", "brave", "gluttonous", "calm"] as const;
export type Trait = typeof TRAITS[number];
export type Personality = Record<Trait, number>;

// `label` és el fallback CA. La UI hauria d'usar t(`petTrait.${key}`).
export const TRAIT_META: Record<Trait, { key: Trait; label: string; icon: string; color: string }> = {
  curious:    { key: "curious",    label: "Curiós",   icon: "🔍", color: "text-blue-400" },
  loyal:      { key: "loyal",      label: "Lleial",   icon: "🤝", color: "text-pink-400" },
  brave:      { key: "brave",      label: "Valent",   icon: "⚔️", color: "text-red-400" },
  gluttonous: { key: "gluttonous", label: "Gormand",  icon: "🍖", color: "text-amber-400" },
  calm:       { key: "calm",       label: "Calmat",   icon: "🌿", color: "text-emerald-400" },
};

const DEFAULT_BASE: Personality = { curious: 5, loyal: 5, brave: 5, gluttonous: 5, calm: 5 };

const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n)));

// Cache de traits per espècie (no canvien mai)
let _speciesCache: Map<string, Personality> | null = null;

async function loadSpeciesCache(): Promise<Map<string, Personality>> {
  if (_speciesCache) return _speciesCache;
  const { data } = await supabase.from("pet_species_traits").select("*");
  const map = new Map<string, Personality>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    map.set(row.pet_type, {
      curious: row.curious, loyal: row.loyal, brave: row.brave,
      gluttonous: row.gluttonous, calm: row.calm,
    });
  }
  _speciesCache = map;
  return map;
}

export async function getSpeciesTraits(petType: string): Promise<Personality> {
  const cache = await loadSpeciesCache();
  // Lookup case-insensitive
  if (cache.has(petType)) return cache.get(petType)!;
  for (const [k, v] of cache.entries()) {
    if (k.toLowerCase() === petType.toLowerCase()) return v;
  }
  return { ...DEFAULT_BASE };
}

/**
 * Modificadors derivats de l'estat actual de la mascota.
 * Aquesta és l'essència del sistema "híbrid": una tortuga ben cuidada pot ser
 * més valenta del normal, un lleó famolenc menys calmat, etc.
 */
export function getStateModifiers(state: PetState): Personality {
  const m: Personality = { curious: 0, loyal: 0, brave: 0, gluttonous: 0, calm: 0 };

  // Bond alt → més lleial i valent (confia en l'amo)
  if (state.bond >= 70) { m.loyal += 2; m.brave += 1; }
  else if (state.bond <= 25) { m.loyal -= 2; m.brave -= 1; }

  // Por alta → menys valent, menys curiós
  if (state.fear >= 60) { m.brave -= 3; m.curious -= 2; m.calm -= 2; }
  else if (state.fear <= 15) { m.brave += 1; m.calm += 1; }

  // Gana alta → més gormand, menys calmat
  if (state.hunger >= 70) { m.gluttonous += 2; m.calm -= 1; }
  else if (state.hunger <= 20) { m.gluttonous -= 1; m.calm += 1; }

  // Cansament alt → menys curiós, més calmat (passiu)
  if (state.sleep >= 70) { m.curious -= 2; m.calm += 1; m.brave -= 1; }
  else if (state.sleep <= 20) { m.curious += 1; }

  return m;
}

/**
 * Combina espècie + estat per donar la personalitat efectiva.
 */
export async function getPetPersonality(userId: string): Promise<Personality> {
  const [petRes, stateRes] = await Promise.all([
    supabase.from("player_pets").select("pet_type").eq("user_id", userId).maybeSingle(),
    supabase.from("pet_state").select("hunger,sleep,fear,bond").eq("user_id", userId).maybeSingle(),
  ]);
  const petType: string = petRes.data?.pet_type ?? "cat";
  const state: PetState = (stateRes.data as any) ?? { hunger: 30, sleep: 30, fear: 20, bond: 40 };

  const base = await getSpeciesTraits(petType);
  const mods = getStateModifiers(state);
  return {
    curious:    clamp(base.curious    + mods.curious),
    loyal:      clamp(base.loyal      + mods.loyal),
    brave:      clamp(base.brave      + mods.brave),
    gluttonous: clamp(base.gluttonous + mods.gluttonous),
    calm:       clamp(base.calm       + mods.calm),
  };
}

/**
 * Comprova si una opció requereix un trait mínim.
 * Format: { curious: 6 } → cal curiositat >= 6
 * Múltiples traits → totes han de complir-se (AND).
 */
export function checkTraitRequirement(
  personality: Personality,
  required: Record<string, number> | null | undefined,
): { ok: boolean; failing: Trait[] } {
  if (!required) return { ok: true, failing: [] };
  const failing: Trait[] = [];
  for (const [traitRaw, min] of Object.entries(required)) {
    const trait = traitRaw as Trait;
    if (!TRAITS.includes(trait)) continue;
    if ((personality[trait] ?? 0) < min) failing.push(trait);
  }
  return { ok: failing.length === 0, failing };
}

/**
 * Aplica un multiplicador d'XP segons la personalitat.
 * Format: { brave: 1.5 } → si trait brave alt (>=7), multiplica XP per 1.5.
 * Es pot encadenar: si brave 7 i curious 6, agafem el màxim multiplicador.
 */
export function getRewardTraitBonus(
  personality: Personality,
  multipliers: Record<string, number> | null | undefined,
): { multiplier: number; trait: Trait | null } {
  if (!multipliers) return { multiplier: 1, trait: null };
  let best = 1;
  let bestTrait: Trait | null = null;
  for (const [traitRaw, mult] of Object.entries(multipliers)) {
    const trait = traitRaw as Trait;
    if (!TRAITS.includes(trait)) continue;
    // Trigger threshold: 7+ activa el multiplicador
    if ((personality[trait] ?? 0) >= 7 && mult > best) {
      best = mult;
      bestTrait = trait;
    }
  }
  return { multiplier: best, trait: bestTrait };
}

/**
 * Trait dominant — el més alt de tots. Útil per badges al perfil.
 */
export function getDominantTrait(personality: Personality): Trait {
  let best: Trait = "curious";
  let max = -1;
  for (const t of TRAITS) {
    if (personality[t] > max) { max = personality[t]; best = t; }
  }
  return best;
}
