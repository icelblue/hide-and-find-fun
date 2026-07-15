// ============================================================
// runtime-types.ts — Formes de dades compartides entre client
// ============================================================
// Files de BD ampliades amb els camps que el client hi afegeix
// o llegeix en temps d'execució (joins, snapshots, resultats RPC).
// ============================================================
import type { Tables } from "@/integrations/supabase/types";

// NOTA: NO afegim `& Record<string, unknown>` ni `& { [k: string]: unknown }` — això
// contamina tots els accessos a propietats conegudes convertint-los a `unknown`.
// Els camps extra (joins, snapshots) es cast-egen puntualment on calgui.
export type GameRow = Tables<"games">;
export type PlayerRow = Tables<"game_players">;
export type ScenarioRow = Tables<"scenarios"> & { themeHint?: string | null };
export type ObjectRow = Tables<"objects">;
export type ItemRow = Tables<"items">;
export type MoveRow = Tables<"game_moves"> & {
  scenarios?: { icon?: string | null; name?: string | null } | null;
  items?: { icon?: string | null; name?: string | null } | null;
};
export type RewardRow = Record<string, unknown> & {
  reward_items?: { name?: string; icon?: string; rarity?: string } | null;
};
