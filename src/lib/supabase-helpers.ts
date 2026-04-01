import { supabase } from "@/integrations/supabase/client";

// ============================================
// MATERIAL vs ENVIRONMENT VALIDATION
// ============================================

/** Returns a user-facing block reason if material can't go in environment, or null if OK */
export function getMaterialBlockReason(material: string, environment: string): string | null {
  if (environment === "generic") return null; // interior — tot hi cap

  // Full compatibility matrix: environment → material → reason (null = OK)
  const rules: Record<string, Record<string, string>> = {
    paper: {
      wet: "es mullaria 💧",
      hot: "es cremaria 🔥",
      dirty: "es faria malbé 🗑️",
      outdoor: "volaria amb el vent 🌬️",
      sorrenc: "s'enterraria 🏜️",
      ventós: "volaria 💨",
      submergit: "es desfaria 🌊",
      químic: "es disoldria ☣️",
    },
    glass: {
      hot: "es trencaria amb la calor 🔥",
      frozen: "es trencaria amb el gel 🧊",
      ventós: "es cauria 💨",
      submergit: "✅", // OK actually — glass is fine underwater
      químic: "✅",    // glass resists chemicals
    },
    fabric: {
      wet: "es pudriria 💧",
      hot: "es cremaria 🔥",
      dirty: "s'embrutiria 🗑️",
      frozen: "s'enrigiria 🧊",
      sorrenc: "s'ompliria de sorra 🏜️",
      ventós: "s'enredaria 💨",
      submergit: "flotaria 🌊",
      químic: "es corroeria ☣️",
    },
    metal: {
      wet: "s'oxidaria 💧",
      submergit: "s'oxidaria 🌊",
      químic: "es corroeria ☣️",
    },
    plastic: {
      hot: "es fondria 🔥",
      frozen: "es trencaria 🧊",
    },
    wood: {
      wet: "es podriria 💧",
      hot: "es cremaria 🔥",
      frozen: "es contrauria 🧊",
      submergit: "flotaria 🌊",
      químic: "es corroeria ☣️",
    },
    cardboard: {
      wet: "es desfaria 💧",
      hot: "es cremaria 🔥",
      dirty: "es faria malbé 🗑️",
      outdoor: "volaria amb el vent 🌬️",
      sorrenc: "s'enterraria 🏜️",
      ventós: "volaria 💨",
      submergit: "es desfaria 🌊",
      químic: "es disoldria ☣️",
    },
    rubber: {
      hot: "es fondria 🔥",
      frozen: "s'enduria 🧊",
    },
    ceramic: {
      frozen: "es trencaria 🧊",
      ventós: "es cauria 💨",
    },
    electronic: {
      wet: "es faria malbé 💧",
      dirty: "es taparien els ports 🗑️",
      outdoor: "es mullaria 🌬️",
      frozen: "bateria morta 🧊",
      sorrenc: "s'ompliria de sorra 🏜️",
      submergit: "es faria malbé 🌊",
      químic: "es corroia ☣️",
    },
    leather: {
      wet: "taques d'humitat 💧",
      hot: "es ressecaria 🔥",
      dirty: "s'embrutiria 🗑️",
      frozen: "es trencaria 🧊",
      submergit: "es podriria 🌊",
      químic: "es corroeria ☣️",
    },
    stone: {
      // Stone is resistant to almost everything
    },
  };

  // Remove false positives (marked ✅ in the matrix for clarity)
  const reason = rules[material]?.[environment];
  if (!reason || reason === "✅") return null;
  return reason;
}

// ============================================
// DATA FETCHING
// ============================================

export function generateGameCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
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

export async function getObjects() {
  const { data, error } = await supabase.from("objects").select("*").order("display_order");
  if (error) throw error;
  return data;
}

export async function getConnectedScenarios(scenarioId: string) {
  // Query both directions: A→B and B→A
  const [{ data: forward, error: e1 }, { data: reverse, error: e2 }] = await Promise.all([
    supabase
      .from("scenario_connections")
      .select("scenario_b")
      .eq("scenario_a", scenarioId),
    supabase
      .from("scenario_connections")
      .select("scenario_a")
      .eq("scenario_b", scenarioId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const connectedIds = [
    ...(forward ?? []).map(c => c.scenario_b),
    ...(reverse ?? []).map(c => c.scenario_a),
  ];
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

  const { data: game, error: gameError } = await supabase
    .from("games").insert(insertData).select().single();
  if (gameError) throw gameError;

  const { error: playerError } = await supabase
    .from("game_players").insert({ game_id: game.id, user_id: userId });
  if (playerError) throw playerError;
  return game;
}

export async function joinGame(gameId: string, userId: string) {
  // Check not already joined
  const { data: existing } = await supabase
    .from("game_players").select("id").eq("game_id", gameId).eq("user_id", userId).maybeSingle();
  if (existing) throw new Error("Ja ets a aquesta partida!");

  // Check game is waiting
  const { data: game } = await supabase
    .from("games").select("id, status, invited_user_id").eq("id", gameId).single();
  if (!game) throw new Error("Partida no trobada");
  if (game.status !== "waiting") throw new Error("Aquesta partida ja ha començat");

  // If it's a private challenge, only the invited user can join
  if (game.invited_user_id && game.invited_user_id !== userId) {
    throw new Error("Aquesta partida és un repte privat!");
  }

  // Check game has room
  const { count } = await supabase
    .from("game_players").select("*", { count: "exact", head: true }).eq("game_id", gameId);
  if ((count ?? 0) >= 2) throw new Error("La partida ja està plena!");

  const { error } = await supabase
    .from("game_players").insert({ game_id: gameId, user_id: userId });
  if (error) throw error;

  await supabase.from("games").update({ status: "hiding" as const }).eq("id", gameId);
}

export async function getAvailableGames(currentUserId: string) {
  // Only show PUBLIC games (no invited_user_id) — challenges are private
  const { data, error } = await supabase
    .from("games").select("*")
    .eq("status", "waiting")
    .is("invited_user_id", null)
    .neq("created_by", currentUserId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const creatorIds = [...new Set(data.map(g => g.created_by))];
  const { data: profiles } = await supabase
    .from("profiles").select("user_id, display_name").in("user_id", creatorIds);
  const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) ?? []);

  return data.map(game => ({
    ...game,
    creator_name: profileMap.get(game.created_by) ?? "Anònim",
  }));
}

export async function findRandomMatch(userId: string): Promise<{ type: "joined" | "created"; gameId: string }> {
  // Try to join an existing public waiting game first
  const { data: available } = await supabase
    .from("games").select("id")
    .eq("status", "waiting")
    .neq("created_by", userId)
    .is("invited_user_id", null)
    .order("created_at", { ascending: true })
    .limit(1);

  if (available && available.length > 0) {
    await joinGame(available[0].id, userId);
    return { type: "joined", gameId: available[0].id };
  }

  // No public games — find a random active player and challenge them
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

  // No other players at all — create public game
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
  // 1. Games I'm already a player in
  const { data: joined } = await supabase
    .from("game_players")
    .select("game_id, games!inner(id, code, status, created_by, created_at, invited_user_id)")
    .eq("user_id", userId);

  // 2. Games where I'm invited but haven't joined yet
  const { data: pendingInvites } = await supabase
    .from("games")
    .select("id, code, status, created_by, created_at, invited_user_id")
    .eq("status", "waiting")
    .eq("invited_user_id", userId);

  // Combine: convert pending invites to same shape, mark as pending
  const joinedIds = new Set((joined ?? []).map((gp: any) => gp.game_id));
  const pendingFormatted = (pendingInvites ?? [])
    .filter(g => !joinedIds.has(g.id))
    .map(g => ({ game_id: g.id, games: g, _pending: true }));

  const all = [...(joined ?? []).map((gp: any) => ({ ...gp, _pending: false })), ...pendingFormatted];

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const statusOrder: Record<string, number> = { playing: 0, hiding: 1, waiting: 2, finished: 3 };
  return all
    .filter((gp: any) => gp.games.status !== "finished" || gp.games.created_at > cutoff)
    .sort((a: any, b: any) => (statusOrder[a.games.status] ?? 9) - (statusOrder[b.games.status] ?? 9));
}

export async function deleteGame(gameId: string) {
  // Delete players first, then game
  await supabase.from("game_players").delete().eq("game_id", gameId);
  const { error } = await supabase.from("games").delete().eq("id", gameId);
  if (error) throw error;
}

// ============================================
// HIDING PHASE
// ============================================

export async function hideObject(
  gameId: string, userId: string, objectId: string, itemId: string,
  position: "sobre" | "sota" | "dins",
  specialData?: any
) {
  const [{ data: obj }, { data: itm }] = await Promise.all([
    supabase.from("objects").select("size, material").eq("id", objectId).single(),
    supabase.from("items").select("inner_capacity, environment").eq("id", itemId).single(),
  ]);

  // Validate size restriction for "dins"
  if (position === "dins") {
    const objSize = (obj as any)?.size ?? 2;
    const capacity = (itm as any)?.inner_capacity ?? 2;
    if (objSize > capacity) {
      throw new Error("L'objecte és massa gran per amagar-lo dins d'aquest moble! Tria una altra posició.");
    }
  }

  // Validate material vs environment
  const material = (obj as any)?.material ?? "generic";
  const environment = (itm as any)?.environment ?? "generic";
  const blockReason = getMaterialBlockReason(material, environment);
  if (blockReason) {
    throw new Error(blockReason);
  }

  const updateData: any = {
    hidden_object_id: objectId, hidden_item_id: itemId,
    hidden_position: position, has_hidden: true,
  };
  if (specialData) updateData.special_data = specialData;

  const { error } = await supabase.from("game_players").update(updateData)
    .eq("game_id", gameId).eq("user_id", userId);
  if (error) throw error;
}

// ============================================
// OBJECT SPECIALS
// ============================================

export async function getObjectSpecial(objectId: string) {
  const { data } = await supabase
    .from("object_specials").select("*").eq("object_id", objectId).maybeSingle();
  return data;
}

export async function autoFixMissingScenario(gameId: string, userId: string, hiddenItemId: string) {
  const scenarios = await getScenarios();
  const { data: hiddenItem } = await supabase
    .from("items").select("scenario_id").eq("id", hiddenItemId).single();
  const available = scenarios.filter(s => s.id !== hiddenItem?.scenario_id);
  const random = available[Math.floor(Math.random() * available.length)];
  await supabase.from("game_players")
    .update({ current_scenario_id: random.id })
    .eq("game_id", gameId).eq("user_id", userId);
  return random.id;
}

export async function checkBothPlayersHidden(gameId: string) {
  const { data, error } = await supabase
    .from("game_players").select("has_hidden").eq("game_id", gameId);
  if (error) throw error;
  // Need exactly 2 players and both must have hidden
  return data?.length === 2 && data.every(p => p.has_hidden);
}

export async function startGame(gameId: string) {
  // Assign starting scenarios to ALL players BEFORE changing status
  const scenarios = await getScenarios();
  const { data: players, error } = await supabase
    .from("game_players").select("user_id, hidden_item_id, current_scenario_id").eq("game_id", gameId);
  if (error) throw error;

  // Only assign scenarios to players who don't have one yet
  for (const player of players) {
    if (player.current_scenario_id) continue; // already assigned (by another call)
    const { data: hiddenItem } = await supabase
      .from("items").select("scenario_id").eq("id", player.hidden_item_id!).single();

    const available = scenarios.filter(s => s.id !== hiddenItem?.scenario_id);
    const random = available[Math.floor(Math.random() * available.length)];

    await supabase.from("game_players")
      .update({ current_scenario_id: random.id })
      .eq("game_id", gameId).eq("user_id", player.user_id);
  }

  // Only transition status if still in hiding (prevents double-transition)
  await supabase.from("games")
    .update({ status: "playing" as const })
    .eq("id", gameId)
    .in("status", ["hiding", "waiting"]);
}

// ============================================
// SEARCH PHASE
// ============================================

export const TOKEN_COSTS = { move: 0.5, look: 0.3, confirm: 1.5 } as const;

export async function ensureTokensReset(player: any) {
  const today = new Date().toISOString().split("T")[0];
  if (player.tokens_last_reset === today) return player.tokens_remaining;

  // Bonus tokens are a permanent daily boost (accumulated from selling rewards)
  // They apply to ALL active games equally — no race condition
  const { data: profile } = await supabase
    .from("profiles").select("bonus_tokens").eq("user_id", player.user_id).single();
  const bonus = profile?.bonus_tokens ?? 0;

  await supabase.from("game_players").update({
    tokens_remaining: 5.0 + bonus, tokens_last_reset: today, social_item_used_today: false,
  }).eq("id", player.id);

  return 5.0 + bonus;
}

export async function performMove(
  gameId: string, playerId: string,
  action: "move" | "look" | "confirm",
  targetScenarioId?: string, targetItemId?: string,
  targetPosition?: "sobre" | "sota" | "dins"
) {
  const { data: player, error: playerError } = await supabase
    .from("game_players").select("*").eq("game_id", gameId).eq("user_id", playerId).single();
  if (playerError) throw playerError;

  let tokensRemaining = await ensureTokensReset(player);
  const cost = TOKEN_COSTS[action];
  if (tokensRemaining < cost) {
    throw new Error(`No tens prou tokens! Necessites ${cost}, tens ${tokensRemaining}`);
  }

  const { count } = await supabase
    .from("game_moves").select("*", { count: "exact", head: true })
    .eq("game_id", gameId).eq("player_id", playerId);
  const turnNumber = (count ?? 0) + 1;

  let foundObject = false;
  let foundBonus: string | null = null;
  let bonusValue: string | null = null;
  let bonusTokens = 0;
  let hintLevel: number | null = null; // 0=cold, 1=warm(right scenario), 2=hot(right item)

  // Get rival's hidden info for both look and confirm
  const { data: rival } = await supabase
    .from("game_players").select("hidden_item_id, hidden_position")
    .eq("game_id", gameId).neq("user_id", playerId).single();

  // CONFIRM: checks rival's object AND costs more
  if (action === "confirm" && targetItemId && targetPosition) {
    if (rival && targetItemId === rival.hidden_item_id && targetPosition === rival.hidden_position) {
      foundObject = true;
    }
  }

  // LOOK: gives progressive hints + checks bonus
  if (action === "look" && targetItemId && targetPosition && rival) {
    // Get the scenario of the rival's hidden item
    const { data: rivalHiddenItem } = await supabase
      .from("items").select("scenario_id").eq("id", rival.hidden_item_id!).single();
    // Get scenario of the item we're looking at
    const { data: targetItem } = await supabase
      .from("items").select("scenario_id").eq("id", targetItemId).single();

    if (rivalHiddenItem && targetItem) {
      if (targetItem.scenario_id !== rivalHiddenItem.scenario_id) {
        hintLevel = 0; // Cold - wrong scenario
      } else if (targetItemId !== rival.hidden_item_id) {
        hintLevel = 1; // Warm - right scenario, wrong item
      } else if (targetPosition !== rival.hidden_position) {
        hintLevel = 2; // Hot - right item, wrong position!
      } else {
        hintLevel = 2; // Also hot (but they'd need confirm to actually find it)
      }
    }
  }

  // Both look and confirm check for bonus
  if ((action === "look" || action === "confirm") && targetItemId && targetPosition) {
    const { data: bonus } = await supabase
      .from("scenario_bonuses").select("*")
      .eq("item_id", targetItemId).eq("position", targetPosition).maybeSingle();

    if (bonus) {
      foundBonus = bonus.bonus_type;
      bonusValue = bonus.value;
      if (bonus.bonus_type === "extra_token") {
        bonusTokens = parseFloat(bonus.value ?? "1");
      }

      // Save to inventory
      await supabase.from("player_inventory").insert({
        user_id: playerId, game_id: gameId,
        item_type: bonus.bonus_type, item_value: bonus.value,
      });
    }
  }

  if (action === "move" && targetScenarioId) {
    // Validate connection exists
    // Validate connection in either direction
    const [{ data: fwd }, { data: rev }] = await Promise.all([
      supabase.from("scenario_connections").select("id")
        .eq("scenario_a", player.current_scenario_id).eq("scenario_b", targetScenarioId).maybeSingle(),
      supabase.from("scenario_connections").select("id")
        .eq("scenario_a", targetScenarioId).eq("scenario_b", player.current_scenario_id).maybeSingle(),
    ]);
    if (!fwd && !rev) throw new Error("No pots anar a aquesta habitació des d'aquí!");

    await supabase.from("game_players")
      .update({ current_scenario_id: targetScenarioId }).eq("id", player.id);
  }

  const newTokens = tokensRemaining - cost + bonusTokens;
  await supabase.from("game_players")
    .update({ tokens_remaining: newTokens }).eq("id", player.id);

  const { data: move, error: moveError } = await supabase.from("game_moves").insert({
    game_id: gameId, player_id: playerId, turn_number: turnNumber,
    action, token_cost: cost, target_scenario_id: targetScenarioId,
    target_item_id: targetItemId, target_position: targetPosition,
    found_object: foundObject, found_bonus: foundBonus as any, bonus_value: bonusValue,
  }).select().single();
  if (moveError) throw moveError;

  if (foundObject) {
    await supabase.from("games")
      .update({ status: "finished" as const, winner_id: playerId }).eq("id", gameId);
  }

  return { move, foundObject, foundBonus, bonusValue, tokensRemaining: newTokens, hintLevel };
}

// ============================================
// SOCIAL ITEMS
// ============================================

export type SocialItemType = "banana" | "smoke_bomb" | "false_clue" | "shield" | "message";

export const SOCIAL_ITEMS = [
  { type: "banana" as const, icon: "🍌", name: "Plàtan", desc: "Pantalla borrosa del rival 3s" },
  { type: "smoke_bomb" as const, icon: "💣", name: "Bomba de fum", desc: "Mou el teu objecte a altra posició" },
  { type: "false_clue" as const, icon: "🔮", name: "Pista falsa", desc: "Indicador fals al rival" },
  { type: "shield" as const, icon: "🛡️", name: "Escut", desc: "Bloqueja el pròxim ítem social" },
  { type: "message" as const, icon: "💡", name: "Pista personalitzada", desc: "Envia una pista o farol al rival" },
] as const;

export async function sendSocialItem(
  gameId: string, fromPlayerId: string, toPlayerId: string,
  itemType: SocialItemType, messageText?: string
) {
  const { data: fromPlayer } = await supabase
    .from("game_players").select("social_item_used_today, id, tokens_last_reset, smoke_bomb_used")
    .eq("game_id", gameId).eq("user_id", fromPlayerId).single();
  if (!fromPlayer) throw new Error("Jugador no trobat");

  const today = new Date().toISOString().split("T")[0];
  if (fromPlayer.tokens_last_reset === today && fromPlayer.social_item_used_today) {
    throw new Error("Ja has usat el teu ítem social avui! 😉");
  }

  const { data: toPlayer } = await supabase
    .from("game_players").select("shield_active, id")
    .eq("game_id", gameId).eq("user_id", toPlayerId).single();

  const blocked = !!(toPlayer?.shield_active && itemType !== "shield");

  await supabase.from("game_social_items").insert({
    game_id: gameId, from_player_id: fromPlayerId, to_player_id: toPlayerId,
    item_type: itemType, message_text: messageText, blocked_by_shield: blocked,
  });

  await supabase.from("game_players")
    .update({ social_item_used_today: true }).eq("id", fromPlayer.id);

  if (blocked) {
    // Shield blocked this item — deactivate shield after use
    await supabase.from("game_players")
      .update({ shield_active: false }).eq("id", toPlayer!.id);
  } else {
    if (itemType === "shield") {
      // Shield activates on the SENDER (protects yourself)
      await supabase.from("game_players")
        .update({ shield_active: true }).eq("id", fromPlayer.id);
    } else if (itemType === "smoke_bomb") {
      // Check if already used this game
      if (fromPlayer.smoke_bomb_used) {
        throw new Error("Ja has usat la bomba de fum en aquesta partida!");
      }
      const { data: self } = await supabase
        .from("game_players").select("hidden_position, id")
        .eq("game_id", gameId).eq("user_id", fromPlayerId).single();
      if (self) {
        const all: ("sobre" | "sota" | "dins")[] = ["sobre", "sota", "dins"];
        const other = all.filter(p => p !== self.hidden_position);
        const newPos = other[Math.floor(Math.random() * other.length)];
        await supabase.from("game_players")
          .update({ hidden_position: newPos, smoke_bomb_used: true }).eq("id", self.id);
      }
    }
  }

  return { blocked };
}

export async function getUnprocessedSocialItems(gameId: string, playerId: string) {
  const { data, error } = await supabase
    .from("game_social_items").select("*")
    .eq("game_id", gameId).eq("to_player_id", playerId)
    .eq("processed", false).eq("blocked_by_shield", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function markSocialItemProcessed(itemId: string) {
  await supabase.from("game_social_items")
    .update({ processed: true }).eq("id", itemId);
}

// ============================================
// INVENTORY
// ============================================

export async function getPlayerInventory(userId: string) {
  const { data, error } = await supabase
    .from("player_inventory").select("*")
    .eq("user_id", userId).is("gifted_to", null)
    .order("collected_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function giftInventoryItem(itemId: string, toUserId: string) {
  const { error } = await supabase.from("player_inventory")
    .update({ gifted_to: toUserId, gifted_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw error;
}
