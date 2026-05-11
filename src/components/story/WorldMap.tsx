// 🔒 Component v5 — Mode Història.
import type { WorldStatus } from "@/lib/story-progression";

interface Props {
  worlds: WorldStatus[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function WorldMap({ worlds, selectedId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {worlds.map((w) => {
        const selected = selectedId === w.id;
        const completed = w.endingsCompleted.length > 0;
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
                : "border-border/20 opacity-50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xl">{w.icon}</span>
              {!w.unlocked && <span className="text-xs">🔒</span>}
              {completed && <span className="text-xs">✓</span>}
            </div>
            <p className="text-sm font-bold leading-tight">{w.name}</p>
            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
              {w.unlocked ? `Cap. ${w.chapters.join("-")}` : w.reason}
            </p>
            {w.visits > 0 && (
              <p className="text-[9px] text-accent/70 mt-1">
                Visites: {w.visits} · Finals: {w.endingsCompleted.length}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
