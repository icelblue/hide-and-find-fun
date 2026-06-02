// ============================================================
// DemoPage.tsx — Tutorial guiat sense registre (5 pantalles)
// ============================================================
// Sandbox 100% client-side. Estat local en useState, sense
// Supabase. Explica el joc: escenari → amagar → buscar → resultat.
// Botó "Registra't" al final per convertir.
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n/LanguageProvider";
import { LanguageSwitcherCompact } from "@/i18n/LanguageSwitcher";

type Step = 0 | 1 | 2 | 3 | 4;

// Tauler mock: 4 posicions amb 1 amagatall correcte
const POSITIONS = [
  { id: "nevera", icon: "🧊", labelKey: "demo.pos.fridge" },
  { id: "calaix", icon: "🗄️", labelKey: "demo.pos.drawer" },
  { id: "armari", icon: "🚪", labelKey: "demo.pos.cupboard" },
  { id: "forn",   icon: "🔥", labelKey: "demo.pos.oven" },
] as const;
const HIDDEN_AT = "armari";

export default function DemoPage() {
  const t = useT();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [attempts, setAttempts] = useState<string[]>([]);

  const next = () => setStep(s => Math.min(4, (s + 1) as Step) as Step);
  const back = () => setStep(s => Math.max(0, (s - 1) as Step) as Step);

  const tryPosition = (id: string) => {
    if (attempts.includes(id)) return;
    const newAttempts = [...attempts, id];
    setAttempts(newAttempts);
    if (id === HIDDEN_AT) {
      setTimeout(() => setStep(4), 800);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border/50">
        <button
          onClick={() => navigate("/auth")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t("demo.exit")}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{step + 1}/5</span>
          <LanguageSwitcherCompact />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass">
          <CardContent className="py-8 px-6 space-y-6">
            {step === 0 && <StepIntro t={t} />}
            {step === 1 && <StepScenario t={t} />}
            {step === 2 && <StepHide t={t} />}
            {step === 3 && (
              <StepSearch t={t} positions={POSITIONS} attempts={attempts} onTry={tryPosition} />
            )}
            {step === 4 && <StepWin t={t} attempts={attempts} />}

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={back} disabled={step === 0} className="text-xs">
                ← {t("common.back")}
              </Button>
              {step < 3 && (
                <Button onClick={next} className="ml-auto">
                  {t("common.continue")} →
                </Button>
              )}
              {step === 4 && (
                <Button onClick={() => navigate("/auth")} className="ml-auto">
                  {t("demo.signupCta")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

// ----------------- Steps -----------------

function StepIntro({ t }: { t: ReturnType<typeof useT> }) {
  return (
    <>
      <h1 className="text-2xl font-bold text-center">{t("demo.intro.title")}</h1>
      <p className="text-sm text-muted-foreground text-center leading-relaxed">
        {t("demo.intro.body")}
      </p>
      <div className="flex justify-center text-5xl gap-3">
        <span>🕵️</span><span>🆚</span><span>🙈</span>
      </div>
    </>
  );
}

function StepScenario({ t }: { t: ReturnType<typeof useT> }) {
  return (
    <>
      <h2 className="text-xl font-bold text-center">{t("demo.scenario.title")}</h2>
      <p className="text-sm text-muted-foreground text-center">{t("demo.scenario.body")}</p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "🍳", key: "demo.scenario.kitchen", active: true },
          { icon: "📚", key: "demo.scenario.library", active: false },
          { icon: "🚗", key: "demo.scenario.garage", active: false },
        ].map(s => (
          <div
            key={s.key}
            className={`p-4 rounded-xl border text-center ${
              s.active
                ? "border-primary bg-primary/10 ring-2 ring-primary"
                : "border-border/40 opacity-50"
            }`}
          >
            <div className="text-3xl mb-1">{s.icon}</div>
            <div className="text-xs font-semibold">{t(s.key)}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-center text-primary font-semibold">{t("demo.scenario.picked")}</p>
    </>
  );
}

function StepHide({ t }: { t: ReturnType<typeof useT> }) {
  return (
    <>
      <h2 className="text-xl font-bold text-center">{t("demo.hide.title")}</h2>
      <p className="text-sm text-muted-foreground text-center">{t("demo.hide.body")}</p>
      <div className="rounded-xl bg-muted/30 p-6 text-center space-y-2">
        <div className="text-5xl">🔑</div>
        <div className="text-xs text-muted-foreground">{t("demo.hide.object")}</div>
        <div className="text-xs">→</div>
        <div className="text-4xl">🚪</div>
        <div className="text-xs font-semibold text-primary">{t("demo.hide.placed")}</div>
      </div>
      <p className="text-xs text-center text-muted-foreground italic">{t("demo.hide.tip")}</p>
    </>
  );
}

function StepSearch({
  t,
  positions,
  attempts,
  onTry,
}: {
  t: ReturnType<typeof useT>;
  positions: typeof POSITIONS;
  attempts: string[];
  onTry: (id: string) => void;
}) {
  return (
    <>
      <h2 className="text-xl font-bold text-center">{t("demo.search.title")}</h2>
      <p className="text-sm text-muted-foreground text-center">{t("demo.search.body")}</p>
      <div className="grid grid-cols-2 gap-3">
        {positions.map(p => {
          const tried = attempts.includes(p.id);
          const hit = tried && p.id === HIDDEN_AT;
          return (
            <button
              key={p.id}
              onClick={() => onTry(p.id)}
              disabled={tried}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                hit
                  ? "border-emerald-500 bg-emerald-500/15"
                  : tried
                  ? "border-destructive/40 bg-destructive/5 opacity-60"
                  : "border-border hover:border-primary hover:bg-primary/5 active:scale-95"
              }`}
            >
              <div className="text-3xl mb-1">{p.icon}</div>
              <div className="text-xs font-semibold">{t(p.labelKey)}</div>
              {tried && (
                <div className="text-[10px] mt-1">
                  {hit ? `✅ ${t("demo.search.found")}` : `❌ ${t("demo.search.empty")}`}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-center text-muted-foreground">
        {t("demo.search.attempts", { n: attempts.length })}
      </p>
    </>
  );
}

function StepWin({ t, attempts }: { t: ReturnType<typeof useT>; attempts: string[] }) {
  return (
    <>
      <div className="text-center space-y-3">
        <div className="text-6xl">🏆</div>
        <h2 className="text-2xl font-bold">{t("demo.win.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("demo.win.body", { n: attempts.length })}
        </p>
      </div>
      <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 space-y-2">
        <p className="text-sm font-semibold text-center">{t("demo.win.realFeatures")}</p>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>✓ {t("demo.win.feat1")}</li>
          <li>✓ {t("demo.win.feat2")}</li>
          <li>✓ {t("demo.win.feat3")}</li>
          <li>✓ {t("demo.win.feat4")}</li>
        </ul>
      </div>
    </>
  );
}
