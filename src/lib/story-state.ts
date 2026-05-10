// ============================================================
// story-state.ts — Estats mascota + Inventari + Receptes (v4)
// ============================================================
// 🔒 CRITICAL: INDEPENDENT del PvP.
// ============================================================

import { supabase } from "@/integrations/supabase/client";

export interface PetState {
  hunger: number;
  sleep: number;
  fear: number;
  bond: number;
}

export interface InventoryItem {
  item_id: string;
  item_name: string;
  item_icon: string;
}

export interface Recipe {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  requires_items: string[];
  result_item_id: string;
  result_item_name: string;
  result_item_icon: string;
}

export const DEFAULT_STATE: PetState = { hunger: 30, sleep: 30, fear: 20, bond: 40 };

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// ============================================
// PET STATE
// ============================================

export async function getPetState(userId: string): Promise<PetState> {
  const { data } = await supabase.from("pet_state").select("hunger,sleep,fear,bond").eq("user_id", userId).maybeSingle();
  if (!data) {
    await supabase.from("pet_state").insert({ user_id: userId, ...DEFAULT_STATE });
    return { ...DEFAULT_STATE };
  }
  return { hunger: data.hunger, sleep: data.sleep, fear: data.fear, bond: data.bond };
}

export async function applyStateDelta(userId: string, delta: Partial<PetState>): Promise<PetState> {
  const current = await getPetState(userId);
  const next: PetState = {
    hunger: clamp(current.hunger + (delta.hunger ?? 0)),
    sleep: clamp(current.sleep + (delta.sleep ?? 0)),
    fear: clamp(current.fear + (delta.fear ?? 0)),
    bond: clamp(current.bond + (delta.bond ?? 0)),
  };
  await supabase.from("pet_state").update({ ...next, updated_at: new Date().toISOString() }).eq("user_id", userId);
  return next;
}

export async function resetPetState(userId: string) {
  await supabase.from("pet_state").delete().eq("user_id", userId);
}

// ============================================
// INVENTORY
// ============================================

export async function getInventory(userId: string): Promise<InventoryItem[]> {
  const { data } = await supabase.from("story_inventory").select("item_id,item_name,item_icon").eq("user_id", userId).order("obtained_at");
  return (data ?? []) as InventoryItem[];
}

export async function addInventoryItem(userId: string, item: InventoryItem): Promise<boolean> {
  const { error } = await supabase.from("story_inventory").insert({ user_id: userId, ...item });
  if (error && (error as any).code === "23505") return false; // duplicate
  if (error) throw error;
  return true;
}

export async function consumeItems(userId: string, itemIds: string[]) {
  if (itemIds.length === 0) return;
  await supabase.from("story_inventory").delete().eq("user_id", userId).in("item_id", itemIds);
}

export function hasItems(inventory: InventoryItem[], required: string[]): boolean {
  const owned = new Set(inventory.map((i) => i.item_id));
  return required.every((id) => owned.has(id));
}

// ============================================
// RECIPES
// ============================================

let _recipesCache: Recipe[] | null = null;

export async function getAllRecipes(): Promise<Recipe[]> {
  if (_recipesCache) return _recipesCache;
  const { data } = await supabase.from("story_recipes").select("*").order("name");
  _recipesCache = ((data ?? []) as any[]).map((r) => ({
    ...r,
    requires_items: Array.isArray(r.requires_items) ? r.requires_items : [],
  })) as Recipe[];
  return _recipesCache;
}

export async function getDiscoveredRecipeIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from("story_recipe_book").select("recipe_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.recipe_id));
}

export async function discoverRecipe(userId: string, recipeId: string): Promise<boolean> {
  const { error } = await supabase.from("story_recipe_book").insert({ user_id: userId, recipe_id: recipeId });
  if (error && (error as any).code === "23505") return false;
  if (error) throw error;
  return true;
}

/** Combine: consume inputs, add result. Returns the new item or null if cannot. */
export async function combineRecipe(userId: string, recipe: Recipe, inventory: InventoryItem[]): Promise<InventoryItem | null> {
  if (!hasItems(inventory, recipe.requires_items)) return null;
  await consumeItems(userId, recipe.requires_items);
  const newItem: InventoryItem = {
    item_id: recipe.result_item_id,
    item_name: recipe.result_item_name,
    item_icon: recipe.result_item_icon,
  };
  await addInventoryItem(userId, newItem).catch(() => false);
  return newItem;
}
