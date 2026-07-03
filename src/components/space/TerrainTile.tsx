// ============================================================
// TerrainTile — SVG inline pixel-art per una cel·la de terreny
// ============================================================
// Sense assets externs. Colors HSL fixos (no design tokens perquè
// el mapa manté la seva paleta orgànica independentment del tema).
// ============================================================
import type { TerrainType } from "@/lib/terrain";

type Props = {
  type: TerrainType;
  className?: string;
};

const PALETTE: Record<TerrainType, { bg: string; fg: string; accent: string }> = {
  grass: { bg: "#7cc76a", fg: "#5ba84c", accent: "#a3dc8c" },
  dirt: { bg: "#a67650", fg: "#7c5535", accent: "#c49472" },
  water: { bg: "#4aa6d6", fg: "#2e7fa8", accent: "#8fd0ec" },
  rock: { bg: "#98a0a8", fg: "#6c7278", accent: "#c4c9cf" },
  sand: { bg: "#e8d284", fg: "#c9ad5a", accent: "#f4e6ad" },
};

export function TerrainTile({ type, className }: Props) {
  const p = PALETTE[type];
  return (
    <svg
      viewBox="0 0 16 16"
      preserveAspectRatio="none"
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      <rect width="16" height="16" fill={p.bg} />
      {type === "grass" && (
        <>
          <rect x="2" y="3" width="1" height="1" fill={p.fg} />
          <rect x="7" y="6" width="1" height="1" fill={p.fg} />
          <rect x="12" y="10" width="1" height="1" fill={p.fg} />
          <rect x="4" y="11" width="1" height="1" fill={p.accent} />
          <rect x="10" y="2" width="1" height="1" fill={p.accent} />
        </>
      )}
      {type === "dirt" && (
        <>
          <rect x="3" y="4" width="1" height="1" fill={p.fg} />
          <rect x="8" y="7" width="1" height="1" fill={p.fg} />
          <rect x="12" y="12" width="1" height="1" fill={p.fg} />
          <rect x="5" y="10" width="1" height="1" fill={p.accent} />
          <rect x="11" y="3" width="1" height="1" fill={p.accent} />
        </>
      )}
      {type === "water" && (
        <>
          <path d="M0 5 Q4 3 8 5 T16 5" stroke={p.accent} strokeWidth="0.6" fill="none" opacity="0.9" />
          <path d="M0 10 Q4 8 8 10 T16 10" stroke={p.accent} strokeWidth="0.6" fill="none" opacity="0.9" />
          <path d="M0 13 Q4 11 8 13 T16 13" stroke={p.fg} strokeWidth="0.5" fill="none" opacity="0.6" />
        </>
      )}
      {type === "rock" && (
        <>
          <path d="M2 12 L4 6 L8 4 L12 6 L14 12 Z" fill={p.fg} />
          <path d="M6 10 L8 7 L10 10" stroke={p.accent} strokeWidth="0.4" fill="none" />
          <rect x="5" y="9" width="1" height="1" fill={p.accent} />
        </>
      )}
      {type === "sand" && (
        <>
          <rect x="3" y="5" width="1" height="1" fill={p.fg} />
          <rect x="9" y="8" width="1" height="1" fill={p.fg} />
          <rect x="13" y="11" width="1" height="1" fill={p.fg} />
          <rect x="6" y="12" width="1" height="1" fill={p.accent} />
          <rect x="11" y="4" width="1" height="1" fill={p.accent} />
        </>
      )}
    </svg>
  );
}
