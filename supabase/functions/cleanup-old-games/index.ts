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
    await supabase.from("game_moves").delete().in("game_id", gameIds);
    await supabase.from("game_social_items").delete().in("game_id", gameIds);
    await supabase.from("game_players").delete().in("game_id", gameIds);
    await supabase.from("games").delete().in("id", gameIds);

    return new Response(
      JSON.stringify({ deleted: gameIds.length, ids: gameIds }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
