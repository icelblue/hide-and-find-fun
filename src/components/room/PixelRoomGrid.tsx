// ============================================================
// PixelRoomGrid — Renderitzador de grid 2D "pixel art" per sales
// ============================================================
// Fase A/C: sprites reals per mobles clau + emoji fallback per la resta.
// Reutilitzable per l'Espai Personal i PvP.
//
// Disseny visual:
//   - Terreny: textura pixel art quan hi ha, patró CSS altrament
//   - Caselles buides SENSE vora → sembla un mapa continu
//   - Mobles amb sprite: sense "peça" darrere, sprite flotant
//   - Mobles amb emoji: token amb marc temàtic (fallback elegant)
//   - Rotació 0/90/180/270 aplicada via CSS transform
// ============================================================
import { useMemo } from "react";
import { deterministicPRNG, type RoomTheme } from "@/lib/room-themes";
import { textureForTheme } from "@/lib/room-sprites";

export interface PixelCell {
  slot: number;
  icon?: string;            // emoji fallback
  spriteUrl?: string;       // sprite pixel art (té prioritat sobre icon)
  label?: string;
  filled?: boolean;
  highlighted?: boolean;    // objectiu de placement (buida)
  selectedCell?: boolean;   // moble seleccionat per acció
  disabled?: boolean;
  rotation?: 0 | 90 | 180 | 270;
  justPlaced?: boolean;     // per animació d'entrada
  dirty?: boolean;          // estat: brut → filtre gris + overlay pols
  broken?: boolean;         // estat: trencat → filtre apagat + overlay esquerda + inclinació
}

export interface GridBackdrop {
  sprite: string;
  col: number;
  row: number;
  spanCols: number;
  spanRows: number;
  opacity?: number;
  cover?: boolean;
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
  seamless?: boolean;
  /** Si false, utilitza el patró CSS del tema (útil per PvP simple) */
  useTexture?: boolean;
  /** Capa decorativa (mobiliari base) sota els mobles interactius */
  backdrops?: GridBackdrop[];
}

export default function PixelRoomGrid({
  theme, gridW, gridH, cells, seed = "default", onCellClick,
  ariaLabelPrefix = "slot", className = "", seamless = true, useTexture = true,
  backdrops,
}: Props) {
  const size = gridW * gridH;

  const textureUrl = useTexture ? textureForTheme(theme.key) : null;
  const showEmojiDecor = !textureUrl;

  const emptyDecor = useMemo(() => {
    if (!showEmojiDecor) return new Array<string | null>(size).fill(null);
    const rnd = deterministicPRNG(`${seed}:${theme.key}:${gridW}x${gridH}`);
    const out = new Array<string | null>(size).fill(null);
    for (let i = 0; i < size; i++) {
      if (rnd() < theme.emptyDecorProb && theme.emptyDecor.length > 0) {
        out[i] = theme.emptyDecor[Math.floor(rnd() * theme.emptyDecor.length)];
      }
    }
    return out;
  }, [seed, theme, gridW, gridH, size, showEmojiDecor]);

  const backgroundStyle: React.CSSProperties = textureUrl
    ? {
        backgroundImage: `url(${textureUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        imageRendering: "pixelated" as const,
      }
    : {
        background: theme.terrainPattern
          ? `${theme.terrainPattern}, ${theme.terrainBg}`
          : theme.terrainBg,
      };

  return (
    <div
      className={`w-full max-w-[380px] mx-auto rounded-2xl overflow-hidden ${className}`}
      style={{
        ...backgroundStyle,
        border: `3px solid ${theme.gridBorder}`,
        boxShadow: `inset 0 0 24px hsl(0 0% 0% / 0.18), 0 6px 20px hsl(0 0% 0% / 0.2)`,
      }}
    >
      <div
        className="grid w-full h-full p-1 relative"
        style={{
          gridTemplateColumns: `repeat(${gridW}, minmax(0, 1fr))`,
          aspectRatio: `${gridW} / ${gridH}`,
          gap: seamless ? "0px" : "4px",
        }}
        role="grid"
        aria-rowcount={gridH}
        aria-colcount={gridW}
      >
        {backdrops && backdrops.length > 0 && (
          <div className="absolute inset-1 pointer-events-none" aria-hidden>
            {backdrops.map((b, i) => (
              <img
                key={i}
                src={b.sprite}
                alt=""
                loading="lazy"
                className="absolute"
                style={{
                  left: `${(b.col / gridW) * 100}%`,
                  top: `${(b.row / gridH) * 100}%`,
                  width: `${(b.spanCols / gridW) * 100}%`,
                  height: `${(b.spanRows / gridH) * 100}%`,
                  objectFit: b.cover ? "cover" : "contain",
                  opacity: b.opacity ?? 1,
                  imageRendering: "pixelated",
                }}
              />
            ))}
          </div>
        )}
        {Array.from({ length: size }).map((_, idx) => {
          const cell = cells[idx];
          const filled = !!cell?.filled;
          const decor = !filled ? emptyDecor[idx] : null;
          const rotation = cell?.rotation ?? 0;
          const hasSprite = filled && !!cell?.spriteUrl;
          const isBroken = filled && !!cell?.broken;
          const isDirty = filled && !!cell?.dirty && !isBroken;
          // Filtre CSS combinat: brut → grisós/apagat, trencat → contrast baix + sèpia
          const stateFilter = isBroken
            ? "grayscale(0.4) contrast(0.85) brightness(0.75) sepia(0.25)"
            : isDirty
              ? "grayscale(0.65) brightness(0.82) saturate(0.7)"
              : undefined;
          // Trencat inclina lleugerament el moble
          const stateRotation = isBroken ? rotation - 4 : rotation;
          return (
            <button
              key={idx}
              role="gridcell"
              aria-label={cell?.label ?? `${ariaLabelPrefix}-${idx}`}
              disabled={cell?.disabled}
              onClick={() => onCellClick?.(idx)}
              className={`aspect-square flex items-center justify-center text-2xl transition-all relative ${
                cell?.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer active:scale-95 hover:brightness-110"
              } ${cell?.selectedCell ? "z-20 scale-110" : ""} ${cell?.justPlaced ? "animate-scale-in" : ""}`}
              style={{
                background: hasSprite
                  ? "transparent"
                  : filled
                    ? theme.filledBg
                    : cell?.highlighted
                      ? "hsl(0 0% 100% / 0.22)"
                      : "transparent",
                border: hasSprite
                  ? "2px solid transparent"
                  : filled
                    ? `2px solid ${theme.filledBorder}`
                    : cell?.highlighted
                      ? `2px dashed hsl(0 0% 100% / 0.75)`
                      : "2px solid transparent",
                borderRadius: filled ? "8px" : "4px",
                boxShadow: hasSprite
                  ? "none"
                  : filled
                    ? `inset 0 -3px 0 hsl(0 0% 0% / 0.2), 0 2px 4px hsl(0 0% 0% / 0.15)`
                    : "none",
                margin: seamless ? "1px" : "0",
              }}
            >
              {filled ? (
                <>
                  {hasSprite ? (
                    <img
                      src={cell!.spriteUrl}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="w-[88%] h-[88%] object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)] transition-transform duration-200"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        imageRendering: "pixelated",
                      }}
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="drop-shadow-sm relative z-10 transition-transform duration-200"
                      style={{ transform: `rotate(${rotation}deg)` }}
                    >
                      {cell?.icon ?? "•"}
                    </span>
                  )}
                  {cell?.selectedCell && (
                    <span
                      className="absolute inset-0 rounded-md pointer-events-none animate-pulse"
                      style={{ boxShadow: `0 0 0 3px hsl(var(--accent) / 0.85)` }}
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
