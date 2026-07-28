// ============================================================
// i18n-helpers.ts — Traducció síncrona fora de components React
// ============================================================
// Per a errors / toasts generats des de funcions pures (lib/)
// que NO tenen accés al hook useT(). Llegeix lang de localStorage.
// ============================================================
import caStrings from "@/i18n/ca.json";
import enStrings from "@/i18n/en.json";

const BUNDLES: Record<string, Record<string, any>> = {
  ca: caStrings as Record<string, any>,
  en: enStrings as Record<string, any>,
};

function deepGet(obj: Record<string, any>, path: string): string | undefined {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object" && k in (acc as Record<string, any>)) {
      return (acc as Record<string, any>)[k];
    }
    return undefined;
  }, obj) as string | undefined;
}

/** Traducció síncrona per a errors/toasts fora de React. */
export function tt(key: string, vars?: Record<string, string | number>, fallback?: string): string {
  const lang = typeof window !== "undefined" && localStorage.getItem("lang") === "en" ? "en" : "ca";
  const raw = deepGet(BUNDLES[lang], key) ?? deepGet(BUNDLES.ca, key) ?? fallback ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}
