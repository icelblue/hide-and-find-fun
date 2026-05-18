// ============================================================
// pet-social.ts — Helpers de visites i relacions entre mascotes (v6)
// ============================================================
// 🔒 CRITICAL: depèn de RPCs send_pet_visit, resolve_my_pet_visits,
// gift_inventory_item i taules pet_visits / pet_relationships.
// ============================================================

import { supabase } from "@/integrations/supabase/client";

export type VisitOutcome = "friends" | "neutral" | "enemies";
export type VisitRole = "host" | "visitor";

export interface ResolvedVisit {
  id: string;
  role: VisitRole;
  other_user_id: string;
  other_pet_name: string;
  other_pet_icon: string;
  outcome: VisitOutcome;
  resolved_at: string;
}

export interface RecentVisit extends ResolvedVisit {
  started_at: string;
}

/**
 * Resol totes les visites pendents per a l'usuari actual,
 * retorna les noves resoltes encara no vistes (i les marca com vistes).
 */
export async function resolveAndFetchPendingVisits(userId: string): Promise<ResolvedVisit[]> {
  try {
    await supabase.rpc("resolve_my_pet_visits" as any);
  } catch {
    // si la RPC no existeix encara o falla, no propaguem
  }

  // Visites resoltes i no vistes per a aquest usuari
  const { data: visits, error } = await supabase
    .from("pet_visits" as any)
    .select("*")
    .not("resolved_at", "is", null)
    .or(
      `and(host_user_id.eq.${userId},seen_by_host.eq.false),and(visitor_user_id.eq.${userId},seen_by_visitor.eq.false)`
    )
    .order("resolved_at", { ascending: false })
    .limit(20);

  if (error || !visits || visits.length === 0) return [];

  const otherIds = Array.from(new Set(
    (visits as any[]).map((v) => v.host_user_id === userId ? v.visitor_user_id : v.host_user_id)
  ));
  const { data: pets } = await supabase
    .from("player_pets")
    .select("user_id, pet_name, pet_icon")
    .in("user_id", otherIds);
  const petMap = new Map((pets ?? []).map((p) => [p.user_id, p]));

  const result: ResolvedVisit[] = (visits as any[]).map((v) => {
    const isHost = v.host_user_id === userId;
    const otherId = isHost ? v.visitor_user_id : v.host_user_id;
    const otherPet = petMap.get(otherId);
    return {
      id: v.id,
      role: isHost ? "host" : "visitor",
      other_user_id: otherId,
      other_pet_name: otherPet?.pet_name ?? "una mascota",
      other_pet_icon: otherPet?.pet_icon ?? "🐾",
      outcome: (v.outcome ?? "neutral") as VisitOutcome,
      resolved_at: v.resolved_at,
    };
  });

  // Marca com vistes (sense bloquejar)
  const hostIds = (visits as any[]).filter((v) => v.host_user_id === userId).map((v) => v.id);
  const visitorIds = (visits as any[]).filter((v) => v.visitor_user_id === userId).map((v) => v.id);
  if (hostIds.length > 0) {
    await supabase.from("pet_visits" as any).update({ seen_by_host: true }).in("id", hostIds);
  }
  if (visitorIds.length > 0) {
    await supabase.from("pet_visits" as any).update({ seen_by_visitor: true }).in("id", visitorIds);
  }
  return result;
}

/**
 * Llista de visites recents (ja resoltes) per mostrar al perfil propi.
 */
export async function getRecentVisits(userId: string, limit = 8): Promise<RecentVisit[]> {
  const { data: visits } = await supabase
    .from("pet_visits" as any)
    .select("*")
    .not("resolved_at", "is", null)
    .or(`host_user_id.eq.${userId},visitor_user_id.eq.${userId}`)
    .order("resolved_at", { ascending: false })
    .limit(limit);
  if (!visits || visits.length === 0) return [];

  const otherIds = Array.from(new Set(
    (visits as any[]).map((v) => v.host_user_id === userId ? v.visitor_user_id : v.host_user_id)
  ));
  const { data: pets } = await supabase
    .from("player_pets")
    .select("user_id, pet_name, pet_icon")
    .in("user_id", otherIds);
  const petMap = new Map((pets ?? []).map((p) => [p.user_id, p]));

  return (visits as any[]).map((v) => {
    const isHost = v.host_user_id === userId;
    const otherId = isHost ? v.visitor_user_id : v.host_user_id;
    const otherPet = petMap.get(otherId);
    return {
      id: v.id,
      role: isHost ? "host" : "visitor",
      other_user_id: otherId,
      other_pet_name: otherPet?.pet_name ?? "una mascota",
      other_pet_icon: otherPet?.pet_icon ?? "🐾",
      outcome: (v.outcome ?? "neutral") as VisitOutcome,
      resolved_at: v.resolved_at,
      started_at: v.started_at,
    };
  });
}

export function outcomeLabel(o: VisitOutcome): { icon: string; text: string; color: string } {
  if (o === "friends") return { icon: "🤝", text: "amistat", color: "text-green-500" };
  if (o === "enemies") return { icon: "💢", text: "baralla", color: "text-destructive" };
  return { icon: "😐", text: "neutral", color: "text-muted-foreground" };
}
