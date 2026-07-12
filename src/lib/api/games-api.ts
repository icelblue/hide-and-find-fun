// ============================================================
// Cicle de vida de partides: crear, unir-se, amagar, començar
import { supabase } from "@/integrations/supabase/client";
// ============================================================
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

  const { data: playerCount } = await supabase.rpc("count_game_players", { _game_id: gameId });
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
  const [{ data: joined }, { data: pendingInvites }] = await Promise.all([
    supabase
      .from("game_players")
      .select("game_id, games!inner(id, code, status, created_by, created_at, invited_user_id, game_mode)")
      .eq("user_id", userId),
    supabase
      .from("games")
      .select("id, code, status, created_by, created_at, invited_user_id, game_mode")
      .eq("status", "waiting")
      .eq("invited_user_id", userId),
  ]);

  const joinedIds = new Set((joined ?? []).map((gp) => gp.game_id));
  const pendingFormatted = (pendingInvites ?? [])
    .filter((g) => !joinedIds.has(g.id))
    .map((g) => ({ game_id: g.id, games: g, _pending: true }));

  const all = [...(joined ?? []).map((gp) => ({ ...gp, _pending: false })), ...pendingFormatted];

  const allGameIds = all.map((gp) => gp.game_id);
  const creatorIds = [...new Set(all.map((gp) => gp.games.created_by))];

  const rivalMap = new Map<string, string>();
  const rivalUserIds: string[] = [];
  if (allGameIds.length > 0) {
    const { data: allPlayers } = await supabase.rpc("get_game_participants", { _game_ids: allGameIds });
    const filteredPlayers = ((allPlayers as Record<string, unknown>[]) ?? []).filter((p) => p.user_id !== userId);
    rivalUserIds.push(...new Set(filteredPlayers.map((p) => p.user_id as string)));
    for (const p of filteredPlayers) rivalMap.set(p.game_id, p.user_id);
  }

  const invitedUserIds = [
    ...new Set(
      all
        .filter(
          (gp: any) => gp.games.status === "waiting" && gp.games.invited_user_id && gp.games.invited_user_id !== userId,
        )
        .map((gp) => gp.games.invited_user_id),
    ),
  ];
  const allProfileIds = [...new Set([...creatorIds, ...invitedUserIds, ...rivalUserIds])];
  const { data: allProfiles } =
    allProfileIds.length > 0
      ? await supabase.from("profiles").select("user_id, display_name").in("user_id", allProfileIds)
      : { data: [] };
  const profileMap = new Map((allProfiles ?? []).map((p) => [p.user_id, p.display_name]));

  for (const gp of all) {
    const game = gp.games;
    gp._creator_name = profileMap.get(game.created_by) ?? "Anònim";
    const rivalId = rivalMap.get(gp.game_id) ?? null;
    let rivalName = rivalId ? profileMap.get(rivalId) ?? "Anònim" : null;
    if (!rivalName && game.status === "waiting" && game.invited_user_id) {
      if (game.created_by === userId && game.invited_user_id !== userId) {
        rivalName = profileMap.get(game.invited_user_id) ?? "Anònim";
      }
    }
    gp._rival_name = rivalName;
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const statusOrder: Record<string, number> = { playing: 0, hiding: 1, waiting: 2, finished: 3 };
  return all
    .filter((gp) => gp.games.status !== "finished" || gp.games.created_at > cutoff)
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
    const objSize = obj?.size ?? 2;
    const capacity = itm?.inner_capacity ?? 2;
    if (objSize > capacity) {
      throw new Error(tt("game.errors.objectTooBigInside"));
    }
  }

  if (position === "darrere" && itm?.can_behind === false) {
    throw new Error(tt("game.errors.cannotHideBehindThis"));
  }

  const material = obj?.material ?? "generic";
  const environment = itm?.environment ?? "generic";
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
  const { data, error } = await supabase.rpc("check_both_hidden", { _game_id: gameId });
  if (error) throw error;
  return !!data;
}

export async function startGame(gameId: string) {
  const { error } = await supabase.rpc("start_game_setup", { _game_id: gameId });
  if (error) throw new Error(error.message);
}

