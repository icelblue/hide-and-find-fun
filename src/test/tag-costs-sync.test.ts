// ============================================================
// REG-016: Costos client/RPC desincronitzats — Trencar fallava
// Data: 2026-06-04
// Bug:  Wave A va pujar els costos a la RPC execute_tag_action
//       (clean 0.2→0.3, break 0.3→0.4, fix 0.2→0.3) sense actualitzar
//       TAG_ACTIONS al client. El botó es veia clicable però la RPC
//       rebutjava amb "No tens prou tokens".
// Fix:  Aquest test extreu els costos de la migració SQL i els compara
//       amb TAG_ACTIONS. Si divergeixen, falla.
// ============================================================
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { TAG_ACTIONS } from "@/lib/supabase-helpers";

function findLatestTagActionMigration(): string {
  const dir = "supabase/migrations";
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
  // Cerca el fitxer més recent que conté la definició de execute_tag_action.
  const sorted = files.sort().reverse();
  for (const f of sorted) {
    const content = readFileSync(join(dir, f), "utf8");
    if (/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.execute_tag_action/i.test(content)) {
      return content;
    }
  }
  throw new Error("No migration with execute_tag_action found");
}

function extractCost(sql: string, action: "clean" | "break" | "fix"): number {
  const re = new RegExp(`WHEN\\s+'${action}'\\s+THEN\\s+_cost\\s*:=\\s*([0-9.]+)`, "i");
  const m = sql.match(re);
  if (!m) throw new Error(`Cost for '${action}' not found in migration`);
  return parseFloat(m[1]);
}

describe("REG-016: Sincronia costos TAG_ACTIONS client ↔ RPC execute_tag_action", () => {
  const sql = findLatestTagActionMigration();

  it("clean cost coincideix", () => {
    expect(TAG_ACTIONS.dirty.cost).toBe(extractCost(sql, "clean"));
  });

  it("break cost coincideix", () => {
    expect(TAG_ACTIONS.breakable.cost).toBe(extractCost(sql, "break"));
  });

  it("fix cost coincideix", () => {
    expect(TAG_ACTIONS.broken.cost).toBe(extractCost(sql, "fix"));
  });
});
