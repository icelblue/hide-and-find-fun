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

export interface StoryNode {
  id: string;
  chapter: number;
  title: string;
  narrative: string;
  is_ending: boolean;
  ending_type: string | null;
}

export interface StoryChoice {
  id: string;
  node_id: string;
  choice_order: number;
  label: string;
  next_node_id: string | null;
  reward_type: string | null;
  reward_value: any;
}

export interface StoryRun {
  id: string;
  user_id: string;
  current_node_id: string | null;
  path: string[];
  status: "active" | "dead" | "completed";
  ending_type: string | null;
  started_at: string;
  ended_at: string | null;
}

const START_NODE_ID = "c1_start";

// ============================================
// NODE / CHOICE FETCH (cached per session)
// ============================================

let _nodesCache: Map<string, StoryNode> | null = null;
let _choicesCache: Map<string, StoryChoice[]> | null = null;

async function loadCatalog() {
  if (_nodesCache && _choicesCache) return;
  const [nodesRes, choicesRes] = await Promise.all([
    supabase.from("story_nodes").select("*"),
    supabase.from("story_choices").select("*").order("choice_order"),
  ]);
  if (nodesRes.error) throw nodesRes.error;
  if (choicesRes.error) throw choicesRes.error;
  _nodesCache = new Map((nodesRes.data ?? []).map((n: any) => [n.id, n]));
  _choicesCache = new Map();
  for (const c of (choicesRes.data ?? []) as any[]) {
    const arr = _choicesCache.get(c.node_id) ?? [];
    arr.push(c);
    _choicesCache.set(c.node_id, arr);
  }
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

export async function startRun(userId: string): Promise<StoryRun> {
  // Close any leftover active runs first
  await supabase
    .from("story_runs")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");

  const { data, error } = await supabase
    .from("story_runs")
    .insert({
      user_id: userId,
      current_node_id: START_NODE_ID,
      path: [START_NODE_ID],
      status: "active",
    })
    .select()
    .single();
  if (error) throw error;
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
  killed?: boolean;
}

const CONSUMABLE_ICONS: Record<string, string> = {
  Menjar: "🍖", Aigua: "💧", Vacuna: "💉",
};

async function applyReward(
  userId: string,
  rewardType: string | null,
  rewardValue: any,
): Promise<RewardOutcome> {
  if (!rewardType || !rewardValue) return {};
  const out: RewardOutcome = {};

  if (rewardType === "xp" && typeof rewardValue.xp === "number") {
    const r = await addPetXP(userId, rewardValue.xp);
    out.xp = rewardValue.xp;
    if (r?.isDead) out.killed = true;
  } else if (rewardType === "damage" && typeof rewardValue.damage === "number") {
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
): Promise<ChoiceResult> {
  const reward = await applyReward(userId, choice.reward_type, choice.reward_value);
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

  return { reward, nextNode, runEnded: endStatus };
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
  if (error && (error as any).code === "23505") {
    return { reward, alreadyDone: true };
  }
  if (error) throw error;
  return { reward };
}

// ============================================
// REWARD → RevealData (UI helper)
// ============================================

export function rewardToReveal(r: RewardOutcome): {
  kind: "xp" | "accessory" | "consumable" | "damage" | "nothing";
  label: string;
  emoji: string;
  tone: "good" | "bad" | "neutral";
} {
  if (r.killed) return { kind: "damage", label: "Final tràgic...", emoji: "💀", tone: "bad" };
  if (r.accessory) return { kind: "accessory", label: `${r.accessory.name}`, emoji: r.accessory.icon, tone: "good" };
  if (r.consumable) return { kind: "consumable", label: r.consumable.name, emoji: r.consumable.icon, tone: "good" };
  if (r.damage) return { kind: "damage", label: `-${r.damage} salut`, emoji: "💥", tone: "bad" };
  if (r.xp) return { kind: "xp", label: `+${r.xp} XP`, emoji: "⭐", tone: "good" };
  return { kind: "nothing", label: "Res aquesta vegada", emoji: "·", tone: "neutral" };
}

export { MAX_PET_XP };

