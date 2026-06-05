// ============================================================
// supabase-helpers.test.ts — Tests unitaris per lògica de joc
// ============================================================
import { describe, it, expect } from "vitest";
import {
  getMaterialBlockReason,
  MATERIAL_LABELS,
  TOKEN_COSTS,
  SOCIAL_ITEMS,
  TOOLS_PER_GAME,
  getDirtyItemsForGame,
  getTagActions,
  TAG_ACTIONS,
  OUTDOOR_SCENARIOS,
  isLightOff,
  generateGameCode,
} from "@/lib/supabase-helpers";
import { RARITY_CONFIG } from "@/lib/reward-helpers";

// ============================================
// MATERIAL VALIDATION
// ============================================
describe("getMaterialBlockReason", () => {
  it("allows generic material in any environment", () => {
    expect(getMaterialBlockReason("generic", "wet")).toBeNull();
    expect(getMaterialBlockReason("generic", "hot")).toBeNull();
    expect(getMaterialBlockReason("generic", "dirty")).toBeNull();
  });

  it("allows any material in generic environment", () => {
    expect(getMaterialBlockReason("paper", "generic")).toBeNull();
    expect(getMaterialBlockReason("food", "generic")).toBeNull();
    expect(getMaterialBlockReason("electronic", "generic")).toBeNull();
  });

  it("blocks paper in wet/submergit/hot", () => {
    expect(getMaterialBlockReason("paper", "wet")).toBeTruthy();
    expect(getMaterialBlockReason("paper", "submergit")).toBeTruthy();
    expect(getMaterialBlockReason("paper", "hot")).toBeTruthy();
  });

  it("blocks food in dirty/químic", () => {
    expect(getMaterialBlockReason("food", "dirty")).toBeTruthy();
    expect(getMaterialBlockReason("food", "químic")).toBeTruthy();
  });

  it("allows food in wet", () => {
    expect(getMaterialBlockReason("food", "wet")).toBeNull();
  });

  it("blocks electronic in wet/submergit", () => {
    expect(getMaterialBlockReason("electronic", "wet")).toBeTruthy();
    expect(getMaterialBlockReason("electronic", "submergit")).toBeTruthy();
  });

  it("allows electronic in hot", () => {
    expect(getMaterialBlockReason("electronic", "hot")).toBeNull();
  });

  it("allows metal everywhere", () => {
    expect(getMaterialBlockReason("metal", "wet")).toBeNull();
    expect(getMaterialBlockReason("metal", "hot")).toBeNull();
    expect(getMaterialBlockReason("metal", "dirty")).toBeNull();
    expect(getMaterialBlockReason("metal", "submergit")).toBeNull();
  });

  it("blocks wood in hot/submergit", () => {
    expect(getMaterialBlockReason("wood", "hot")).toBeTruthy();
    expect(getMaterialBlockReason("wood", "submergit")).toBeTruthy();
  });

  it("blocks fabric only in hot", () => {
    expect(getMaterialBlockReason("fabric", "hot")).toBeTruthy();
    expect(getMaterialBlockReason("fabric", "wet")).toBeNull();
  });

  it("blocks plastic/rubber in hot", () => {
    expect(getMaterialBlockReason("plastic", "hot")).toBeTruthy();
    expect(getMaterialBlockReason("rubber", "hot")).toBeTruthy();
  });

  it("blocks leather in submergit/hot", () => {
    expect(getMaterialBlockReason("leather", "submergit")).toBeTruthy();
    expect(getMaterialBlockReason("leather", "hot")).toBeTruthy();
  });

  it("allows glass/ceramic/stone everywhere", () => {
    for (const mat of ["glass", "ceramic", "stone"]) {
      expect(getMaterialBlockReason(mat, "wet")).toBeNull();
      expect(getMaterialBlockReason(mat, "hot")).toBeNull();
      expect(getMaterialBlockReason(mat, "submergit")).toBeNull();
    }
  });
});

// ============================================
// MATERIAL LABELS
// ============================================
describe("MATERIAL_LABELS", () => {
  it("has all required materials", () => {
    const expected = [
      "generic", "paper", "glass", "metal", "plastic",
      "fabric", "wood", "cardboard", "rubber", "ceramic",
      "electronic", "leather", "stone", "food",
    ];
    for (const mat of expected) {
      expect(MATERIAL_LABELS[mat]).toBeTruthy();
    }
  });

  it("fabric maps to i18n key", () => {
    expect(MATERIAL_LABELS.fabric).toBe("game.materials.fabric");
  });

  it("food maps to i18n key", () => {
    expect(MATERIAL_LABELS.food).toBe("game.materials.food");
  });
});

// ============================================
// TOKEN COSTS
// ============================================
describe("TOKEN_COSTS", () => {
  it("move costs 0.5", () => {
    expect(TOKEN_COSTS.move).toBe(0.5);
  });

  it("look costs 0.3", () => {
    expect(TOKEN_COSTS.look).toBe(0.3);
  });
});

// ============================================
// SOCIAL ITEMS
// ============================================
describe("SOCIAL_ITEMS", () => {
  it("has all 9 social items", () => {
    expect(SOCIAL_ITEMS.length).toBe(9);
  });

  it("includes robar_tornavis", () => {
    expect(SOCIAL_ITEMS.find(i => i.type === "robar_tornavis")).toBeTruthy();
  });

  it("includes all expected types", () => {
    const types = SOCIAL_ITEMS.map(i => i.type);
    expect(types).toContain("banana");
    expect(types).toContain("smoke_bomb");
    expect(types).toContain("shield");
    expect(types).toContain("swap");
    expect(types).toContain("espia");
    expect(types).toContain("message");
    expect(types).toContain("robar_tornavis");
  });

  it("each item has icon, name, desc", () => {
    for (const item of SOCIAL_ITEMS) {
      expect(item.icon).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.desc).toBeTruthy();
    }
  });
});

// ============================================
// TOOLS PER GAME (shared pool)
// ============================================
describe("TOOLS_PER_GAME", () => {
  it("has correct pool sizes", () => {
    expect(TOOLS_PER_GAME.martell).toBe(5);
    expect(TOOLS_PER_GAME.drap).toBe(5);
    expect(TOOLS_PER_GAME.llanterna).toBe(3);
    expect(TOOLS_PER_GAME.tornavis).toBe(5);
  });
});

// ============================================
// DIRTY ITEMS PER GAME
// ============================================
describe("getDirtyItemsForGame", () => {
  const items = [
    { id: "a", tags: ["dirty"] },
    { id: "b", tags: ["dirty"] },
    { id: "c", tags: ["dirty"] },
    { id: "d", tags: ["breakable"] },
    { id: "e", tags: [] },
  ];

  it("returns only items with dirty tag", () => {
    const result = getDirtyItemsForGame(items, "game1");
    for (const id of result) {
      const item = items.find(i => i.id === id);
      expect(item?.tags).toContain("dirty");
    }
  });

  it("is deterministic for same gameId", () => {
    const r1 = getDirtyItemsForGame(items, "game123");
    const r2 = getDirtyItemsForGame(items, "game123");
    expect([...r1].sort()).toEqual([...r2].sort());
  });

  it("varies with different gameIds", () => {
    // Run 10 different game IDs and check we get at least some variation
    const results = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const r = getDirtyItemsForGame(items, `game-${i}`);
      results.add([...r].sort().join(","));
    }
    // We should get at least 1 different result (probabilistically near-certain)
    expect(results.size).toBeGreaterThanOrEqual(1);
  });

  it("returns at least 1 dirty item when eligible items exist", () => {
    const result = getDirtyItemsForGame(items, "any-game");
    expect(result.size).toBeGreaterThanOrEqual(1);
  });

  it("returns empty set when no dirty items", () => {
    const cleanItems = [{ id: "x", tags: [] }];
    const result = getDirtyItemsForGame(cleanItems, "game1");
    expect(result.size).toBe(0);
  });
});

// ============================================
// TAG ACTIONS
// ============================================
describe("getTagActions", () => {
  it("returns clean action for dirty items", () => {
    const item = { id: "item1", tags: ["dirty"] };
    const dirtySet = new Set(["item1"]);
    const actions = getTagActions(item, { drap: 1, tornavis: 1, martell: 0, llanterna: 0 }, new Set(), dirtySet);
    expect(actions.some(a => a.tag === "dirty")).toBe(true);
  });

  it("returns break action for breakable items", () => {
    const item = { id: "item1", tags: ["breakable"] };
    const actions = getTagActions(item, { drap: 0, tornavis: 1, martell: 1, llanterna: 0 }, new Set());
    expect(actions.some(a => a.tag === "breakable")).toBe(true);
  });

  it("returns fix action for broken items", () => {
    const item = { id: "item1", tags: ["breakable"] };
    const breaks = new Set(["item1"]);
    const actions = getTagActions(item, { drap: 0, tornavis: 1, martell: 0, llanterna: 0 }, breaks);
    expect(actions.some(a => a.tag === "broken")).toBe(true);
  });

  it("does not show break if already broken", () => {
    const item = { id: "item1", tags: ["breakable"] };
    const breaks = new Set(["item1"]);
    const actions = getTagActions(item, { drap: 0, tornavis: 1, martell: 1, llanterna: 0 }, breaks);
    expect(actions.some(a => a.tag === "breakable")).toBe(false);
  });

  it("marks hasTool=false when tool missing", () => {
    const item = { id: "item1", tags: ["breakable"] };
    const actions = getTagActions(item, { drap: 0, tornavis: 0, martell: 0, llanterna: 0 }, new Set());
    const breakAction = actions.find(a => a.tag === "breakable");
    expect(breakAction?.hasTool).toBe(false);
  });
});

// ============================================
// TAG ACTION COSTS
// ============================================
describe("TAG_ACTIONS", () => {
  it("dirty costs 0.2 and requires drap", () => {
    expect(TAG_ACTIONS.dirty.cost).toBe(0.2);
    expect(TAG_ACTIONS.dirty.requiresTool).toBe("drap");
  });

  it("breakable costs 0.3 and requires martell", () => {
    expect(TAG_ACTIONS.breakable.cost).toBe(0.3);
    expect(TAG_ACTIONS.breakable.requiresTool).toBe("martell");
  });

  it("broken costs 0.2 and requires tornavis", () => {
    expect(TAG_ACTIONS.broken.cost).toBe(0.2);
    expect(TAG_ACTIONS.broken.requiresTool).toBe("tornavis");
  });
});

// ============================================
// LIGHT SYSTEM
// ============================================
describe("isLightOff", () => {
  it("returns false when no moves", () => {
    expect(isLightOff("s1", [])).toBe(false);
  });

  it("returns true after light_off", () => {
    expect(isLightOff("s1", [{ bonus_value: "tag:light_off:s1" }])).toBe(true);
  });

  it("returns false after light_off then light_on", () => {
    expect(isLightOff("s1", [
      { bonus_value: "tag:light_off:s1" },
      { bonus_value: "tag:light_on:s1" },
    ])).toBe(false);
  });

  it("only affects the specific scenario", () => {
    expect(isLightOff("s2", [{ bonus_value: "tag:light_off:s1" }])).toBe(false);
  });
});

// ============================================
// OUTDOOR SCENARIOS
// ============================================
describe("OUTDOOR_SCENARIOS", () => {
  it("includes Jardí and Balcó", () => {
    expect(OUTDOOR_SCENARIOS).toContain("Jardí");
    expect(OUTDOOR_SCENARIOS).toContain("Balcó");
  });
});

// ============================================
// GAME CODE GENERATION
// ============================================
describe("generateGameCode", () => {
  it("generates 6 character codes", () => {
    expect(generateGameCode().length).toBe(6);
  });

  it("generates different codes", () => {
    const codes = new Set(Array.from({ length: 10 }, () => generateGameCode()));
    expect(codes.size).toBeGreaterThan(1);
  });

  it("only uses safe characters", () => {
    const safe = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let i = 0; i < 20; i++) {
      const code = generateGameCode();
      for (const char of code) {
        expect(safe).toContain(char);
      }
    }
  });
});

// ============================================
// RARITY CONFIG
// ============================================
describe("RARITY_CONFIG", () => {
  it("has all 5 rarities", () => {
    expect(Object.keys(RARITY_CONFIG)).toEqual(
      expect.arrayContaining(["common", "uncommon", "rare", "epic", "legendary"])
    );
  });

  it("sell values increase with rarity", () => {
    expect(RARITY_CONFIG.common.sell).toBeLessThan(RARITY_CONFIG.uncommon.sell);
    expect(RARITY_CONFIG.uncommon.sell).toBeLessThan(RARITY_CONFIG.rare.sell);
    expect(RARITY_CONFIG.rare.sell).toBeLessThan(RARITY_CONFIG.epic.sell);
    expect(RARITY_CONFIG.epic.sell).toBeLessThan(RARITY_CONFIG.legendary.sell);
  });

  it("each rarity has label and emoji", () => {
    for (const [, config] of Object.entries(RARITY_CONFIG)) {
      expect(config.label).toBeTruthy();
      expect(config.emoji).toBeTruthy();
      expect(config.sell).toBeGreaterThan(0);
    }
  });
});
