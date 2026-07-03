// ============================================================
// room-themes.ts — Paletes i patrons "pixel art" per tema
// ============================================================
// Fase A del pla "Grid 2D Pixel Art unificat".
// Un tema defineix:
//   - `terrain`   → fons pla (CSS color) + patró (repeating gradient)
//   - `tile`      → estil de cada casella buida
//   - `border`    → color de vora del grid
//   - `accents`   → paleta secundària (per animacions futures / hover)
//   - `emptyDecor`→ emojis aleatoris deterministes per omplir el buit
//                   (dóna vida sense necessitar sprites encara)
// ============================================================

export type ThemeKey =
  | "bedroom" | "kitchen" | "bath" | "dining"
  | "office"  | "garden"  | "balcony" | "hall"
  // Escenaris PvP no mapejats 1:1 a categoria personal:
  | "livingroom";

export interface RoomTheme {
  key: ThemeKey;
  label: string;
  terrainBg: string;         // hsl/rgb; fons del grid sencer
  terrainPattern: string;    // css `background-image`
  tileBg: string;            // color casella buida
  tileBorder: string;        // vora casella buida
  filledBg: string;          // casella amb moble
  filledBorder: string;      // vora casella amb moble
  gridBorder: string;        // vora exterior del grid
  emptyDecor: string[];      // possibles emojis per omplir buit
  emptyDecorProb: number;    // 0..1 densitat
}

// Genera un patró "quadrets" tipus pixel a partir de 2 colors.
// Cel·la de 8×8 alternada dins de cada tile.
const pixelChecker = (a: string, b: string, size = 8) =>
  `repeating-conic-gradient(${a} 0% 25%, ${b} 0% 50%) 0 0 / ${size}px ${size}px`;

const stripes = (a: string, b: string, w = 6) =>
  `repeating-linear-gradient(45deg, ${a} 0 ${w}px, ${b} ${w}px ${w * 2}px)`;

const dots = (fg: string, bg: string) =>
  `radial-gradient(circle at 4px 4px, ${fg} 1.5px, transparent 2px) 0 0/10px 10px, ${bg}`;

export const ROOM_THEMES: Record<ThemeKey, RoomTheme> = {
  bedroom: {
    key: "bedroom",
    label: "Habitació",
    terrainBg: "hsl(30 40% 82%)",
    terrainPattern: stripes("hsl(30 45% 78%)", "hsl(30 40% 84%)", 10),
    tileBg: "hsl(30 45% 88%)",
    tileBorder: "hsl(30 30% 70%)",
    filledBg: "hsl(30 50% 92%)",
    filledBorder: "hsl(30 60% 55%)",
    gridBorder: "hsl(30 50% 40%)",
    emptyDecor: ["🧸", "📚", "🕯️"],
    emptyDecorProb: 0.08,
  },
  kitchen: {
    key: "kitchen",
    label: "Cuina",
    terrainBg: "hsl(200 20% 88%)",
    terrainPattern: pixelChecker("hsl(200 20% 90%)", "hsl(200 25% 82%)", 12),
    tileBg: "hsl(200 25% 92%)",
    tileBorder: "hsl(200 20% 70%)",
    filledBg: "hsl(0 0% 98%)",
    filledBorder: "hsl(200 40% 55%)",
    gridBorder: "hsl(200 40% 40%)",
    emptyDecor: ["🍎", "🥄", "🧂"],
    emptyDecorProb: 0.06,
  },
  bath: {
    key: "bath",
    label: "Lavabo",
    terrainBg: "hsl(190 55% 82%)",
    terrainPattern: pixelChecker("hsl(190 55% 85%)", "hsl(190 45% 75%)", 10),
    tileBg: "hsl(190 60% 90%)",
    tileBorder: "hsl(190 40% 65%)",
    filledBg: "hsl(0 0% 99%)",
    filledBorder: "hsl(190 55% 45%)",
    gridBorder: "hsl(190 60% 35%)",
    emptyDecor: ["💧", "🧼", "🫧"],
    emptyDecorProb: 0.07,
  },
  dining: {
    key: "dining",
    label: "Menjador",
    terrainBg: "hsl(25 50% 60%)",
    terrainPattern: stripes("hsl(25 55% 58%)", "hsl(25 45% 65%)", 12),
    tileBg: "hsl(25 55% 72%)",
    tileBorder: "hsl(25 40% 45%)",
    filledBg: "hsl(35 60% 85%)",
    filledBorder: "hsl(25 60% 40%)",
    gridBorder: "hsl(25 60% 30%)",
    emptyDecor: ["🍽️", "🍷", "🕯️"],
    emptyDecorProb: 0.07,
  },
  office: {
    key: "office",
    label: "Despatx",
    terrainBg: "hsl(220 15% 30%)",
    terrainPattern: stripes("hsl(220 15% 28%)", "hsl(220 15% 33%)", 14),
    tileBg: "hsl(220 15% 40%)",
    tileBorder: "hsl(220 15% 20%)",
    filledBg: "hsl(220 20% 55%)",
    filledBorder: "hsl(200 60% 60%)",
    gridBorder: "hsl(220 20% 15%)",
    emptyDecor: ["📎", "📌", "💡"],
    emptyDecorProb: 0.06,
  },
  garden: {
    key: "garden",
    label: "Jardí",
    terrainBg: "hsl(110 45% 55%)",
    terrainPattern: dots("hsl(110 55% 40%)", "hsl(110 45% 55%)"),
    tileBg: "hsl(110 45% 62%)",
    tileBorder: "hsl(110 45% 30%)",
    filledBg: "hsl(90 45% 75%)",
    filledBorder: "hsl(90 60% 30%)",
    gridBorder: "hsl(110 60% 20%)",
    emptyDecor: ["🌱", "🌼", "🍄", "🦋"],
    emptyDecorProb: 0.15,
  },
  balcony: {
    key: "balcony",
    label: "Balcó",
    terrainBg: "hsl(210 30% 75%)",
    terrainPattern: pixelChecker("hsl(210 25% 78%)", "hsl(210 20% 65%)", 14),
    tileBg: "hsl(210 30% 82%)",
    tileBorder: "hsl(210 20% 50%)",
    filledBg: "hsl(200 40% 90%)",
    filledBorder: "hsl(200 55% 45%)",
    gridBorder: "hsl(210 40% 30%)",
    emptyDecor: ["☁️", "🌿", "🕊️"],
    emptyDecorProb: 0.1,
  },
  hall: {
    key: "hall",
    label: "Rebedor",
    terrainBg: "hsl(0 0% 80%)",
    terrainPattern: pixelChecker("hsl(0 0% 82%)", "hsl(0 0% 72%)", 12),
    tileBg: "hsl(0 0% 88%)",
    tileBorder: "hsl(0 0% 55%)",
    filledBg: "hsl(0 0% 96%)",
    filledBorder: "hsl(0 0% 30%)",
    gridBorder: "hsl(0 0% 20%)",
    emptyDecor: ["🗝️", "🧥", "👞"],
    emptyDecorProb: 0.05,
  },
  livingroom: {
    key: "livingroom",
    label: "Sala",
    terrainBg: "hsl(15 35% 65%)",
    terrainPattern: stripes("hsl(15 40% 62%)", "hsl(15 30% 70%)", 12),
    tileBg: "hsl(15 40% 75%)",
    tileBorder: "hsl(15 40% 45%)",
    filledBg: "hsl(30 45% 88%)",
    filledBorder: "hsl(15 60% 40%)",
    gridBorder: "hsl(15 55% 25%)",
    emptyDecor: ["📺", "🛋️", "🕯️"],
    emptyDecorProb: 0.06,
  },
};

// Mapeja categoria de room_catalog → tema
export function themeForCategory(category: string | null | undefined): RoomTheme {
  if (!category) return ROOM_THEMES.hall;
  const c = category.toLowerCase();
  if (c in ROOM_THEMES) return ROOM_THEMES[c as ThemeKey];
  // fallback per categories desconegudes
  return ROOM_THEMES.hall;
}

// PRNG determinista (mulberry32) — mateixa sala = mateix decor
export function deterministicPRNG(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
