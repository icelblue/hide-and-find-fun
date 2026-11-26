import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
import { getProfileMatchHistory, historySince, signedElo } from "@/lib/profile-match-history";

describe("exact profile Elo history", () => {
  it("never turns missing historical Elo into a zero change", () => {
    expect(signedElo(null)).toBe("—");
    expect(signedElo(0)).toBe("0");
  });
  it("shows the actual recorded gain or loss without assuming a fixed amount", () => {
    expect(signedElo(25)).toBe("+25");
    expect(signedElo(-5)).toBe("-5");
    expect(signedElo(-20)).toBe("-20");
  });
  it("supports recent periods and all history", () => {
    const now = new Date("2026-11-26T04:00:00Z");
    expect(historySince("7", now)).toBe("2026-11-19T04:00:00.000Z");
    expect(historySince("30", now)).toBe("2026-10-27T04:00:00.000Z");
    expect(historySince("all", now)).toBeNull();
  });
  it("reads the requested player and page without exposing hiding data", async () => {
    const history = { matches: [{ elo_before: 105, elo_after: 100, elo_change: -5 }], total: 21 };
    mocks.rpc.mockResolvedValue({ data: history, error: null });
    expect(await getProfileMatchHistory("player", "all", 1)).toEqual(history);
    expect(mocks.rpc).toHaveBeenCalledWith("get_player_match_history", { _user_id: "player", _since: undefined, _limit: 20, _offset: 20 });
  });
  it("surfaces server errors rather than pretending there are no matches", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("unavailable") });
    await expect(getProfileMatchHistory("player", "all", 0)).rejects.toThrow("unavailable");
  });
});