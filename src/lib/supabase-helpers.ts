import { supabase } from "@/integrations/supabase/client";

export function generateGameCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function getScenarios() {
  const { data, error } = await supabase
    .from("scenarios")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return data;
}

export async function getItemsByScenario(scenarioId: string) {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("scenario_id", scenarioId)
    .order("display_order");
  if (error) throw error;
  return data;
}

export async function getObjects() {
  const { data, error } = await supabase
    .from("objects")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return data;
}

export async function createGame(userId: string) {
  const code = generateGameCode();
  const { data: game, error: gameError } = await supabase
    .from("games")
    .insert({ code, created_by: userId })
    .select()
    .single();
  if (gameError) throw gameError;

  const { error: playerError } = await supabase
    .from("game_players")
    .insert({ game_id: game.id, user_id: userId });
  if (playerError) throw playerError;

  return game;
}

export async function joinGame(gameId: string, userId: string) {
  const { error } = await supabase
    .from("game_players")
    .insert({ game_id: gameId, user_id: userId });
  if (error) throw error;

  await supabase
    .from("games")
    .update({ status: "hiding" as const })
    .eq("id", gameId);
}

export async function getAvailableGames() {
  // Can't do profiles:created_by join since created_by FK is to auth.users not profiles
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("status", "waiting")
    .order("created_at", { ascending: false });
  if (error) throw error;

  // Fetch creator display names separately
  if (!data || data.length === 0) return data;
  
  const creatorIds = [...new Set(data.map(g => g.created_by))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", creatorIds);

  const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) ?? []);

  return data.map(game => ({
    ...game,
    creator_name: profileMap.get(game.created_by) ?? "Anònim",
  }));
}

export async function hideObject(
  gameId: string,
  userId: string,
  objectId: string,
  itemId: string,
  position: "sobre" | "sota" | "dins"
) {
  const { error } = await supabase
    .from("game_players")
    .update({
      hidden_object_id: objectId,
      hidden_item_id: itemId,
      hidden_position: position,
      has_hidden: true,
    })
    .eq("game_id", gameId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function checkBothPlayersHidden(gameId: string) {
  const { data, error } = await supabase
    .from("game_players")
    .select("has_hidden, user_id")
    .eq("game_id", gameId);
  if (error) throw error;
  if (!data || data.length < 2) return false;
  return data.every((p) => p.has_hidden);
}

export async function startGame(gameId: string, scenarioId: string) {
  const scenarios = await getScenarios();
  const { data: players, error } = await supabase
    .from("game_players")
    .select("user_id, hidden_item_id")
    .eq("game_id", gameId);
  if (error) throw error;

  for (const player of players) {
    const { data: hiddenItem } = await supabase
      .from("items")
      .select("scenario_id")
      .eq("id", player.hidden_item_id!)
      .single();

    const availableScenarios = scenarios.filter(
      (s) => s.id !== hiddenItem?.scenario_id
    );
    const randomScenario =
      availableScenarios[Math.floor(Math.random() * availableScenarios.length)];

    await supabase
      .from("game_players")
      .update({ current_scenario_id: randomScenario.id })
      .eq("game_id", gameId)
      .eq("user_id", player.user_id);
  }

  await supabase
    .from("games")
    .update({ status: "playing" as const, scenario_id: scenarioId })
    .eq("id", gameId);
}

export const TOKEN_COSTS = {
  move: 0.5,
  look: 0.3,
  confirm: 1.5,
} as const;

export async function performMove(
  gameId: string,
  playerId: string,
  action: "move" | "look" | "confirm",
  targetScenarioId?: string,
  targetItemId?: string,
  targetPosition?: "sobre" | "sota" | "dins"
) {
  const { data: player, error: playerError } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_id", gameId)
    .eq("user_id", playerId)
    .single();
  if (playerError) throw playerError;

  // Token daily reset
  const today = new Date().toISOString().split("T")[0];
  let tokensRemaining = player.tokens_remaining;
  if (player.tokens_last_reset !== today) {
    tokensRemaining = 5.0;
    await supabase
      .from("game_players")
      .update({ tokens_remaining: 5.0, tokens_last_reset: today, social_item_used_today: false })
      .eq("id", player.id);
  }

  const cost = TOKEN_COSTS[action];
  if (tokensRemaining < cost) {
    throw new Error(`No tens prou tokens! Necessites ${cost}, tens ${tokensRemaining}`);
  }

  // Turn number
  const { count } = await supabase
    .from("game_moves")
    .select("*", { count: "exact", head: true })
    .eq("game_id", gameId)
    .eq("player_id", playerId);
  const turnNumber = (count ?? 0) + 1;

  let foundObject = false;
  let foundBonus: string | null = null;
  let bonusValue: string | null = null;
  let bonusTokens = 0;

  if (action === "look" || action === "confirm") {
    // Check rival's hidden object
    const { data: rival } = await supabase
      .from("game_players")
      .select("hidden_item_id, hidden_position, hidden_object_id")
      .eq("game_id", gameId)
      .neq("user_id", playerId)
      .single();

    if (
      rival &&
      targetItemId === rival.hidden_item_id &&
      targetPosition === rival.hidden_position &&
      action === "confirm"
    ) {
      foundObject = true;
    }

    // Check for bonus at this position
    if (targetItemId && targetPosition) {
      const { data: bonus } = await supabase
        .from("scenario_bonuses")
        .select("*")
        .eq("item_id", targetItemId)
        .eq("position", targetPosition)
        .maybeSingle();

      if (bonus) {
        foundBonus = bonus.bonus_type;
        bonusValue = bonus.value;
        if (bonus.bonus_type === "extra_token") {
          bonusTokens = parseFloat(bonus.value ?? "1");
        }
      }
    }
  }

  // Update scenario if moving
  if (action === "move" && targetScenarioId) {
    await supabase
      .from("game_players")
      .update({ current_scenario_id: targetScenarioId })
      .eq("id", player.id);
  }

  // Deduct tokens + add bonus (fixed: no double-counting)
  const newTokens = tokensRemaining - cost + bonusTokens;
  await supabase
    .from("game_players")
    .update({ tokens_remaining: newTokens })
    .eq("id", player.id);

  // Record move
  const { data: move, error: moveError } = await supabase
    .from("game_moves")
    .insert({
      game_id: gameId,
      player_id: playerId,
      turn_number: turnNumber,
      action,
      token_cost: cost,
      target_scenario_id: targetScenarioId,
      target_item_id: targetItemId,
      target_position: targetPosition,
      found_object: foundObject,
      found_bonus: foundBonus as any,
      bonus_value: bonusValue,
    })
    .select()
    .single();
  if (moveError) throw moveError;

  // End game if found
  if (foundObject) {
    await supabase
      .from("games")
      .update({ status: "finished" as const, winner_id: playerId })
      .eq("id", gameId);
  }

  return { move, foundObject, foundBonus, bonusValue, tokensRemaining: newTokens };
}

// ============================================
// SOCIAL ITEMS
// ============================================

export type SocialItemType = "banana" | "smoke_bomb" | "false_clue" | "shield" | "message";

export const SOCIAL_ITEMS = [
  {
    type: "banana" as const,
    icon: "🍌",
    name: "Plàtan",
    desc: "El rival veu la pantalla borrosa 3s",
    effect: "Distracció visual al rival",
  },
  {
    type: "smoke_bomb" as const,
    icon: "💣",
    name: "Bomba de fum",
    desc: "Mou el teu objecte a una altra posició del mateix moble",
    effect: "Canvia posició de l'objecte",
  },
  {
    type: "false_clue" as const,
    icon: "🔮",
    name: "Pista falsa",
    desc: "El rival veu un ítem fals marcat com a 'sospitós'",
    effect: "Confusió al rival",
  },
  {
    type: "shield" as const,
    icon: "🛡️",
    name: "Escut",
    desc: "Bloqueja el pròxim ítem social que et llancin",
    effect: "Protecció durant la partida",
  },
  {
    type: "message" as const,
    icon: "💬",
    name: "Missatge",
    desc: "Envia un missatge al rival (ell decideix si el llegeix)",
    effect: "Comunicació / ment games",
  },
] as const;

export async function sendSocialItem(
  gameId: string,
  fromPlayerId: string,
  toPlayerId: string,
  itemType: SocialItemType,
  messageText?: string
) {
  // Check if already used today
  const { data: fromPlayer } = await supabase
    .from("game_players")
    .select("social_item_used_today, id, tokens_last_reset")
    .eq("game_id", gameId)
    .eq("user_id", fromPlayerId)
    .single();

  if (!fromPlayer) throw new Error("Jugador no trobat");

  // Reset if new day
  const today = new Date().toISOString().split("T")[0];
  if (fromPlayer.tokens_last_reset !== today) {
    await supabase
      .from("game_players")
      .update({ social_item_used_today: false, tokens_last_reset: today })
      .eq("id", fromPlayer.id);
  } else if (fromPlayer.social_item_used_today) {
    throw new Error("Ja has usat el teu ítem social avui! Torna demà 😉");
  }

  // Check rival's shield
  const { data: toPlayer } = await supabase
    .from("game_players")
    .select("shield_active, id")
    .eq("game_id", gameId)
    .eq("user_id", toPlayerId)
    .single();

  const blockedByShield = toPlayer?.shield_active && itemType !== "shield";

  // Record the social item
  const { error } = await supabase
    .from("game_social_items")
    .insert({
      game_id: gameId,
      from_player_id: fromPlayerId,
      to_player_id: toPlayerId,
      item_type: itemType,
      message_text: messageText,
      blocked_by_shield: blockedByShield ?? false,
    });
  if (error) throw error;

  // Mark as used today
  await supabase
    .from("game_players")
    .update({ social_item_used_today: true })
    .eq("id", fromPlayer.id);

  // Apply effects if not blocked
  if (!blockedByShield) {
    if (itemType === "shield") {
      // Activate own shield
      await supabase
        .from("game_players")
        .update({ shield_active: true })
        .eq("id", fromPlayer.id);
    } else if (itemType === "smoke_bomb") {
      // Move object to different position within same item
      const { data: selfPlayer } = await supabase
        .from("game_players")
        .select("hidden_position, id")
        .eq("game_id", gameId)
        .eq("user_id", fromPlayerId)
        .single();

      if (selfPlayer) {
        const allPositions: ("sobre" | "sota" | "dins")[] = ["sobre", "sota", "dins"];
        const otherPositions = allPositions.filter(p => p !== selfPlayer.hidden_position);
        const newPos = otherPositions[Math.floor(Math.random() * otherPositions.length)];
        await supabase
          .from("game_players")
          .update({ hidden_position: newPos })
          .eq("id", selfPlayer.id);
      }
    }
    // banana and false_clue effects are handled client-side
    // If rival had shield, deactivate it
    if (toPlayer?.shield_active && itemType !== "shield") {
      await supabase
        .from("game_players")
        .update({ shield_active: false })
        .eq("id", toPlayer.id);
    }
  }

  return { blockedByShield };
}

export async function getReceivedSocialItems(gameId: string, playerId: string) {
  const { data, error } = await supabase
    .from("game_social_items")
    .select("*")
    .eq("game_id", gameId)
    .eq("to_player_id", playerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
