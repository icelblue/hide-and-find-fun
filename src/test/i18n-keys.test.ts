// ============================================================
// i18n-keys.test.ts — Guarda de coherència de traduccions
// ============================================================
// 1. Tota clau t("a.b.c") usada al codi ha d'existir a ca.json
//    (si no, l'usuari anglès veu el fallback català per sempre —
//    bug real detectat el 2026-07: "lobby.spaceMenu").
// 2. ca.json i en.json han de tenir exactament les mateixes claus.
// ============================================================
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ca from "@/i18n/ca.json";
import en from "@/i18n/en.json";

function flatKeys(obj: Record<string, unknown>, prefix = ""): Set<string> {
  const out = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object") {
      for (const kk of flatKeys(v as Record<string, unknown>, prefix + k + ".")) out.add(kk);
    } else {
      out.add(prefix + k);
    }
  }
  return out;
}

function* walkSources(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "ui" || name === "node_modules") continue;
      yield* walkSources(p);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) {
      yield p;
    }
  }
}

const caKeys = flatKeys(ca as Record<string, unknown>);
const enKeys = flatKeys(en as Record<string, unknown>);

describe("i18n: coherència de claus", () => {
  it("ca.json i en.json tenen exactament les mateixes claus", () => {
    const missingEn = [...caKeys].filter((k) => !enKeys.has(k));
    const missingCa = [...enKeys].filter((k) => !caKeys.has(k));
    expect(missingEn, `Falten a en.json: ${missingEn.join(", ")}`).toEqual([]);
    expect(missingCa, `Falten a ca.json: ${missingCa.join(", ")}`).toEqual([]);
  });

  it("tota clau t(\"...\") usada al codi existeix als bundles", () => {
    const pat = /\bt\(\s*["']([\w.]+)["']/g;
    const missing = new Map<string, string>();
    for (const file of walkSources(join(process.cwd(), "src"))) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(pat)) {
        const key = m[1];
        if (key.includes(".") && !caKeys.has(key) && !missing.has(key)) {
          missing.set(key, file.replace(process.cwd(), ""));
        }
      }
    }
    const report = [...missing.entries()].map(([k, f]) => `${k} (${f})`).join("\n");
    expect(missing.size, `Claus inexistents (mostrarien el fallback català en anglès):\n${report}`).toBe(0);
  });
});
