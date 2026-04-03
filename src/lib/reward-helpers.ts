// ============================================================
// reward-helpers.ts — Sistema de recompenses del joc
// ============================================================
// Gestiona el cicle de vida de les recompenses:
//   1. Obtenció: automàtica via trigger `handle_game_finished()`
//   2. Consulta: getMyRewards / getGameReward / getRewardCatalog
//   3. Venda: sellRewardItem → RPC sell_reward_item (bonus tokens)
//   4. Col·locació: placeRewardItem → RPC place_reward_item
//      (afegeix moble nou a l'escenari per a TOTS els jugadors)
//
// Rareses i drop rates:
//   ⚪ Comú (50%) → 1🪙 | 🟢 Poc comú (30%) → 2🪙
//   🔵 Rar (13%) → 3🪙 | 🟣 Èpic (5%) → 5🪙
//   🟡 Llegendari (2%) → 8🪙
// ============================================================

import { supabase } from "@/integrations/supabase/client";

/**
 * Configuració visual i econòmica per a cada nivell de raresa.
 * Usat a ProfilePage per mostrar badges i valors de venda.
 */
export const RARITY_CONFIG: Record<string, { label: string; emoji: string; sell: number }> = {
  common: { label: "Comú", emoji: "⚪", sell: 1 },
  uncommon: { label: "Poc comú", emoji: "🟢", sell: 2 },
  rare: { label: "Rar", emoji: "🔵", sell: 3 },
  epic: { label: "Èpic", emoji: "🟣", sell: 5 },
  legendary: { label: "Llegendari", emoji: "🟡", sell: 8 },
};

/** Obté totes les recompenses 'owned' d'un jugador (no venudes ni col·locades) */
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

/** Obté la recompensa d'una partida concreta (si existeix) */
export async function getGameReward(gameId: string, userId: string) {
  const { data } = await supabase
    .from("player_rewards")
    .select("*, reward_items(*)")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/**
 * Col·loca un moble-premi en un escenari.
 * Crida l'RPC `place_reward_item` que valida:
 *   - Ownership i status = 'owned'
 *   - El moble no estigui ja col·locat
 *   - L'escenari no superi max_items
 * Un cop col·locat, el moble és visible per TOTS els jugadors.
 */
export async function placeRewardItem(playerRewardId: string, scenarioId: string) {
  const { error } = await supabase.rpc("place_reward_item", {
    _player_reward_id: playerRewardId,
    _scenario_id: scenarioId,
  });
  if (error) throw error;
}

/**
 * Ven un moble-premi i obté tokens bonus.
 * Crida l'RPC `sell_reward_item` que:
 *   - Canvia status a 'sold'
 *   - Suma sell_value a profiles.bonus_tokens
 *   - Retorna la quantitat de tokens rebuts
 */
export async function sellRewardItem(playerRewardId: string): Promise<number> {
  const { data, error } = await supabase.rpc("sell_reward_item", {
    _player_reward_id: playerRewardId,
  });
  if (error) throw error;
  return data as number;
}

/** Catàleg complet de mobles-premi disponibles al joc */
export async function getRewardCatalog() {
  const { data, error } = await supabase
    .from("reward_items")
    .select("*")
    .order("rarity");
  if (error) throw error;
  return data ?? [];
}
