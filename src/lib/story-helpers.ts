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
  { type: "dog", icon: "🐕", name: "Gos" },
  { type: "cat", icon: "🐱", name: "Gat" },
  { type: "rabbit", icon: "🐰", name: "Conill" },
  { type: "hamster", icon: "🐹", name: "Hàmster" },
  { type: "turtle", icon: "🐢", name: "Tortuga" },
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
export const PET_CONSUMABLES = [
  { name: "Menjar", icon: "🍖", xpHeal: 100, maxXpBoost: 50 },
  { name: "Aigua", icon: "💧", xpHeal: 50, maxXpBoost: 25 },
  { name: "Vacuna", icon: "💉", xpHeal: 200, maxXpBoost: 100 },
] as const;

// Random health events that DAMAGE (increase XP rapidly)
export const PET_HEALTH_EVENTS = [
  { type: "virus", icon: "🤒", name: "Virus", xpDamage: 200, desc: "Ha agafat un virus!" },
  { type: "caiguda", icon: "🤕", name: "Caiguda", xpDamage: 150, desc: "Ha caigut i s'ha fet mal!" },
  { type: "febre", icon: "🫠", name: "Febre", xpDamage: 100, desc: "Té febre alta!" },
] as const;

// Max XP before pet dies
export const MAX_PET_XP = 5000;

// Evolution tiers
export const PET_EVOLUTION_TIERS: readonly { minXp: number; label: string; badge: string; glow: string; ring: string }[] = [
  { minXp: 0, label: "Bebè", badge: "🥚", glow: "from-gray-400/20 to-gray-300/10", ring: "ring-muted-foreground/30" },
  { minXp: 500, label: "Jove", badge: "🌱", glow: "from-green-400/30 to-emerald-300/15", ring: "ring-green-500/40" },
  { minXp: 1500, label: "Adult", badge: "⭐", glow: "from-blue-400/30 to-cyan-300/15", ring: "ring-blue-500/40" },
  { minXp: 3000, label: "Veterà", badge: "🔥", glow: "from-orange-400/30 to-amber-300/15", ring: "ring-orange-500/50" },
  { minXp: 4500, label: "Llegendari", badge: "👑", glow: "from-purple-400/40 to-pink-300/20", ring: "ring-purple-500/60" },
];

export function getPetEvolution(xp: number) {
  let tier = PET_EVOLUTION_TIERS[0];
  for (const t of PET_EVOLUTION_TIERS) {
    if (xp >= t.minXp) tier = t;
  }
  const nextTier = PET_EVOLUTION_TIERS.find(t => t.minXp > xp);
  const isDead = xp >= MAX_PET_XP;
  return { ...tier, nextTier, isDead, xp, maxXp: MAX_PET_XP };
}

export function hasAllAccessories(accessories: any[]): boolean {
  const owned = new Set(accessories.map(a => a.accessory_name));
  return PET_ACCESSORIES.every(a => owned.has(a.name));
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
  const { data } = await supabase
    .from("player_pets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function createPet(userId: string, petType: string, petName: string, petIcon: string) {
  const { data, error } = await supabase
    .from("player_pets")
    .insert({ user_id: userId, pet_type: petType, pet_name: petName, pet_icon: petIcon })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addPetXP(userId: string, xp: number) {
  const pet = await getMyPet(userId);
  if (!pet) return null;
  const newXp = Math.min((pet.xp ?? 0) + xp, MAX_PET_XP);
  const { error } = await supabase
    .from("player_pets")
    .update({ xp: newXp })
    .eq("user_id", userId);
  if (error) throw error;
  return { newXp, isDead: newXp >= MAX_PET_XP };
}

// Reduce pet XP (healing via consumable)
export async function healPetXP(userId: string, xpReduce: number) {
  const pet = await getMyPet(userId);
  if (!pet) return null;
  const newXp = Math.max(0, (pet.xp ?? 0) - xpReduce);
  const { error } = await supabase
    .from("player_pets")
    .update({ xp: newXp })
    .eq("user_id", userId);
  if (error) throw error;
  return { newXp };
}

// Delete pet + progress + accessories + events for rebirth
export async function resetPetAndProgress(userId: string) {
  await Promise.all([
    supabase.from("pet_accessories").delete().eq("user_id", userId),
    supabase.from("pet_consumables").delete().eq("user_id", userId),
    supabase.from("pet_events").delete().eq("user_id", userId),
    supabase.from("story_progress").delete().eq("user_id", userId),
    supabase.from("player_pets").delete().eq("user_id", userId),
  ]);
}

// ============================================
// STORY PROGRESS
// ============================================

export async function getStoryProgress(userId: string) {
  const { data } = await supabase
    .from("story_progress")
    .select("*")
    .eq("user_id", userId)
    .order("chapter");
  return data ?? [];
}

export async function initChapter(userId: string, chapter: number) {
  const { data: existing } = await supabase
    .from("story_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("chapter", chapter)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("story_progress")
      .update({ status: "active", moves_used: 0 })
      .eq("id", existing.id);
  } else {
    await supabase.from("story_progress").insert({
      user_id: userId,
      chapter,
      status: "active",
    });
  }
}

export async function completeChapter(userId: string, chapter: number, movesUsed: number) {
  const { data: existing } = await supabase
    .from("story_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("chapter", chapter)
    .single();
  
  const bestMoves = existing?.best_moves ? Math.min(existing.best_moves, movesUsed) : movesUsed;
  
  await supabase
    .from("story_progress")
    .update({
      status: "completed",
      moves_used: movesUsed,
      best_moves: bestMoves,
      completed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("chapter", chapter);

  // Unlock next chapter (only if not already existing)
  const nextChapter = chapter + 1;
  if (nextChapter <= 2 + PET_ACCESSORIES.length) {
    const { data: next } = await supabase
      .from("story_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("chapter", nextChapter)
      .maybeSingle();
    if (!next) {
      await supabase.from("story_progress").insert({
        user_id: userId,
        chapter: nextChapter,
        status: "unlocked",
      });
    }
  }

  // Award XP
  const xp = calculateXP(chapter, movesUsed);
  const result = await addPetXP(userId, xp);
  return { xp, isDead: result?.isDead ?? false, newXp: result?.newXp ?? 0 };
}

// ============================================
// PET ACCESSORIES
// ============================================

export async function getMyAccessories(userId: string) {
  const { data } = await supabase
    .from("pet_accessories")
    .select("*")
    .eq("user_id", userId)
    .order("obtained_at");
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
export async function rollHealthEvent(userId: string): Promise<typeof PET_HEALTH_EVENTS[number] | null> {
  if (Math.random() > 0.25) return null; // 75% nothing happens
  const event = PET_HEALTH_EVENTS[Math.floor(Math.random() * PET_HEALTH_EVENTS.length)];
  // Apply XP damage
  const result = await addPetXP(userId, event.xpDamage);
  // Record the event
  await supabase.from("pet_events").insert({
    user_id: userId,
    event_type: event.type,
    event_icon: event.icon,
    event_name: event.name,
    xp_change: event.xpDamage,
  });
  return event;
}

/** Use a consumable to heal the pet */
export async function useConsumable(userId: string, consumableName: string) {
  const consumable = PET_CONSUMABLES.find(c => c.name === consumableName);
  if (!consumable) throw new Error("Consumible no vàlid");

  // Check user has an unused consumable
  const { data: owned } = await supabase
    .from("pet_consumables")
    .select("id")
    .eq("user_id", userId)
    .eq("consumable_name", consumableName)
    .is("used_at", null)
    .limit(1);

  if (!owned || owned.length === 0) throw new Error(`No tens ${consumable.icon} ${consumable.name}!`);

  // Mark consumable as used
  await supabase
    .from("pet_consumables")
    .update({ used_at: new Date().toISOString() })
    .eq("id", owned[0].id);

  // Heal pet
  const result = await healPetXP(userId, consumable.xpHeal);

  // Resolve any active events of matching type
  await supabase
    .from("pet_events")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("resolved", false);

  return { healed: consumable.xpHeal, newXp: result?.newXp ?? 0 };
}

// ============================================
// CPU LOGIC (random decisions)
// ============================================

export function cpuChooseHidingSpot(items: any[], objects: any[]) {
  if (items.length === 0 || objects.length === 0) return null;
  const item = items[Math.floor(Math.random() * items.length)];
  const obj = objects[Math.floor(Math.random() * objects.length)];
  const positions = ["sobre", "sota", "dins"] as const;
  const pos = positions[Math.floor(Math.random() * positions.length)];
  return { itemId: item.id, objectId: obj.id, position: pos, itemName: item.name, objectName: obj.name };
}
