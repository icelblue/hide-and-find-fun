// ============================================================
// garden-helpers.ts — Jardí: plantar llavors i collir
// ============================================================
// Les sales de categoria 'garden' o 'balcony' permeten plantar
// fins a 4 llavors en caselles buides. El creixement es valida
// AL SERVIDOR (RPC harvest_plant); aquí només hi ha la lectura
// i la lògica pura de fases visuals.
//
// Fases visuals (client): 🌱 llavor → 🌿 creixent → icona madura
// ============================================================
import { supabase } from "@/integrations/supabase/client";

export const GARDEN_CATEGORIES = ["garden", "balcony"] as const;
export const MAX_PLOTS_PER_ROOM = 4;

export interface GardenCatalogItem {
  id: string;
  icon: string;
  seed_icon: string;
  name_key: string;
  growth_minutes: number;
  yield_coins: number;
}

export interface GardenPlant {
  id: string;
  room_id: string;
  slot: number;
  plant_type: string;
  planted_at: string;
}

export type GrowthStage = "seed" | "growing" | "ready";

/** Lògica pura: fase de creixement segons temps transcorregut. */
export function growthStage(plantedAt: string | Date, growthMinutes: number, now: Date = new Date()): GrowthStage {
  const planted = typeof plantedAt === "string" ? new Date(plantedAt) : plantedAt;
  const elapsedMin = (now.getTime() - planted.getTime()) / 60000;
  if (elapsedMin >= growthMinutes) return "ready";
  if (elapsedMin >= growthMinutes / 2) return "growing";
  return "seed";
}

/** Lògica pura: minuts restants fins a poder collir (0 si ja es pot). */
export function minutesUntilReady(plantedAt: string | Date, growthMinutes: number, now: Date = new Date()): number {
  const planted = typeof plantedAt === "string" ? new Date(plantedAt) : plantedAt;
  const remaining = growthMinutes - (now.getTime() - planted.getTime()) / 60000;
  return Math.max(0, Math.ceil(remaining));
}

/** Lògica pura: icona a mostrar segons la fase. */
export function iconForStage(stage: GrowthStage, catalogItem: Pick<GardenCatalogItem, "icon" | "seed_icon">): string {
  if (stage === "ready") return catalogItem.icon;
  if (stage === "growing") return "🌿";
  return catalogItem.seed_icon || "🌱";
}

/** Format curt de temps restant: "3h 20m" / "45m". */
export function formatRemaining(minutes: number): string {
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ---------- Accés a dades ----------

export async function getGardenCatalog(): Promise<GardenCatalogItem[]> {
  const { data, error } = await supabase
    .from("garden_catalog" as never)
    .select("*")
    .order("growth_minutes", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as GardenCatalogItem[];
}

export async function getPlantsForRoom(roomId: string): Promise<GardenPlant[]> {
  const { data, error } = await supabase
    .from("garden_plants" as never)
    .select("*")
    .eq("room_id", roomId);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as GardenPlant[];
}

export async function plantSeed(roomId: string, slot: number, plantType: string) {
  const { data, error } = await supabase.rpc("plant_seed" as never, {
    _room_id: roomId,
    _slot: slot,
    _plant_type: plantType,
  } as never);
  if (error) throw new Error(error.message);
  return data as { plant_id: string };
}

export async function harvestPlant(plantId: string) {
  const { data, error } = await supabase.rpc("harvest_plant" as never, {
    _plant_id: plantId,
  } as never);
  if (error) throw new Error(error.message);
  return data as { yield: number; icon: string };
}

export async function petThePet() {
  const { data, error } = await supabase.rpc("pet_the_pet" as never);
  if (error) throw new Error(error.message);
  return data as { bond: number; petted: boolean; next_at?: string };
}
