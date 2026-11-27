// ============================================================
// story-helpers.ts — Lògica del Mode Història (single-player)
// ============================================================
// Gestiona:
//   - Mascotes: creació, XP, evolució, mort/renaixement
//   - Progrés de capítols
//   - Accesoris + consumibles post-accesoris
//   - CPU rival (decisions aleatòries)
// ============================================================

import { supabase } from "@/integrations/supabase/client";

// ============================================
// CONSTANTS
// ============================================

export const PET_OPTIONS = [
  { type: "dog", icon: "🐶", name: "Gos" },
  { type: "Lion", icon: "🦁", name: "Lleó" },
  { type: "cat", icon: "🐱", name: "Gat" },
  { type: "rabbit", icon: "🐰", name: "Conill" },
  { type: "Cow", icon: "🐮", name: "Vaca" },
  { type: "hamster", icon: "🐹", name: "Hàmster" },
  { type: "hem", icon: "🐔", name: "Gallina" },
  { type: "turtle", icon: "🐢", name: "Tortuga" },
  { type: "Koala", icon: "🐨", name: "Koala" },
  { type: "Pig", icon: "🐷", name: "Porc" },
  { type: "Wolf", icon: "🐺", name: "Llop" },
  { type: "Monky", icon: "🐵", name: "Mico" },
] as const;

export const PET_ACCESSORIES = [
  { name: "Collar", icon: "📿" },
  { name: "Llaç", icon: "🎀" },
  { name: "Pilota", icon: "⚽" },
  { name: "Os", icon: "🦴" },
  { name: "Manta", icon: "🧣" },
  { name: "Joguina", icon: "🧸" },
] as const;

// Consumables unlocked after all accessories — they HEAL (reduce XP) and EXTEND max life
// Each consumable cures a SPECIFIC health event type
export const PET_CONSUMABLES = [
  { name: "Menjar", icon: "🍖", xpHeal: 100, maxXpBoost: 50, curesEvent: "caiguda" },
  { name: "Aigua", icon: "💧", xpHeal: 50, maxXpBoost: 25, curesEvent: "febre" },
  { name: "Vacuna", icon: "💉", xpHeal: 200, maxXpBoost: 100, curesEvent: "virus" },
] as const;

// Random health events that DAMAGE (increase XP rapidly)
// Each event is cured by a specific consumable (see PET_CONSUMABLES.curesEvent)
export const PET_HEALTH_EVENTS = [
  { type: "virus", icon: "🤒", name: "Virus", xpDamage: 200, desc: "Ha agafat un virus!", cure: "Vacuna" },
  { type: "caiguda", icon: "🤕", name: "Caiguda", xpDamage: 150, desc: "Ha caigut i s'ha fet mal!", cure: "Menjar" },
  { type: "febre", icon: "🫠", name: "Febre", xpDamage: 100, desc: "Té febre alta!", cure: "Aigua" },
] as const;

// Max XP before pet dies
export const MAX_PET_XP = 5000;

// Evolution tiers
export const PET_EVOLUTION_TIERS: readonly {
  minXp: number;
  key: "baby" | "young" | "adult" | "veteran" | "legendary";
  label: string;
  badge: string;
  glow: string;
  ring: string;
}[] = [
  { minXp: 0, key: "baby", label: "Bebè", badge: "🥚", glow: "from-gray-400/20 to-gray-300/10", ring: "ring-muted-foreground/30" },
  { minXp: 500, key: "young", label: "Jove", badge: "🌱", glow: "from-green-400/30 to-emerald-300/15", ring: "ring-green-500/40" },
  { minXp: 1500, key: "adult", label: "Adult", badge: "⭐", glow: "from-blue-400/30 to-cyan-300/15", ring: "ring-blue-500/40" },
  { minXp: 3000, key: "veteran", label: "Veterà", badge: "🔥", glow: "from-orange-400/30 to-amber-300/15", ring: "ring-orange-500/50" },
  {
    minXp: 4500,
    key: "legendary",
    label: "Llegendari",
    badge: "👑",
    glow: "from-purple-400/40 to-pink-300/20",
    ring: "ring-purple-500/60",
  },
];

export function getPetEvolution(xp: number, maxXp?: number) {
  const effectiveMax = maxXp ?? MAX_PET_XP;
  let tier = PET_EVOLUTION_TIERS[0];
  for (const t of PET_EVOLUTION_TIERS) {
    if (xp >= t.minXp) tier = t;
  }
  const nextTier = PET_EVOLUTION_TIERS.find((t) => t.minXp > xp);
  const isDead = xp >= effectiveMax;
  return { ...tier, nextTier, isDead, xp, maxXp: effectiveMax };
}

export function hasAllAccessories(accessories: Array<{ slot?: string | null; accessory_name?: string }>): boolean {
  const owned = new Set(accessories.map((a) => a.accessory_name));
  return PET_ACCESSORIES.every((a) => owned.has(a.name));
}

// XP rewards per chapter
export function calculateXP(chapter: number, movesUsed: number): number {
  const baseXP: Record<number, number> = { 1: 100, 2: 200 };
  const base = baseXP[chapter] ?? 150;
  const efficiency = Math.max(1, 10 - movesUsed);
  return Math.round(base + efficiency * 10);
}

// ============================================
// PET CRUD
// ============================================

export async function getMyPet(userId: string) {
  const { data } = await supabase.from("player_pets").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

export async function createPet(userId: string, petType: string, petName: string, petIcon: string) {
  const { data, error } = await supabase
    .from("player_pets")
    .insert({ user_id: userId, pet_type: petType, pet_name: petName, pet_icon: petIcon })
    .select()
    .single();
  // A repeated tap can arrive after the pet was already created: reuse it instead of failing.
  if (error?.code === "23505") {
    const existing = await getMyPet(userId);
    if (existing) return existing;
  }
  if (error) throw new Error(error.message);
  return data;
}

export async function addPetXP(userId: string, xp: number) {
  const pet = await getMyPet(userId);
  if (!pet) return null;
  // XP is changed only by server RPCs; this reports the current value.
  void xp;
  const effectiveMax = pet.max_xp ?? MAX_PET_XP;
  const newXp = pet.xp ?? 0;
  return { newXp, isDead: newXp >= effectiveMax };
}

// Reduce pet XP (healing via consumable)
export async function healPetXP(userId: string, xpReduce: number) {
  const pet = await getMyPet(userId);
  if (!pet) return null;
  void xpReduce;
  return { newXp: pet.xp ?? 0 };
}

// Delete pet + accessories + events + state + inventory + recipe book + skills for rebirth
export async function resetPetAndProgress(userId: string) {
  await Promise.all([
    supabase.from("pet_accessories").delete().eq("user_id", userId),
    supabase.from("pet_consumables").delete().eq("user_id", userId),
    supabase.from("pet_events").delete().eq("user_id", userId),
    supabase.from("pet_state").delete().eq("user_id", userId),
    supabase.from("pet_skills").delete().eq("user_id", userId),
    supabase.from("story_inventory").delete().eq("user_id", userId),
    supabase.from("story_recipe_book").delete().eq("user_id", userId),
    supabase.from("player_pets").delete().eq("user_id", userId),
  ]);
}

// ============================================
// PET ACCESSORIES
// ============================================

export async function getMyAccessories(userId: string) {
  const { data } = await supabase.from("pet_accessories").select("*").eq("user_id", userId).order("obtained_at");
  return data ?? [];
}

export async function awardAccessory(userId: string, name: string, icon: string) {
  const { error } = await supabase
    .from("pet_accessories")
    .upsert({ user_id: userId, accessory_name: name, accessory_icon: icon }, { onConflict: "user_id,accessory_name" });
  if (error) throw error;
}

// ============================================
// PET HEALTH EVENTS
// ============================================

export async function getActiveEvents(userId: string) {
  const { data } = await supabase
    .from("pet_events")
    .select("*")
    .eq("user_id", userId)
    .eq("resolved", false)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Roll for a random health event after completing a chapter (25% chance) */
export async function rollHealthEvent(userId: string): Promise<(typeof PET_HEALTH_EVENTS)[number] | null> {
  void userId;
  const { data } = await supabase.rpc("story_roll_health_event");
  const type = (data as { type?: string } | null)?.type;
  if (!type) return null;
  const event = PET_HEALTH_EVENTS.find((e) => e.type === type) ?? null;
  return event;
}

/** Use a consumable to heal the pet and extend its max life */
export async function useConsumable(userId: string, consumableName: string) {
  const consumable = PET_CONSUMABLES.find((c) => c.name === consumableName);
  if (!consumable) throw new Error("Consumible no vàlid");

  void userId;
  const { data, error } = await supabase.rpc("story_use_consumable", { _name: consumableName });
  if (error) {
    if ((error.message ?? "").includes("no_consumable")) throw new Error(`No tens ${consumable.icon} ${consumable.name}!`);
    throw new Error(error.message);
  }
  return data as unknown as {
    healed: number; maxXpBoost: number; newXp: number; didCureEvent: boolean; curesEvent: string;
  };
}

// ============================================
// CPU LOGIC (random decisions)
// ============================================

export function cpuChooseHidingSpot(items: Array<Record<string, any>>, objects: Array<Record<string, any>>) {
  if (items.length === 0 || objects.length === 0) return null;
  const item = items[Math.floor(Math.random() * items.length)];
  const obj = objects[Math.floor(Math.random() * objects.length)];
  const positions = ["sobre", "sota", "dins"] as const;
  const pos = positions[Math.floor(Math.random() * positions.length)];
  return { itemId: item.id, objectId: obj.id, position: pos, itemName: item.name, objectName: obj.name };
}
