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
  /** Llum apagada: sala en gris i mobles invisibles fins que s'encén */
  dark?: boolean;
}

export default function PixelRoomGrid({
  theme, gridW, gridH, cells, seed = "default", onCellClick,
  ariaLabelPrefix = "slot", className = "", seamless = true, useTexture = true,
  backdrops, dark = false,
}: Props) {
  // Llum apagada: es veu l'habitació (parets, terra) en gris fosc,
  // però CAP moble ni decoració — com demana el mode PvP.
  const effectiveCells = dark ? cells.map((c) => ({ slot: c?.slot ?? 0 })) : cells;
  const size = gridW * gridH;

  const textureUrl = useTexture ? textureForTheme(theme.key) : null;

  const emptyDecor = useMemo(() => {
    const rnd = deterministicPRNG(`${seed}:${theme.key}:${gridW}x${gridH}`);
    const out = new Array<string | null>(size).fill(null);
    // Amb textura de fons la decoració es manté però més subtil (60% de la densitat)
    const prob = textureUrl ? theme.emptyDecorProb * 0.6 : theme.emptyDecorProb;
    for (let i = 0; i < size; i++) {
      if (rnd() < prob && theme.emptyDecor.length > 0) {
        out[i] = theme.emptyDecor[Math.floor(rnd() * theme.emptyDecor.length)];
      }
    }
    return out;
  }, [seed, theme, gridW, gridH, size, textureUrl]);

  // Decoració de PARET (finestra, quadre...) determinista per sala:
  // dona sensació d'habitació de joc 2D, no de "terra flotant".
  const wallDecor = useMemo(() => {
    const rnd = deterministicPRNG(`${seed}:wall:${theme.key}`);
    const isOutdoor = theme.key === "garden" || theme.key === "balcony";
    const pool = isOutdoor ? ["🌤️", "🕊️", "🌙"] : ["🪟", "🖼️", "🕰️", "🪞"];
    const count = 1 + Math.floor(rnd() * 2); // 1-2 elements
    const picks: Array<{ icon: string; left: number }> = [];
    const positions = [18, 50, 80];
    for (let i = 0; i < count; i++) {
      picks.push({
        icon: pool[Math.floor(rnd() * pool.length)],
        left: positions[Math.floor(rnd() * positions.length)] + Math.floor(rnd() * 8) - 4,
      });
    }
    // dedupe per posició aproximada
    return picks.filter((p, i) => picks.findIndex((q) => Math.abs(q.left - p.left) < 12) === i);
  }, [seed, theme.key]);

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

  // Variació subtil de terra per cel·la (determinista) — trenca la monotonia
  const floorTints = useMemo(() => {
    const rnd = deterministicPRNG(`${seed}:floor:${gridW}x${gridH}`);
    return Array.from({ length: size }, () => {
      const v = rnd();
      if (v < 0.33) return "hsl(0 0% 0% / 0.05)";
      if (v < 0.66) return "transparent";
      return "hsl(0 0% 100% / 0.04)";
    });
  }, [seed, gridW, gridH, size]);

  return (
    <div
      className={`w-full max-w-[380px] mx-auto rounded-2xl overflow-hidden ${className}`}
      style={{
        filter: dark ? "grayscale(0.92) brightness(0.55) contrast(0.9)" : undefined,
        transition: "filter 300ms ease",
        border: `3px solid ${theme.gridBorder}`,
        boxShadow: `inset 0 0 24px hsl(0 0% 0% / 0.18), 0 6px 20px hsl(0 0% 0% / 0.2)`,
      }}
    >
      {/* Paret superior estil joc 2D: franja fosca amb sòcol */}
      <div
        aria-hidden
        className="relative w-full"
        style={{
          height: "clamp(18px, 7cqw, 28px)",
          background: `linear-gradient(180deg, ${theme.gridBorder} 0%, ${theme.filledBg} 100%)`,
          borderBottom: `2px solid hsl(0 0% 0% / 0.35)`,
        }}
      >
        {/* Decoració de paret: finestres, quadres... (determinista per sala) */}
        {wallDecor.map((d, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute top-1/2 -translate-y-1/2 select-none"
            style={{ left: `${d.left}%`, fontSize: "clamp(11px, 4.5cqw, 16px)", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))" }}
          >
            {d.icon}
          </span>
        ))}
        {/* Sòcol clar just sobre el terra */}
        <div className="absolute bottom-0 left-0 right-0" style={{ height: 3, background: "hsl(0 0% 100% / 0.18)" }} />
      </div>
      <div className="relative" style={backgroundStyle}>
      {/* Catifa central (interiors): ancoratge visual de l'habitació */}
      {theme.key !== "garden" && theme.key !== "balcony" && (
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            left: "18%", right: "18%", top: "30%", bottom: "22%",
            background: theme.filledBg,
            opacity: 0.35,
            borderRadius: 6,
            border: `2px solid ${theme.filledBorder}`,
            boxShadow: "inset 0 0 0 4px hsl(0 0% 100% / 0.15)",
          }}
        />
      )}
      {/* Il·luminació ambient: llum suau des de dalt + vinyeta */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(180deg, hsl(0 0% 100% / 0.10) 0%, transparent 30%)," +
            "radial-gradient(120% 90% at 50% 40%, transparent 55%, hsl(0 0% 0% / 0.16) 100%)",
        }}
      />
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
          const cell = effectiveCells[idx];
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
                  ? floorTints[idx]
                  : filled
                    ? theme.filledBg
                    : cell?.highlighted
                      ? "hsl(0 0% 100% / 0.22)"
                      : floorTints[idx],
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
                    <>
                    <span
                      aria-hidden
                      className="absolute bottom-[6%] left-1/2 -translate-x-1/2 pointer-events-none"
                      style={{
                        width: "62%",
                        height: "16%",
                        background: "radial-gradient(ellipse at center, hsl(0 0% 0% / 0.30) 0%, transparent 70%)",
                      }}
                    />
                    <img
                      src={cell!.spriteUrl}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="w-[88%] h-[88%] object-contain transition-transform duration-200"
                      style={{
                        transform: `rotate(${stateRotation}deg)`,
                        imageRendering: "pixelated",
                        // Contorn negre pixel-art (4 ombres d'1px) + ombra suau — estil tauler
                        filter: `${stateFilter ? stateFilter + " " : ""}drop-shadow(1px 0 0 #17121c) drop-shadow(-1px 0 0 #17121c) drop-shadow(0 1px 0 #17121c) drop-shadow(0 -1px 0 #17121c) drop-shadow(0 2px 2px rgba(0,0,0,0.35))`,
                      }}
                    />
                    </>
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
                  {/* Overlay ESQUERDA (trencat): línia diagonal fina amb bifurcació subtil */}
                  {isBroken && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      {/* Contorn fosc per contrast sobre qualsevol sprite */}
                      <path
                        d="M5 3 L11 11 L9 13 L14 18 L12 21"
                        fill="none"
                        stroke="rgba(0,0,0,0.65)"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Bifurcació lateral curta */}
                      <path
                        d="M11 11 L15 12"
                        fill="none"
                        stroke="rgba(0,0,0,0.5)"
                        strokeWidth="0.9"
                        strokeLinecap="round"
                      />
                      {/* Highlight blanc a sobre per efecte "esquerda oberta" */}
                      <path
                        d="M5 3 L11 11 L9 13 L14 18 L12 21"
                        fill="none"
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth="0.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
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
              ) : decor && !dark ? (
                <span aria-hidden className="opacity-60 text-sm select-none">{decor}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
