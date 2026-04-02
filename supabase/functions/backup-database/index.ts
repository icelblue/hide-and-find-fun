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
  "scenario_bonuses",
  "items",
  "objects",
  "object_specials",
  "object_traits",
];

const TRANSIENT_TABLES = [
  "game_moves",
  "game_social_items",
  "wall_messages",
  "error_logs",
];

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
      version: "1.0",
      tables: {},
    };
    const stats: Record<string, number> = {};

    // Export all tables
    const allTables = [...CRITICAL_TABLES, ...CONFIG_TABLES, ...TRANSIENT_TABLES];
    
    for (const table of allTables) {
      const result = await exportTable(table);
      (backupData.tables as Record<string, unknown>)[table] = result.data;
      stats[table] = result.rows;
    }

    // Upload as JSON to storage
    const fileName = `backup-${timestamp}.json`;
    const jsonBlob = new Blob([JSON.stringify(backupData)], { type: "application/json" });
    
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

    if (files && files.length > 8) {
      const toDelete = files.slice(0, files.length - 8).map(f => f.name);
      await supabase.storage.from("backups").remove(toDelete);
    }

    return new Response(JSON.stringify({
      status: "ok",
      file: fileName,
      tables: stats,
      total_rows: Object.values(stats).reduce((a, b) => a + b, 0),
      old_backups_cleaned: Math.max(0, (files?.length ?? 0) - 8),
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
