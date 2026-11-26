import { supabase } from "@/integrations/supabase/client";

// Catalog foreign keys were retired; resolve optional display metadata separately.
// Keep the history authoritative even when a catalog entry no longer exists.
export async function getMoveHistory(gameId: string, userId: string) {
  const { data, error } = await supabase.from("game_moves").select("*")
    .eq("game_id", gameId).eq("player_id", userId)
    .order("turn_number", { ascending: false });
  if (error) throw error;
  const moves = data ?? [];
  const scenarioIds = [...new Set(moves.flatMap(m => m.target_scenario_id ? [m.target_scenario_id] : []))];
  const itemIds = [...new Set(moves.flatMap(m => m.target_item_id ? [m.target_item_id] : []))];
  const [scenarios, items] = await Promise.all([
    scenarioIds.length ? supabase.from("scenarios").select("id, name, icon").in("id", scenarioIds) : Promise.resolve({ data: [] }),
    itemIds.length ? supabase.from("items").select("id, name, icon").in("id", itemIds) : Promise.resolve({ data: [] }),
  ]);
  const scenarioMap = new Map((scenarios.data ?? []).map(s => [s.id, s]));
  const itemMap = new Map((items.data ?? []).map(i => [i.id, i]));
  return { data: moves.map(m => ({
    ...m,
    scenarios: m.target_scenario_id ? scenarioMap.get(m.target_scenario_id) ?? null : null,
    items: m.target_item_id ? itemMap.get(m.target_item_id) ?? null : null,
  })) };
}