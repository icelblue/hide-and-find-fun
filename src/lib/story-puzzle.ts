// ============================================================
// story-puzzle.ts — Mini-puzzles del Mode Història (Bloc C)
// ============================================================
// 🔒 INDEPENDENT del PvP. Puzzle d'ordre d'ingredients.
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import { addInventoryItem, applyStateDelta } from "./story-state";
import { addPetXP } from "./story-helpers";

export interface IngredientOrderPuzzle {
  type: "ingredient_order";
  slots: number;
  valid_items: string[];
  correct_order: string[];
  reward_item: { item_id: string; item_name: string; item_icon: string };
  reward_xp: number;
  /** i18n key for fail hint after 2nd attempt */
  hint_key?: string;
}

export type StoryPuzzle = IngredientOrderPuzzle;

export const MAX_PUZZLE_ATTEMPTS = 3;
/** Penalty when skipping: fear +20, bond -10 (≈ "perdre una vida"). */
export const SKIP_PENALTY = { fear: 20, bond: -10 };

export interface PuzzleAttemptRow {
  run_id: string;
  node_id: string;
  attempts: number;
  solved_at: string | null;
  skipped_at: string | null;
}

export function parsePuzzle(raw: unknown): StoryPuzzle | null {
  if (!raw || typeof raw !== "object") return null;
  if (raw.type !== "ingredient_order") return null;
  if (!Array.isArray(raw.valid_items) || !Array.isArray(raw.correct_order)) return null;
  if (raw.correct_order.length === 0) return null;
  return {
    type: "ingredient_order",
    slots: raw.slots ?? raw.correct_order.length,
    valid_items: raw.valid_items as string[],
    correct_order: raw.correct_order as string[],
    reward_item: raw.reward_item ?? { item_id: "puzzle_reward", item_name: "Recompensa", item_icon: "🎁" },
    reward_xp: typeof raw.reward_xp === "number" ? raw.reward_xp : 50,
    hint_key: raw.hint_key ?? raw.fail_message_key,
  };
}

/** Pure: true iff `submission` matches `correct_order` exactly (item ids, order). */
export function checkOrder(submission: string[], correct: string[]): boolean {
  if (submission.length !== correct.length) return false;
  for (let i = 0; i < correct.length; i++) {
    if (submission[i] !== correct[i]) return false;
  }
  return true;
}

export async function getAttempt(runId: string, nodeId: string): Promise<PuzzleAttemptRow | null> {
  const { data } = await supabase
    .from("story_puzzle_attempts")
    .select("run_id,node_id,attempts,solved_at,skipped_at")
    .eq("run_id", runId)
    .eq("node_id", nodeId)
    .maybeSingle();
  return (data as PuzzleAttemptRow | null) ?? null;
}

async function upsertAttempt(
  userId: string,
  runId: string,
  nodeId: string,
  patch: Partial<PuzzleAttemptRow>,
): Promise<PuzzleAttemptRow> {
  const existing = await getAttempt(runId, nodeId);
  if (existing) {
    const next = { ...existing, ...patch };
    await supabase.from("story_puzzle_attempts")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("run_id", runId).eq("node_id", nodeId);
    return next;
  }
  const insert = {
    user_id: userId,
    run_id: runId,
    node_id: nodeId,
    attempts: patch.attempts ?? 0,
    solved_at: patch.solved_at ?? null,
    skipped_at: patch.skipped_at ?? null,
  };
  await supabase.from("story_puzzle_attempts").insert(insert);
  return insert as PuzzleAttemptRow;
}

export interface SubmitResult {
  solved: boolean;
  attempts: number;
  exhausted: boolean;
  reward?: { item: { id: string; name: string; icon: string }; xp: number };
}

export async function submitPuzzleOrder(
  userId: string,
  runId: string,
  nodeId: string,
  puzzle: IngredientOrderPuzzle,
  submission: string[],
): Promise<SubmitResult> {
  const prior = await getAttempt(runId, nodeId);
  if (prior?.solved_at) {
    return { solved: true, attempts: prior.attempts, exhausted: false };
  }
  const attempts = (prior?.attempts ?? 0) + 1;
  const ok = checkOrder(submission, puzzle.correct_order);

  if (ok) {
    await upsertAttempt(userId, runId, nodeId, { attempts, solved_at: new Date().toISOString() });
    // Grant reward
    await addInventoryItem(userId, puzzle.reward_item);
    if (puzzle.reward_xp > 0) {
      await addPetXP(userId, puzzle.reward_xp);
    }
    return {
      solved: true,
      attempts,
      exhausted: false,
      reward: {
        item: { id: puzzle.reward_item.item_id, name: puzzle.reward_item.item_name, icon: puzzle.reward_item.item_icon },
        xp: puzzle.reward_xp,
      },
    };
  }

  const exhausted = attempts >= MAX_PUZZLE_ATTEMPTS;
  await upsertAttempt(userId, runId, nodeId, { attempts });
  return { solved: false, attempts, exhausted };
}

export async function skipPuzzle(
  userId: string,
  runId: string,
  nodeId: string,
): Promise<void> {
  await upsertAttempt(userId, runId, nodeId, { skipped_at: new Date().toISOString() });
  await applyStateDelta(userId, SKIP_PENALTY);
}
