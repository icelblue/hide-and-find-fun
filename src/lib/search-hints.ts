export const SEARCH_HINT_ICONS: Record<number, string> = {
  0: "🧊", 1: "🥶", 2: "🌡️", 3: "♨️", 4: "🔥",
};

export type SearchHintKind = "far" | "adjacent" | "room" | "similar" | "exact" | "uncertain" | "unknown";

// Five server levels describe proximity; noisy hints never confirm furniture.
export function classifySearchHint(level: number | null | undefined, noisy = false): SearchHintKind {
  if (noisy) return "uncertain";
  const kinds: Record<number, SearchHintKind> = {
    0: "far", 1: "adjacent", 2: "room", 3: "similar", 4: "exact",
  };
  return level == null ? "unknown" : kinds[level] ?? "unknown";
}

/** Temperature words only: hints say how close you are, never which room or furniture. */
export const SEARCH_HINT_LABELS: Record<number, string> = {
  0: "Congelat", 1: "Fred", 2: "Tebi", 3: "Calent", 4: "Cremant",
};

export function searchHintMessage(level: number | null | undefined, noisy: boolean, _furniture?: string) {
  if (level == null || !(level in SEARCH_HINT_LABELS)) return "🔍 No hi ha cap pista disponible.";
  const text = `${SEARCH_HINT_ICONS[level]} ${SEARCH_HINT_LABELS[level]}!`;
  return noisy ? `${text} (pista imprecisa, pot variar un grau)` : text;
}
