// ============================================================
// PixelRoomGrid — Renderitzador de grid 2D "pixel art" per sales
// ============================================================
// Fase A: sense sprites — mobles com quadres amb icona/emoji.
// Reutilitzable per l'Espai Personal i (a Fase B) per PvP.
//
// Props clau:
//   theme        → paleta i patró de terreny (temàtic)
//   gridW/gridH  → dimensions de la sala (venen de room_catalog)
//   cells        → contingut per casella:
//                    { slot, icon, label, filled, disabled }
//   onCellClick  → handler únic; el pare decideix què fer
//   seed         → per fer el decor de buit determinista
// ============================================================
import { useMemo } from "react";
import { deterministicPRNG, type RoomTheme } from "@/lib/room-themes";

export interface PixelCell {
  slot: number;
  icon?: string;
  label?: string;
  filled?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
}

interface Props {
  theme: RoomTheme;
  gridW: number;
  gridH: number;
  cells: PixelCell[];               // longitud = gridW * gridH
  seed?: string;
  onCellClick?: (slot: number) => void;
  ariaLabelPrefix?: string;
  className?: string;
}

export default function PixelRoomGrid({
  theme, gridW, gridH, cells, seed = "default", onCellClick, ariaLabelPrefix = "slot", className = "",
}: Props) {
  const size = gridW * gridH;

  // Decor determinista per omplir caselles buides (dóna vida sense sprites)
  const emptyDecor = useMemo(() => {
    const rnd = deterministicPRNG(`${seed}:${theme.key}:${gridW}x${gridH}`);
    const out = new Array<string | null>(size).fill(null);
    for (let i = 0; i < size; i++) {
      if (rnd() < theme.emptyDecorProb && theme.emptyDecor.length > 0) {
        out[i] = theme.emptyDecor[Math.floor(rnd() * theme.emptyDecor.length)];
      }
    }
    return out;
  }, [seed, theme, gridW, gridH, size]);

  return (
    <div
      className={`w-full max-w-[380px] mx-auto rounded-2xl p-2 grid gap-1 ${className}`}
      style={{
        gridTemplateColumns: `repeat(${gridW}, minmax(0, 1fr))`,
        aspectRatio: `${gridW} / ${gridH}`,
        background: theme.terrainPattern
          ? `${theme.terrainPattern}, ${theme.terrainBg}`
          : theme.terrainBg,
        border: `3px solid ${theme.gridBorder}`,
        boxShadow: `inset 0 0 0 2px hsl(0 0% 100% / 0.15), 0 4px 16px hsl(0 0% 0% / 0.15)`,
        imageRendering: "pixelated",
      }}
      role="grid"
      aria-rowcount={gridH}
      aria-colcount={gridW}
    >
      {Array.from({ length: size }).map((_, idx) => {
        const cell = cells[idx];
        const filled = !!cell?.filled;
        const decor = !filled ? emptyDecor[idx] : null;
        return (
          <button
            key={idx}
            role="gridcell"
            aria-label={cell?.label ?? `${ariaLabelPrefix}-${idx}`}
            disabled={cell?.disabled}
            onClick={() => onCellClick?.(idx)}
            className={`aspect-square rounded-md flex items-center justify-center text-2xl transition-all active:scale-95 relative ${
              cell?.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
            } ${cell?.highlighted ? "ring-2 ring-accent scale-105 z-10" : ""}`}
            style={{
              background: filled ? theme.filledBg : theme.tileBg,
              border: `2px solid ${filled ? theme.filledBorder : theme.tileBorder}`,
              boxShadow: filled ? `inset 0 -3px 0 hsl(0 0% 0% / 0.15)` : "none",
            }}
          >
            {filled ? (
              <>
                <span aria-hidden className="drop-shadow-sm">{cell?.icon ?? "•"}</span>
                {cell?.label && (
                  <span className="sr-only">{cell.label}</span>
                )}
              </>
            ) : decor ? (
              <span aria-hidden className="opacity-70 text-base">{decor}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
