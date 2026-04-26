// ============================================================
// referral-helpers.ts — Sistema de referrals (convidar amics)
// ============================================================
// Gestiona:
//   - Lectura/escriptura de codi de referral des de localStorage
//   - Registrar un referral després del signup
//   - Consultar amics convidats i el seu estat
//   - Reclamar bonus de recordatori
// ============================================================

import { supabase } from "@/integrations/supabase/client";

const REFERRAL_STORAGE_KEY = "dd_pending_referral_code";

/** Guarda un codi de referral pendent (després s'aplica al signup) */
export function savePendingReferralCode(code: string) {
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, code.toUpperCase().trim());
  } catch {}
}

/** Llegeix el codi pendent (si n'hi ha) */
export function getPendingReferralCode(): string | null {
  try {
    return localStorage.getItem(REFERRAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Esborra el codi pendent */
export function clearPendingReferralCode() {
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {}
}

/**
 * Aplica el codi de referral pendent al perfil de l'usuari.
 * Crida l'RPC `register_referral` que valida i crea la fila.
 * Es crida just després del primer login si hi ha codi pendent.
 */
export async function applyPendingReferral(): Promise<{ ok: boolean; error?: string }> {
  const code = getPendingReferralCode();
  if (!code) return { ok: false, error: "no_code" };

  const { data, error } = await supabase.rpc("register_referral", { _referral_code: code });
  if (error) return { ok: false, error: error.message };

  const result = data as { success?: boolean; error?: string };
  if (result?.success) {
    clearPendingReferralCode();
    return { ok: true };
  }
  // Si l'error és recuperable (ja referenciat), netegem el codi igualment
  if (result?.error === "already_referred" || result?.error === "self_referral") {
    clearPendingReferralCode();
  }
  return { ok: false, error: result?.error || "unknown" };
}

/** Obté el codi de referral del perfil i l'URL completa per compartir */
export async function getMyReferralLink(userId: string): Promise<{ code: string; url: string } | null> {
  const { data } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.referral_code) return null;
  const url = `${window.location.origin}/?ref=${data.referral_code}`;
  return { code: data.referral_code, url };
}

/** Obté la llista d'amics convidats per l'usuari amb el seu estat */
export async function getMyReferrals(userId: string) {
  const { data, error } = await supabase
    .from("referrals")
    .select("id, referred_user_id, status, signup_reward_given, first_game_reward_given, active_reward_given, created_at")
    .eq("referrer_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  // Carregar noms dels convidats
  const ids = (data ?? []).map((r) => r.referred_user_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", ids);
  const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));

  return (data ?? []).map((r) => ({
    ...r,
    display_name: nameMap.get(r.referred_user_id) ?? "Jugador",
  }));
}

/** Reclama el bonus d'un recordatori via token */
export async function claimReminderBonus(claimToken: string) {
  const { data, error } = await supabase.rpc("claim_reminder_bonus", { _claim_token: claimToken });
  if (error) throw error;
  return data as { success?: boolean; error?: string; tokens?: number; reward_rarity?: string };
}
