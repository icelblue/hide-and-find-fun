import { describe, it, expect } from "vitest";
import { calculateXP, PET_OPTIONS, PET_ACCESSORIES, cpuChooseHidingSpot } from "@/lib/story-helpers";

describe("Story Mode helpers", () => {
  describe("PET_OPTIONS", () => {
    it("should have 5 pet options", () => {
      expect(PET_OPTIONS).toHaveLength(5);
    });
    it("each pet has type, icon, name", () => {
      for (const pet of PET_OPTIONS) {
        expect(pet.type).toBeTruthy();
        expect(pet.icon).toBeTruthy();
        expect(pet.name).toBeTruthy();
      }
    });
  });

  describe("PET_ACCESSORIES", () => {
    it("should have 6 accessories", () => {
      expect(PET_ACCESSORIES).toHaveLength(6);
    });
    it("each has name and icon", () => {
      for (const acc of PET_ACCESSORIES) {
        expect(acc.name).toBeTruthy();
        expect(acc.icon).toBeTruthy();
      }
    });
  });

  describe("calculateXP", () => {
    it("chapter 1 base is 100", () => {
      const xp = calculateXP(1, 10);
      expect(xp).toBe(110); // base 100 + max(1, 10-10)*10 = 100+10
    });
    it("fewer moves gives more XP", () => {
      const fast = calculateXP(1, 2);
      const slow = calculateXP(1, 9);
      expect(fast).toBeGreaterThan(slow);
    });
    it("chapter 2 base is 200", () => {
      const xp = calculateXP(2, 5);
      expect(xp).toBeGreaterThanOrEqual(200);
    });
    it("chapter 3+ base is 150", () => {
      const xp = calculateXP(5, 5);
      expect(xp).toBeGreaterThanOrEqual(150);
    });
  });

  describe("cpuChooseHidingSpot", () => {
    it("returns null for empty arrays", () => {
      expect(cpuChooseHidingSpot([], [])).toBeNull();
      expect(cpuChooseHidingSpot([{ id: "1" }], [])).toBeNull();
    });
    it("returns valid spot with items and objects", () => {
      const items = [{ id: "i1", name: "Taula" }, { id: "i2", name: "Cadira" }];
      const objects = [{ id: "o1", name: "Clau" }];
      const spot = cpuChooseHidingSpot(items, objects);
      expect(spot).not.toBeNull();
      expect(["sobre", "sota", "dins"]).toContain(spot!.position);
      expect(items.some(i => i.id === spot!.itemId)).toBe(true);
    });
  });
});
