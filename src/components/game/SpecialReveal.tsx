// ============================================================
// SpecialReveal — Overlay animation for curse/bonus discovery (Wave A polish)
// ============================================================
// Renders full-screen reveal when player uncovers a special spot in PvP.
// ============================================================
import { useEffect } from "react";

export interface SpecialRevealData {
  type: "curse" | "bonus";
  value: number;
}

interface Props {
  reveal: SpecialRevealData | null;
  onDone: () => void;
  /** Localized labels — pass from parent via t() to keep component pure. */
  labels: { curse: string; bonus: string };
}

export function SpecialReveal({ reveal, onDone, labels }: Props) {
  useEffect(() => {
    if (!reveal) return;
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [reveal, onDone]);

  if (!reveal) return null;

  const isCurse = reveal.type === "curse";
  const ringColor = isCurse
    ? "ring-destructive shadow-[0_0_80px_hsl(var(--destructive)/0.55)]"
    : "ring-accent shadow-[0_0_80px_hsl(var(--accent)/0.55)]";
  const emoji = isCurse ? "💀" : "🎁";
  const label = isCurse ? labels.curse : labels.bonus;
  const sign = isCurse ? "" : "+";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in"
      onClick={onDone}
      role="alert"
      aria-live="assertive"
    >
      <div className={`flex flex-col items-center gap-3 px-10 py-8 rounded-2xl glass ring-2 ${ringColor} animate-scale-in`}>
        <span className="text-7xl animate-pulse">{emoji}</span>
        <p className="text-lg font-bold text-center">{label}</p>
        <p className={`text-3xl font-black ${isCurse ? "text-destructive" : "text-accent"}`}>
          {sign}{reveal.value}🪙
        </p>
      </div>
    </div>
  );
}
