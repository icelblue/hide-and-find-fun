// ============================================================
// Economia de tokens i moviments del joc
import { supabase } from "@/integrations/supabase/client";
import type { Position } from "@/lib/game-types";
// ============================================================
// ============================================
// SEARCH PHASE
// ============================================

export const TOKEN_COSTS = { move: 0.5, look: 0.3 } as const;

export async function ensureTokensReset(player: { id: string; tokens_remaining: number; tokens_last_reset: string | null }) {
  const today = new Date().toISOString().split("T")[0];
  if (player.tokens_last_reset === today) return player.tokens_remaining;

  await supabase
    .from("game_players")
    .update({
      tokens_remaining: 5.0,
      tokens_last_reset: today,
      social_item_used_today: false,
    })
    .eq("id", player.id);

  return 4.0;
}

export async function redeemBonusTokens(gameId: string, userId: string, amount: number) {
  if (amount <= 0) throw new Error("Has de triar almenys 0.5 tokens!");
  const { data, error } = await supabase.rpc("redeem_bonus_tokens", {
    _game_id: gameId,
    _amount: amount,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function performMove(
  gameId: string,
  playerId: string,
  action: "move" | "look" | "confirm",
  targetScenarioId?: string,
  targetItemId?: string,
  targetPosition?: Position,
  isStory?: boolean,
) {
  const { data, error } = await supabase.rpc("execute_game_move", {
    _game_id: gameId,
    _action: action,
    _target_scenario_id: targetScenarioId ?? null,
    _target_item_id: targetItemId ?? null,
    _target_position: targetPosition ?? null,
    _is_story: isStory ?? false,
  });
  if (error) throw new Error(error.message);
  const result = data as Record<string, unknown>;
  return {
    move: { id: result.move_id },
    foundObject: result.found_object ?? false,
    foundBonus: result.found_bonus ?? null,
    bonusValue: result.bonus_value ?? null,
    bonusTokens: result.bonus_tokens ?? 0,
    cursed: result.cursed ?? false,
    tokensRemaining: result.tokens_remaining ?? 0,
    hintLevel: result.hint_level ?? null,
    toolFound: result.tool_found ?? null,
    trapHit: result.trap_hit ?? false,
    trapPenalty: result.trap_penalty ?? 0,
    barricade_hit: result.barricade_hit ?? false,
    barricade_extra_cost: result.barricade_extra_cost ?? 0,
  };
}

