import { describe, it, expect } from "vitest";
import { generateTerrain, preferredTerrainForCategory, MAP_SIZE } from "@/lib/terrain";

describe("terrain generator", () => {
  it("is deterministic for the same userId", () => {
    const a = generateTerrain("user-abc-123");
    const b = generateTerrain("user-abc-123");
    expect(a).toEqual(b);
  });

  it("differs for different users", () => {
    const a = JSON.stringify(generateTerrain("user-a"));
    const b = JSON.stringify(generateTerrain("user-b"));
    expect(a).not.toBe(b);
  });

  it("produces a MAP_SIZE×MAP_SIZE grid", () => {
    const g = generateTerrain("user-x");
    expect(g).toHaveLength(MAP_SIZE);
    for (const row of g) expect(row).toHaveLength(MAP_SIZE);
  });

  it("always includes at least some water and grass", () => {
    for (const seed of ["u1", "u2", "u3", "u4", "u5"]) {
      const flat = generateTerrain(seed).flat();
      expect(flat.filter((t) => t === "water").length).toBeGreaterThanOrEqual(1);
      expect(flat.filter((t) => t === "grass").length).toBeGreaterThanOrEqual(1);
    }
  });

  it("maps categories to preferred terrain", () => {
    expect(preferredTerrainForCategory("garden")).toBe("grass");
    expect(preferredTerrainForCategory("bath")).toBe("water");
    expect(preferredTerrainForCategory("unknown")).toBeNull();
  });
});
