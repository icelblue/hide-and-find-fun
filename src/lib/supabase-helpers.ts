import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase
    .from("games").select("*").eq("status", "waiting").order("created_at", { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Filter: not own games, and either no invite or invited to me
  const otherGames = data.filter(g =>
    g.created_by !== currentUserId &&
    (!g.invited_user_id || g.invited_user_id === currentUserId)
  );
  if (otherGames.length === 0) return [];

  const creatorIds = [...new Set(otherGames.map(g => g.created_by))];
  const { data: profiles } = await supabase
    .from("profiles").select("user_id, display_name").in("user_id", creatorIds);
  const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) ?? []);

  return otherGames.map(game => ({
    ...game,
    creator_name: profileMap.get(game.created_by) ?? "Anònim",
  }));
}

export async function findRandomMatch(userId: string): Promise<{ type: "joined" | "created"; gameId: string }> {
  // Try to join an existing public waiting game
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

  // No games available — create one and wait
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
  const { data } = await supabase
    .from("game_players")
    .select("game_id, games!inner(id, code, status, created_by, created_at)")
    .eq("user_id", userId);
  // Filter out old finished games (keep last 24h)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return (data ?? []).filter((gp: any) =>
    gp.games.status !== "finished" || gp.games.created_at > cutoff
  );
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
  position: "sobre" | "sota" | "dins"
) {
  const { error } = await supabase.from("game_players").update({
    hidden_object_id: objectId, hidden_item_id: itemId,
    hidden_position: position, has_hidden: true,
  }).eq("game_id", gameId).eq("user_id", userId);
  if (error) throw error;
}

export async function checkBothPlayersHidden(gameId: string) {
  const { data, error } = await supabase
    .from("game_players").select("has_hidden").eq("game_id", gameId);
  if (error) throw error;
  // Need exactly 2 players and both must have hidden
  return data?.length === 2 && data.every(p => p.has_hidden);
}

export async function startGame(gameId: string) {
  const scenarios = await getScenarios();
  const { data: players, error } = await supabase
    .from("game_players").select("user_id, hidden_item_id").eq("game_id", gameId);
  if (error) throw error;

  for (const player of players) {
    const { data: hiddenItem } = await supabase
      .from("items").select("scenario_id").eq("id", player.hidden_item_id!).single();

    const available = scenarios.filter(s => s.id !== hiddenItem?.scenario_id);
    const random = available[Math.floor(Math.random() * available.length)];

    await supabase.from("game_players")
      .update({ current_scenario_id: random.id })
      .eq("game_id", gameId).eq("user_id", player.user_id);
  }

  await supabase.from("games").update({ status: "playing" as const }).eq("id", gameId);
}

// ============================================
// SEARCH PHASE
// ============================================

export const TOKEN_COSTS = { move: 0.5, look: 0.3, confirm: 1.5 } as const;

async function ensureTokensReset(player: any) {
  const today = new Date().toISOString().split("T")[0];
  if (player.tokens_last_reset === today) return player.tokens_remaining;

  // Check for bonus tokens from sold rewards
  const { data: profile } = await supabase
    .from("profiles").select("*").eq("user_id", player.user_id).single();
  const bonus = profile?.bonus_tokens ?? 0;

  await supabase.from("game_players").update({
    tokens_remaining: 5.0 + bonus, tokens_last_reset: today, social_item_used_today: false,
  }).eq("id", player.id);

  if (bonus > 0) {
    await supabase.from("profiles").update({ bonus_tokens: 0 }).eq("user_id", player.user_id);
  }
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

  // LOOK: only checks bonus, NOT rival's object
  // CONFIRM: checks rival's object AND costs more
  if (action === "confirm" && targetItemId && targetPosition) {
    const { data: rival } = await supabase
      .from("game_players").select("hidden_item_id, hidden_position")
      .eq("game_id", gameId).neq("user_id", playerId).single();

    if (rival && targetItemId === rival.hidden_item_id && targetPosition === rival.hidden_position) {
      foundObject = true;
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

  return { move, foundObject, foundBonus, bonusValue, tokensRemaining: newTokens };
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
  { type: "message" as const, icon: "💬", name: "Missatge", desc: "Envia text al rival" },
] as const;

export async function sendSocialItem(
  gameId: string, fromPlayerId: string, toPlayerId: string,
  itemType: SocialItemType, messageText?: string
) {
  const { data: fromPlayer } = await supabase
    .from("game_players").select("social_item_used_today, id, tokens_last_reset")
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

  if (!blocked) {
    if (itemType === "shield") {
      await supabase.from("game_players")
        .update({ shield_active: true }).eq("id", fromPlayer.id);
    } else if (itemType === "smoke_bomb") {
      const { data: self } = await supabase
        .from("game_players").select("hidden_position, id")
        .eq("game_id", gameId).eq("user_id", fromPlayerId).single();
      if (self) {
        const all: ("sobre" | "sota" | "dins")[] = ["sobre", "sota", "dins"];
        const other = all.filter(p => p !== self.hidden_position);
        const newPos = other[Math.floor(Math.random() * other.length)];
        await supabase.from("game_players")
          .update({ hidden_position: newPos }).eq("id", self.id);
      }
    }
    if (toPlayer?.shield_active) {
      await supabase.from("game_players")
        .update({ shield_active: false }).eq("id", toPlayer.id);
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
