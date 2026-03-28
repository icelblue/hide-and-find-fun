import { supabase } from "@/integrations/supabase/client";

export const RARITY_CONFIG: Record<string, { label: string; emoji: string; sell: number }> = {
  common: { label: "Comú", emoji: "⚪", sell: 1 },
  uncommon: { label: "Poc comú", emoji: "🟢", sell: 2 },
  rare: { label: "Rar", emoji: "🔵", sell: 3 },
  epic: { label: "Èpic", emoji: "🟣", sell: 5 },
  legendary: { label: "Llegendari", emoji: "🟡", sell: 8 },
};

export async function getMyRewards(userId: string) {
  const { data, error } = await supabase
    .from("player_rewards")
    .select("*, reward_items(*)")
    .eq("user_id", userId)
    .eq("status", "owned")
    .order("obtained_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getGameReward(gameId: string, userId: string) {
  const { data } = await supabase
    .from("player_rewards")
    .select("*, reward_items(*)")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function placeRewardItem(playerRewardId: string, scenarioId: string) {
  const { error } = await supabase.rpc("place_reward_item", {
    _player_reward_id: playerRewardId,
    _scenario_id: scenarioId,
  });
  if (error) throw error;
}

export async function sellRewardItem(playerRewardId: string): Promise<number> {
  const { data, error } = await supabase.rpc("sell_reward_item", {
    _player_reward_id: playerRewardId,
  });
  if (error) throw error;
  return data as number;
}

export async function getRewardCatalog() {
  const { data, error } = await supabase
    .from("reward_items")
    .select("*")
    .order("rarity");
  if (error) throw error;
  return data ?? [];
}
