// ============================================================
// story-progression.ts — Mons, Habilitats, Visites, Diari (v5)
// ============================================================
// 🔒 INDEPENDENT del PvP.
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import { getMyPet } from "./story-helpers";

// -------- LEVELS / SKILLS --------

export interface SkillDef {
  id: string;
  level: number;
  name: string;
  icon: string;
  description: string;
}

export const SKILLS: SkillDef[] = [
  { id: "smell",    level: 2,  icon: "👃", name: "Olfacte",  description: "Detecta camins ocults." },
  { id: "strength", level: 4,  icon: "💪", name: "Força",    description: "Aparta obstacles pesats." },
  { id: "empathy",  level: 6,  icon: "✨", name: "Empatia",  description: "Obre opcions amistoses." },
  { id: "courage",  level: 8,  icon: "🔥", name: "Coratge",  description: "Redueix la por en moments crítics." },
  { id: "legend",   level: 10, icon: "👑", name: "Llegenda", description: "Desbloqueja el final secret." },
];

export const XP_PER_LEVEL = 500;
export const MAX_LEVEL = 10;

export function levelFromXp(xp: number): number {
  return Math.min(MAX_LEVEL, Math.max(1, Math.floor((xp ?? 0) / XP_PER_LEVEL) + 1));
}

export function xpToNextLevel(xp: number): { current: number; next: number; remaining: number } {
  const lvl = levelFromXp(xp);
  if (lvl >= MAX_LEVEL) return { current: xp, next: xp, remaining: 0 };
  const nextThreshold = lvl * XP_PER_LEVEL;
  return { current: xp, next: nextThreshold, remaining: nextThreshold - xp };
}

export async function getMySkills(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from("pet_skills").select("skill_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.skill_id));
}

/** Sync pet level + unlock any new skills based on current XP. Returns newly unlocked. */
export async function syncLevelAndSkills(userId: string): Promise<{
  level: number;
  newlyUnlocked: SkillDef[];
}> {
  const pet = await getMyPet(userId);
  if (!pet) return { level: 1, newlyUnlocked: [] };
  const xp = pet.xp ?? 0;
  const newLevel = levelFromXp(xp);
  if ((pet.level ?? 1) !== newLevel) {
    await supabase.from("player_pets").update({ level: newLevel }).eq("user_id", userId);
  }
  const owned = await getMySkills(userId);
  const newlyUnlocked: SkillDef[] = [];
  for (const s of SKILLS) {
    if (newLevel >= s.level && !owned.has(s.id)) {
      const { error } = await supabase.from("pet_skills").insert({ user_id: userId, skill_id: s.id });
      if (!error) newlyUnlocked.push(s);
    }
  }
  return { level: newLevel, newlyUnlocked };
}

// -------- WORLDS --------

export interface World {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  start_node_id: string;
  chapters: number[];
  display_order: number;
  unlock_rule: { bond?: number; recipes?: number; level?: number };
}

export interface WorldStatus extends World {
  unlocked: boolean;
  reason?: string;
  visits: number;
  endingsCompleted: string[];
}

import { getCurrentLang, translateWorlds, onLangChange } from "@/i18n/translate-data";

let _worldsCache: World[] | null = null;
let _worldsLang: string | null = null;

if (typeof window !== "undefined") {
  onLangChange(() => { _worldsCache = null; _worldsLang = null; });
}

export async function getAllWorlds(): Promise<World[]> {
  const lang = getCurrentLang();
  if (_worldsCache && _worldsLang === lang) return _worldsCache;
  const { data } = await supabase.from("story_worlds").select("*").order("display_order");
  const raw = ((data ?? []) as Record<string, unknown>[]).map((w) => ({
    ...w,
    chapters: w.chapters ?? [],
    unlock_rule: w.unlock_rule ?? {},
  })) as World[];
  _worldsCache = await translateWorlds(raw, lang);
  _worldsLang = lang;
  return _worldsCache;
}

export async function getWorldStatuses(userId: string, ctx: {
  bond: number;
  recipesDiscovered: number;
  level: number;
}): Promise<WorldStatus[]> {
  const [worlds, progressRes] = await Promise.all([
    getAllWorlds(),
    supabase.from("story_world_progress").select("*").eq("user_id", userId),
  ]);
  const progressMap = new Map((progressRes.data ?? []).map((p) => [p.world_id, p]));
  return worlds.map((w) => {
    const r = w.unlock_rule;
    let unlocked = true;
    let reason: string | undefined;
    if (r.bond && ctx.bond < r.bond) { unlocked = false; reason = `Vincle ≥ ${r.bond} (tens ${ctx.bond})`; }
    else if (r.recipes && ctx.recipesDiscovered < r.recipes) { unlocked = false; reason = `${r.recipes} receptes (tens ${ctx.recipesDiscovered})`; }
    else if (r.level && ctx.level < r.level) { unlocked = false; reason = `Nivell ≥ ${r.level} (tens ${ctx.level})`; }
    const p = progressMap.get(w.id);
    return {
      ...w,
      unlocked,
      reason,
      visits: p?.visits ?? 0,
      endingsCompleted: Array.isArray(p?.completed_endings) ? p.completed_endings : [],
    };
  });
}

export async function recordWorldVisit(userId: string, worldId: string) {
  const { data: existing } = await supabase
    .from("story_world_progress")
    .select("id, visits")
    .eq("user_id", userId)
    .eq("world_id", worldId)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("story_world_progress")
      .update({ visits: (existing.visits ?? 0) + 1, last_visited_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("story_world_progress").insert({ user_id: userId, world_id: worldId, visits: 1 });
  }
}

export async function recordEndingCompleted(userId: string, worldId: string, endingId: string) {
  const { data: existing } = await supabase
    .from("story_world_progress")
    .select("id, completed_endings")
    .eq("user_id", userId)
    .eq("world_id", worldId)
    .maybeSingle();
  const list: string[] = Array.isArray(existing?.completed_endings) ? (existing!.completed_endings as string[]) : [];
  if (list.includes(endingId)) return;
  list.push(endingId);
  if (existing) {
    await supabase.from("story_world_progress").update({ completed_endings: list }).eq("id", existing.id);
  } else {
    await supabase.from("story_world_progress").insert({ user_id: userId, world_id: worldId, completed_endings: list });
  }
}

// -------- NODE VISITS --------

export async function getNodeVisitMap(userId: string): Promise<Map<string, number>> {
  const { data } = await supabase.from("story_node_visits").select("node_id, count").eq("user_id", userId);
  return new Map((data ?? []).map((r) => [r.node_id, r.count]));
}

export async function incrementNodeVisit(userId: string, nodeId: string) {
  const { data: existing } = await supabase
    .from("story_node_visits")
    .select("id, count")
    .eq("user_id", userId)
    .eq("node_id", nodeId)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("story_node_visits")
      .update({ count: (existing.count ?? 0) + 1, last_visited_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("story_node_visits").insert({ user_id: userId, node_id: nodeId, count: 1 });
  }
}

// -------- DISCOVERY JOURNAL --------

export interface JournalSummary {
  itemsFound: { id: string; name: string; icon: string; obtained_at: string }[];
  recipesDiscovered: { id: string; name: string; icon: string }[];
  endingsSeen: { id: string; title: string }[];
  totals: { items: number; recipes: number; endings: number };
}

export async function getJournal(userId: string): Promise<JournalSummary> {
  const [invRes, recDiscRes, allRecRes, endingsSeenRes, allEndingsRes] = await Promise.all([
    supabase.from("story_inventory").select("item_id,item_name,item_icon,obtained_at").eq("user_id", userId),
    supabase.from("story_recipe_book").select("recipe_id").eq("user_id", userId),
    supabase.from("story_recipes").select("id,name,icon"),
    supabase.from("story_runs").select("ending_type,current_node_id").eq("user_id", userId).eq("status", "completed"),
    supabase.from("story_nodes").select("id,title,ending_type").eq("is_ending", true),
  ]);
  const recMap = new Map((allRecRes.data ?? []).map((r) => [r.id, r]));
  const recipesDiscovered = (recDiscRes.data ?? [])
    .map((r) => recMap.get(r.recipe_id))
    .filter(Boolean)
    .map((r) => ({ id: r.id, name: r.name, icon: r.icon }));
  const allEndings = (allEndingsRes.data ?? []) as Record<string, unknown>[];
  const seenIds = new Set((endingsSeenRes.data ?? []).map((r) => r.current_node_id).filter(Boolean));
  const endingsSeen = allEndings.filter((e) => seenIds.has(e.id)).map((e) => ({ id: e.id, title: e.title }));
  const itemsFound = ((invRes.data ?? []) as Record<string, unknown>[]).map((i) => ({
    id: i.item_id, name: i.item_name, icon: i.item_icon, obtained_at: i.obtained_at,
  }));
  return {
    itemsFound,
    recipesDiscovered,
    endingsSeen,
    totals: {
      items: 8, // approximate catalogue
      recipes: (allRecRes.data ?? []).length,
      endings: allEndings.filter((e) => e.ending_type !== "death").length,
    },
  };
}
