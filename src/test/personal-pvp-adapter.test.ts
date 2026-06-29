import { describe, it, expect } from "vitest";
import {
  parseSnapshot,
  synthScenario,
  synthObjects,
  synthItems,
  synthConnections,
  mergeSnapshots,
  PERSONAL_SCENARIO_ID,
  type FurnitureCatalogItem,
} from "@/lib/personal-pvp-adapter";

const catalog = new Map<string, FurnitureCatalogItem>([
  ["bed_basic", { id: "bed_basic", name_key: "furniture.bed_basic", icon: "🛏️", category: "bed" }],
  ["rug_red", { id: "rug_red", name_key: "furniture.rug_red", icon: "🟥", category: "rug" }],
  ["plant_cactus", { id: "plant_cactus", name_key: "furniture.plant_cactus", icon: "🌵", category: "plant" }],
  ["lamp_floor", { id: "lamp_floor", name_key: "furniture.lamp_floor", icon: "💡", category: "decor" }],
]);

describe("personal-pvp-adapter", () => {
  describe("parseSnapshot", () => {
    it("accepta array directe", () => {
      const out = parseSnapshot([{ slot: 0, furniture_id: "bed_basic" }]);
      expect(out).toEqual([{ slot: 0, furniture_id: "bed_basic" }]);
    });
    it("accepta {layout:[...]}", () => {
      const out = parseSnapshot({ layout: [{ slot: 5, furniture_id: "rug_red" }] });
      expect(out).toEqual([{ slot: 5, furniture_id: "rug_red" }]);
    });
    it("retorna [] per null/undefined/forma invàlida", () => {
      expect(parseSnapshot(null)).toEqual([]);
      expect(parseSnapshot(undefined)).toEqual([]);
      expect(parseSnapshot({ foo: "bar" })).toEqual([]);
      expect(parseSnapshot([{ bad: true }])).toEqual([]);
    });
  });

  describe("synth", () => {
    it("snapshot buit → 1 escenari, 0 objectes, 0 items", () => {
      expect([synthScenario()].length).toBe(1);
      expect(synthObjects([], catalog)).toEqual([]);
      expect(synthItems([], catalog)).toEqual([]);
      expect(synthConnections()).toEqual([]);
    });

    it("4 mobles → 4 objectes i 4 items amb icons del catàleg", () => {
      const snap = [
        { slot: 0, furniture_id: "bed_basic" },
        { slot: 1, furniture_id: "rug_red" },
        { slot: 2, furniture_id: "plant_cactus" },
        { slot: 3, furniture_id: "lamp_floor" },
      ];
      const objs = synthObjects(snap, catalog);
      const items = synthItems(snap, catalog);
      expect(objs).toHaveLength(4);
      expect(items).toHaveLength(4);
      expect(objs[0].icon).toBe("🛏️");
      expect(items[0].scenario_id).toBe(PERSONAL_SCENARIO_ID);
      expect(items.every((i) => i.hidden === false)).toBe(true);
      expect(objs.every((o) => o.is_special === false)).toBe(true);
    });

    it("furniture_id desconegut es filtra sense petar", () => {
      const snap = [
        { slot: 0, furniture_id: "bed_basic" },
        { slot: 1, furniture_id: "unknown_xyz" },
      ];
      expect(synthObjects(snap, catalog)).toHaveLength(1);
      expect(synthItems(snap, catalog)).toHaveLength(1);
    });

    it("furniture_id duplicat es deduplica", () => {
      const snap = [
        { slot: 0, furniture_id: "bed_basic" },
        { slot: 7, furniture_id: "bed_basic" },
      ];
      expect(synthObjects(snap, catalog)).toHaveLength(1);
    });
  });

  describe("mergeSnapshots", () => {
    it("uneix host + guest i deduplica", () => {
      const host = [{ slot: 0, furniture_id: "bed_basic" }];
      const guest = [
        { slot: 0, furniture_id: "bed_basic" },
        { slot: 1, furniture_id: "rug_red" },
      ];
      const merged = mergeSnapshots(host, guest);
      expect(merged.map((m) => m.furniture_id)).toEqual(["bed_basic", "rug_red"]);
      expect(merged[0].slot).toBe(0);
      expect(merged[1].slot).toBe(1);
    });
  });
});
