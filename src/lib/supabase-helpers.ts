// ============================================================
// 🔒 CRITICAL — supabase-helpers.ts
// Lògica de negoci completa del joc. Tocar amb pre-flight obligatori.
// Tests obligatoris: src/test/supabase-helpers.test.ts + regressions.test.ts
// Bugs passats: REG-005, REG-007, REG-008, REG-011
// ============================================================
// v1.8.1 — Arquitectura RPC + RLS
//
// ACCIONS CRÍTIQUES (via RPC SECURITY DEFINER al servidor):
//   - execute_game_move → moviments, hints, bonus, eines
//   - execute_toggle_light → visibilitat indoor/outdoor
//   - execute_tag_action → netejar, trencar, arreglar
//   - get_safe_game_players → emmascara dades sensibles
//
// LÒGICA CLIENT (aquest fitxer):
//   - Validació material↔entorn (UI feedback)
//   - Fetch de dades (escenaris, ítems, objectes, connexions)
//   - Definicions de tags i eines (constants)
//   - Sistema de visibilitat (lectura d'estat des de moves)
//   - Cicle de vida de partida (crear, unir, amagar)
//   - Ítems socials (plàtan, bomba, escut, espia, missatge)
//   - Inventari i regals
//
// SEGURETAT:
//   - RLS complet a totes les taules
//   - Moviments només via RPC (client NO pot INSERT game_moves)
//   - Dades oponent emmascadades (hidden_* = null mentre playing)
//   - Perfils: només display_name/avatar_url editables
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import { parseTools, type PlayerTools, type ToolType, type Position } from "@/lib/game-types";
import { translateRows } from "@/i18n/translate-data";
import { tt } from "@/lib/i18n-helpers";

// Re-export for backwards compatibility
export { parseTools, type ToolType } from "@/lib/game-types";

// ============================================
// MATERIAL vs ENVIRONMENT VALIDATION
// ============================================

/** Returns a user-facing block reason if material can't go in environment, or null if OK */
export function getMaterialBlockReason(material: string, environment: string): string | null {
  if (environment === "generic") return null;

  const rules: Record<string, Record<string, string>> = {
    paper: {
      wet: "es mullaria 💧",
      submergit: "es desfaria 🌊",
      hot: "es cremaria 🔥",
    },
    cardboard: {
      wet: "es desfaria 💧",
      submergit: "es desfaria 🌊",
      hot: "es cremaria 🔥",
    },
    food: {
      dirty: "no és higiènic 🗑️",
      químic: "seria tòxic ☣️",
    },
    electronic: {
      wet: "es faria malbé 💧",
      submergit: "es faria malbé 🌊",
    },
    wood: {
      hot: "es cremaria 🔥",
      submergit: "flotaria 🌊",
    },
    fabric: {
      hot: "es cremaria 🔥",
    },
    metal: {},
    plastic: {
      hot: "es fondria 🔥",
    },
    rubber: {
      hot: "es fondria 🔥",
    },
    glass: {},
    ceramic: {},
    leather: {
      submergit: "es podriria 🌊",
      hot: "es ressecaria 🔥",
    },
    stone: {},
    generic: {},
  };

  const reason = rules[material]?.[environment];
  if (!reason) return null;
  return reason;
}

/** Display name for materials in UI — values are i18n KEYS (use t(MATERIAL_LABELS[m])) */
export const MATERIAL_LABELS: Record<string, string> = {
  generic: "game.materials.generic",
  paper: "game.materials.paper",
  glass: "game.materials.glass",
  metal: "game.materials.metal",
  plastic: "game.materials.plastic",
  fabric: "game.materials.fabric",
  wood: "game.materials.wood",
  cardboard: "game.materials.cardboard",
  rubber: "game.materials.rubber",
  ceramic: "game.materials.ceramic",
  electronic: "game.materials.electronic",
  leather: "game.materials.leather",
  stone: "game.materials.stone",
  food: "game.materials.food",
};

/** Contextual label key when an object is placed in a specific environment (use t(ENVIRONMENT_LABELS[e])) */
export const ENVIRONMENT_LABELS: Record<string, string> = {
  wet: "game.environments.wet",
  hot: "game.environments.hot",
  dirty: "game.environments.dirty",
  frozen: "game.environments.frozen",
  outdoor: "game.environments.outdoor",
  sorrenc: "game.environments.sorrenc",
  submergit: "game.environments.submergit",
  químic: "game.environments.químic",
  ventós: "game.environments.ventós",
};

/** Get contextual i18n key for an object hidden in a specific item environment */
export function getEnvironmentLabel(environment: string): string | null {
  if (environment === "generic") return null;
  return ENVIRONMENT_LABELS[environment] ?? null;
}


// ============================================
// DATA FETCHING
// ============================================

export function generateGameCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function getScenarios() {
  const { data, error } = await supabase.from("scenarios").select("*").order("display_order");
  if (error) throw error;
  return translateRows(data ?? [], "pvp_scenario_name", "id", "name");
}

export async function getItemsByScenario(scenarioId: string) {
  const { data, error } = await supabase.from("items").select("*").eq("scenario_id", scenarioId).order("display_order");
  if (error) throw error;
  return translateRows(data ?? [], "pvp_item_name", "id", "name");
}

export async function getItemInteractions(itemIds: string[]) {
  if (itemIds.length === 0) return [];
  const { data, error } = await supabase
    .from("item_interactions")
    .select("*")
    .in("item_id", itemIds)
    .order("display_order");
  if (error) throw error;
  return translateRows(data ?? [], "pvp_item_interaction_label", "id", "action_label");
}

// ============================================
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
export function getDirtyItemsForGame(allItems: any[], gameId: string): Set<string> {
  const eligible = allItems.filter((i: any) => (i.tags ?? []).includes("dirty"));
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
export function getBreakableItemsForGame(allItems: any[], gameId: string): Set<string> {
  const eligible = allItems.filter((i: any) => (i.tags ?? []).includes("breakable"));
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
  const { data, error } = await supabase.rpc("execute_fill_water" as any, { _game_id: gameId, _item_id: itemId });
  if (error) throw new Error(error.message);
  return data as any;
}

export async function executePolish(gameId: string, itemId: string) {
  const { data, error } = await supabase.rpc("execute_polish" as any, { _game_id: gameId, _item_id: itemId });
  if (error) throw new Error(error.message);
  return data as any;
}

export async function rollGalledaDrop(gameId: string) {
  const { data, error } = await supabase.rpc("roll_galleda_drop" as any, { _game_id: gameId });
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
  const { data: players } = await supabase.rpc("get_safe_game_players" as any, { _game_id: gameId });

  const totals: Record<ToolType, number> = { martell: 0, drap: 0, llanterna: 0, tornavis: 0, galleda: 0, drap_mullat: 0 };
  for (const p of (players as any[]) ?? []) {
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
  const { data, error } = await supabase.rpc("execute_toggle_light" as any, {
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
  const { data, error } = await supabase.rpc("execute_tag_action" as any, {
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
  const normalized = (data ?? []).map((o: any) => {
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
// GAME LIFECYCLE
// ============================================

export async function createGame(userId: string, invitedUserId?: string) {
  const code = generateGameCode();
  const insertData: any = { code, created_by: userId };
  if (invitedUserId) insertData.invited_user_id = invitedUserId;

  const { data: game, error: gameError } = await supabase.from("games").insert(insertData).select().single();
  if (gameError) throw gameError;

  const { error: playerError } = await supabase.from("game_players").insert({ game_id: game.id, user_id: userId });
  if (playerError) throw playerError;

  // Send push notification to invited player (fire & forget)
  if (invitedUserId) {
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", userId).single();
    const name = profile?.display_name ?? "Algú";
    supabase.functions.invoke("send-push", {
      body: {
        user_ids: [invitedUserId],
        title: "🎯 Repte rebut!",
        body: `${name} t'ha reptat a una partida!`,
        url: `/game/${game.id}`,
        tag: `challenge-${game.id}`,
      },
    }).catch(() => {});
  }

  return game;
}

export async function joinGame(gameId: string, userId: string) {
  const { data: existing } = await supabase
    .from("game_players")
    .select("id")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) throw new Error(tt("game.errors.alreadyInGame"));

  const { data: game } = await supabase.from("games").select("id, status, invited_user_id, created_by").eq("id", gameId).single();
  if (!game) throw new Error(tt("game.errors.gameNotFound"));
  if (game.status !== "waiting") throw new Error(tt("game.errors.gameAlreadyStarted"));

  if (game.invited_user_id && game.invited_user_id !== userId) {
    throw new Error(tt("game.errors.gameIsPrivate"));
  }

  const { data: playerCount } = await supabase.rpc("count_game_players" as any, { _game_id: gameId });
  if ((playerCount ?? 0) >= 2) throw new Error(tt("game.errors.gameFull"));

  const { error } = await supabase.from("game_players").insert({ game_id: gameId, user_id: userId });
  if (error) throw error;

  await supabase
    .from("games")
    .update({ status: "hiding" as const })
    .eq("id", gameId);

  // Notify the game creator that someone joined (fire & forget)
  if (game) {
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", userId).single();
    const name = profile?.display_name ?? "Algú";
    supabase.functions.invoke("send-push", {
      body: {
        user_ids: [game.created_by],
        title: "🎮 Partida iniciada!",
        body: `${name} s'ha unit a la teva partida!`,
        url: `/game/${gameId}`,
        tag: `join-${gameId}`,
      },
    }).catch(() => {});
  }
}

export async function getAvailableGames(currentUserId: string) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("status", "waiting")
    .is("invited_user_id", null)
    .neq("created_by", currentUserId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const creatorIds = [...new Set(data.map((g) => g.created_by))];
  const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", creatorIds);
  const profileMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) ?? []);

  return data.map((game) => ({
    ...game,
    creator_name: profileMap.get(game.created_by) ?? "Anònim",
  }));
}

export async function findRandomMatch(userId: string): Promise<{ type: "joined" | "created"; gameId: string }> {
  const { data: available } = await supabase
    .from("games")
    .select("id")
    .eq("status", "waiting")
    .neq("created_by", userId)
    .is("invited_user_id", null)
    .order("created_at", { ascending: true })
    .limit(1);

  if (available && available.length > 0) {
    await joinGame(available[0].id, userId);
    return { type: "joined", gameId: available[0].id };
  }

  const { data: candidates } = await supabase
    .from("profiles")
    .select("user_id")
    .neq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (candidates && candidates.length > 0) {
    const randomIdx = Math.floor(Math.random() * candidates.length);
    const rivalId = candidates[randomIdx].user_id;
    const game = await createGame(userId, rivalId);
    return { type: "created", gameId: game.id };
  }

  const game = await createGame(userId);
  return { type: "created", gameId: game.id };
}

export async function searchPlayers(query: string, currentUserId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, elo, league")
    .neq("user_id", currentUserId)
    .ilike("display_name", `%${query}%`)
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function challengePlayer(userId: string, rivalUserId: string) {
  return createGame(userId, rivalUserId);
}

export async function getMyInvites(userId: string) {
  const { data } = await supabase
    .from("games")
    .select("*")
    .eq("status", "waiting")
    .eq("invited_user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getMyGames(userId: string) {
  const { data: joined } = await supabase
    .from("game_players")
    .select("game_id, games!inner(id, code, status, created_by, created_at, invited_user_id)")
    .eq("user_id", userId);

  const { data: pendingInvites } = await supabase
    .from("games")
    .select("id, code, status, created_by, created_at, invited_user_id")
    .eq("status", "waiting")
    .eq("invited_user_id", userId);

  const joinedIds = new Set((joined ?? []).map((gp: any) => gp.game_id));
  const pendingFormatted = (pendingInvites ?? [])
    .filter((g: any) => !joinedIds.has(g.id))
    .map((g: any) => ({ game_id: g.id, games: g, _pending: true }));

  const all = [...(joined ?? []).map((gp: any) => ({ ...gp, _pending: false })), ...pendingFormatted];

  const allGameIds = all.map((gp: any) => gp.game_id);
  const creatorIds = [...new Set(all.map((gp: any) => gp.games.created_by))];

  let rivalMap = new Map<string, string>();
  if (allGameIds.length > 0) {
    const { data: allPlayers } = await supabase.rpc("get_game_participants" as any, { _game_ids: allGameIds });
    const filteredPlayers = ((allPlayers as any[]) ?? []).filter((p: any) => p.user_id !== userId);
    const rivalUserIds = [...new Set(filteredPlayers.map((p: any) => p.user_id as string))];
    if (rivalUserIds.length > 0) {
      const { data: rivalProfiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", rivalUserIds);
      const rpMap = new Map(rivalProfiles?.map((p) => [p.user_id, p.display_name]) ?? []);
      for (const p of filteredPlayers) {
        rivalMap.set(p.game_id, rpMap.get(p.user_id) ?? "Anònim");
      }
    }
  }

  const invitedUserIds = [
    ...new Set(
      all
        .filter(
          (gp: any) => gp.games.status === "waiting" && gp.games.invited_user_id && gp.games.invited_user_id !== userId,
        )
        .map((gp: any) => gp.games.invited_user_id),
    ),
  ];
  let invitedProfileMap = new Map<string, string>();
  if (invitedUserIds.length > 0) {
    const { data: invProfiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", invitedUserIds);
    invitedProfileMap = new Map(invProfiles?.map((p) => [p.user_id, p.display_name ?? "Anònim"]) ?? []);
  }

  const allProfileIds = [...new Set([...creatorIds, ...invitedUserIds])];
  const { data: allProfiles } =
    allProfileIds.length > 0
      ? await supabase.from("profiles").select("user_id, display_name").in("user_id", allProfileIds)
      : { data: [] };
  const profileMap = new Map((allProfiles ?? []).map((p) => [p.user_id, p.display_name]));

  for (const gp of all) {
    const game = (gp as any).games;
    (gp as any)._creator_name = profileMap.get(game.created_by) ?? "Anònim";
    let rivalName = rivalMap.get((gp as any).game_id) ?? null;
    if (!rivalName && game.status === "waiting" && game.invited_user_id) {
      if (game.created_by === userId && game.invited_user_id !== userId) {
        rivalName = profileMap.get(game.invited_user_id) ?? "Anònim";
      }
    }
    (gp as any)._rival_name = rivalName;
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const statusOrder: Record<string, number> = { playing: 0, hiding: 1, waiting: 2, finished: 3 };
  return all
    .filter((gp: any) => gp.games.status !== "finished" || gp.games.created_at > cutoff)
    .sort((a: any, b: any) => (statusOrder[a.games.status] ?? 9) - (statusOrder[b.games.status] ?? 9));
}

export async function deleteGame(gameId: string) {
  await supabase.from("game_players").delete().eq("game_id", gameId);
  const { error } = await supabase.from("games").delete().eq("id", gameId);
  if (error) throw error;
}

// ============================================
// HIDING PHASE
// ============================================

export async function hideObject(
  gameId: string,
  userId: string,
  objectId: string,
  itemId: string,
  position: Position,
  specialData?: any,
) {
  const [{ data: obj }, { data: itm }] = await Promise.all([
    supabase.from("objects").select("size, material").eq("id", objectId).single(),
    supabase.from("items").select("inner_capacity, environment, can_behind").eq("id", itemId).single(),
  ]);

  if (position === "dins") {
    const objSize = (obj as any)?.size ?? 2;
    const capacity = (itm as any)?.inner_capacity ?? 2;
    if (objSize > capacity) {
      throw new Error(tt("game.errors.objectTooBigInside"));
    }
  }

  if (position === "darrere" && (itm as any)?.can_behind === false) {
    throw new Error(tt("game.errors.cannotHideBehindThis"));
  }

  const material = (obj as any)?.material ?? "generic";
  const environment = (itm as any)?.environment ?? "generic";
  const blockReason = getMaterialBlockReason(material, environment);
  if (blockReason) {
    throw new Error(blockReason);
  }

  const updateData: any = {
    hidden_object_id: objectId,
    hidden_item_id: itemId,
    hidden_position: position,
    has_hidden: true,
  };
  if (specialData) updateData.special_data = specialData;

  const { error } = await supabase.from("game_players").update(updateData).eq("game_id", gameId).eq("user_id", userId);
  if (error) throw error;
}

// ============================================
// OBJECT SPECIALS
// ============================================

export async function getObjectSpecial(objectId: string) {
  const { data } = await supabase.from("object_specials").select("*").eq("object_id", objectId).maybeSingle();
  return data;
}

export async function autoFixMissingScenario(gameId: string, userId: string, hiddenItemId: string) {
  const scenarios = await getScenarios();
  const { data: hiddenItem } = await supabase.from("items").select("scenario_id").eq("id", hiddenItemId).single();
  const available = scenarios.filter((s) => s.id !== hiddenItem?.scenario_id);
  const random = available[Math.floor(Math.random() * available.length)];
  await supabase
    .from("game_players")
    .update({ current_scenario_id: random.id })
    .eq("game_id", gameId)
    .eq("user_id", userId);
  return random.id;
}

export async function checkBothPlayersHidden(gameId: string) {
  const { data, error } = await supabase.rpc("check_both_hidden" as any, { _game_id: gameId });
  if (error) throw error;
  return !!data;
}

export async function startGame(gameId: string) {
  const { error } = await supabase.rpc("start_game_setup" as any, { _game_id: gameId });
  if (error) throw new Error(error.message);
}

// ============================================
// SEARCH PHASE
// ============================================

export const TOKEN_COSTS = { move: 0.5, look: 0.3 } as const;

export async function ensureTokensReset(player: any) {
  const today = new Date().toISOString().split("T")[0];
  if (player.tokens_last_reset === today) return player.tokens_remaining;

  await supabase
    .from("game_players")
    .update({
      tokens_remaining: 4.0,
      tokens_last_reset: today,
      social_item_used_today: false,
    })
    .eq("id", player.id);

  return 4.0;
}

export async function redeemBonusTokens(gameId: string, userId: string, amount: number) {
  if (amount <= 0) throw new Error("Has de triar almenys 0.5 tokens!");
  const { data, error } = await supabase.rpc("redeem_bonus_tokens" as any, {
    _game_id: gameId,
    _amount: amount,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function performMove(
  gameId: string,
  playerId: string,
  action: "move" | "look" | "confirm",
  targetScenarioId?: string,
  targetItemId?: string,
  targetPosition?: Position,
  isStory?: boolean,
) {
  const { data, error } = await supabase.rpc("execute_game_move" as any, {
    _game_id: gameId,
    _action: action,
    _target_scenario_id: targetScenarioId ?? null,
    _target_item_id: targetItemId ?? null,
    _target_position: targetPosition ?? null,
    _is_story: isStory ?? false,
  });
  if (error) throw new Error(error.message);
  const result = data as any;
  return {
    move: { id: result.move_id },
    foundObject: result.found_object ?? false,
    foundBonus: result.found_bonus ?? null,
    bonusValue: result.bonus_value ?? null,
    bonusTokens: result.bonus_tokens ?? 0,
    cursed: result.cursed ?? false,
    tokensRemaining: result.tokens_remaining ?? 0,
    hintLevel: result.hint_level ?? null,
    toolFound: result.tool_found ?? null,
    trapHit: result.trap_hit ?? false,
    trapPenalty: result.trap_penalty ?? 0,
    barricade_hit: result.barricade_hit ?? false,
    barricade_extra_cost: result.barricade_extra_cost ?? 0,
  };
}

// ============================================
// SOCIAL ITEMS
// ============================================

export type SocialItemType = "banana" | "smoke_bomb" | "shield" | "message" | "espia" | "swap" | "robar_tornavis" | "robar_llanterna" | "barricada" | "trampa";

/**
 * Social item catalog. `nameKey`/`descKey` are i18n keys — translate at render with t().
 * `name`/`desc` keep CA fallback for places that build toast messages without i18n context.
 */
export const SOCIAL_ITEMS = [
  { type: "banana" as const, icon: "🍌", nameKey: "game.socialItems.banana.name", descKey: "game.socialItems.banana.desc", name: "Plàtan", desc: "Bloqueja 1 posició del rival" },
  { type: "smoke_bomb" as const, icon: "💣", nameKey: "game.socialItems.smoke_bomb.name", descKey: "game.socialItems.smoke_bomb.desc", name: "Bomba de fum", desc: "Mou el teu objecte a altra posició" },
  { type: "shield" as const, icon: "🛡️", nameKey: "game.socialItems.shield.name", descKey: "game.socialItems.shield.desc", name: "Escut", desc: "Bloqueja el pròxim atac (1 ús)" },
  { type: "swap" as const, icon: "🔄", nameKey: "game.socialItems.swap.name", descKey: "game.socialItems.swap.desc", name: "Intercanvi", desc: "Intercanvia la teva sala amb la del rival" },
  { type: "espia" as const, icon: "🕵️", nameKey: "game.socialItems.espia.name", descKey: "game.socialItems.espia.desc", name: "Espia", desc: "Descobreix on és el rival ara" },
  { type: "barricada" as const, icon: "🚧", nameKey: "game.socialItems.barricada.name", descKey: "game.socialItems.barricada.desc", name: "Barricada", desc: "Bloqueja un camí al rival. Pot forçar pagant +1🪙 (peatge únic) — 2/dia", multiUse: true },
  { type: "trampa" as const, icon: "🪤", nameKey: "game.socialItems.trampa.name", descKey: "game.socialItems.trampa.desc", name: "Trampa", desc: "Col·loca trampa en un moble (-1🪙 al rival si mira) — 2/dia", multiUse: true },
  { type: "message" as const, icon: "💡", nameKey: "game.socialItems.message.name", descKey: "game.socialItems.message.desc", name: "Pista personalitzada", desc: "Envia una pista o farol al rival" },
  { type: "robar_tornavis" as const, icon: "🔧", nameKey: "game.socialItems.robar_tornavis.name", descKey: "game.socialItems.robar_tornavis.desc", name: "Robar tornavís", desc: "Roba 1 tornavís al rival" },
  { type: "robar_llanterna" as const, icon: "🔦", nameKey: "game.socialItems.robar_llanterna.name", descKey: "game.socialItems.robar_llanterna.desc", name: "Robar llanterna", desc: "Roba 1 llanterna al rival" },
] as const;

/**
 * Costos socials ofensius (Wave B). Ítems defensius (shield, message, smoke_bomb,
 * robar_llanterna) = gratis. Sincronitzat amb RPC `consume_social_cost`.
 */
export const SOCIAL_COSTS: Record<SocialItemType, number> = {
  banana: 0.5,
  barricada: 0.5,
  trampa: 0.5,
  espia: 0.5,
  robar_tornavis: 0.5,
  swap: 1.0,
  shield: 0,
  message: 0,
  smoke_bomb: 0,
  robar_llanterna: 0,
};

export async function sendSocialItem(
  gameId: string,
  fromPlayerId: string,
  toPlayerId: string,
  itemType: SocialItemType,
  messageText?: string,
  extraData?: { scenarioFrom?: string; scenarioTo?: string; itemId?: string },
) {
  const { data: fromPlayer } = await supabase
    .from("game_players")
    .select("social_item_used_today, id, tokens_last_reset, smoke_bomb_used, special_data")
    .eq("game_id", gameId)
    .eq("user_id", fromPlayerId)
    .single();
  if (!fromPlayer) throw new Error(tt("game.errors.playerNotFound"));

  const today = new Date().toISOString().split("T")[0];
  const isBarricadaOrTrampa = itemType === "barricada" || itemType === "trampa";

  // Barricada/trampa have their own 2x/day limit checked in the RPC
  if (!isBarricadaOrTrampa && fromPlayer.tokens_last_reset === today && fromPlayer.social_item_used_today) {
    throw new Error(tt("game.errors.socialItemUsedToday"));
  }

  // Use safe RPC to read opponent data (SELECT restricted to own rows)
  const { data: safePlayers } = await supabase.rpc("get_safe_game_players" as any, { _game_id: gameId });
  const toPlayer = ((safePlayers as any[]) ?? []).find((p: any) => p.user_id === toPlayerId) ?? null;

  const blocked = !!(toPlayer?.shield_active && (itemType === "banana" || itemType === "swap" || itemType === "robar_tornavis" || itemType === "barricada"));

  const actualToPlayer = itemType === "espia" ? fromPlayerId : toPlayerId;

  let espiaResult: string | null = null;

  // Wave B: deduct social cost BEFORE any action (RPC handles validation + reset)
  const cost = SOCIAL_COSTS[itemType] ?? 0;
  if (cost > 0 && !blocked) {
    const { error: costErr } = await supabase.rpc("consume_social_cost" as any, {
      _game_id: gameId, _cost: cost,
    });
    if (costErr) throw new Error(costErr.message);
  }

  // Execute the action FIRST, before marking as used (so if it fails, the user can retry)
  if (blocked) {
    await supabase.from("game_players").update({ shield_active: false }).eq("id", toPlayer!.id);
  } else {
    if (itemType === "shield") {
      await supabase.from("game_players").update({ shield_active: true }).eq("id", fromPlayer.id);
    } else if (itemType === "smoke_bomb") {
      const { data: bombResult, error: bombErr } = await supabase.rpc("execute_smoke_bomb" as any, { _game_id: gameId });
      if (bombErr) throw new Error(bombErr.message);
      supabase.functions.invoke("send-push", {
        body: {
          user_ids: [toPlayerId],
          title: "💨 Bomba de fum",
          body: "El rival ha usat una bomba de fum! Ha mogut el seu objecte!",
          url: `/game/${gameId}`,
          tag: `social-${gameId}`,
        },
      }).catch(() => {});
      return { blocked: false, espiaResult: null, smokeBombResult: bombResult as any };
    } else if (itemType === "swap") {
      const { error: swapErr } = await supabase.rpc("execute_swap" as any, { _game_id: gameId });
      if (swapErr) throw new Error(swapErr.message);
    } else if (itemType === "espia") {
      const rivalScenarioId = toPlayer?.current_scenario_id;
      if (rivalScenarioId) {
        const { data: scenario } = await supabase
          .from("scenarios")
          .select("name, icon")
          .eq("id", rivalScenarioId)
          .single();
        if (scenario) espiaResult = `${scenario.icon} ${scenario.name}`;
        else espiaResult = "📍 Ubicació desconeguda";
      } else {
        espiaResult = "🤷 El rival encara no s'ha mogut!";
      }
    } else if (itemType === "robar_tornavis") {
      const { error: robarErr } = await supabase.rpc("execute_robar_tornavis" as any, { _game_id: gameId });
      if (robarErr) throw new Error(robarErr.message);
    } else if (itemType === "robar_llanterna") {
      const { error: robarErr } = await supabase.rpc("execute_robar_llanterna" as any, { _game_id: gameId });
      if (robarErr) throw new Error(robarErr.message);
      // RPC ja insereix a game_social_items, no marquem social_item_used_today (és gratis)
      return { blocked: false, espiaResult: null };
    } else if (itemType === "barricada") {
      if (!extraData?.scenarioFrom || !extraData?.scenarioTo) throw new Error(tt("game.errors.mustSelectPath"));
      const { data: barResult, error: barErr } = await supabase.rpc("execute_barricada" as any, {
        _game_id: gameId, _scenario_from: extraData.scenarioFrom, _scenario_to: extraData.scenarioTo,
      });
      if (barErr) throw new Error(barErr.message);
      if ((barResult as any)?.blocked) {
        return { blocked: true, espiaResult: null };
      }
      supabase.functions.invoke("send-push", {
        body: {
          user_ids: [toPlayerId],
          title: "🚧 Barricada!",
          body: "El rival ha barricadat un camí! Costa +1🪙 per forçar el pas.",
          url: `/game/${gameId}`, tag: `social-${gameId}`,
        },
      }).catch(() => {});
      return { blocked: false, espiaResult: null, barricadaResult: barResult as any };
    } else if (itemType === "trampa") {
      if (!extraData?.itemId) throw new Error("Has de seleccionar un moble!");
      const { data: trapResult, error: trapErr } = await supabase.rpc("execute_trampa" as any, {
        _game_id: gameId, _item_id: extraData.itemId,
      });
      if (trapErr) throw new Error(trapErr.message);
      supabase.functions.invoke("send-push", {
        body: {
          user_ids: [toPlayerId],
          title: "🪤 Trampa!",
          body: "El rival ha col·locat una trampa en algun moble...",
          url: `/game/${gameId}`, tag: `social-${gameId}`,
        },
      }).catch(() => {});
      return { blocked: false, espiaResult: null, trampaResult: trapResult as any };
    }
  }

  // Mark as used AFTER successful action (barricada/trampa use their own counter via RPC)
  if (!isBarricadaOrTrampa) {
    await supabase.from("game_players").update({ social_item_used_today: true }).eq("id", fromPlayer.id);
  }

  await supabase.from("game_social_items").insert({
    game_id: gameId,
    from_player_id: fromPlayerId,
    to_player_id: actualToPlayer,
    item_type: itemType as any,
    message_text: messageText,
    blocked_by_shield: blocked,
  });

  // Send push notification for social items (fire & forget)
  if (itemType !== "espia" && itemType !== "shield" && toPlayerId !== fromPlayerId) {
    const itemLabels: Record<string, string> = {
      banana: "🍌 Plàtan", smoke_bomb: "💨 Bomba de fum",
      message: "💬 Missatge", swap: "🔄 Intercanvi", robar_tornavis: "🔧 Robatori",
      barricada: "🚧 Barricada", trampa: "🪤 Trampa",
    };
    supabase.functions.invoke("send-push", {
      body: {
        user_ids: [toPlayerId],
        title: blocked ? "🛡️ Escut activat!" : (itemLabels[itemType] ?? "📦 Ítem social"),
        body: blocked
          ? "Un ítem social ha estat bloquejat pel teu escort!"
          : `Has rebut ${itemLabels[itemType] ?? "un ítem social"}${messageText ? `: ${messageText}` : ""}`,
        url: `/game/${gameId}`,
        tag: `social-${gameId}`,
      },
    }).catch(() => {});
  }

  return { blocked, espiaResult };
}

export async function getUnprocessedSocialItems(gameId: string, playerId: string) {
  const { data, error } = await supabase
    .from("game_social_items")
    .select("*")
    .eq("game_id", gameId)
    .eq("to_player_id", playerId)
    .eq("processed", false)
    .eq("blocked_by_shield", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function markSocialItemProcessed(itemId: string) {
  await supabase.from("game_social_items").update({ processed: true }).eq("id", itemId);
}

// ============================================
// INVENTORY
// ============================================

export async function getPlayerInventory(userId: string) {
  const { data, error } = await supabase
    .from("player_inventory")
    .select("*")
    .eq("user_id", userId)
    .is("gifted_to", null)
    .order("collected_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function giftInventoryItem(itemId: string, toUserId: string) {
  const { error } = await supabase
    .from("player_inventory")
    .update({ gifted_to: toUserId, gifted_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw error;
}
