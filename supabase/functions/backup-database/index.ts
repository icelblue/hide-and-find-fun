import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Tables to backup — ordered by importance
const CRITICAL_TABLES = [
  "profiles",
  "player_inventory",
  "player_rewards",
  "reward_items",
  "games",
  "game_players",
];

const CONFIG_TABLES = [
  "scenarios",
  "scenario_connections",
  "items",
  "objects",
  "object_specials",
  "object_traits",
];

// Transient data — only backup if recent (last 7 days of active games)
const TRANSIENT_TABLES = [
  "game_moves",
  "game_social_items",
];

// Skip entirely (not worth backing up)
// wall_messages: TTL 22h, cleaned by cron
// error_logs: cleaned after 30 days
// scenario_bonuses: legacy, replaced by random bonuses

async function exportTable(tableName: string): Promise<{ name: string; rows: number; data: Record<string, unknown>[] }> {
  const allRows: Record<string, unknown>[] = [];
  let from = 0;
  const PAGE = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(from, from + PAGE - 1);
    
    if (error) throw new Error(`Error reading ${tableName}: ${error.message}`);
    if (!data || data.length === 0) break;
    
    allRows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  
  return { name: tableName, rows: allRows.length, data: allRows };
}

Deno.serve(async () => {
  try {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    const backupData: Record<string, unknown> = {
      created_at: new Date().toISOString(),
      version: "2.0",
      tables: {},
    };
    const stats: Record<string, number> = {};

    // Export critical + config tables (full backup)
    const fullTables = [...CRITICAL_TABLES, ...CONFIG_TABLES];
    
    for (const table of fullTables) {
      const result = await exportTable(table);
      (backupData.tables as Record<string, unknown>)[table] = result.data;
      stats[table] = result.rows;
    }

    // Export transient tables (only from active games to save space)
    const { data: activeGames } = await supabase
      .from("games").select("id")
      .in("status", ["playing", "hiding"]);
    const activeIds = (activeGames ?? []).map(g => g.id);

    for (const table of TRANSIENT_TABLES) {
      if (activeIds.length > 0) {
        const allRows: Record<string, unknown>[] = [];
        for (let i = 0; i < activeIds.length; i += 100) {
          const batch = activeIds.slice(i, i + 100);
          const { data } = await supabase.from(table).select("*").in("game_id", batch);
          if (data) allRows.push(...data);
        }
        (backupData.tables as Record<string, unknown>)[table] = allRows;
        stats[table] = allRows.length;
      } else {
        (backupData.tables as Record<string, unknown>)[table] = [];
        stats[table] = 0;
      }
    }

    // Upload as JSON to storage
    const fileName = `backup-${timestamp}.json`;
    const jsonStr = JSON.stringify(backupData);
    const jsonBlob = new Blob([jsonStr], { type: "application/json" });
    
    const { error: uploadError } = await supabase.storage
      .from("backups")
      .upload(fileName, jsonBlob, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Clean up old backups — keep last 8 (≈2 months of weekly)
    const { data: files } = await supabase.storage
      .from("backups")
      .list("", { sortBy: { column: "created_at", order: "asc" } });

    let cleaned = 0;
    if (files && files.length > 6) {
      const toDelete = files.slice(0, files.length - 6).map(f => f.name);
      await supabase.storage.from("backups").remove(toDelete);
      cleaned = toDelete.length;
    }

    const sizeKB = Math.round(jsonStr.length / 1024);

    return new Response(JSON.stringify({
      status: "ok",
      file: fileName,
      size_kb: sizeKB,
      tables: stats,
      total_rows: Object.values(stats).reduce((a, b) => a + b, 0),
      old_backups_cleaned: cleaned,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
