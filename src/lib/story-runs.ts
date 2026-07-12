// ============================================================
// story-runs.ts — Sistema d'aventura ramificada (Mode Història v3)
// ============================================================
// 🔒 CRITICAL: Aquest fitxer és INDEPENDENT del PvP.
// Cap funció d'aquí ha de ser cridada per components de partida real.
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import {
  addPetXP, healPetXP, getMyPet, awardAccessory,
  resetPetAndProgress, MAX_PET_XP,
} from "./story-helpers";
import {
  applyStateDelta, addInventoryItem, discoverRecipe, type PetState,
} from "./story-state";

export interface StoryNode {
  id: string;
  chapter: number;
  title: string;
  narrative: string;
  is_ending: boolean;
  ending_type: string | null;
  puzzle_type?: string | null;
  puzzle_data?: any;
}

export interface StoryChoice {
  id: string;
  node_id: string;
  choice_order: number;
  label: string;
  next_node_id: string | null;
  reward_type: string | null;
  reward_value: any;
  state_delta?: Partial<PetState> | null;
  requires_items?: string[] | null;
  requires_bond?: number | null;
  requires_skill?: string | null;
  min_visits?: number | null;
  max_visits?: number | null;
  requires_traits?: Record<string, number> | null;
  trait_reward_multiplier?: Record<string, number> | null;
}

export interface StoryRun {
  id: string;
  user_id: string;
  current_node_id: string | null;
  path: string[];
  status: "active" | "dead" | "completed";
  ending_type: string | null;
  starting_world: string | null;
  started_at: string;
  ended_at: string | null;
}

const DEFAULT_START_NODE_ID = "c1_start";

// ============================================
// NODE / CHOICE FETCH (cached per session, per lang)
// ============================================

import { getCurrentLang, translateNodes, translateChoices, onLangChange } from "@/i18n/translate-data";

let _nodesCache: Map<string, StoryNode> | null = null;
let _choicesCache: Map<string, StoryChoice[]> | null = null;
let _cacheLang: string | null = null;

if (typeof window !== "undefined") {
  onLangChange(() => { _nodesCache = null; _choicesCache = null; _cacheLang = null; });
}

async function loadCatalog() {
  const lang = getCurrentLang();
  if (_nodesCache && _choicesCache && _cacheLang === lang) return;
  const [nodesRes, choicesRes] = await Promise.all([
    supabase.from("story_nodes").select("*"),
    supabase.from("story_choices").select("*").order("choice_order"),
  ]);
  if (nodesRes.error) throw nodesRes.error;
  if (choicesRes.error) throw choicesRes.error;
  const nodes = await translateNodes((nodesRes.data ?? []) as StoryNode[], lang);
  const choices = await translateChoices((choicesRes.data ?? []) as StoryChoice[], lang);
  _nodesCache = new Map(nodes.map((n) => [n.id, n]));
  _choicesCache = new Map();
  for (const c of choices) {
    const arr = _choicesCache.get(c.node_id) ?? [];
    arr.push(c);
    _choicesCache.set(c.node_id, arr);
  }
  _cacheLang = lang;
}

export async function getNode(id: string): Promise<StoryNode | null> {
  await loadCatalog();
  return _nodesCache!.get(id) ?? null;
}

export async function getChoices(nodeId: string): Promise<StoryChoice[]> {
  await loadCatalog();
  return _choicesCache!.get(nodeId) ?? [];
}

// ============================================
// RUN LIFECYCLE
// ============================================

export async function getActiveRun(userId: string): Promise<StoryRun | null> {
  const { data } = await supabase
    .from("story_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as StoryRun | null;
}

export async function startRun(userId: string, startNodeId?: string, worldId?: string): Promise<StoryRun> {
  // Close any leftover active runs first
  await supabase
    .from("story_runs")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");

  const startId = startNodeId ?? DEFAULT_START_NODE_ID;
  const { data, error } = await supabase
    .from("story_runs")
    .insert({
      user_id: userId,
      current_node_id: startId,
      path: [startId],
      status: "active",
      starting_world: worldId ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  // Increment node visit + world visit
  try {
    const { incrementNodeVisit, recordWorldVisit } = await import("./story-progression");
    await incrementNodeVisit(userId, startId);
    if (worldId) await recordWorldVisit(userId, worldId);
  } catch { /* non-blocking */ }

  return data as StoryRun;
}

// ============================================
// REWARD APPLICATION
// ============================================

export interface RewardOutcome {
  xp?: number;
  damage?: number;
  accessory?: { name: string; icon: string };
  consumable?: { name: string; icon: string };
  item?: { id: string; name: string; icon: string };
  recipe?: { id: string; name: string; icon: string };
  killed?: boolean;
  stateChanged?: Partial<PetState>;
  newState?: PetState;
}

const CONSUMABLE_ICONS: Record<string, string> = {
  Menjar: "🍖", Aigua: "💧", Vacuna: "💉",
};

async function applyReward(
  userId: string,
  rewardType: string | null,
  rewardValue: any,
  xpMultiplier: number = 1,
): Promise<RewardOutcome> {
  if (!rewardType || !rewardValue) return {};
  const out: RewardOutcome = {};

  if (rewardType === "xp" && typeof rewardValue.xp === "number") {
    const xp = Math.round(rewardValue.xp * xpMultiplier);
    const r = await addPetXP(userId, xp);
    out.xp = xp;
    if (r?.isDead) out.killed = true;
  } else if (rewardType === "damage" && typeof rewardValue.damage === "number") {
    // Mai amplifiquem el dany per personalitat (només upside)
    const r = await addPetXP(userId, rewardValue.damage);
    out.damage = rewardValue.damage;
    if (r?.isDead) out.killed = true;
  } else if (rewardType === "accessory" && rewardValue.accessory) {
    const icon = rewardValue.icon ?? "🎁";
    await awardAccessory(userId, rewardValue.accessory, icon);
    out.accessory = { name: rewardValue.accessory, icon };
  } else if (rewardType === "consumable" && rewardValue.consumable) {
    const icon = CONSUMABLE_ICONS[rewardValue.consumable] ?? "💊";
    await supabase.from("pet_consumables").insert({
      user_id: userId,
      consumable_name: rewardValue.consumable,
      consumable_icon: icon,
    });
    out.consumable = { name: rewardValue.consumable, icon };
  } else if (rewardType === "item" && rewardValue.item_id) {
    const icon = rewardValue.icon ?? "🎁";
    const name = rewardValue.name ?? rewardValue.item_id;
    const added = await addInventoryItem(userId, { item_id: rewardValue.item_id, item_name: name, item_icon: icon });
    if (added) out.item = { id: rewardValue.item_id, name, icon };
  } else if (rewardType === "recipe" && rewardValue.recipe_id) {
    const discovered = await discoverRecipe(userId, rewardValue.recipe_id);
    if (discovered) {
      out.recipe = {
        id: rewardValue.recipe_id,
        name: rewardValue.name ?? "Recepta",
        icon: rewardValue.icon ?? "📜",
      };
    }
  }
  return out;
}

// ============================================
// MAKE A CHOICE → advance node + apply reward
// ============================================

export interface ChoiceResult {
  reward: RewardOutcome;
  nextNode: StoryNode | null;
  runEnded: "dead" | "completed" | null;
}

export async function makeChoice(
  userId: string,
  run: StoryRun,
  choice: StoryChoice,
  personality?: import("./pet-personality").Personality,
): Promise<ChoiceResult & { traitBonus?: { trait: string; multiplier: number } }> {
  // Compute trait-based XP multiplier
  let xpMultiplier = 1;
  let traitBonus: { trait: string; multiplier: number } | undefined;
  if (personality && choice.trait_reward_multiplier) {
    const { getRewardTraitBonus } = await import("./pet-personality");
    const bonus = getRewardTraitBonus(personality, choice.trait_reward_multiplier);
    xpMultiplier = bonus.multiplier;
    if (bonus.trait && bonus.multiplier > 1) {
      traitBonus = { trait: bonus.trait, multiplier: bonus.multiplier };
    }
  }
  const reward = await applyReward(userId, choice.reward_type, choice.reward_value, xpMultiplier);

  // Apply state delta (silent — revealed via animated bars)
  if (choice.state_delta && typeof choice.state_delta === "object") {
    const newState = await applyStateDelta(userId, choice.state_delta);
    reward.stateChanged = choice.state_delta;
    reward.newState = newState;
    // Big fear penalty
    if (newState.fear >= 95) {
      const r = await addPetXP(userId, 50);
      if (r?.isDead) {
        reward.killed = true;
        reward.damage = (reward.damage ?? 0) + 50;
      }
    }
  }

  const nextNode = choice.next_node_id ? await getNode(choice.next_node_id) : null;

  // Determine end status
  let endStatus: "dead" | "completed" | null = null;
  if (reward.killed) endStatus = "dead";
  else if (nextNode?.is_ending) endStatus = nextNode.ending_type === "death" ? "dead" : "completed";

  const newPath = [...(run.path ?? []), ...(nextNode ? [nextNode.id] : [])];

  const update: any = { current_node_id: nextNode?.id ?? run.current_node_id, path: newPath };
  if (endStatus) {
    update.status = endStatus;
    update.ending_type = endStatus === "dead" ? "death" : nextNode?.ending_type ?? null;
    update.ended_at = new Date().toISOString();
  }
  await supabase.from("story_runs").update(update).eq("id", run.id);

  // v5: track visits + endings + sync level/skills
  try {
    const prog = await import("./story-progression");
    if (nextNode) await prog.incrementNodeVisit(userId, nextNode.id);
    if (endStatus === "completed" && nextNode && run.starting_world) {
      await prog.recordEndingCompleted(userId, run.starting_world, nextNode.id);
    }
    if (reward.xp) await prog.syncLevelAndSkills(userId);
  } catch { /* non-blocking */ }

  return { reward, nextNode, runEnded: endStatus, traitBonus };
}

// ============================================
// DEATH → reset everything (Reset total)
// ============================================

export async function killAndReset(userId: string) {
  // Mark any active runs as dead first
  await supabase
    .from("story_runs")
    .update({ status: "dead", ended_at: new Date().toISOString(), ending_type: "death" })
    .eq("user_id", userId)
    .eq("status", "active");
  // Then full reset (pet, accessories, consumables, events, story_progress)
  await resetPetAndProgress(userId);
  // And drop runs history
  await supabase.from("story_runs").delete().eq("user_id", userId);
}

// ============================================
// DAILY CHALLENGE
// ============================================

export interface DailyChallengeState {
  node: StoryNode | null;
  choices: StoryChoice[];
  alreadyDone: boolean;
  lastReward: { reward_type: string | null; reward_value: any } | null;
  completedAt: string | null;
}

function todayISO(): string {
  // Local date YYYY-MM-DD (matches user's day)
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dailyNodeIdForToday(date: Date = new Date()): string {
  const dow = date.getDay(); // 0..6
  return `daily_dow_${dow}`;
}

export async function getTodayChallenge(userId: string): Promise<DailyChallengeState> {
  const nodeId = dailyNodeIdForToday();
  const today = todayISO();
  const [node, choices, logRes] = await Promise.all([
    getNode(nodeId),
    getChoices(nodeId),
    supabase
      .from("daily_challenge_log")
      .select("reward_type, reward_value, completed_at")
      .eq("user_id", userId)
      .eq("challenge_date", today)
      .maybeSingle(),
  ]);
  return {
    node,
    choices,
    alreadyDone: !!logRes.data,
    lastReward: logRes.data ? { reward_type: logRes.data.reward_type, reward_value: logRes.data.reward_value } : null,
    completedAt: logRes.data?.completed_at ?? null,
  };
}

export async function submitDailyChoice(
  userId: string,
  choice: StoryChoice,
): Promise<{ reward: RewardOutcome; alreadyDone?: boolean }> {
  const today = todayISO();
  // Apply reward first
  const reward = await applyReward(userId, choice.reward_type, choice.reward_value);
  // Insert log (unique constraint prevents double-claim)
  const { error } = await supabase.from("daily_challenge_log").insert({
    user_id: userId,
    challenge_date: today,
    node_id: choice.node_id,
    choice_id: choice.id,
    reward_type: choice.reward_type,
    reward_value: choice.reward_value,
  });
  if (error && error.code === "23505") {
    return { reward, alreadyDone: true };
  }
  if (error) throw error;
  return { reward };
}

// ============================================
// REWARD → RevealData (UI helper)
// ============================================

type TFn = (key: string, vars?: Record<string, string | number>, fallback?: string) => string;

export function rewardToReveal(r: RewardOutcome, t?: TFn): {
  kind: "xp" | "accessory" | "consumable" | "item" | "recipe" | "damage" | "nothing";
  label: string;
  emoji: string;
  tone: "good" | "bad" | "neutral";
} {
  const tr: TFn = t ?? ((_k, _v, fb) => fb ?? _k);
  if (r.killed) return { kind: "damage", label: tr("reveal.tragicEnd", undefined, "Final tràgic..."), emoji: "💀", tone: "bad" };
  if (r.accessory) return { kind: "accessory", label: r.accessory.name, emoji: r.accessory.icon, tone: "good" };
  if (r.consumable) return { kind: "consumable", label: r.consumable.name, emoji: r.consumable.icon, tone: "good" };
  if (r.item) return { kind: "item", label: tr("reveal.foundItem", { name: r.item.name }, `Has trobat ${r.item.name}!`), emoji: r.item.icon, tone: "good" };
  if (r.recipe) return { kind: "recipe", label: tr("reveal.recipe", { name: r.recipe.name }, `Recepta: ${r.recipe.name}`), emoji: "📜", tone: "good" };
  if (r.damage) return { kind: "damage", label: tr("reveal.damage", { n: r.damage }, `-${r.damage} salut`), emoji: "💥", tone: "bad" };
  if (r.xp) return { kind: "xp", label: tr("reveal.xp", { n: r.xp }, `+${r.xp} XP`), emoji: "⭐", tone: "good" };
  return { kind: "nothing", label: tr("reveal.nothing", undefined, "Res aquesta vegada"), emoji: "·", tone: "neutral" };
}


export { MAX_PET_XP };

