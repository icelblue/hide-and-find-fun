// ============================================================
// LanguageProvider — i18n híbrid: UI a JSON, contingut a BD
// ============================================================
// - Llegeix profiles.language (fallback 'ca')
// - useT(): traduccions d'UI des de JSON
// - useContentT(): traduccions de contingut BD via taula `translations`
//   amb fallback automàtic a CA si l'EN no existeix.
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import caStrings from "./ca.json";
import enStrings from "./en.json";

export type Lang = "ca" | "en";

const BUNDLES: Record<Lang, Record<string, unknown>> = {
  ca: caStrings,
  en: enStrings,
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
  t: (key: string, fallback?: string) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

function deepGet(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object" && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj) as string | undefined;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    return stored === "en" ? "en" : "ca";
  });

  // Sync amb profiles.language al login
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("language")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const dbLang = (data as { language?: string } | null)?.language;
        if (dbLang === "ca" || dbLang === "en") {
          setLangState(dbLang);
          localStorage.setItem("lang", dbLang);
        }
      });
  }, [user]);

  const setLang = useCallback(
    async (l: Lang) => {
      setLangState(l);
      localStorage.setItem("lang", l);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("lang-changed", { detail: l }));
      }
      if (user) {
        await supabase.from("profiles").update({ language: l } as never).eq("user_id", user.id);
      }
    },
    [user]
  );

  const t = useCallback(
    (key: string, varsOrFallback?: Record<string, string | number> | string, maybeFallback?: string) => {
      const vars = typeof varsOrFallback === "object" ? varsOrFallback : undefined;
      const fallback = typeof varsOrFallback === "string" ? varsOrFallback : maybeFallback;
      const raw =
        deepGet(BUNDLES[lang], key) ??
        deepGet(BUNDLES.ca, key) ??
        fallback ??
        key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
    },
    [lang]
  );

  const value = useMemo<Ctx>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}

/** Hook shortcut per UI strings */
export function useT() {
  return useLanguage().t;
}

// ============================================================
// Content translation helpers (taula `translations`)
// ============================================================

export type ContentEntityType =
  | "story_node_title"
  | "story_node_narrative"
  | "story_choice_label"
  | "story_world_name"
  | "story_world_description"
  | "story_recipe_name"
  | "story_recipe_description"
  | "reward_item_name";

/**
 * Bulk fetch traduccions per a una llista d'entitats.
 * Retorna un Map<`${entity_type}:${entity_id}`, value>.
 */
export async function fetchTranslations(
  lang: Lang,
  entries: Array<{ entity_type: ContentEntityType; entity_id: string }>
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (entries.length === 0) return result;

  // 1 query per type per minimitzar PostgREST overhead
  const byType = new Map<ContentEntityType, string[]>();
  for (const e of entries) {
    const list = byType.get(e.entity_type) ?? [];
    list.push(e.entity_id);
    byType.set(e.entity_type, list);
  }

  for (const [entity_type, ids] of byType) {
    const { data } = await supabase
      .from("translations")
      .select("entity_id, lang, value")
      .eq("entity_type", entity_type)
      .in("entity_id", ids)
      .in("lang", lang === "en" ? ["en", "ca"] : ["ca"]);

    if (!data) continue;

    // Prioritzem lang triat; si no, fallback CA
    const byId = new Map<string, { en?: string; ca?: string }>();
    for (const row of data as Array<{ entity_id: string; lang: string; value: string }>) {
      const e = byId.get(row.entity_id) ?? {};
      if (row.lang === "en") e.en = row.value;
      else if (row.lang === "ca") e.ca = row.value;
      byId.set(row.entity_id, e);
    }
    for (const [id, vals] of byId) {
      const v = (lang === "en" ? vals.en : undefined) ?? vals.ca;
      if (v) result.set(`${entity_type}:${id}`, v);
    }
  }

  return result;
}

/** Helper síncron: aplica traducció amb fallback al text original. */
export function translateContent(
  map: Map<string, string>,
  entity_type: ContentEntityType,
  entity_id: string,
  fallback: string
): string {
  return map.get(`${entity_type}:${entity_id}`) ?? fallback;
}
