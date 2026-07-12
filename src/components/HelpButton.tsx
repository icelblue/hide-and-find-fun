// ============================================================
// HelpButton.tsx — Panell flotant de regles del joc + catàleg recompenses
// ============================================================
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { TOKEN_COSTS, getScenarios, getConnectedScenarios } from "@/lib/supabase-helpers";
import { getRewardCatalog, RARITY_CONFIG } from "@/lib/reward-helpers";
import { useT } from "@/i18n/LanguageProvider";

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"] as const;
const BASIC_STEPS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"] as const;
const RULE_KEYS = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r16", "r17", "r18", "r11", "r12", "r13", "r14", "r15"] as const;

export function HelpButton({ variant }: { variant?: "menu" | "icon" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"basics" | "rules" | "rewards">("basics");
  const [rewardCatalog, setRewardCatalog] = useState<any[]>([]);
  const [scenarioMap, setScenarioMap] = useState<{ name: string; icon: string; connections: string[] }[]>([]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
      getRewardCatalog().then(setRewardCatalog).catch(() => {});
      getScenarios().then(async (scenarios) => {
        const result: { name: string; icon: string; connections: string[] }[] = [];
        for (const s of scenarios) {
          const connected = await getConnectedScenarios(s.id);
          result.push({ name: s.name, icon: s.icon, connections: connected.map((c) => `${c.icon} ${c.name}`) });
        }
        setScenarioMap(result);
      }).catch(() => {});
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
  }, [open]);

  // Group rewards by rarity
  const groupedRewards: Record<string, any[]> = {};
  for (const r of RARITY_ORDER) groupedRewards[r] = [];
  for (const item of rewardCatalog) {
    if (groupedRewards[item.rarity]) groupedRewards[item.rarity].push(item);
  }

  const ruleTitle = (k: string) => {
    if (k === "r4") return t("helpPvp.rules.r4.title", { cost: TOKEN_COSTS.move });
    if (k === "r5") return t("helpPvp.rules.r5.title", { cost: TOKEN_COSTS.look });
    return t(`helpPvp.rules.${k}.title`);
  };

  const modal = open ? createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 backdrop-blur-sm"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={() => setOpen(false)}
      style={{
        touchAction: "none",
        paddingTop: "max(16px, env(safe-area-inset-top, 16px))",
        paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
        paddingLeft: "8px",
        paddingRight: "8px",
      }}
    >
      <div
        className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden"
        style={{ maxHeight: "min(85vh, calc(100dvh - 32px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
          <h2 className="text-lg font-bold">{t("helpPvp.title")}</h2>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            ✕
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 pb-2 shrink-0 border-b border-border/30">
          {([
            { id: "basics", label: t("helpPvp.tabs.basics") },
            { id: "rules", label: t("helpPvp.tabs.rules") },
            { id: "rewards", label: t("helpPvp.tabs.rewards") },
          ] as const).map(tabItem => (
            <button
              key={tabItem.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); setTab(tabItem.id); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                tab === tabItem.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        <div
          className="px-5 pb-5 pt-4 space-y-4 overflow-y-auto flex-1 overscroll-contain"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          {/* TAB: BÀSIC */}
          {tab === "basics" && (
            <>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-primary mb-1">{t("helpPvp.firstTime.title")}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t("helpPvp.firstTime.body")}
                </p>
              </div>
              {BASIC_STEPS.map((k, i) => (
                <div key={k} className="flex gap-3 border-b border-border/20 pb-3 last:border-0">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-1">{t(`helpPvp.basics.${k}.title`)}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{t(`helpPvp.basics.${k}.text`)}</p>
                  </div>
                </div>
              ))}
              <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-3 mt-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t("helpPvp.tipText")}
                </p>
              </div>
            </>
          )}

          {/* TAB: REGLES COMPLETES */}
          {tab === "rules" && (
            <>
              {RULE_KEYS.map((k) => (
                <div key={k} className="border-b border-border/20 pb-3 last:border-0">
                  <p className="text-sm font-semibold mb-1">{ruleTitle(k)}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{t(`helpPvp.rules.${k}.text`)}</p>
                </div>
              ))}

              {/* Scenario connections map */}
              {scenarioMap.length > 0 && (
                <div className="border-t border-border/40 pt-4">
                  <p className="text-sm font-semibold mb-3">{t("helpPvp.mapTitle")}</p>
                  <p className="text-xs text-muted-foreground mb-3">{t("helpPvp.mapBody")}</p>
                  <div className="space-y-2">
                    {scenarioMap.map((s, i) => (
                      <div key={i} className="bg-muted/30 rounded-lg px-3 py-2">
                        <span className="text-sm font-semibold">{s.icon} {s.name}</span>
                        {s.connections.length > 0 ? (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            → {s.connections.join(" · ")}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground/50 mt-0.5">{t("helpPvp.mapNone")}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB: PREMIS */}
          {tab === "rewards" && (
            <div>
              <p className="text-sm font-semibold mb-3">{t("helpPvp.rewardsTitle")}</p>
              <p className="text-xs text-muted-foreground mb-3">
                {t("helpPvp.rewardsBody")}
              </p>
              {RARITY_ORDER.map(rarity => {
                const items = groupedRewards[rarity] ?? [];
                const cfg = RARITY_CONFIG[rarity];
                if (items.length === 0) return null;
                return (
                  <div key={rarity} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">
                        {cfg?.emoji} {t(`helpPvp.rarity.${rarity}.label`)} ({items.length})
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {t(`helpPvp.rarity.${rarity}.pct`)} · {cfg?.sell}🪙
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((item) => (
                        <span key={item.id} className="inline-flex items-center gap-1 bg-muted/40 rounded-lg px-2 py-1 text-[11px]">
                          {item.icon} {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="text-[10px] text-muted-foreground mt-2">
                {t("helpPvp.rewardsTotal", { count: rewardCatalog.length })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {variant === "menu" ? (
        <button onClick={() => setOpen(true)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2">
          {t("helpPvp.menuLabel")}
        </button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className="text-lg"
          aria-label={t("helpPvp.ariaLabel")}
        >
          ❓
        </Button>
      )}

      {modal}
    </>
  );
}

export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-muted-foreground/70 italic leading-snug">{children}</p>
  );
}
