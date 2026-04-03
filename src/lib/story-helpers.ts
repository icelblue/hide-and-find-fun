// ============================================================
// story-helpers.ts — Lògica del Mode Història (single-player)
// ============================================================
// Gestiona:
//   - Mascotes: creació, XP
//   - Progrés de capítols
//   - Accesoris de mascota
//   - CPU rival (decisions aleatòries)
// ============================================================

import { supabase } from "@/integrations/supabase/client";

// Available pets
export const PET_OPTIONS = [
  { type: "dog", icon: "🐕", name: "Gos" },
  { type: "cat", icon: "🐱", name: "Gat" },
  { type: "rabbit", icon: "🐰", name: "Conill" },
  { type: "hamster", icon: "🐹", name: "Hàmster" },
  { type: "turtle", icon: "🐢", name: "Tortuga" },
] as const;

// Accessories to collect in chapter 3+
export const PET_ACCESSORIES = [
  { name: "Collar", icon: "📿" },
  { name: "Llaç", icon: "🎀" },
  { name: "Pilota", icon: "⚽" },
  { name: "Os", icon: "🦴" },
  { name: "Manta", icon: "🧣" },
  { name: "Joguina", icon: "🧸" },
] as const;

// XP rewards per chapter
export function calculateXP(chapter: number, movesUsed: number): number {
  const baseXP: Record<number, number> = { 1: 100, 2: 200 };
  const base = baseXP[chapter] ?? 150;
  // Fewer moves = more bonus (max 2x)
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
  if (!pet) return;
  const { error } = await supabase
    .from("player_pets")
    .update({ xp: (pet.xp ?? 0) + xp })
    .eq("user_id", userId);
  if (error) throw error;
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

  // Unlock next chapter
  const nextChapter = chapter + 1;
  if (nextChapter <= 3 + PET_ACCESSORIES.length) {
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
        status: "locked",
      });
    }
  }

  // Award XP
  const xp = calculateXP(chapter, movesUsed);
  await addPetXP(userId, xp);
  return xp;
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
