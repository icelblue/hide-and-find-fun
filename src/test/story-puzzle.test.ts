import { describe, it, expect } from "vitest";
import { checkOrder, parsePuzzle, MAX_PUZZLE_ATTEMPTS, SKIP_PENALTY } from "@/lib/story-puzzle";

describe("story-puzzle pure logic", () => {
  describe("checkOrder", () => {
    it("returns true on exact match", () => {
      expect(checkOrder(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
    });
    it("returns false on wrong order", () => {
      expect(checkOrder(["b", "a", "c"], ["a", "b", "c"])).toBe(false);
    });
    it("returns false on missing item", () => {
      expect(checkOrder(["a", "b"], ["a", "b", "c"])).toBe(false);
    });
    it("returns false on extra item", () => {
      expect(checkOrder(["a", "b", "c", "d"], ["a", "b", "c"])).toBe(false);
    });
  });

  describe("parsePuzzle", () => {
    it("returns null for missing data", () => {
      expect(parsePuzzle(null)).toBeNull();
      expect(parsePuzzle(undefined)).toBeNull();
      expect(parsePuzzle({})).toBeNull();
    });
    it("returns null for unsupported type", () => {
      expect(parsePuzzle({ type: "memory" })).toBeNull();
    });
    it("returns null if correct_order empty", () => {
      expect(parsePuzzle({
        type: "ingredient_order",
        valid_items: [],
        correct_order: [],
      })).toBeNull();
    });
    it("parses a valid puzzle and fills defaults", () => {
      const p = parsePuzzle({
        type: "ingredient_order",
        valid_items: ["herb", "water", "crystal"],
        correct_order: ["water", "herb", "crystal"],
      });
      expect(p).not.toBeNull();
      expect(p!.slots).toBe(3);
      expect(p!.reward_xp).toBe(50);
      expect(p!.reward_item.item_id).toBe("puzzle_reward");
    });
    it("respects provided slots/reward", () => {
      const p = parsePuzzle({
        type: "ingredient_order",
        slots: 4,
        valid_items: ["a", "b", "c", "d"],
        correct_order: ["a", "b", "c", "d"],
        reward_item: { item_id: "elixir", item_name: "Elixir", item_icon: "🧪" },
        reward_xp: 80,
      });
      expect(p!.slots).toBe(4);
      expect(p!.reward_xp).toBe(80);
      expect(p!.reward_item.item_id).toBe("elixir");
    });
  });

  it("MAX_PUZZLE_ATTEMPTS = 3", () => {
    expect(MAX_PUZZLE_ATTEMPTS).toBe(3);
  });
  it("skip penalty hurts bond and adds fear", () => {
    expect(SKIP_PENALTY.fear).toBeGreaterThan(0);
    expect(SKIP_PENALTY.bond).toBeLessThan(0);
  });
});
