// 🔒 CRITICAL: Component del Mode Història v4.
import type { PetState } from "@/lib/story-state";

interface Props {
  state: PetState;
  prevState?: PetState | null;
}

const STATS = [
  { key: "bond" as const, emoji: "❤️", label: "Vincle", color: "bg-pink-500", goodHigh: true },
  { key: "hunger" as const, emoji: "😋", label: "Gana", color: "bg-amber-500", goodHigh: false },
  { key: "sleep" as const, emoji: "😴", label: "Son", color: "bg-blue-500", goodHigh: false },
  { key: "fear" as const, emoji: "😨", label: "Por", color: "bg-purple-500", goodHigh: false },
];

export function PetStatsBar({ state, prevState }: Props) {
  return (
    <div className="grid grid-cols-2 gap-1.5 mb-3 animate-fade-in">
      {STATS.map((s) => {
        const v = state[s.key];
        const prev = prevState?.[s.key];
        const delta = prev !== undefined ? v - prev : 0;
        const warn = (s.goodHigh ? v < 20 : v > 80);
        return (
          <div key={s.key} className={`glass rounded-lg px-2 py-1.5 border ${warn ? "border-destructive/50" : "border-border/30"}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">
                {s.emoji} {s.label}
              </span>
              <span className="text-[10px] font-bold flex items-center gap-1">
                {v}
                {delta !== 0 && (
                  <span className={`text-[9px] ${delta > 0 === s.goodHigh ? "text-accent" : "text-destructive"} animate-fade-in`}>
                    {delta > 0 ? "+" : ""}{delta}
                  </span>
                )}
              </span>
            </div>
            <div className="w-full bg-muted/40 rounded-full h-1 overflow-hidden">
              <div className={`h-1 rounded-full ${s.color} transition-all duration-700`} style={{ width: `${v}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
