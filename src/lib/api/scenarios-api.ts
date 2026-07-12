// ============================================================
// Escenaris i ítems: lectures de catàleg
import { supabase } from "@/integrations/supabase/client";
// ============================================================
// DATA FETCHING
// ============================================

export function generateGameCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function getScenarios() {
  const { data, error } = await supabase.from("scenarios").select("*").order("display_order");
  if (error) throw error;
  return translateRows(data ?? [], "pvp_scenario_name", "id", "name");
}

export async function getItemsByScenario(scenarioId: string) {
  const { data, error } = await supabase.from("items").select("*").eq("scenario_id", scenarioId).order("display_order");
  if (error) throw error;
  return translateRows(data ?? [], "pvp_item_name", "id", "name");
}

export async function getItemInteractions(itemIds: string[]) {
  if (itemIds.length === 0) return [];
  const { data, error } = await supabase
    .from("item_interactions")
    .select("*")
    .in("item_id", itemIds)
    .order("display_order");
  if (error) throw error;
  return translateRows(data ?? [], "pvp_item_interaction_label", "id", "action_label");
}

// ============================================
