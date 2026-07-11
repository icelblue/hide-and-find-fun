import { describe, it, expect } from "vitest";
import { growthStage, minutesUntilReady, iconForStage, formatRemaining } from "@/lib/garden-helpers";

const T0 = new Date("2026-07-11T10:00:00Z");
const min = (n: number) => new Date(T0.getTime() + n * 60000);

describe("garden growthStage", () => {
  it("acabada de plantar → seed", () => {
    expect(growthStage(T0, 480, min(0))).toBe("seed");
    expect(growthStage(T0, 480, min(100))).toBe("seed");
  });
  it("a mig camí → growing", () => {
    expect(growthStage(T0, 480, min(240))).toBe("growing");
    expect(growthStage(T0, 480, min(479))).toBe("growing");
  });
  it("temps complert → ready", () => {
    expect(growthStage(T0, 480, min(480))).toBe("ready");
    expect(growthStage(T0, 480, min(9999))).toBe("ready");
  });
  it("accepta string ISO", () => {
    expect(growthStage(T0.toISOString(), 240, min(240))).toBe("ready");
  });
});

describe("garden minutesUntilReady", () => {
  it("compta enrere i s'atura a 0", () => {
    expect(minutesUntilReady(T0, 480, min(0))).toBe(480);
    expect(minutesUntilReady(T0, 480, min(240))).toBe(240);
    expect(minutesUntilReady(T0, 480, min(480))).toBe(0);
    expect(minutesUntilReady(T0, 480, min(600))).toBe(0);
  });
  it("arrodoneix cap amunt (mai promet abans d'hora)", () => {
    expect(minutesUntilReady(T0, 480, new Date(T0.getTime() + 30000))).toBe(480);
  });
});

describe("garden iconForStage", () => {
  const tomato = { icon: "🍅", seed_icon: "🌱" };
  it("mostra la icona correcta per fase", () => {
    expect(iconForStage("seed", tomato)).toBe("🌱");
    expect(iconForStage("growing", tomato)).toBe("🌿");
    expect(iconForStage("ready", tomato)).toBe("🍅");
  });
  it("fallback de seed_icon buit", () => {
    expect(iconForStage("seed", { icon: "🥕", seed_icon: "" })).toBe("🌱");
  });
});

describe("garden formatRemaining", () => {
  it("formata hores i minuts", () => {
    expect(formatRemaining(0)).toBe("");
    expect(formatRemaining(45)).toBe("45m");
    expect(formatRemaining(200)).toBe("3h 20m");
    expect(formatRemaining(1440)).toBe("24h 0m");
  });
});
