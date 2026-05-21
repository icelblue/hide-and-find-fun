import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async () => {
  try {
    const stats = {
      cleaned_finished_moves: 0,
      cleaned_finished_social: 0,
      deleted_stale_waiting: 0,
      deleted_stale_hiding: 0,
      deleted_stale_playing: 0,
      deleted_stale_moves: 0,
      deleted_stale_social: 0,
      deleted_stale_players: 0,
      deleted_stale_inventory: 0,
      deleted_player_rewards_sold: 0,
      deleted_wall_messages: 0,
      deleted_error_logs: 0,
      fixed_blocked_social_items: 0,
      deleted_old_backups: 0,
      deleted_finished_story_games: 0,
      deleted_pet_visits: 0,
      deleted_pet_notifications: 0,
    };

    // ─────────────────────────────────────────────
    // 1. FINISHED games > 7 days — clean moves & social items
    //    (keep recent finished games so players can see the action log)
    //    KEEP: games, game_players (stats), player_inventory (trophies), player_rewards
    // ─────────────────────────────────────────────
    const finishedCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: oldFinishedGames } = await supabase
      .from("games").select("id")
      .eq("status", "finished")
      .lt("updated_at", finishedCutoff);

    const finishedIds = (oldFinishedGames ?? []).map(g => g.id);

    if (finishedIds.length > 0) {
      for (let i = 0; i < finishedIds.length; i += 100) {
        const batch = finishedIds.slice(i, i + 100);

        const { data: moves } = await supabase.from("game_moves").delete()
          .in("game_id", batch).select("id");
        stats.cleaned_finished_moves += moves?.length ?? 0;

        const { data: social } = await supabase.from("game_social_items").delete()
          .in("game_id", batch).select("id");
        stats.cleaned_finished_social += social?.length ?? 0;
      }
    }

    // ─────────────────────────────────────────────
    // 2. Stale "waiting" games > 3 days — full delete
    // ─────────────────────────────────────────────
    const waitingCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleWaiting } = await supabase
      .from("games").select("id")
      .eq("status", "waiting")
      .lt("created_at", waitingCutoff);

    // ─────────────────────────────────────────────
    // 3. Stale "hiding" games > 7 days — full delete
    // ─────────────────────────────────────────────
    const hidingCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleHiding } = await supabase
      .from("games").select("id")
      .eq("status", "hiding")
      .lt("updated_at", hidingCutoff);

    // 3b. Stale "playing" games > 7 days — full delete (abandoned matches)
    const playingCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: stalePlaying } = await supabase
      .from("games").select("id")
      .eq("status", "playing")
      .eq("is_story", false)
      .lt("updated_at", playingCutoff);

    const staleIds = [
      ...(staleWaiting ?? []).map(g => g.id),
      ...(staleHiding ?? []).map(g => g.id),
      ...(stalePlaying ?? []).map(g => g.id),
    ];

    stats.deleted_stale_waiting = staleWaiting?.length ?? 0;
    stats.deleted_stale_hiding = staleHiding?.length ?? 0;
    stats.deleted_stale_playing = stalePlaying?.length ?? 0;

    if (staleIds.length > 0) {
      for (let i = 0; i < staleIds.length; i += 100) {
        const batch = staleIds.slice(i, i + 100);

        const { data: inv } = await supabase.from("player_inventory").delete()
          .in("game_id", batch).select("id");
        stats.deleted_stale_inventory += inv?.length ?? 0;

        const { data: moves } = await supabase.from("game_moves").delete()
          .in("game_id", batch).select("id");
        stats.deleted_stale_moves += moves?.length ?? 0;

        const { data: social } = await supabase.from("game_social_items").delete()
          .in("game_id", batch).select("id");
        stats.deleted_stale_social += social?.length ?? 0;

        const { data: players } = await supabase.from("game_players").delete()
          .in("game_id", batch).select("id");
        stats.deleted_stale_players += players?.length ?? 0;

        await supabase.from("games").delete().in("id", batch);
      }
    }

    // ─────────────────────────────────────────────
    // 2b. Finished story games > 1 day — full cleanup (no value keeping them)
    // ─────────────────────────────────────────────
    const storyCutoff = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const { data: finishedStory } = await supabase
      .from("games").select("id")
      .eq("status", "finished")
      .eq("is_story", true)
      .lt("updated_at", storyCutoff);

    const storyIds = (finishedStory ?? []).map(g => g.id);
    stats.deleted_finished_story_games = storyIds.length;

    if (storyIds.length > 0) {
      for (let i = 0; i < storyIds.length; i += 100) {
        const batch = storyIds.slice(i, i + 100);
        await supabase.from("game_moves").delete().in("game_id", batch);
        await supabase.from("game_players").delete().in("game_id", batch);
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
    // 6. Error logs > 14 days (reduced from 30)
    // ─────────────────────────────────────────────
    const errorCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
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

    // ─────────────────────────────────────────────
    // 9. Pet visits resolved > 24 hours
    // ─────────────────────────────────────────────
    const petVisitCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: deletedPetVisits } = await supabase
      .from("pet_visits")
      .delete()
      .not("resolved_at", "is", null)
      .lt("resolved_at", petVisitCutoff)
      .select("id");
    stats.deleted_pet_visits = deletedPetVisits?.length ?? 0;

    // ─────────────────────────────────────────────
    // 10. Pet notifications > 7 days
    // ─────────────────────────────────────────────
    const petNotifCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: deletedPetNotifs } = await supabase
      .from("pet_notifications")
      .delete()
      .lt("created_at", petNotifCutoff)
      .select("id");
    stats.deleted_pet_notifications = deletedPetNotifs?.length ?? 0;

    // ─────────────────────────────────────────────
    // 11. Clean old backups in storage (keep last 6)
    // ─────────────────────────────────────────────
    const { data: backupFiles } = await supabase.storage
      .from("backups")
      .list("", { sortBy: { column: "created_at", order: "asc" } });

    if (backupFiles && backupFiles.length > 6) {
      const toDelete = backupFiles.slice(0, backupFiles.length - 6).map(f => f.name);
      await supabase.storage.from("backups").remove(toDelete);
      stats.deleted_old_backups = toDelete.length;
    }

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
