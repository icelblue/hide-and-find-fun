import { describe, it, expect } from "vitest";
import {
  isSingleEmoji,
  validateCustomObject,
  buildCustomObjectSpecialData,
  isCustomObjectSpecialData,
  CUSTOM_OBJECT_SENTINEL_ID,
} from "@/lib/custom-object";

describe("isSingleEmoji", () => {
  it("accepts a single basic emoji", () => {
    expect(isSingleEmoji("🦄")).toBe(true);
    expect(isSingleEmoji("🍕")).toBe(true);
    expect(isSingleEmoji("✨")).toBe(true);
  });

  it("accepts emoji with skin-tone modifier", () => {
    expect(isSingleEmoji("👍🏽")).toBe(true);
  });

  it("accepts ZWJ-joined emoji (family, profession)", () => {
    expect(isSingleEmoji("👨‍🚀")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isSingleEmoji("")).toBe(false);
    expect(isSingleEmoji("   ")).toBe(false);
  });

  it("rejects plain text", () => {
    expect(isSingleEmoji("a")).toBe(false);
    expect(isSingleEmoji("hola")).toBe(false);
    expect(isSingleEmoji("1")).toBe(false);
  });

  it("rejects multiple emojis", () => {
    expect(isSingleEmoji("🦄🍕")).toBe(false);
    expect(isSingleEmoji("✨ ✨")).toBe(false);
  });

  it("rejects emoji + text", () => {
    expect(isSingleEmoji("🦄x")).toBe(false);
    expect(isSingleEmoji("hi🦄")).toBe(false);
  });

  it("trims surrounding whitespace before checking", () => {
    expect(isSingleEmoji(" 🦄 ")).toBe(true);
  });
});

describe("validateCustomObject", () => {
  const valid = { icon: "🦄", name: "Unicorn", size: 2 as const, material: "fabric" as const };

  it("accepts a fully valid input", () => {
    expect(validateCustomObject(valid)).toEqual({ ok: true });
  });

  it("rejects bad icon", () => {
    expect(validateCustomObject({ ...valid, icon: "abc" }).ok).toBe(false);
    expect(validateCustomObject({ ...valid, icon: "" }).ok).toBe(false);
    expect(validateCustomObject({ ...valid, icon: "🦄🦄" }).ok).toBe(false);
  });

  it("rejects empty/long name", () => {
    expect(validateCustomObject({ ...valid, name: "" }).ok).toBe(false);
    expect(validateCustomObject({ ...valid, name: "   " }).ok).toBe(false);
    expect(validateCustomObject({ ...valid, name: "x".repeat(21) }).ok).toBe(false);
  });

  it("rejects bad size", () => {
    expect(validateCustomObject({ ...valid, size: 0 as any }).ok).toBe(false);
    expect(validateCustomObject({ ...valid, size: 5 as any }).ok).toBe(false);
  });

  it("rejects bad material", () => {
    expect(validateCustomObject({ ...valid, material: "kryptonite" as any }).ok).toBe(false);
  });
});

describe("buildCustomObjectSpecialData", () => {
  it("produces the expected JSON shape", () => {
    const data = buildCustomObjectSpecialData({
      icon: "🦄",
      name: "  Unicorn  ",
      size: 2,
      material: "fabric",
    });
    expect(data).toEqual({
      is_custom: true,
      custom_icon: "🦄",
      custom_name: "Unicorn",
      custom_size: 2,
      custom_material: "fabric",
    });
  });
});

describe("isCustomObjectSpecialData", () => {
  it("detects custom objects", () => {
    expect(isCustomObjectSpecialData({ is_custom: true, custom_icon: "🦄" })).toBe(true);
  });

  it("ignores non-custom data", () => {
    expect(isCustomObjectSpecialData(null)).toBe(false);
    expect(isCustomObjectSpecialData({})).toBe(false);
    expect(isCustomObjectSpecialData({ is_custom: false })).toBe(false);
    expect(isCustomObjectSpecialData({ is_custom: true })).toBe(false);
  });
});

describe("CUSTOM_OBJECT_SENTINEL_ID", () => {
  it("is a stable UUID-shaped string", () => {
    expect(CUSTOM_OBJECT_SENTINEL_ID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
