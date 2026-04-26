// ============================================================
// referral-helpers.test.ts — Tests del sistema de referrals
// ============================================================
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  savePendingReferralCode,
  getPendingReferralCode,
  clearPendingReferralCode,
} from "@/lib/referral-helpers";

describe("referral-helpers — localStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("guarda i recupera un codi pendent", () => {
    savePendingReferralCode("joan-a4f2");
    expect(getPendingReferralCode()).toBe("JOAN-A4F2");
  });

  it("retorna null si no hi ha codi", () => {
    expect(getPendingReferralCode()).toBeNull();
  });

  it("normalitza a majúscules i fa trim", () => {
    savePendingReferralCode("  maria-x7k2  ");
    expect(getPendingReferralCode()).toBe("MARIA-X7K2");
  });

  it("esborra el codi pendent", () => {
    savePendingReferralCode("TEST-1234");
    clearPendingReferralCode();
    expect(getPendingReferralCode()).toBeNull();
  });

  it("sobreescriu el codi anterior", () => {
    savePendingReferralCode("FIRST-AAAA");
    savePendingReferralCode("SECOND-BBBB");
    expect(getPendingReferralCode()).toBe("SECOND-BBBB");
  });

  it("no falla si localStorage llença error", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => { throw new Error("quota"); });
    expect(() => savePendingReferralCode("X")).not.toThrow();
    Storage.prototype.setItem = original;
  });
});

describe("referral-helpers — format de codi", () => {
  it("accepta codis amb format NOM-XXXX", () => {
    const codes = ["JOAN-A4F2", "MARIA-X7K2", "ADMIN-1234"];
    codes.forEach((c) => {
      savePendingReferralCode(c);
      expect(getPendingReferralCode()).toBe(c);
      clearPendingReferralCode();
    });
  });
});
