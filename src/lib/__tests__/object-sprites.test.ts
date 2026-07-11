import { describe, it, expect } from "vitest";
import { OBJECT_SPRITES, getObjectSprite } from "@/lib/object-sprites";

// Llista mestra: noms exactes que existeixen a la taula `objects` de la BD.
// Si algú afegeix un objecte nou, aquest test forçarà a afegir sprite (o marcar-lo
// com a fallback controlat afegint-lo a KNOWN_FALLBACK).
const DB_OBJECT_NAMES = [
  "Anell", "Bola de Neu", "Botó", "Calces", "Carta", "Clau",
  "cor de vidre (joia)", "Cullera", "Dau", "Foto", "Gel", "Joguina",
  "Llapis", "Llibre", "Mitjó", "Mitjó pudent", "Mocador", "Moneda",
  "Nas de pallasso", "Pastís d'aniversari", "Petard", "Pilota", "Pinta",
  "Plàtan podrit", "ratolí de pc", "Rellotge", "Rosa", "Sabatilla",
  "Xapa", "Xiulet",
];

const KNOWN_FALLBACK: string[] = [];

describe("object-sprites", () => {
  it("cada objecte de la BD té sprite mapejat", () => {
    const missing = DB_OBJECT_NAMES.filter(
      (n) => !OBJECT_SPRITES[n] && !KNOWN_FALLBACK.includes(n),
    );
    expect(missing, `Objectes sense sprite: ${missing.join(", ")}`).toEqual([]);
  });

  it("__custom__ sentinel té sprite (placeholder per objecte personalitzat)", () => {
    expect(OBJECT_SPRITES["__custom__"]).toBeTruthy();
  });

  it("getObjectSprite retorna null per noms desconeguts (fallback a emoji)", () => {
    expect(getObjectSprite("no_existeix_xyz")).toBeNull();
    expect(getObjectSprite(null)).toBeNull();
    expect(getObjectSprite(undefined)).toBeNull();
  });

  it("tots els sprites són URLs CDN vàlides", () => {
    for (const [name, url] of Object.entries(OBJECT_SPRITES)) {
      expect(url, `Sprite invàlid per ${name}`).toMatch(/^\/__l5e\/assets-v1\//);
    }
  });
});
