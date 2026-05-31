// Compact CA/EN language switcher — used in Lobby header and Auth landing.
import { useLanguage, useT, type Lang } from "@/i18n/LanguageProvider";

export function LanguageSwitcherCompact({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  const t = useT();
  return (
    <div
      role="group"
      aria-label={t("lobby.languageToggle")}
      className={`inline-flex items-center rounded-lg border border-border/50 bg-muted/40 p-0.5 text-[11px] font-semibold ${className}`}
    >
      {(["ca", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2 py-1 rounded-md transition-colors uppercase tracking-wider ${
            lang === l
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
