// 🔒 CRITICAL: Component del Mode Història v4.
import type { PetState } from "@/lib/story-state";

interface Props {
  state: PetState;
  prevState?: PetState | null;
}

// 🎯 v6: Display sempre com a "benestar" — barra plena = bo.
// Internament la BD guarda hunger/sleep/fear com a "necessitat" (100 = molt),
// així que les invertim només a la capa visual: display = 100 - raw (excepte bond).
const STATS = [
  { key: "bond" as const, emoji: "❤️", label: "Vincle", color: "bg-pink-500", invert: false, tip: "Quant t'estima la mascota" },
  { key: "hunger" as const, emoji: "🍗", label: "Sacietat", color: "bg-amber-500", invert: true, tip: "Si està plena, no té gana" },
  { key: "sleep" as const, emoji: "😴", label: "Descans", color: "bg-blue-500", invert: true, tip: "Si està plena, està descansada" },
  { key: "fear" as const, emoji: "🛡️", label: "Calma", color: "bg-purple-500", invert: true, tip: "Si està plena, està tranquil·la" },
];

export function PetStatsBar({ state, prevState }: Props) {
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
          <div key={s.key} title={s.tip} className={`glass rounded-lg px-2 py-1.5 border ${warn ? "border-destructive/50" : "border-border/30"}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">
                {s.emoji} {s.label}
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
