// ============================================================
// translate-data.ts — Aplica traduccions BD a objectes carregats
// ============================================================
// Helpers per traduir en bloc nodes, choices, mons i receptes
// segons l'idioma actual. Fallback automàtic a CA (gestionat
// per fetchTranslations dins LanguageProvider).
// ============================================================
import { fetchTranslations, type ContentEntityType, type Lang } from "./LanguageProvider";
import type { StoryNode, StoryChoice } from "@/lib/story-runs";

/** Lang actual llegit de localStorage (sync). Defecte: 'ca'. */
export function getCurrentLang(): Lang {
  if (typeof window === "undefined") return "ca";
  const v = window.localStorage.getItem("lang");
  return v === "en" ? "en" : "ca";
}

/**
 * Generic translator for an array of rows. Mutates each row's `valueKey` to
 * the EN translation when lang='en' and a translation exists. CA is no-op.
 * Use for arbitrary BD-fetched lists (scenarios, items, objects…).
 */
export async function translateRows<T extends Record<string, unknown>>(
  rows: T[],
  entity_type: ContentEntityType,
  idKey: keyof T,
  valueKey: keyof T,
  lang: Lang = getCurrentLang(),
): Promise<T[]> {
  if (lang === "ca" || rows.length === 0) return rows;
  const entries = rows
    .filter((r) => r[idKey] != null)
    .map((r) => ({ entity_type, entity_id: String(r[idKey]) }));
  const map = await fetchTranslations(lang, entries);
  return rows.map((r) => {
    const v = map.get(`${entity_type}:${String(r[idKey])}`);
    return v ? { ...r, [valueKey]: v } : r;
  });
}


async function translateBatch(
  lang: Lang,
  entries: Array<{ entity_type: ContentEntityType; entity_id: string }>
) {
  if (lang === "ca" || entries.length === 0) return new Map<string, string>();
  return fetchTranslations(lang, entries);
}

export async function translateNodes<T extends StoryNode>(nodes: T[], lang: Lang): Promise<T[]> {
  if (lang === "ca" || nodes.length === 0) return nodes;
  const entries: Array<{ entity_type: ContentEntityType; entity_id: string }> = [];
  for (const n of nodes) {
    entries.push({ entity_type: "story_node_title", entity_id: n.id });
    entries.push({ entity_type: "story_node_narrative", entity_id: n.id });
  }
  const map = await translateBatch(lang, entries);
  return nodes.map((n) => ({
    ...n,
    title: map.get(`story_node_title:${n.id}`) ?? n.title,
    narrative: map.get(`story_node_narrative:${n.id}`) ?? n.narrative,
  }));
}

export async function translateChoices<T extends StoryChoice>(choices: T[], lang: Lang): Promise<T[]> {
  if (lang === "ca" || choices.length === 0) return choices;
  const map = await translateBatch(
    lang,
    choices.map((c) => ({ entity_type: "story_choice_label" as const, entity_id: c.id }))
  );
  return choices.map((c) => ({
    ...c,
    label: map.get(`story_choice_label:${c.id}`) ?? c.label,
  }));
}

export async function translateWorlds<T extends { id: string; name: string; description: string | null }>(
  worlds: T[],
  lang: Lang
): Promise<T[]> {
  if (lang === "ca" || worlds.length === 0) return worlds;
  const entries: Array<{ entity_type: ContentEntityType; entity_id: string }> = [];
  for (const w of worlds) {
    entries.push({ entity_type: "story_world_name", entity_id: w.id });
    entries.push({ entity_type: "story_world_description", entity_id: w.id });
  }
  const map = await translateBatch(lang, entries);
  return worlds.map((w) => ({
    ...w,
    name: map.get(`story_world_name:${w.id}`) ?? w.name,
    description: map.get(`story_world_description:${w.id}`) ?? w.description,
  }));
}

/** Subscriu un callback que es dispara quan canvia l'idioma. */
export function onLangChange(cb: (lang: Lang) => void): () => void {
  const handler = () => cb(getCurrentLang());
  window.addEventListener("lang-changed", handler);
  return () => window.removeEventListener("lang-changed", handler);
}
