// ============================================================
// pet-social.test.ts — Tests del sistema social v6
// ============================================================
import { describe, it, expect } from "vitest";
import { outcomeLabel } from "@/lib/pet-social";

describe("pet-social", () => {
  describe("outcomeLabel", () => {
    it("retorna amistat per friends", () => {
      const r = outcomeLabel("friends");
      expect(r.icon).toBe("🤝");
      expect(r.text).toBe("amistat");
      expect(r.color).toContain("green");
    });

    it("retorna baralla per enemies", () => {
      const r = outcomeLabel("enemies");
      expect(r.icon).toBe("💢");
      expect(r.text).toBe("baralla");
      expect(r.color).toContain("destructive");
    });

    it("retorna neutral per neutral", () => {
      const r = outcomeLabel("neutral");
      expect(r.icon).toBe("😐");
      expect(r.text).toBe("neutral");
    });
  });
});
