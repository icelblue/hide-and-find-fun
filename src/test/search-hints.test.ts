import { describe, expect, it, vi } from "vitest";
import { classifySearchHint } from "@/lib/search-hints";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
import { performMove } from "@/lib/api/tokens-api";

describe("five-level PvP proximity contract", () => {
  it.each([[0, "far"], [1, "adjacent"], [2, "room"], [3, "similar"], [4, "exact"]] as const)(
    "classifies level %s as %s, not a different certainty", (level, kind) => {
      expect(classifySearchHint(level, false)).toBe(kind);
    },
  );
  it.each([0, 1, 2, 3, 4])("never confirms a noisy level %s", level => {
    expect(classifySearchHint(level, true)).toBe("uncertain");
  });
  it("does not invent a cold hint when none was returned", () => {
    expect(classifySearchHint(null)).toBe("unknown");
  });
  it("keeps a noisy maximum hint separate from an actual victory", async () => {
    mocks.rpc.mockResolvedValue({ data: { hint_level: 4, hint_noisy: true, found_object: false }, error: null });
    const result = await performMove("game", "player", "look", undefined, "item", "sobre");
    expect(result.hintNoisy).toBe(true);
    expect(classifySearchHint(result.hintLevel, result.hintNoisy)).toBe("uncertain");
    expect(result.foundObject).toBe(false);
  });
  it("keeps the server victory when the exact position was found", async () => {
    mocks.rpc.mockResolvedValue({ data: { hint_level: 4, hint_noisy: false, found_object: true }, error: null });
    expect((await performMove("game", "player", "look", undefined, "item", "sobre")).foundObject).toBe(true);
  });
});
import { searchHintMessage } from "@/lib/search-hints";
describe("temperature hint wording", () => {
  it.each([[0, "Congelat"], [1, "Fred"], [2, "Tebi"], [3, "Calent"], [4, "Cremant"]] as const)(
    "level %i says %s and never names the room or furniture", (level, word) => {
      const msg = searchHintMessage(level, false, "🛏️ Llit");
      expect(msg).toContain(word);
      expect(msg).not.toMatch(/habitació|moble|Llit/i);
    });
});
