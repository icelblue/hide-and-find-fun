// 🔒 Component v5.1 — Mode Història. Mons amb requisits visibles.
import type { WorldStatus } from "@/lib/story-progression";
import { useT } from "@/i18n/LanguageProvider";

interface Props {
  worlds: WorldStatus[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function WorldMap({ worlds, selectedId, onSelect }: Props) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {worlds.map((w) => {
        const selected = selectedId === w.id;
        const completed = w.endingsCompleted.length > 0;
        // Mons "ocults": no desbloquejats i amb requisits alts (bond≥60, recipes≥3 o level≥6)
        const r = w.unlock_rule ?? {};
        const isDeepLocked =
          !w.unlocked && ((r.bond ?? 0) >= 60 || (r.recipes ?? 0) >= 3 || (r.level ?? 0) >= 6);
        return (
          <button
            key={w.id}
            onClick={() => w.unlocked && onSelect(w.id)}
            disabled={!w.unlocked}
            className={`relative glass rounded-xl p-3 text-left transition-all border ${
              selected
                ? "border-accent ring-2 ring-accent/40"
                : w.unlocked
                ? "border-border/30 hover:border-accent/50 active:scale-[0.98]"
                : "border-border/20 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xl">{isDeepLocked ? "❔" : w.icon}</span>
              {!w.unlocked && <span className="text-xs">🔒</span>}
              {completed && <span className="text-xs">✓</span>}
            </div>
            <p className="text-sm font-bold leading-tight">
              {isDeepLocked ? "???" : w.name}
            </p>

            {w.unlocked ? (
              <>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Cap. {w.chapters.join("-")}
                </p>
                {w.visits > 0 && (
                  <p className="text-[9px] text-accent/70 mt-1">
                    Visites: {w.visits} · Finals: {w.endingsCompleted.length}
                  </p>
                )}
              </>
            ) : (
              <div className="mt-1 space-y-0.5">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground/80">
                  {isDeepLocked ? "Indici:" : "Per desbloquejar:"}
                </p>
                <p className="text-[10px] text-amber-500/90 font-medium leading-tight">
                  {isDeepLocked ? "Un lloc llunyà espera... continua creixent." : w.reason}
                </p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

