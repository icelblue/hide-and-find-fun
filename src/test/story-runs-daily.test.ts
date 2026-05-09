import { describe, it, expect } from "vitest";
import { dailyNodeIdForToday } from "@/lib/story-runs";

describe("daily challenge — node selection", () => {
  it("returns a valid node id for any weekday", () => {
    for (let dow = 0; dow < 7; dow++) {
      // Fake a date with given dow
      const base = new Date(2026, 0, 4 + dow); // Jan 4 2026 = Sunday
      const id = dailyNodeIdForToday(base);
      expect(id).toBe(`daily_dow_${dow}`);
    }
  });

  it("is deterministic for the same date", () => {
    const d = new Date(2026, 4, 9);
    expect(dailyNodeIdForToday(d)).toBe(dailyNodeIdForToday(d));
  });
});
