import { supabase } from "@/integrations/supabase/client";

export type HistoryPeriod = "7" | "30" | "all";
export interface ProfileMatch {
  game_id: string;
  game_code: string;
  opponent_id: string | null;
  opponent_name: string;
  result: "win" | "loss" | "draw";
  elo_before: number | null;
  elo_after: number | null;
  elo_change: number | null;
  finished_at: string;
  game_exists: boolean;
}
export interface ProfileMatchHistory {
  matches: ProfileMatch[];
  total: number;
  elo_gained: number;
  elo_lost: number;
  elo_net: number;
  recorded_matches: number;
  legacy_matches: number;
}
export const HISTORY_PAGE_SIZE = 20;
export function historySince(period: HistoryPeriod, now = new Date()) {
  return period === "all" ? null : new Date(now.getTime() - Number(period) * 86400000).toISOString();
}
export function signedElo(value: number | null) {
  return value == null ? "—" : value > 0 ? `+${value}` : String(value);
}
export async function getProfileMatchHistory(userId: string, period: HistoryPeriod, page: number) {
  const { data, error } = await supabase.rpc("get_player_match_history", {
    _user_id: userId,
    _since: historySince(period) ?? undefined,
    _limit: HISTORY_PAGE_SIZE,
    _offset: Math.max(0, page) * HISTORY_PAGE_SIZE,
  });
  if (error) throw error;
  if (!data) throw new Error("No s’ha pogut carregar l’historial.");
  return data as unknown as ProfileMatchHistory;
}