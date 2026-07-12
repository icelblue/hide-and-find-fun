// ============================================================
// story-state.ts — Estats mascota + Inventari + Receptes (v5.1)
// ============================================================
// 🔒 CRITICAL: INDEPENDENT del PvP.
// Decay temporal: hunger/sleep pugen amb el temps, fear baixa, bond baixa lent.
// ============================================================

import { supabase } from "@/integrations/supabase/client";

export interface PetState {
  hunger: number;  // 0=ple, 100=famolenc
  sleep: number;   // 0=descansat, 100=esgotat
  fear: number;    // 0=tranquil, 100=aterrit
  bond: number;    // 0=fred, 100=inseparable
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
// 🕒 DECAY TEMPORAL — apply when reading state
// ============================================
// Cada 6h: hunger +15, sleep +12, fear -5, bond -3
// v6: Decay més lent (cada 12h enlloc de 6h) — la mascota viu més temps
const DECAY_PER_12H: Partial<PetState> = { hunger: 15, sleep: 12, fear: -5, bond: -3 };

function applyDecay(state: PetState, hoursElapsed: number): { state: PetState; changed: boolean } {
  if (hoursElapsed < 1) return { state, changed: false };
  const factor = hoursElapsed / 12;
  const next: PetState = {
    hunger: clamp(state.hunger + (DECAY_PER_12H.hunger! * factor)),
    sleep: clamp(state.sleep + (DECAY_PER_12H.sleep! * factor)),
    fear: clamp(state.fear + (DECAY_PER_12H.fear! * factor)),
    bond: clamp(state.bond + (DECAY_PER_12H.bond! * factor)),
  };
  const changed =
    next.hunger !== state.hunger || next.sleep !== state.sleep ||
    next.fear !== state.fear || next.bond !== state.bond;
  return { state: next, changed };
}

// ============================================
// PET STATE
// ============================================

export async function getPetState(userId: string): Promise<PetState> {
  const { data } = await supabase
    .from("pet_state")
    .select("hunger,sleep,fear,bond,updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    await supabase.from("pet_state").insert({ user_id: userId, ...DEFAULT_STATE });
    return { ...DEFAULT_STATE };
  }
  const current: PetState = {
    hunger: data.hunger, sleep: data.sleep, fear: data.fear, bond: data.bond,
  };
  const updatedAt = data.updated_at ? new Date(data.updated_at).getTime() : Date.now();
  const hoursElapsed = (Date.now() - updatedAt) / (1000 * 60 * 60);
  const { state: next, changed } = applyDecay(current, hoursElapsed);
  if (changed) {
    await supabase.from("pet_state")
      .update({ ...next, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }
  return next;
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
// 🎯 EFECTES D'OBJECTES — donar items a la mascota
// ============================================

export type EffectKind = "eat" | "devour" | "taste" | "drink" | "rest" | "play" | "calm" | "gift" | "music";

export interface ItemEffect {
  delta: Partial<PetState>;
  kind: EffectKind;   // i18n key under storyEffect.<kind>
  label: string;      // fallback CA label (botó)
  verb: string;       // fallback CA verb (toast)
}

/** Static fallback used while the DB cache is still loading (or for offline tests). */
const ITEM_EFFECTS_BY_ID: Record<string, ItemEffect> = {
  apple:    { delta: { hunger: -40, bond: 5 },   kind: "eat",    label: "🍎 Donar menjar", verb: "menja" },
  bread:    { delta: { hunger: -50, bond: 5 },   kind: "eat",    label: "🍞 Donar pa",     verb: "menja" },
  meat:     { delta: { hunger: -60 },             kind: "devour", label: "🍖 Donar carn",   verb: "devora" },
  fish:     { delta: { hunger: -50, bond: 5 },   kind: "eat",    label: "🐟 Donar peix",   verb: "menja" },
  berries:  { delta: { hunger: -25, bond: 10 }, kind: "taste",  label: "🫐 Donar baies",  verb: "tasta" },
  water:    { delta: { sleep: -15, hunger: -10 }, kind: "drink",  label: "💧 Donar aigua",  verb: "beu" },
  blanket:  { delta: { sleep: -45, fear: -15 },  kind: "rest",   label: "🛏️ Acotxar",      verb: "es relaxa amb" },
  toy:      { delta: { bond: 25, fear: -20 },    kind: "play",   label: "🧸 Jugar",        verb: "juga amb" },
  ball:     { delta: { bond: 20, fear: -15 },    kind: "play",   label: "⚽ Jugar a pilota", verb: "juga amb" },
  potion:   { delta: { fear: -50, bond: 10 },    kind: "calm",   label: "🧪 Calmar",       verb: "pren" },
  flower:   { delta: { bond: 15, fear: -10 },    kind: "gift",   label: "🌸 Regalar flor",  verb: "olora" },
  music:    { delta: { fear: -30, sleep: -10 },  kind: "music",  label: "🎵 Calmar amb música", verb: "escolta" },
};

/** Verb fallback per kind quan ve de BD i no tenim text personalitzat. */
const KIND_VERB: Record<EffectKind, string> = {
  eat: "menja", devour: "devora", taste: "tasta", drink: "beu",
  rest: "descansa amb", play: "juga amb", calm: "pren",
  gift: "rep", music: "escolta",
};

/** DB-loaded overlay: item_id → ItemEffect (loaded once per session). */
let _effectsCache: Record<string, ItemEffect> | null = null;
let _effectsLoading: Promise<void> | null = null;

async function loadEffectsCache(): Promise<void> {
  if (_effectsCache) return;
  if (_effectsLoading) return _effectsLoading;
  _effectsLoading = (async () => {
    const { data } = await supabase
      .from("story_item_effects")
      .select("item_id,kind,d_hunger,d_sleep,d_fear,d_bond");
    const map: Record<string, ItemEffect> = {};
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const delta: Partial<PetState> = {};
      if (row.d_hunger) delta.hunger = row.d_hunger;
      if (row.d_sleep)  delta.sleep  = row.d_sleep;
      if (row.d_fear)   delta.fear   = row.d_fear;
      if (row.d_bond)   delta.bond   = row.d_bond;
      const kind = row.kind as EffectKind;
      map[row.item_id] = { delta, kind, label: "", verb: KIND_VERB[kind] ?? "rep" };
    }
    _effectsCache = map;
  })();
  return _effectsLoading;
}

/** Force-refresh BD cache (tests, after seeds). */
export function _resetItemEffectsCache() { _effectsCache = null; _effectsLoading = null; }

/** Inferred fallback by name keyword (català/castellà) — last resort. */
function inferEffect(item: InventoryItem): ItemEffect | null {
  const direct = ITEM_EFFECTS_BY_ID[item.item_id];
  if (direct) return direct;
  const fromDb = _effectsCache?.[item.item_id];
  if (fromDb) {
    return {
      ...fromDb,
      label: `${item.item_icon ?? ""} ${item.item_name}`.trim(),
    };
  }
  const n = item.item_name.toLowerCase();
  if (/poma|fruita|menj|comid|pa\b|pan\b|carn|peix|pesc|baia|baya|llaminadu|caram|honey|mel|miel/.test(n))
    return { delta: { hunger: -40, bond: 5 }, kind: "eat", label: `${item.item_icon} Donar a menjar`, verb: "menja" };
  if (/aigu|agua|beguda|bebid/.test(n))
    return { delta: { sleep: -15, hunger: -10 }, kind: "drink", label: `${item.item_icon} Donar de beure`, verb: "beu" };
  if (/manta|coix|coj|llit|cama|dormir/.test(n))
    return { delta: { sleep: -40, fear: -10 }, kind: "rest", label: `${item.item_icon} Acotxar`, verb: "descansa amb" };
  if (/jogui|joc|peluix|pilota|pelota|toy|ball/.test(n))
    return { delta: { bond: 20, fear: -15 }, kind: "play", label: `${item.item_icon} Jugar`, verb: "juga amb" };
  if (/poci|elixir|tonic|calm|cur|medic/.test(n))
    return { delta: { fear: -40, bond: 5 }, kind: "calm", label: `${item.item_icon} Calmar`, verb: "pren" };
  if (/flor|flower|ram|regal/.test(n))
    return { delta: { bond: 15 }, kind: "gift", label: `${item.item_icon} Regalar`, verb: "rep" };
  return null;
}

export function getItemEffect(item: InventoryItem): ItemEffect | null {
  return inferEffect(item);
}

/** Async variant: ensures DB cache is loaded before resolving. Preferred from UI. */
export async function getItemEffectAsync(item: InventoryItem): Promise<ItemEffect | null> {
  await loadEffectsCache();
  return inferEffect(item);
}


/** Use one item: consume + apply delta. Returns new state and effect used (null if not usable). */
export async function useItemOnPet(userId: string, item: InventoryItem):
  Promise<{ state: PetState; effect: ItemEffect } | null>
{
  const effect = await getItemEffectAsync(item);
  if (!effect) return null;

  // Remove ONE instance (delete by id from row table — match item_id, limit 1 via eq+row)
  const { data: row } = await supabase
    .from("story_inventory")
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", item.item_id)
    .limit(1)
    .maybeSingle();
  if (row?.id) {
    await supabase.from("story_inventory").delete().eq("id", row.id);
  }
  const state = await applyStateDelta(userId, effect.delta);
  return { state, effect };
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
  if (error && error.code === "23505") return false; // duplicate
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
  _recipesCache = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
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
  if (error && error.code === "23505") return false;
  if (error) throw error;
  return true;
}

/**
 * Auto-discover: detect recipes the user could craft with current inventory but hasn't unlocked yet.
 * Returns newly discovered recipe definitions (so caller can toast them).
 */
export async function autoDiscoverRecipes(userId: string, inventory: InventoryItem[]):
  Promise<Recipe[]>
{
  const [all, known] = await Promise.all([
    getAllRecipes(),
    getDiscoveredRecipeIds(userId),
  ]);
  const newlyDiscovered: Recipe[] = [];
  for (const r of all) {
    if (known.has(r.id)) continue;
    if (r.requires_items.length === 0) continue;
    if (hasItems(inventory, r.requires_items)) {
      const ok = await discoverRecipe(userId, r.id);
      if (ok) newlyDiscovered.push(r);
    }
  }
  return newlyDiscovered;
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
