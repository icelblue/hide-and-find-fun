// ============================================================
// PixelRoomGrid — Renderitzador de grid 2D "pixel art" per sales
// ============================================================
// Fase A: sense sprites — mobles com quadres amb icona/emoji.
// Reutilitzable per l'Espai Personal i PvP (Fase B).
//
// Disseny visual (v2):
//   - Terreny continu: caselles buides NO tenen vora → sembla un mapa
//   - Només els mobles tenen "peça" visible (com un token 2D)
//   - Highlight de selecció = ombra + halo dashed
//   - Hover discret per fer clic evident sense trencar el look
// ============================================================
import { useMemo } from "react";
import { deterministicPRNG, type RoomTheme } from "@/lib/room-themes";

export interface PixelCell {
  slot: number;
  icon?: string;
  label?: string;
  filled?: boolean;
  highlighted?: boolean;   // objectiu de placement (buida)
  selectedCell?: boolean;  // moble seleccionat per acció (PvP)
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
  /** Amaga completament la vora de les caselles buides (mode "mapa 2D") */
  seamless?: boolean;
}

export default function PixelRoomGrid({
  theme, gridW, gridH, cells, seed = "default", onCellClick,
  ariaLabelPrefix = "slot", className = "", seamless = true,
}: Props) {
  const size = gridW * gridH;

  // Decor determinista per omplir caselles buides
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
      className={`w-full max-w-[380px] mx-auto rounded-2xl overflow-hidden ${className}`}
      style={{
        background: theme.terrainPattern
          ? `${theme.terrainPattern}, ${theme.terrainBg}`
          : theme.terrainBg,
        border: `3px solid ${theme.gridBorder}`,
        boxShadow: `inset 0 0 24px hsl(0 0% 0% / 0.18), 0 6px 20px hsl(0 0% 0% / 0.2)`,
        imageRendering: "pixelated",
      }}
    >
      <div
        className="grid w-full h-full p-1"
        style={{
          gridTemplateColumns: `repeat(${gridW}, minmax(0, 1fr))`,
          aspectRatio: `${gridW} / ${gridH}`,
          gap: seamless ? "0px" : "4px",
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
              className={`aspect-square flex items-center justify-center text-2xl transition-all relative ${
                cell?.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer active:scale-95"
              } ${cell?.selectedCell ? "z-20 scale-110" : ""}`}
              style={{
                background: filled
                  ? theme.filledBg
                  : cell?.highlighted
                    ? "hsl(0 0% 100% / 0.18)"
                    : "transparent",
                border: filled
                  ? `2px solid ${theme.filledBorder}`
                  : cell?.highlighted
                    ? `2px dashed hsl(0 0% 100% / 0.7)`
                    : "2px solid transparent",
                borderRadius: filled ? "8px" : "4px",
                boxShadow: filled
                  ? `inset 0 -3px 0 hsl(0 0% 0% / 0.2), 0 2px 4px hsl(0 0% 0% / 0.15)`
                  : "none",
                margin: seamless ? "1px" : "0",
              }}
            >
              {filled ? (
                <>
                  <span aria-hidden className="drop-shadow-sm relative z-10">{cell?.icon ?? "•"}</span>
                  {cell?.selectedCell && (
                    <span
                      className="absolute inset-0 rounded-md pointer-events-none animate-pulse"
                      style={{ boxShadow: `0 0 0 3px hsl(var(--accent) / 0.7)` }}
                    />
                  )}
                  {cell?.label && <span className="sr-only">{cell.label}</span>}
                </>
              ) : decor ? (
                <span aria-hidden className="opacity-60 text-sm select-none">{decor}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
