// 🔒 CRITICAL: Component del Mode Història. NO toca PvP.
import { useEffect } from "react";

export interface RevealData {
  kind: "xp" | "accessory" | "consumable" | "damage" | "nothing";
  label: string;
  emoji: string;
  tone: "good" | "bad" | "neutral";
}

interface Props {
  reveal: RevealData;
  onDone: () => void;
}

export function RewardReveal({ reveal, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  const ringColor =
    reveal.tone === "good" ? "ring-accent shadow-[0_0_60px_hsl(var(--accent)/0.5)]" :
    reveal.tone === "bad" ? "ring-destructive shadow-[0_0_60px_hsl(var(--destructive)/0.5)]" :
    "ring-muted";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in"
      onClick={onDone}
    >
      <div className={`flex flex-col items-center gap-3 px-8 py-6 rounded-2xl glass ring-2 ${ringColor} animate-scale-in`}>
        <span className="text-6xl">{reveal.emoji}</span>
        <p className="text-lg font-bold text-center">{reveal.label}</p>
      </div>
    </div>
  );
}
