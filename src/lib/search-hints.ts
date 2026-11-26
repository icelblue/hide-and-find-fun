export const SEARCH_HINT_ICONS: Record<number, string> = {
  0: "❄️", 1: "🥶", 2: "🌬️", 3: "🌡️", 4: "🔥",
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

export function searchHintMessage(level: number | null | undefined, noisy: boolean, furniture: string) {
  switch (classifySearchHint(level, noisy)) {
    case "far": return "❄️ Fred! L’objecte no és en aquesta habitació ni en una d’adjacent.";
    case "adjacent": return "🥶 Fred! L’objecte és en una habitació adjacent, no en aquesta.";
    case "room": return "🌬️ Fresc! L’objecte és en aquesta habitació, però en un altre moble.";
    case "similar": return "🌡️ Tebi! L’objecte és en aquesta habitació, en un altre moble amb característiques semblants.";
    case "exact": return `🔥 Moble correcte! ${furniture}. Prova una altra posició.`;
    case "uncertain": return `${SEARCH_HINT_ICONS[level ?? -1] ?? "🔍"} Pista imprecisa: no confirma l’habitació ni el moble. Contrasta-la amb altres observacions.`;
    case "unknown": return "🔍 No hi ha una pista de proximitat disponible.";
  }
}