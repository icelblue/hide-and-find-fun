// ============================================================
// REG-017: Auditoria CORE joc — evita regressions de regles BD/client
// ============================================================
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { TOOLS_PER_GAME } from "@/lib/supabase-helpers";

const MIGRATIONS_DIR = "supabase/migrations";

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
}

function readMigration(file: string): string {
  return readFileSync(join(MIGRATIONS_DIR, file), "utf8");
}

function latestFunctionSql(functionName: string): string {
  for (const file of migrationFiles().reverse()) {
    const sql = readMigration(file);
    if (new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${functionName}\\b`, "i").test(sql)) {
      return sql;
    }
  }
  throw new Error(`No migration found for function ${functionName}`);
}

function latestTokensDefaultSql(): string {
  for (const file of migrationFiles().reverse()) {
    const sql = readMigration(file);
    if (/ALTER\s+TABLE\s+public\.game_players\s+ALTER\s+COLUMN\s+tokens_remaining\s+SET\s+DEFAULT/i.test(sql)) {
      return sql;
    }
  }
  throw new Error("No tokens_remaining default migration found");
}

function extractLlanternaPool(sql: string): number {
  const match = sql.match(/_pool_llanterna\s*:=\s*(\d+)/i);
  if (!match) throw new Error("_pool_llanterna not found");
  return Number(match[1]);
}

describe("REG-017: CORE PvP no torna a valors/columnes antigues", () => {
  it("tokens diaris per defecte són 4, no 5", () => {
    expect(latestTokensDefaultSql()).toMatch(/tokens_remaining\s+SET\s+DEFAULT\s+4\.0/i);
  });

  it("RPCs que resetejen tokens usen 4.0", () => {
    for (const fn of ["execute_game_move", "execute_tag_action", "execute_toggle_light"]) {
      const sql = latestFunctionSql(fn);
      expect(sql).toMatch(/tokens_remaining\s*=\s*4\.0/i);
      expect(sql).not.toMatch(/tokens_remaining\s*=\s*5\.0/i);
    }
  });

  it("execute_game_move usa profiles.elo i no elo_rating", () => {
    const sql = latestFunctionSql("execute_game_move");
    expect(sql).toMatch(/COALESCE\(elo,\s*1200\)/i);
    expect(sql).not.toMatch(/elo_rating/i);
  });

  it("RPCs de joc no contenen el typo i_story", () => {
    for (const fn of ["execute_game_move", "execute_tag_action", "execute_toggle_light"]) {
      expect(latestFunctionSql(fn)).not.toMatch(/\bi_story\b/i);
    }
  });

  it("pool llanterna client ↔ RPCs està sincronitzat a 5", () => {
    expect(TOOLS_PER_GAME.llanterna).toBe(5);
    expect(extractLlanternaPool(latestFunctionSql("execute_tag_action"))).toBe(5);
    expect(extractLlanternaPool(latestFunctionSql("execute_toggle_light"))).toBe(5);
  });
});