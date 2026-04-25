import { describe, it, expect } from "vitest";
import { translateAuthError, validateAuthForm } from "@/lib/auth-errors";

describe("translateAuthError", () => {
  it("traduix invalid_credentials a missatge accionable en català", () => {
    const msg = translateAuthError(new Error("Invalid login credentials"));
    expect(msg).toContain("Email o contrasenya incorrectes");
    expect(msg.toLowerCase()).toContain("registra");
  });

  it("detecta usuari ja registrat", () => {
    const msg = translateAuthError(new Error("User already registered"));
    expect(msg.toLowerCase()).toContain("ja està registrat");
  });

  it("detecta password feble", () => {
    const msg = translateAuthError(new Error("Password should be at least 6 characters"));
    expect(msg).toContain("6 caràcters");
  });

  it("detecta email no confirmat", () => {
    const msg = translateAuthError(new Error("Email not confirmed"));
    expect(msg.toLowerCase()).toContain("confirmar");
  });

  it("detecta rate limit", () => {
    const msg = translateAuthError(new Error("Email rate limit exceeded"));
    expect(msg.toLowerCase()).toContain("massa intents");
  });

  it("detecta error de xarxa", () => {
    const msg = translateAuthError(new Error("Failed to fetch"));
    expect(msg.toLowerCase()).toContain("connexió");
  });

  it("retorna missatge genèric per errors desconeguts llargs", () => {
    const longMsg = "x".repeat(200);
    const msg = translateAuthError(new Error(longMsg));
    expect(msg).toContain("inesperat");
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
    expect(r).toContain("format vàlid");
  });

  it("rebutja password curt", () => {
    const r = validateAuthForm({ email: "a@b.com", password: "123", isSignup: false });
    expect(r).toContain("6 caràcters");
  });

  it("a signup, exigeix display name", () => {
    const r = validateAuthForm({ email: "a@b.com", password: "abcdef", displayName: "  ", isSignup: true });
    expect(r).toContain("nom de jugador");
  });

  it("a signup, rebutja noms massa llargs", () => {
    const r = validateAuthForm({ email: "a@b.com", password: "abcdef", displayName: "x".repeat(40), isSignup: true });
    expect(r).toContain("30 caràcters");
  });

  it("retorna null si tot OK (login)", () => {
    expect(validateAuthForm({ email: "a@b.com", password: "abcdef", isSignup: false })).toBeNull();
  });

  it("retorna null si tot OK (signup)", () => {
    expect(validateAuthForm({ email: "a@b.com", password: "abcdef", displayName: "Sonia", isSignup: true })).toBeNull();
  });
});
