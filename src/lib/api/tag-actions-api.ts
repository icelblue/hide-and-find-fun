// ============================================================
// Accions d'etiqueta (netejar, trencar...), eines i llums
import { supabase } from "@/integrations/supabase/client";
import type { ToolType } from "@/lib/game-types";
// ============================================================
// TAG-BASED INTERACTIONS (Netejar, Trencar, Arreglar)
// ============================================

// 🔒 CRITICAL: REG-016 — costs SINCRONITZATS amb RPC execute_tag_action.
// Si canvies un cost aquí, actualitza també la migració SQL.
// Test de sincronia: src/test/tag-costs-sync.test.ts
export const TAG_ACTIONS = {
  dirty: { icon: "🧹", label: "Netejar", cost: 0.2, requiresTool: "drap" as const },
  breakable: { icon: "💥", label: "Trencar", cost: 0.3, requiresTool: "martell" as const },
  broken: { icon: "🔧", label: "Arreglar", cost: 0.2, requiresTool: "tornavis" as const },
  fillable: { icon: "🪣", label: "Mullar drap", cost: 0.3, requiresTool: "galleda" as const },
  polish: { icon: "✨", label: "Abrillantar (+2🪙)", cost: 0, requiresTool: "drap_mullat" as const },
} as const;

// Outdoor scenarios: start dark (need illumination).
// 🔒 Backwards-compatible CA name list (now deprecated — prefer scenarios.is_outdoor flag from BD).
export const OUTDOOR_SCENARIOS = ["Jardí", "Balcó", "Garden", "Balcony", "Terrassa", "Pati"];

/** Returns true if a scenario object is outdoor (dark by default). Uses BD flag with name fallback. */
export function isScenarioOutdoor(scenario: { name?: string; is_outdoor?: boolean | null } | null | undefined): boolean {
  if (!scenario) return false;
  if (scenario.is_outdoor === true) return true;
  return scenario.name ? OUTDOOR_SCENARIOS.includes(scenario.name) : false;
}

/**
 * Deterministic hash from gameId to decide which items are dirty per game.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Given all items with 'dirty' tag and a gameId, returns a Set of item IDs
 * that are dirty THIS game (~60% of eligible items, randomized per game).
 */
export function getDirtyItemsForGame(allItems: Array<{ id: string; tags?: string[] | null }>, gameId: string): Set<string> {
  const eligible = allItems.filter((i) => (i.tags ?? []).includes("dirty"));
  const dirtySet = new Set<string>();
  const seed = hashString(gameId);
  for (let i = 0; i < eligible.length; i++) {
    const itemSeed = hashString(eligible[i].id + gameId);
    if (itemSeed % 100 < 60) dirtySet.add(eligible[i].id);
  }
  if (dirtySet.size === 0 && eligible.length > 0) {
    dirtySet.add(eligible[seed % eligible.length].id);
  }
  return dirtySet;
}

/**
 * Same idea per als trencables: ~60% subset determinístic per gameId.
 * Així cada partida varia quins mobles són realment trencables.
 */
export function getBreakableItemsForGame(allItems: Array<{ id: string; tags?: string[] | null }>, gameId: string): Set<string> {
  const eligible = allItems.filter((i) => (i.tags ?? []).includes("breakable"));
  const breakSet = new Set<string>();
  const seed = hashString(gameId + ":break");
  for (let i = 0; i < eligible.length; i++) {
    const itemSeed = hashString(eligible[i].id + gameId + ":break");
    if (itemSeed % 100 < 60) breakSet.add(eligible[i].id);
  }
  if (breakSet.size === 0 && eligible.length > 0) {
    breakSet.add(eligible[seed % eligible.length].id);
  }
  return breakSet;
}

/** Get tag-based actions available for an item given player's tools and game state */
export function getTagActions(
  item: any,
  playerTools: Record<string, number>,
  gameBreaks: Set<string>,
  dirtyItems?: Set<string>,
  breakableItems?: Set<string>,
) {
  const tags: string[] = item.tags ?? [];
  const actions: Array<{
    tag: string;
    icon: string;
    label: string;
    cost: number;
    requiresTool: ToolType | null;
    hasTool: boolean;
    actionKey: string;
  }> = [];

  if (gameBreaks.has(item.id)) {
    const cfg = TAG_ACTIONS.broken;
    actions.push({
      tag: "broken",
      ...cfg,
      hasTool: (playerTools.tornavis ?? 0) > 0,
      actionKey: `fix:${item.id}`,
    });
  }

  const isDirtyThisGame = dirtyItems ? dirtyItems.has(item.id) : tags.includes("dirty");
  if (isDirtyThisGame && !gameBreaks.has(`clean:${item.id}`)) {
    const cfg = TAG_ACTIONS.dirty;
    actions.push({
      tag: "dirty",
      ...cfg,
      hasTool: (playerTools.drap ?? 0) > 0,
      actionKey: `clean:${item.id}`,
    });
  }

  const isBreakableThisGame = breakableItems ? breakableItems.has(item.id) : tags.includes("breakable");
  if (isBreakableThisGame && !gameBreaks.has(item.id)) {
    const cfg = TAG_ACTIONS.breakable;
    actions.push({
      tag: "breakable",
      ...cfg,
      hasTool: (playerTools.martell ?? 0) > 0,
      actionKey: `break:${item.id}`,
    });
  }

  const tagsArr: string[] = tags;
  const isFillable = tagsArr.includes("fillable");
  const isBrokenNow = gameBreaks.has(item.id);
  const isDirtyNow = isDirtyThisGame && !gameBreaks.has(`clean:${item.id}`);

  // Wave C: fill_water — requires galleda + drap
  if (isFillable && !isBrokenNow) {
    const cfg = TAG_ACTIONS.fillable;
    const hasGalleda = (playerTools.galleda ?? 0) > 0;
    const hasDrap = (playerTools.drap ?? 0) > 0;
    actions.push({
      tag: "fillable",
      ...cfg,
      hasTool: hasGalleda && hasDrap,
      actionKey: `fill_water:${item.id}`,
    });
  }

  // Wave C: polish — requires drap_mullat, item must be "normal" (not dirty/broken)
  if (!isBrokenNow && !isDirtyNow && (playerTools.drap_mullat ?? 0) > 0) {
    const cfg = TAG_ACTIONS.polish;
    actions.push({
      tag: "polish",
      ...cfg,
      hasTool: true,
      actionKey: `polish:${item.id}`,
    });
  }

  return actions;
}

export async function executeFillWater(gameId: string, itemId: string) {
  const { data, error } = await supabase.rpc("execute_fill_water", { _game_id: gameId, _item_id: itemId });
  if (error) throw new Error(error.message);
  return data as any;
}

export async function executePolish(gameId: string, itemId: string) {
  const { data, error } = await supabase.rpc("execute_polish", { _game_id: gameId, _item_id: itemId });
  if (error) throw new Error(error.message);
  return data as any;
}

export async function rollGalledaDrop(gameId: string) {
  const { data, error } = await supabase.rpc("roll_galleda_drop", { _game_id: gameId });
  if (error) return { dropped: false };
  return data as any;
}
export const TOOLS_PER_GAME: Record<ToolType, number> = {
  martell: 5,
  drap: 5,
  llanterna: 5,
  tornavis: 5,
  galleda: 2,        // Wave C: pool partida 2 (drop 5%)
  drap_mullat: 99,   // sense límit pool (només via combo galleda+drap)
};

/** Get how many of each tool have been found in this game (both players combined) */
async function getToolsFoundInGame(gameId: string): Promise<Record<ToolType, number>> {
  const { data: players } = await supabase.rpc("get_safe_game_players", { _game_id: gameId });

  const totals: Record<ToolType, number> = { martell: 0, drap: 0, llanterna: 0, tornavis: 0, galleda: 0, drap_mullat: 0 };
  for (const p of (players as Record<string, unknown>[]) ?? []) {
    const t = parseTools(p.tools);
    totals.martell += t.martell;
    totals.drap += t.drap;
    totals.llanterna += t.llanterna;
    totals.tornavis += Math.max(0, t.tornavis - 1); // -1 for the starting one
    totals.galleda += t.galleda;
    totals.drap_mullat += t.drap_mullat;
  }
  return totals;
}

/** Roll for tool finding (~20% chance, checks shared pool) */
export async function rollForTool(gameId: string): Promise<ToolType | null> {
  const roll = Math.random();
  if (roll >= 0.2) return null;

  let candidate: ToolType;
  if (roll < 0.05) candidate = "martell";
  else if (roll < 0.1) candidate = "tornavis";
  else if (roll < 0.15) candidate = "drap";
  else candidate = "llanterna";

  const found = await getToolsFoundInGame(gameId);
  if (found[candidate] >= TOOLS_PER_GAME[candidate]) {
    const alternatives: ToolType[] = ["martell", "drap", "llanterna", "tornavis"];
    const available = alternatives.filter(t => found[t] < TOOLS_PER_GAME[t]);
    if (available.length === 0) return null;
    candidate = available[Math.floor(Math.random() * available.length)];
  }

  return candidate;
}

// ============================================
// UNIFIED VISIBILITY SYSTEM (indoor light + outdoor illumination)
// ============================================

/**
 * Check if a scenario is illuminated.
 * - Indoor scenarios: start ON, can be toggled off/on
 * - Outdoor scenarios: start OFF, can be toggled on with llanterna
 *
 * Pass `isOutdoor` from BD (`scenarios.is_outdoor`) to avoid hardcoded name matching.
 * Falls back to OUTDOOR_SCENARIOS list if `isOutdoor` is undefined (legacy callers).
 */
export function isIlluminated(
  scenarioId: string,
  scenarioName: string,
  allTagMoves: Array<{ bonus_value: string | null }>,
  isOutdoor?: boolean,
): boolean {
  const outdoor = isOutdoor ?? OUTDOOR_SCENARIOS.includes(scenarioName);
  // Default: indoor=ON, outdoor=OFF
  let lit = !outdoor;
  for (const m of allTagMoves) {
    const val = (m.bonus_value as string) ?? "";
    if (val === `tag:light_off:${scenarioId}`) lit = false;
    if (val === `tag:light_on:${scenarioId}`) lit = true;
  }
  return lit;
}

/**
 * Backwards-compatible: also check old tag:flashlight: moves as light_on for outdoor
 */
export function isLightOff(scenarioId: string, allTagMoves: Array<{ bonus_value: string | null }>): boolean {
  let off = false;
  for (const m of allTagMoves) {
    const val = (m.bonus_value as string) ?? "";
    if (val === `tag:light_off:${scenarioId}`) off = true;
    if (val === `tag:light_on:${scenarioId}`) off = false;
    // Backwards compat: old flashlight moves count as light_on
    if (val === `tag:flashlight:${scenarioId}`) off = false;
  }
  return off;
}

/**
 * Toggle illumination in any scenario.
 * - Indoor: regular light switch (no tool needed)
 * - Outdoor: requires llanterna tool to turn ON
 */
export async function toggleLight(
  gameId: string,
  playerId: string,
  scenarioId: string,
  turnOff: boolean,
  scenarioName?: string,
) {
  const { data, error } = await supabase.rpc("execute_toggle_light", {
    _game_id: gameId,
    _scenario_id: scenarioId,
    _turn_off: turnOff,
    _scenario_name: scenarioName ?? null,
  });
  if (error) throw new Error(error.message);
  const result = data as any;
  return { toolFound: result?.tool_found ?? null };
}

// useLlanterna removed — unified into toggleLight with isOutdoor detection

/** Execute a tag-based action (server-side via RPC) */
export async function performTagAction(
  gameId: string,
  playerId: string,
  itemId: string,
  actionKey: string,
  playerTools: Record<string, number>,
) {
  const { data, error } = await supabase.rpc("execute_tag_action", {
    _game_id: gameId,
    _item_id: itemId,
    _action_key: actionKey,
    _player_tools: playerTools,
  });
  if (error) throw new Error(error.message);
  const result = data as any;
  return {
    bonusResult: result?.bonus_result ?? null,
    tornavisSpawned: result?.tornavis_spawned ?? false,
    toolFound: result?.tool_found ?? null,
    actionType: result?.action_type ?? actionKey.split(":")[0],
  };
}

export async function getObjects() {
  const { data, error } = await supabase
    .from("objects")
    .select("*, object_specials(id)")
    .order("display_order");
  if (error) throw error;
  const normalized = (data ?? []).map((o) => {
    const os = o.object_specials;
    const isSpecial = Array.isArray(os) ? os.length > 0 : os != null;
    return { ...o, is_special: isSpecial };
  });
  return translateRows(normalized, "pvp_object_name", "id", "name");
}

export async function getConnectedScenarios(scenarioId: string) {
  const [{ data: forward, error: e1 }, { data: reverse, error: e2 }] = await Promise.all([
    supabase.from("scenario_connections").select("scenario_b").eq("scenario_a", scenarioId),
    supabase.from("scenario_connections").select("scenario_a").eq("scenario_b", scenarioId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const connectedIds = [...(forward ?? []).map((c) => c.scenario_b), ...(reverse ?? []).map((c) => c.scenario_a)];
  if (connectedIds.length === 0) return [];

  const { data: scenarios, error } = await supabase
    .from("scenarios")
    .select("id, name, icon, display_order")
    .in("id", connectedIds)
    .order("display_order");
  if (error) throw error;
  return scenarios ?? [];
}

// ============================================
