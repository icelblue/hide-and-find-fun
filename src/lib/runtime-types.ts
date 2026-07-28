// ============================================================
// runtime-types.ts — Formes de dades compartides entre client
// ============================================================
// Files de BD ampliades amb els camps que el client hi afegeix
// o llegeix en temps d'execució (joins, snapshots, resultats RPC).
// ============================================================
import type { Tables } from "@/integrations/supabase/types";

export type GameRow = Tables<"games"> & Record<string, any>;
export type PlayerRow = Tables<"game_players"> & Record<string, any>;
export type ScenarioRow = Tables<"scenarios"> & { themeHint?: string | null };
export type ObjectRow = Tables<"objects"> & Record<string, any>;
export type ItemRow = Tables<"items"> & Record<string, any>;
export type MoveRow = Tables<"game_moves"> & {
  scenarios?: { icon?: string | null; name?: string | null } | null;
  items?: { icon?: string | null; name?: string | null } | null;
};
export type RewardRow = Record<string, any> & {
  reward_items?: { name?: string; icon?: string; rarity?: string } | null;
};
