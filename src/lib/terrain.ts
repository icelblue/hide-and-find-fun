// ============================================================
// terrain.ts — Generador determinista de terreny 2D per l'apartament
// ============================================================
// Estil "pixel-art clàssic" tipus Stardew / Pokémon G1.
// Grid MAP_SIZE×MAP_SIZE (5×5 per defecte). Determinista per userId
// via hash + mulberry32: mateix jugador → sempre el mateix mapa.
//
// Regles de generació:
//  - 1 massa d'aigua contínua (2-4 cel·les) a un cantó aleatori.
//  - 1 zona de sorra tocant l'aigua.
//  - 1-2 roques dispersades.
//  - Resta: gespa majoritari + alguna cel·la de terra.
//
// Sense BD: tot es deriva del userId. Zero cost de storage.
// ============================================================

export type TerrainType = "grass" | "dirt" | "water" | "rock" | "sand";

export const MAP_SIZE = 5;
export const TERRAIN_BONUS = 0.1; // +10% happiness si la sala coincideix

/** Mapa categoria de sala → terreny preferit. Si coincideix, +10% felicitat. */
const PREFERRED: Record<string, TerrainType> = {
  garden: "grass",
  balcony: "rock",
  bath: "water",
  kitchen: "dirt",
  dining: "grass",
  bedroom: "grass",
  office: "dirt",
  hall: "rock",
};

export function preferredTerrainForCategory(cat: string): TerrainType | null {
  return PREFERRED[cat] ?? null;
}

// -------- PRNG determinista --------
function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Genera el terreny 5×5 (grid[y][x]) determinista per userId. */
export function generateTerrain(userId: string, size: number = MAP_SIZE): TerrainType[][] {
  const rand = mulberry32(hashSeed(userId || "guest"));
  const grid: TerrainType[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "grass" as TerrainType)
  );

  const inBounds = (x: number, y: number) => x >= 0 && x < size && y >= 0 && y < size;

  // 1) Aigua: comença en una cantonada, creix per BFS 2-4 cel·les
  const corners: Array<[number, number]> = [
    [0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1],
  ];
  const [wx, wy] = corners[Math.floor(rand() * corners.length)];
  const waterSize = 2 + Math.floor(rand() * 3); // 2..4
  const waterCells: Array<[number, number]> = [];
  const queue: Array<[number, number]> = [[wx, wy]];
  while (waterCells.length < waterSize && queue.length > 0) {
    // pop aleatori per formes orgàniques
    const idx = Math.floor(rand() * queue.length);
    const [x, y] = queue.splice(idx, 1)[0];
    if (!inBounds(x, y) || grid[y][x] === "water") continue;
    grid[y][x] = "water";
    waterCells.push([x, y]);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => queue.push([x + dx, y + dy]));
  }

  // 2) Sorra: 1-2 cel·les tocant aigua (només si hi ha veïnes lliures)
  const sandCandidates: Array<[number, number]> = [];
  for (const [x, y] of waterCells) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
      const nx = x + dx, ny = y + dy;
      if (inBounds(nx, ny) && grid[ny][nx] === "grass") sandCandidates.push([nx, ny]);
    }
  }
  const sandCount = Math.min(sandCandidates.length, 1 + Math.floor(rand() * 2));
  for (let i = 0; i < sandCount; i++) {
    const idx = Math.floor(rand() * sandCandidates.length);
    const [sx, sy] = sandCandidates.splice(idx, 1)[0];
    if (grid[sy][sx] === "grass") grid[sy][sx] = "sand";
  }

  // 3) Roques: 1-2 disperses, no sobre aigua/sorra
  const rockCount = 1 + Math.floor(rand() * 2);
  let tries = 0;
  let placed = 0;
  while (placed < rockCount && tries < 40) {
    tries++;
    const rx = Math.floor(rand() * size);
    const ry = Math.floor(rand() * size);
    if (grid[ry][rx] === "grass") {
      grid[ry][rx] = "rock";
      placed++;
    }
  }

  // 4) Terra: 2-4 cel·les de gespa passen a terra
  const dirtCount = 2 + Math.floor(rand() * 3);
  tries = 0;
  placed = 0;
  while (placed < dirtCount && tries < 60) {
    tries++;
    const dx = Math.floor(rand() * size);
    const dy = Math.floor(rand() * size);
    if (grid[dy][dx] === "grass") {
      grid[dy][dx] = "dirt";
      placed++;
    }
  }

  return grid;
}

/** Retorna el terreny d'una cel·la donada (helper). */
export function terrainAt(grid: TerrainType[][], x: number, y: number): TerrainType {
  return grid[y]?.[x] ?? "grass";
}
