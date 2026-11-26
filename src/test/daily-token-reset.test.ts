import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ update: vi.fn(), single: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ update: mocks.update }) },
}));
import { ensureTokensReset } from "@/lib/api/tokens-api";

describe("daily allowance", () => {
  it("writes 5 daily tokens and returns the confirmed 5, not 4", async () => {
    mocks.update.mockReturnValue({ eq: () => ({ select: () => ({ single: mocks.single }) }) });
    mocks.single.mockResolvedValue({ data: { tokens_remaining: 5 }, error: null });
    expect(await ensureTokensReset({ id: "player", tokens_remaining: 0, tokens_last_reset: "2026-04-26" })).toBe(5);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ tokens_remaining: 5 }));
  });
  it("does not pretend the reset succeeded when the server rejects it", async () => {
    mocks.update.mockReturnValue({ eq: () => ({ select: () => ({ single: mocks.single }) }) });
    mocks.single.mockResolvedValue({ data: null, error: new Error("reset refused") });
    await expect(ensureTokensReset({ id: "player", tokens_remaining: 0, tokens_last_reset: "2026-04-26" })).rejects.toThrow("reset refused");
  });
});