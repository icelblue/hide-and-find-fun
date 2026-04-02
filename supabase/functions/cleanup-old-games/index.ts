import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async () => {
  try {
    const stats = {
      deleted_finished_games: 0,
      deleted_stale_waiting: 0,
      deleted_stale_hiding: 0,
      deleted_game_moves: 0,
      deleted_game_social_items: 0,
      deleted_game_players: 0,
      deleted_player_inventory: 0,
      deleted_player_rewards_sold: 0,
      deleted_wall_messages: 0,
      deleted_error_logs: 0,
      fixed_blocked_social_items: 0,
    };

    // ─────────────────────────────────────────────
    // 1. ALL finished games — immediate full cascade delete
    // ─────────────────────────────────────────────
    const { data: allFinished } = await supabase
      .from("games").select("id")
      .eq("status", "finished");

    // ─────────────────────────────────────────────
    // 2. Stale "waiting" games > 3 days (never joined)
    // ─────────────────────────────────────────────
    const waitingCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleWaiting } = await supabase
      .from("games").select("id")
      .eq("status", "waiting")
      .lt("created_at", waitingCutoff);

    // ─────────────────────────────────────────────
    // 3. Stale "hiding" games > 7 days (started but never played)
    // ─────────────────────────────────────────────
    const hidingCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleHiding } = await supabase
      .from("games").select("id")
      .eq("status", "hiding")
      .lt("updated_at", hidingCutoff);

    // Collect all game IDs to purge
    const allGameIds = [
      ...(allFinished ?? []).map(g => g.id),
      ...(staleWaiting ?? []).map(g => g.id),
      ...(staleHiding ?? []).map(g => g.id),
    ];

    stats.deleted_finished_games = allFinished?.length ?? 0;
    stats.deleted_stale_waiting = staleWaiting?.length ?? 0;
    stats.deleted_stale_hiding = staleHiding?.length ?? 0;

    if (allGameIds.length > 0) {
      for (let i = 0; i < allGameIds.length; i += 100) {
        const batch = allGameIds.slice(i, i + 100);

        // Delete transient inventory (keep special_trophy — permanent collectible)
        const { data: inv } = await supabase.from("player_inventory").delete()
          .in("game_id", batch)
          .neq("item_type", "special_trophy")
          .select("id");
        stats.deleted_player_inventory += inv?.length ?? 0;

        // Delete game moves
        const { data: moves } = await supabase.from("game_moves").delete()
          .in("game_id", batch).select("id");
        stats.deleted_game_moves += moves?.length ?? 0;

        // Delete ALL social items for these games
        const { data: social } = await supabase.from("game_social_items").delete()
          .in("game_id", batch).select("id");
        stats.deleted_game_social_items += social?.length ?? 0;

        // Delete game players
        const { data: players } = await supabase.from("game_players").delete()
          .in("game_id", batch).select("id");
        stats.deleted_game_players += players?.length ?? 0;

        // Finally delete the games themselves
        await supabase.from("games").delete().in("id", batch);
      }
    }

    // ─────────────────────────────────────────────
    // 4. Sold rewards > 30 days
    // ─────────────────────────────────────────────
    const soldCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: soldRewards } = await supabase.from("player_rewards").delete()
      .eq("status", "sold")
      .lt("obtained_at", soldCutoff)
      .select("id");
    stats.deleted_player_rewards_sold = soldRewards?.length ?? 0;

    // ─────────────────────────────────────────────
    // 5. Wall messages > 22 hours
    // ─────────────────────────────────────────────
    const wallCutoff = new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString();
    const { data: deletedWall } = await supabase
      .from("wall_messages").delete()
      .lt("created_at", wallCutoff)
      .select("id");
    stats.deleted_wall_messages = deletedWall?.length ?? 0;

    // ─────────────────────────────────────────────
    // 6. Error logs > 30 days
    // ─────────────────────────────────────────────
    const errorCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: deletedErrors } = await supabase
      .from("error_logs").delete()
      .lt("created_at", errorCutoff)
      .select("id");
    stats.deleted_error_logs = deletedErrors?.length ?? 0;

    // ─────────────────────────────────────────────
    // 7. Fix orphan social items
    // ─────────────────────────────────────────────
    const { data: fixedBlocked } = await supabase
      .from("game_social_items")
      .update({ processed: true })
      .eq("blocked_by_shield", true)
      .eq("processed", false)
      .select("id");
    stats.fixed_blocked_social_items = fixedBlocked?.length ?? 0;

    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
