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

  // Update game status to hiding phase
  await supabase
    .from("games")
    .update({ status: "hiding" as const })
    .eq("id", gameId);
}

export async function getAvailableGames() {
  const { data, error } = await supabase
    .from("games")
    .select(`
      *,
      profiles:created_by(display_name)
    `)
    .eq("status", "waiting")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
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
  return data?.every((p) => p.has_hidden) ?? false;
}

export async function startGame(gameId: string, scenarioId: string) {
  // Get all scenarios for random assignment
  const scenarios = await getScenarios();
  const players = await supabase
    .from("game_players")
    .select("user_id, hidden_item_id")
    .eq("game_id", gameId);

  if (players.error) throw players.error;

  // Assign random starting scenarios (different from where they hid)
  for (const player of players.data) {
    const hiddenItem = await supabase
      .from("items")
      .select("scenario_id")
      .eq("id", player.hidden_item_id!)
      .single();

    const availableScenarios = scenarios.filter(
      (s) => s.id !== hiddenItem.data?.scenario_id
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
  // Get current player state
  const { data: player, error: playerError } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_id", gameId)
    .eq("user_id", playerId)
    .single();
  if (playerError) throw playerError;

  // Check token reset
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
    throw new Error("No tens prou tokens!");
  }

  // Get turn number
  const { count } = await supabase
    .from("game_moves")
    .select("*", { count: "exact", head: true })
    .eq("game_id", gameId)
    .eq("player_id", playerId);

  const turnNumber = (count ?? 0) + 1;

  // Check if found object
  let foundObject = false;
  let foundBonus: string | null = null;
  let bonusValue: string | null = null;

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
      targetPosition === rival.hidden_position
    ) {
      if (action === "confirm") {
        foundObject = true;
      }
    }

    // Check for bonus
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
          tokensRemaining += parseFloat(bonus.value ?? "1");
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

  // Deduct tokens
  await supabase
    .from("game_players")
    .update({ tokens_remaining: tokensRemaining - cost + (foundBonus === "extra_token" ? parseFloat(bonusValue ?? "0") : 0) })
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

  // If found object, end game
  if (foundObject) {
    await supabase
      .from("games")
      .update({ status: "finished" as const, winner_id: playerId })
      .eq("id", gameId);

    // Profile stats updated via trigger or manually later
  }

  return { move, foundObject, foundBonus, bonusValue, tokensRemaining: tokensRemaining - cost };
}
