import { describe, it, expect } from "vitest";
import { calculateXP, PET_OPTIONS, PET_ACCESSORIES, PET_CONSUMABLES, PET_EVOLUTION_TIERS, MAX_PET_XP, getPetEvolution, hasAllAccessories, cpuChooseHidingSpot } from "@/lib/story-helpers";

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

  describe("PET_CONSUMABLES", () => {
    it("should have 3 consumables", () => {
      expect(PET_CONSUMABLES).toHaveLength(3);
    });
    it("each has name and icon", () => {
      for (const c of PET_CONSUMABLES) {
        expect(c.name).toBeTruthy();
        expect(c.icon).toBeTruthy();
      }
    });
  });

  describe("MAX_PET_XP", () => {
    it("should be 5000", () => {
      expect(MAX_PET_XP).toBe(5000);
    });
  });

  describe("PET_EVOLUTION_TIERS", () => {
    it("should have 5 tiers", () => {
      expect(PET_EVOLUTION_TIERS).toHaveLength(5);
    });
    it("tiers are sorted ascending by minXp", () => {
      for (let i = 1; i < PET_EVOLUTION_TIERS.length; i++) {
        expect(PET_EVOLUTION_TIERS[i].minXp).toBeGreaterThan(PET_EVOLUTION_TIERS[i - 1].minXp);
      }
    });
    it("first tier starts at 0", () => {
      expect(PET_EVOLUTION_TIERS[0].minXp).toBe(0);
    });
  });

  describe("getPetEvolution", () => {
    it("0 XP = Bebè", () => {
      const evo = getPetEvolution(0);
      expect(evo.label).toBe("Bebè");
      expect(evo.isDead).toBe(false);
    });
    it("500 XP = Jove", () => {
      expect(getPetEvolution(500).label).toBe("Jove");
    });
    it("1500 XP = Adult", () => {
      expect(getPetEvolution(1500).label).toBe("Adult");
    });
    it("3000 XP = Veterà", () => {
      expect(getPetEvolution(3000).label).toBe("Veterà");
    });
    it("4500 XP = Llegendari", () => {
      expect(getPetEvolution(4500).label).toBe("Llegendari");
    });
    it("MAX_PET_XP = isDead", () => {
      expect(getPetEvolution(MAX_PET_XP).isDead).toBe(true);
    });
    it("below MAX = not dead", () => {
      expect(getPetEvolution(4999).isDead).toBe(false);
    });
    it("nextTier exists for non-max tiers", () => {
      const evo = getPetEvolution(100);
      expect(evo.nextTier).toBeDefined();
      expect(evo.nextTier!.label).toBe("Jove");
    });
    it("no nextTier at max tier", () => {
      expect(getPetEvolution(4500).nextTier).toBeUndefined();
    });
  });

  describe("hasAllAccessories", () => {
    it("returns false for empty", () => {
      expect(hasAllAccessories([])).toBe(false);
    });
    it("returns false for partial", () => {
      expect(hasAllAccessories([{ accessory_name: "Collar" }])).toBe(false);
    });
    it("returns true when all 6 present", () => {
      const all = PET_ACCESSORIES.map(a => ({ accessory_name: a.name }));
      expect(hasAllAccessories(all)).toBe(true);
    });
  });

  describe("calculateXP", () => {
    it("chapter 1 base is 100", () => {
      const xp = calculateXP(1, 10);
      expect(xp).toBe(110);
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
