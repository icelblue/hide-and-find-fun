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
          // Trencat inclina molt lleugerament el moble (subtil, manté llegibilitat)
          const stateRotation = isBroken ? rotation - 2 : rotation;

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
                        transform: `rotate(${stateRotation}deg)`,
                        imageRendering: "pixelated",
                        filter: stateFilter,
                      }}
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="drop-shadow-sm relative z-10 transition-transform duration-200"
                      style={{ transform: `rotate(${stateRotation}deg)`, filter: stateFilter }}
                    >
                      {cell?.icon ?? "•"}
                    </span>
                  )}
                  {/* Overlay POLS (brut): punts translúcids beige */}
                  {isDirty && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <circle cx="6" cy="7" r="1.1" fill="#c9b98a" opacity="0.55" />
                      <circle cx="17" cy="5" r="0.8" fill="#b8a878" opacity="0.5" />
                      <circle cx="19" cy="14" r="1" fill="#d4c496" opacity="0.55" />
                      <circle cx="8" cy="17" r="0.7" fill="#a89568" opacity="0.5" />
                      <circle cx="13" cy="11" r="0.6" fill="#e0d3a8" opacity="0.45" />
                      <circle cx="4" cy="19" r="0.9" fill="#b8a878" opacity="0.5" />
                    </svg>
                  )}
                  {/* Overlay ESQUERDA (trencat): zigzag blanc contornejat negre */}
                  {isBroken && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <polyline
                        points="4,4 9,10 6,13 12,17 10,20 16,22"
                        fill="none"
                        stroke="rgba(0,0,0,0.7)"
                        strokeWidth="1.6"
                        strokeLinejoin="miter"
                      />
                      <polyline
                        points="4,4 9,10 6,13 12,17 10,20 16,22"
                        fill="none"
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth="0.7"
                        strokeLinejoin="miter"
                      />
                      <polyline
                        points="14,3 12,8 17,11 15,15 20,18"
                        fill="none"
                        stroke="rgba(0,0,0,0.55)"
                        strokeWidth="1.2"
                      />
                    </svg>
                  )}
                  {cell?.selectedCell && (
                    <span
                      className="absolute inset-0 rounded-md pointer-events-none animate-pulse"
                      style={{ boxShadow: `0 0 0 3px hsl(var(--accent) / 0.85)` }}
                    />
                  )}
                  {/* Badge d'estat cantonada superior dreta */}
                  {(isDirty || isBroken) && (
                    <span
                      className="absolute top-0 right-0 text-[10px] leading-none px-0.5 rounded-bl-md pointer-events-none"
                      style={{
                        background: isBroken ? "hsl(0 70% 45% / 0.9)" : "hsl(45 60% 40% / 0.85)",
                        color: "white",
                      }}
                      aria-hidden
                    >
                      {isBroken ? "💥" : "🧹"}
                    </span>
                  )}
                  {cell?.label && (
                    <span className="sr-only">
                      {cell.label}{isBroken ? " (trencat)" : isDirty ? " (brut)" : ""}
                    </span>
                  )}
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
