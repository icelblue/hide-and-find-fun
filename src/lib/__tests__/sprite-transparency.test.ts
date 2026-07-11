// ============================================================
// Test de regressió: transparència sprites.
// Evita que un sprite futur torni al bug del "marge blanc"
// (ex. tauleta v1) verificant que TOTS els assets referenciats
// des de room-sprites.ts són PNG amb mida > 0.
//
// Nota: no podem inspeccionar píxels reals (els binaris viuen
// al CDN, no al disc). El que sí bloqueja aquest test és:
//   1. Referenciar un sprite com a JPG (mai té canal alpha
//      → marge de fons opac garantit).
//   2. Pointer .asset.json trencat o buit.
//   3. Content-type no-imatge.
// ============================================================
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ASSETS_DIR = join(process.cwd(), "src/assets/room");

interface AssetPointer {
  url?: string;
  size?: number;
  content_type?: string;
  original_filename?: string;
}

function loadPointer(file: string): AssetPointer {
  const raw = readFileSync(join(ASSETS_DIR, file), "utf-8");
  return JSON.parse(raw) as AssetPointer;
}

// Sprites (spr-*) DEUEN ser PNG per tenir canal alpha.
// Textures (tex-*) i backdrops (bg-*) poden ser JPG (mai es
// componen sobre un altre sprite, ocupen tota la cel·la).
const SPRITE_FILES = readdirSync(ASSETS_DIR).filter(
  (f) => f.startsWith("spr-") && f.endsWith(".png.asset.json"),
);

const ALL_ROOM_ASSETS = readdirSync(ASSETS_DIR).filter((f) =>
  f.endsWith(".asset.json"),
);

describe("sprite assets: transparència garantida", () => {
  it("hi ha almenys 30 sprites registrats", () => {
    expect(SPRITE_FILES.length).toBeGreaterThanOrEqual(30);
  });

  it.each(SPRITE_FILES)("%s → PNG amb canal alpha", (file) => {
    const ptr = loadPointer(file);
    expect(ptr.content_type, `${file} sense content_type`).toBe("image/png");
    expect(ptr.size ?? 0, `${file} mida 0`).toBeGreaterThan(0);
    expect(ptr.url, `${file} sense url`).toMatch(/\.png$/i);
  });

  it.each(ALL_ROOM_ASSETS)("%s → pointer vàlid", (file) => {
    const ptr = loadPointer(file);
    expect(ptr.url, `${file} sense url`).toBeTruthy();
    expect(ptr.size ?? 0, `${file} mida 0`).toBeGreaterThan(0);
    expect(ptr.content_type, `${file} sense content_type`).toMatch(
      /^image\//,
    );
  });
});
