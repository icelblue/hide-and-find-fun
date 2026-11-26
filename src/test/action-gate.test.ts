import { describe, expect, it } from "vitest";
import { createActionGate } from "@/lib/action-gate";

describe("game action gate", () => {
  it("accepts one action, refuses a simultaneous second action, then allows retry", () => {
    const gate = createActionGate();
    expect(gate.acquire()).toBe(true);
    expect(gate.acquire()).toBe(false);
    gate.release();
    expect(gate.acquire()).toBe(true);
  });
});