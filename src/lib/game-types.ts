// ============================================================
// game-types.ts — Tipus i constants centralitzades del joc
// ============================================================

// ============================================
// TOOL SYSTEM
// ============================================

export type ToolType = "drap" | "tornavis" | "martell" | "llanterna" | "galleda" | "drap_mullat";

export type PlayerTools = {
  drap: number;
  tornavis: number;
  martell: number;
  llanterna: number;
  galleda: number;
  drap_mullat: number;
};

/** Default tools every player starts with */
export const DEFAULT_TOOLS: PlayerTools = {
  drap: 0,
  tornavis: 1,
  martell: 0,
  llanterna: 1,
  galleda: 0,
  drap_mullat: 0,
} as const;

/** Safely parse tools from the jsonb column */
export function parseTools(raw: unknown): PlayerTools {
  if (typeof raw === "object" && raw !== null) {
    const t = raw as Record<string, number>;
    return {
      drap: t.drap ?? DEFAULT_TOOLS.drap,
      tornavis: t.tornavis ?? DEFAULT_TOOLS.tornavis,
      martell: t.martell ?? DEFAULT_TOOLS.martell,
      llanterna: t.llanterna ?? DEFAULT_TOOLS.llanterna,
      galleda: t.galleda ?? DEFAULT_TOOLS.galleda,
      drap_mullat: t.drap_mullat ?? DEFAULT_TOOLS.drap_mullat,
    };
  }
  return { ...DEFAULT_TOOLS };
}

/** Human-readable tool name with emoji */
export function getToolName(tool: ToolType): string {
  const names: Record<ToolType, string> = {
    drap: "🧹 Drap",
    tornavis: "🔧 Tornavís",
    martell: "🔨 Martell",
    llanterna: "🔦 Llanterna",
    galleda: "🪣 Galleda",
    drap_mullat: "✨ Drap mullat",
  };
  return names[tool];
}

// ============================================
// GAME PHASES
// ============================================

export type Phase = "waiting" | "hiding" | "playing" | "finished";

export const CPU_ID = "00000000-0000-0000-0000-000000000001";

export type Position = "sobre" | "sota" | "dins" | "darrere";

export const POSITIONS = [
  { value: "sobre" as const, label: "Sobre", icon: "⬆️" },
  { value: "sota" as const, label: "Sota", icon: "⬇️" },
  { value: "dins" as const, label: "Dins", icon: "📦" },
  { value: "darrere" as const, label: "Darrere", icon: "🔙" },
] as const;

export const POS_LABELS: Record<string, string> = {
  sobre: "⬆️ Sobre",
  sota: "⬇️ Sota",
  dins: "📦 Dins",
  darrere: "🔙 Darrere",
};
