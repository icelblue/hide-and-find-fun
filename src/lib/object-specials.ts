// 🔒 CRITICAL — object-specials.ts
// Construcció de special_data del trofeu i display de noms/icones.
// Tests: REG-006, REG-013. Pre-flight obligatori.
export interface TrophySpecialData {
  [key: string]: string | null;
  object_name: string | null;
  object_icon: string | null;
  custom_name: string | null;
  variant_value: string | null;
  variant_label: string | null;
  variant_icon: string | null;
  special_type: string | null;
  custom_message: string | null;
  effect: string | null;
}

export function getHideMessage(specialData: Record<string, unknown> | null | undefined): string | null {
  if (!specialData) return null;
  return specialData.hide_message || (specialData.type === "custom_message" ? specialData.message : null);
}

export function buildTrophySpecialData(args: {
  special: Record<string, unknown> | null;
  objectRecord: Record<string, unknown> | null;
  inputName?: string;
  variant?: Record<string, unknown> | null;
  hideMessage?: string | null;
}): TrophySpecialData {
  const { special, objectRecord, inputName, variant, hideMessage } = args;
  const effect = (special?.variants as Record<string, unknown> | null)?.effect ?? variant?.effect ?? null;

  return {
    object_name: objectRecord?.name ?? null,
    object_icon: objectRecord?.icon ?? null,
    custom_name: special?.special_type === "custom_name" ? inputName?.trim() || null : null,
    variant_value: special?.special_type === "choose_variant" ? variant?.value ?? null : null,
    variant_label: special?.special_type === "choose_variant" ? variant?.label ?? null : null,
    variant_icon: special?.special_type === "choose_variant" ? variant?.icon ?? null : null,
    special_type: special?.special_type ?? null,
    custom_message: hideMessage ?? null,
    effect,
  };
}

export function getTrophyDisplayName(specialData: Record<string, unknown> | null | undefined): string {
  // Player-defined custom object takes priority over everything else
  if (specialData?.is_custom && specialData?.custom_name) return `${specialData.custom_name}`;
  if (specialData?.custom_name) return `"${specialData.custom_name}"`;
  if (specialData?.variant_label) return `${specialData.variant_label}`;
  return specialData?.object_name ?? "Trofeu";
}

export function getTrophyDisplayIcon(specialData: Record<string, unknown> | null | undefined): string {
  if (specialData?.is_custom && specialData?.custom_icon) return specialData.custom_icon;
  return specialData?.variant_icon ?? specialData?.object_icon ?? "⭐";
}

export function getSpecialEffectDescriptor(special: Record<string, unknown> | null) {
  const variants = special?.variants as Record<string, unknown> | null;
  return {
    emoji: variants?.emoji ?? "😈",
    animation: variants?.animation ?? "shake",
    effect: variants?.effect ?? null,
  };
}