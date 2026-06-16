import { describe, it, expect } from "vitest";
import { getItemEffect } from "@/lib/story-state";

describe("Story · Item effects (Peça A)", () => {
  it("recognizes base items by item_id without keyword inference", () => {
    const e = getItemEffect({ item_id: "apple", item_name: "Xxx-creative-name", item_icon: "🍎" });
    expect(e).not.toBeNull();
    expect(e?.kind).toBe("eat");
  });

  it("falls back to keyword inference for completely unknown items", () => {
    const e = getItemEffect({ item_id: "weird_unknown", item_name: "Pilota gegant", item_icon: "⚽" });
    expect(e?.kind).toBe("play");
  });

  it("returns null when nothing matches (no keyword, no id)", () => {
    const e = getItemEffect({ item_id: "xx", item_name: "qqqqq", item_icon: "❓" });
    expect(e).toBeNull();
  });
});
