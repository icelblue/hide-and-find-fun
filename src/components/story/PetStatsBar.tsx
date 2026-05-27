// 🔒 CRITICAL: Component del Mode Història v4.
import type { PetState } from "@/lib/story-state";
import { useT } from "@/i18n/LanguageProvider";

interface Props {
  state: PetState;
  prevState?: PetState | null;
}

const STATS = [
  { key: "bond" as const, emoji: "❤️", labelKey: "stats.bond", tipKey: "stats.bondTip", color: "bg-pink-500", invert: false },
  { key: "hunger" as const, emoji: "🍗", labelKey: "stats.hunger", tipKey: "stats.hungerTip", color: "bg-amber-500", invert: true },
  { key: "sleep" as const, emoji: "😴", labelKey: "stats.sleep", tipKey: "stats.sleepTip", color: "bg-blue-500", invert: true },
  { key: "fear" as const, emoji: "🛡️", labelKey: "stats.fear", tipKey: "stats.fearTip", color: "bg-purple-500", invert: true },
];

export function PetStatsBar({ state, prevState }: Props) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-1.5 mb-3 animate-fade-in">
      {STATS.map((s) => {
        const raw = state[s.key];
        const v = s.invert ? 100 - raw : raw;
        const prevRaw = prevState?.[s.key];
        const prev = prevRaw !== undefined ? (s.invert ? 100 - prevRaw : prevRaw) : undefined;
        const delta = prev !== undefined ? v - prev : 0;
        const warn = v < 20;
        const goodHigh = true;
        return (
          <div key={s.key} title={t(s.tipKey)} className={`glass rounded-lg px-2 py-1.5 border ${warn ? "border-destructive/50" : "border-border/30"}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">
                {s.emoji} {t(s.labelKey)}
              </span>
              <span className="text-[10px] font-bold flex items-center gap-1">
                {v}
                {delta !== 0 && (
                  <span className={`text-[9px] ${delta > 0 === goodHigh ? "text-accent" : "text-destructive"} animate-fade-in`}>
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
