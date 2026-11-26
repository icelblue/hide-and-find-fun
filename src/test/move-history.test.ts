import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), catalog: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
import { getMoveHistory } from "@/lib/api/move-history-api";

const move = { id: "move", action: "look", target_item_id: "item", target_scenario_id: "room", target_position: "sobre", turn_number: 2 };
beforeEach(() => {
  vi.clearAllMocks();
  const chain = { select: mocks.select, eq: mocks.eq, order: mocks.order, in: mocks.catalog };
  mocks.from.mockReturnValue(chain);
  mocks.select.mockReturnValue(chain);
  mocks.eq.mockReturnValue(chain);
  mocks.order.mockResolvedValue({ data: [move], error: null });
  mocks.catalog.mockResolvedValue({ data: [] });
});

describe("move history after catalog foreign keys were retired", () => {
  it("retains the observed item and position without relationship embeds", async () => {
    const result = await getMoveHistory("game", "player");
    expect(mocks.select.mock.calls[0]).toEqual(["*"]);
    expect(mocks.eq.mock.calls).toEqual([["game_id", "game"], ["player_id", "player"]]);
    expect(result.data[0]).toMatchObject({ target_item_id: "item", target_position: "sobre", action: "look" });
  });
  it("enriches surviving catalog entries without losing missing entries", async () => {
    mocks.catalog.mockResolvedValueOnce({ data: [{ id: "room", name: "Cuina", icon: "room-icon" }] });
    mocks.catalog.mockResolvedValueOnce({ data: [{ id: "item", name: "Nevera", icon: "item-icon" }] });
    const result = await getMoveHistory("game", "player");
    expect(result.data[0].scenarios?.name).toBe("Cuina");
    expect(result.data[0].items?.name).toBe("Nevera");
  });
  it("does not silently report an empty history after a failed move query", async () => {
    mocks.order.mockResolvedValue({ data: null, error: new Error("history unavailable") });
    await expect(getMoveHistory("game", "player")).rejects.toThrow("history unavailable");
  });
  it("does not issue catalog queries for an empty history", async () => {
    mocks.order.mockResolvedValue({ data: [], error: null });
    expect((await getMoveHistory("game", "player")).data).toEqual([]);
    expect(mocks.catalog).not.toHaveBeenCalled();
  });
});