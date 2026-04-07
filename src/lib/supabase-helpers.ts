// ============================================================
// supabase-helpers.ts — Lògica de negoci completa del joc
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
import { parseTools, type PlayerTools, type ToolType } from "@/lib/game-types";

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

/** Display name for materials in UI */
export const MATERIAL_LABELS: Record<string, string> = {
  generic: "Genèric",
  paper: "Paper",
  glass: "Vidre",
  metal: "Metall",
  plastic: "Plàstic",
  fabric: "Roba",
  wood: "Fusta",
  cardboard: "Cartró",
  rubber: "Goma",
  ceramic: "Ceràmica",
  electronic: "Electrònic",
  leather: "Cuir",
  stone: "Pedra",
  food: "Menjar",
};

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
  return data;
}

export async function getItemsByScenario(scenarioId: string) {
  const { data, error } = await supabase.from("items").select("*").eq("scenario_id", scenarioId).order("display_order");
  if (error) throw error;
  return data;
}

export async function getItemInteractions(itemIds: string[]) {
  if (itemIds.length === 0) return [];
  const { data, error } = await supabase
    .from("item_interactions")
    .select("*")
    .in("item_id", itemIds)
    .order("display_order");
  if (error) throw error;
  return data ?? [];
}

// ============================================
// TAG-BASED INTERACTIONS (Netejar, Trencar, Arreglar)
// ============================================

export const TAG_ACTIONS = {
  dirty: { icon: "🧹", label: "Netejar", cost: 0.2, requiresTool: "drap" as const },
  breakable: { icon: "💥", label: "Trencar", cost: 0.3, requiresTool: "martell" as const },
  broken: { icon: "🔧", label: "Arreglar", cost: 0.2, requiresTool: "tornavis" as const },
} as const;

// Outdoor scenarios: start dark (need illumination)
export const OUTDOOR_SCENARIOS = ["Jardí", "Balcó"];

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

/** Get tag-based actions available for an item given player's tools and game state */
export function getTagActions(
  item: any,
  playerTools: Record<string, number>,
  gameBreaks: Set<string>,
  dirtyItems?: Set<string>,
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

  if (tags.includes("breakable") && !gameBreaks.has(item.id)) {
    const cfg = TAG_ACTIONS.breakable;
    actions.push({
      tag: "breakable",
      ...cfg,
      hasTool: (playerTools.martell ?? 0) > 0,
      actionKey: `break:${item.id}`,
    });
  }

  return actions;
}

// Shared tool pool per game
export const TOOLS_PER_GAME: Record<ToolType, number> = {
  martell: 5,
  drap: 2,
  llanterna: 1,
  tornavis: 5,
};

/** Get how many of each tool have been found in this game (both players combined) */
async function getToolsFoundInGame(gameId: string): Promise<Record<ToolType, number>> {
  const { data: players } = await supabase.rpc("get_safe_game_players" as any, { _game_id: gameId });

  const totals: Record<ToolType, number> = { martell: 0, drap: 0, llanterna: 0, tornavis: 0 };
  for (const p of (players as any[]) ?? []) {
    const t = parseTools(p.tools);
    totals.martell += t.martell;
    totals.drap += t.drap;
    totals.llanterna += t.llanterna;
    totals.tornavis += Math.max(0, t.tornavis - 1); // -1 for the starting one
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
 * We look at tag:light_off / tag:light_on moves.
 * Outdoor scenarios without any light_on move are considered dark.
 */
export function isIlluminated(
  scenarioId: string,
  scenarioName: string,
  allTagMoves: Array<{ bonus_value: string | null }>,
): boolean {
  const isOutdoor = OUTDOOR_SCENARIOS.includes(scenarioName);
  // Default: indoor=ON, outdoor=OFF
  let lit = !isOutdoor;
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
  const { data, error } = await supabase.from("objects").select("*").order("display_order");
  if (error) throw error;
  return data;
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
  return game;
}

export async function joinGame(gameId: string, userId: string) {
  const { data: existing } = await supabase
    .from("game_players")
    .select("id")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) throw new Error("Ja ets a aquesta partida!");

  const { data: game } = await supabase.from("games").select("id, status, invited_user_id").eq("id", gameId).single();
  if (!game) throw new Error("Partida no trobada");
  if (game.status !== "waiting") throw new Error("Aquesta partida ja ha començat");

  if (game.invited_user_id && game.invited_user_id !== userId) {
    throw new Error("Aquesta partida és un repte privat!");
  }

  const { data: playerCount } = await supabase.rpc("count_game_players" as any, { _game_id: gameId });
  if ((playerCount ?? 0) >= 2) throw new Error("La partida ja està plena!");

  const { error } = await supabase.from("game_players").insert({ game_id: gameId, user_id: userId });
  if (error) throw error;

  await supabase
    .from("games")
    .update({ status: "hiding" as const })
    .eq("id", gameId);
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
    .select("game_id, games!inner(id, code, status, created_by, created_at, invited_user_id, is_story)")
    .eq("user_id", userId);

  const { data: pendingInvites } = await supabase
    .from("games")
    .select("id, code, status, created_by, created_at, invited_user_id, is_story")
    .eq("status", "waiting")
    .eq("invited_user_id", userId);

  const joinedIds = new Set((joined ?? []).map((gp: any) => gp.game_id));
  const pendingFormatted = (pendingInvites ?? [])
    .filter((g) => !joinedIds.has(g.id))
    .map((g) => ({ game_id: g.id, games: g, _pending: true }));

  const all = [...(joined ?? []).map((gp: any) => ({ ...gp, _pending: false })), ...pendingFormatted]
    .filter((gp: any) => !(gp.games as any).is_story);

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
  position: "sobre" | "sota" | "dins",
  specialData?: any,
) {
  const [{ data: obj }, { data: itm }] = await Promise.all([
    supabase.from("objects").select("size, material").eq("id", objectId).single(),
    supabase.from("items").select("inner_capacity, environment").eq("id", itemId).single(),
  ]);

  if (position === "dins") {
    const objSize = (obj as any)?.size ?? 2;
    const capacity = (itm as any)?.inner_capacity ?? 2;
    if (objSize > capacity) {
      throw new Error("L'objecte és massa gran per amagar-lo dins d'aquest moble! Tria una altra posició.");
    }
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
      tokens_remaining: 5.0,
      tokens_last_reset: today,
      social_item_used_today: false,
    })
    .eq("id", player.id);

  return 5.0;
}

export async function redeemBonusTokens(gameId: string, userId: string, amount: number) {
  if (amount <= 0) throw new Error("Has de triar almenys 1 token!");

  const { data: profile } = await supabase.from("profiles").select("bonus_tokens").eq("user_id", userId).single();
  const available = profile?.bonus_tokens ?? 0;
  if (available <= 0) throw new Error("No tens bonus tokens disponibles!");
  if (amount > available) throw new Error(`Només tens ${available} bonus tokens!`);

  const { data: player } = await supabase
    .from("game_players")
    .select("id, tokens_remaining, bonus_tokens_added")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .single();
  if (!player) throw new Error("No ets a aquesta partida!");

  await supabase
    .from("game_players")
    .update({
      tokens_remaining: player.tokens_remaining + amount,
      bonus_tokens_added: (player as any).bonus_tokens_added + amount,
    })
    .eq("id", player.id);

  await supabase
    .from("profiles")
    .update({ bonus_tokens: available - amount })
    .eq("user_id", userId);

  return amount;
}

export async function performMove(
  gameId: string,
  playerId: string,
  action: "move" | "look" | "confirm",
  targetScenarioId?: string,
  targetItemId?: string,
  targetPosition?: "sobre" | "sota" | "dins",
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
    tokensRemaining: result.tokens_remaining ?? 0,
    hintLevel: result.hint_level ?? null,
  };
}

// ============================================
// SOCIAL ITEMS
// ============================================

export type SocialItemType = "banana" | "smoke_bomb" | "shield" | "message" | "espia" | "swap" | "robar_tornavis";

export const SOCIAL_ITEMS = [
  { type: "banana" as const, icon: "🍌", name: "Plàtan", desc: "Bloqueja 1 posició del rival" },
  { type: "smoke_bomb" as const, icon: "💣", name: "Bomba de fum", desc: "Mou el teu objecte a altra posició" },
  { type: "shield" as const, icon: "🛡️", name: "Escut", desc: "Bloqueja el pròxim plàtan o intercanvi (1 ús)" },
  { type: "swap" as const, icon: "🔄", name: "Intercanvi", desc: "Intercanvia la teva posició amb la del rival" },
  { type: "espia" as const, icon: "🕵️", name: "Espia", desc: "Descobreix on és el rival ara" },
  { type: "message" as const, icon: "💡", name: "Pista personalitzada", desc: "Envia una pista o farol al rival" },
  { type: "robar_tornavis" as const, icon: "🔧", name: "Robar tornavís", desc: "Roba 1 tornavís al rival" },
] as const;

export async function sendSocialItem(
  gameId: string,
  fromPlayerId: string,
  toPlayerId: string,
  itemType: SocialItemType,
  messageText?: string,
) {
  const { data: fromPlayer } = await supabase
    .from("game_players")
    .select("social_item_used_today, id, tokens_last_reset, smoke_bomb_used")
    .eq("game_id", gameId)
    .eq("user_id", fromPlayerId)
    .single();
  if (!fromPlayer) throw new Error("Jugador no trobat");

  const today = new Date().toISOString().split("T")[0];
  if (fromPlayer.tokens_last_reset === today && fromPlayer.social_item_used_today) {
    throw new Error("Ja has usat el teu ítem social avui! 😉");
  }

  // Use safe RPC to read opponent data (SELECT restricted to own rows)
  const { data: safePlayers } = await supabase.rpc("get_safe_game_players" as any, { _game_id: gameId });
  const toPlayer = ((safePlayers as any[]) ?? []).find((p: any) => p.user_id === toPlayerId) ?? null;

  const blocked = !!(toPlayer?.shield_active && (itemType === "banana" || itemType === "swap" || itemType === "robar_tornavis"));

  const actualToPlayer = itemType === "espia" ? fromPlayerId : toPlayerId;

  let espiaResult: string | null = null;

  await supabase.from("game_players").update({ social_item_used_today: true }).eq("id", fromPlayer.id);

  if (blocked) {
    await supabase.from("game_players").update({ shield_active: false }).eq("id", toPlayer!.id);
  } else {
    if (itemType === "shield") {
      await supabase.from("game_players").update({ shield_active: true }).eq("id", fromPlayer.id);
    } else if (itemType === "smoke_bomb") {
      if (fromPlayer.smoke_bomb_used) {
        throw new Error("Ja has usat la bomba de fum en aquesta partida!");
      }
      const { data: self } = await supabase
        .from("game_players")
        .select("hidden_item_id, hidden_position, id")
        .eq("game_id", gameId)
        .eq("user_id", fromPlayerId)
        .single();
      if (self && self.hidden_item_id) {
        const { data: currentItem } = await supabase
          .from("items").select("scenario_id").eq("id", self.hidden_item_id).single();
        const allScenarios = await getScenarios();
        const otherScenarios = allScenarios.filter(s => s.id !== currentItem?.scenario_id);
        if (otherScenarios.length === 0) throw new Error("No hi ha altres escenaris disponibles!");
        const newScenario = otherScenarios[Math.floor(Math.random() * otherScenarios.length)];
        const newItems = await getItemsByScenario(newScenario.id);
        if (newItems.length === 0) throw new Error("L'escenari destí no té mobles!");
        const newItem = newItems[Math.floor(Math.random() * newItems.length)];
        const allPos: ("sobre" | "sota" | "dins")[] = ["sobre", "sota", "dins"];
        const validPos = allPos.filter(p => p !== "dins" || (newItem.inner_capacity ?? 2) >= 2);
        const newPos = validPos[Math.floor(Math.random() * validPos.length)];
        await supabase
          .from("game_players")
          .update({ hidden_item_id: newItem.id, hidden_position: newPos, smoke_bomb_used: true })
          .eq("id", self.id);
        await supabase.from("game_social_items").insert({
          game_id: gameId,
          from_player_id: fromPlayerId,
          to_player_id: fromPlayerId,
          item_type: "message" as const,
          message_text: `💣 Bomba de fum! El teu objecte s'ha mogut a ${newScenario.icon} ${newScenario.name} → ${newItem.icon} ${newItem.name} (${newPos})`,
        });
      }
    } else if (itemType === "swap") {
      const { data: sender } = await supabase
        .from("game_players")
        .select("id, current_scenario_id")
        .eq("game_id", gameId)
        .eq("user_id", fromPlayerId)
        .single();
      if (sender && toPlayer) {
        await Promise.all([
          supabase.from("game_players")
            .update({ current_scenario_id: toPlayer.current_scenario_id })
            .eq("id", sender.id),
          supabase.from("game_players")
            .update({ current_scenario_id: sender.current_scenario_id })
            .eq("id", toPlayer.id),
        ]);
      }
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
      const { data: rivalPlayer } = await supabase
        .from("game_players")
        .select("id, tools")
        .eq("game_id", gameId)
        .eq("user_id", toPlayerId)
        .single();
      if (rivalPlayer) {
        const rivalTools = parseTools(rivalPlayer.tools);
        if (rivalTools.tornavis > 0) {
          rivalTools.tornavis -= 1;
          await supabase.from("game_players").update({ tools: rivalTools }).eq("id", rivalPlayer.id);
          const { data: selfPlayer } = await supabase
            .from("game_players")
            .select("id, tools")
            .eq("game_id", gameId)
            .eq("user_id", fromPlayerId)
            .single();
          if (selfPlayer) {
            const selfTools = parseTools(selfPlayer.tools);
            selfTools.tornavis += 1;
            await supabase.from("game_players").update({ tools: selfTools }).eq("id", selfPlayer.id);
          }
        } else {
          throw new Error("El rival no té cap tornavís per robar! 🔧");
        }
      }
    }
  }

  await supabase.from("game_social_items").insert({
    game_id: gameId,
    from_player_id: fromPlayerId,
    to_player_id: actualToPlayer,
    item_type: itemType,
    message_text: messageText,
    blocked_by_shield: blocked,
  });

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
