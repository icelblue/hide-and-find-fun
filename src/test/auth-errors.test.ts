import { describe, it, expect } from "vitest";
import { translateAuthError, validateAuthForm } from "@/lib/auth-errors";

describe("translateAuthError", () => {
  it("traduix invalid_credentials a missatge accionable en català", () => {
    const msg = translateAuthError(new Error("Invalid login credentials"));
    expect(msg).toContain("authErrors.email_o_contrasenya_incorr");
    expect(msg).toContain("authErrors.");
  });

  it("detecta usuari ja registrat", () => {
    const msg = translateAuthError(new Error("User already registered"));
    expect(msg).toContain("ja_esta_regis");
  });

  it("detecta password feble", () => {
    const msg = translateAuthError(new Error("Password should be at least 6 characters"));
    expect(msg).toContain("la_contrasenya_ha_de_tenir");
  });

  it("detecta email no confirmat", () => {
    const msg = translateAuthError(new Error("Email not confirmed"));
    expect(msg).toContain("confirmar");
  });

  it("detecta rate limit", () => {
    const msg = translateAuthError(new Error("Email rate limit exceeded"));
    expect(msg).toContain("massa_intents");
  });

  it("detecta error de xarxa", () => {
    const msg = translateAuthError(new Error("Failed to fetch"));
    expect(msg).toContain("connexio");
  });

  it("retorna missatge genèric per errors desconeguts llargs", () => {
    const longMsg = "x".repeat(200);
    const msg = translateAuthError(new Error(longMsg));
    expect(msg).toContain("error_inesp");
  });

  it("no peta amb null/undefined", () => {
    expect(() => translateAuthError(null)).not.toThrow();
    expect(() => translateAuthError(undefined)).not.toThrow();
  });
});

describe("validateAuthForm", () => {
  it("rebutja email buit", () => {
    const r = validateAuthForm({ email: "", password: "abcdef", isSignup: false });
    expect(r).toContain("email");
  });

  it("rebutja email amb format invàlid", () => {
    const r = validateAuthForm({ email: "no-arrova", password: "abcdef", isSignup: false });
    expect(r).toContain("format_va");
  });

  it("rebutja password curt", () => {
    const r = validateAuthForm({ email: "a@b.com", password: "123", isSignup: false });
    expect(r).toContain("la_contrasenya_ha_de_tenir");
  });

  it("a signup, exigeix display name", () => {
    const r = validateAuthForm({ email: "a@b.com", password: "abcdef", displayName: "  ", isSignup: true });
    expect(r).toContain("nom_de_jugad");
  });

  it("a signup, rebutja noms massa llargs", () => {
    const r = validateAuthForm({ email: "a@b.com", password: "abcdef", displayName: "x".repeat(40), isSignup: true });
    expect(r).toContain("no_pot_s");
  });

  it("retorna null si tot OK (login)", () => {
    expect(validateAuthForm({ email: "a@b.com", password: "abcdef", isSignup: false })).toBeNull();
  });

  it("retorna null si tot OK (signup)", () => {
    expect(validateAuthForm({ email: "a@b.com", password: "abcdef", displayName: "Sonia", isSignup: true })).toBeNull();
  });
});

import caBundle from "@/i18n/ca.json";
import enBundle from "@/i18n/en.json";

describe("authErrors: claus existents als bundles", () => {
  it("cada clau authErrors.* té traducció ca i en", () => {
    const caKeys = Object.keys((caBundle as Record<string, Record<string, string>>).authErrors ?? {});
    const enKeys = Object.keys((enBundle as Record<string, Record<string, string>>).authErrors ?? {});
    expect(caKeys.length).toBeGreaterThan(10);
    expect(new Set(enKeys)).toEqual(new Set(caKeys));
  });
});
