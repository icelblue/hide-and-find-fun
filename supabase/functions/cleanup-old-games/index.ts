import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async () => {
  try {
    let deletedGames = 0;

    // 1. Clean up old finished games (>7 days)
    const gameCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: oldGames } = await supabase
      .from("games")
      .select("id")
      .eq("status", "finished")
      .lt("updated_at", gameCutoff);

    if (oldGames && oldGames.length > 0) {
      const gameIds = oldGames.map((g) => g.id);

      // Delete transient inventory (bonuses), keep special_trophy
      await supabase.from("player_inventory").delete()
        .in("game_id", gameIds)
        .neq("item_type", "special_trophy");

      await supabase.from("game_moves").delete().in("game_id", gameIds);
      await supabase.from("game_social_items").delete().in("game_id", gameIds);
      await supabase.from("game_players").delete().in("game_id", gameIds);
      await supabase.from("games").delete().in("id", gameIds);
      deletedGames = gameIds.length;
    }

    // 2. Clean up expired wall messages (>22 hours)
    const wallCutoff = new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString();
    const { data: deletedWall } = await supabase
      .from("wall_messages").delete()
      .lt("created_at", wallCutoff)
      .select("id");

    return new Response(
      JSON.stringify({
        deleted_games: deletedGames,
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
