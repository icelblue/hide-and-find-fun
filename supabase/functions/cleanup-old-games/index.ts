import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async () => {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get old finished games
    const { data: oldGames } = await supabase
      .from("games")
      .select("id")
      .eq("status", "finished")
      .lt("updated_at", cutoff);

    if (!oldGames || oldGames.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const gameIds = oldGames.map((g) => g.id);

    // Delete related data (but NOT player_inventory or player_rewards)
    // Delete transient inventory items (bonuses) from old games, keep special_trophy
    await supabase.from("player_inventory").delete()
      .in("game_id", gameIds)
      .neq("item_type", "special_trophy");

    await supabase.from("game_moves").delete().in("game_id", gameIds);
    await supabase.from("game_social_items").delete().in("game_id", gameIds);
    await supabase.from("game_players").delete().in("game_id", gameIds);
    await supabase.from("games").delete().in("id", gameIds);

    // Clean up expired wall messages (older than 22 hours)
    const wallCutoff = new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString();
    const { data: deletedWall } = await supabase
      .from("wall_messages").delete()
      .lt("created_at", wallCutoff)
      .select("id");

    return new Response(
      JSON.stringify({
        deleted_games: gameIds.length,
        deleted_wall_messages: deletedWall?.length ?? 0,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
