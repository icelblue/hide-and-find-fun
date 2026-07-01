import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import type { InventoryItem } from "@/lib/story-state";
import {
  type IngredientOrderPuzzle, MAX_PUZZLE_ATTEMPTS,
  getAttempt, submitPuzzleOrder, skipPuzzle, type SubmitResult,
} from "@/lib/story-puzzle";
import { useT } from "@/i18n/LanguageProvider";
import { toast } from "sonner";

interface Props {
  userId: string;
  runId: string;
  nodeId: string;
  puzzle: IngredientOrderPuzzle;
  inventory: InventoryItem[];
  onSolved: (reward: { item: { id: string; name: string; icon: string }; xp: number }) => void;
  onSkipped: () => void;
}

export function PuzzleNodeView({ userId, runId, nodeId, puzzle, inventory, onSolved, onSkipped }: Props) {
  const t = useT();
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(puzzle.slots).fill(null));
  const [attempts, setAttempts] = useState(0);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [glow, setGlow] = useState(false);

  // Load prior attempts on mount
  useEffect(() => {
    let cancel = false;
    (async () => {
      const a = await getAttempt(runId, nodeId);
      if (!cancel && a) setAttempts(a.attempts);
    })();
    return () => { cancel = true; };
  }, [runId, nodeId]);

  // Items available in inventory that are valid puzzle ingredients
  const palette = useMemo(() => {
    const owned = new Set(inventory.map((i) => i.item_id));
    return puzzle.valid_items.map((id) => {
      const inv = inventory.find((i) => i.item_id === id);
      return {
        item_id: id,
        item_name: inv?.item_name ?? id,
        item_icon: inv?.item_icon ?? "❔",
        owned: owned.has(id),
      };
    });
  }, [puzzle.valid_items, inventory]);

  const firstEmpty = slots.findIndex((s) => s === null);
  const allFilled = firstEmpty === -1;
  const attemptsLeft = MAX_PUZZLE_ATTEMPTS - attempts;

  const addToSlot = (itemId: string) => {
    if (allFilled) return;
    if (slots.includes(itemId)) return; // no duplicates
    const next = [...slots];
    next[firstEmpty] = itemId;
    setSlots(next);
  };

  const clearSlot = (idx: number) => {
    const next = [...slots];
    next[idx] = null;
    setSlots(next);
  };

  const reset = () => setSlots(Array(puzzle.slots).fill(null));

  const handleSubmit = async () => {
    if (!allFilled || busy) return;
    setBusy(true);
    try {
      const submission = slots.filter((s): s is string => !!s);
      const res: SubmitResult = await submitPuzzleOrder(userId, runId, nodeId, puzzle, submission);
      setAttempts(res.attempts);
      if (res.solved && res.reward) {
        setGlow(true);
        setTimeout(() => onSolved(res.reward!), 700);
        return;
      }
      setShake(true);
      setTimeout(() => setShake(false), 500);
      if (res.exhausted) {
        toast.error(t("puzzle.exhausted", undefined, "Has esgotat els intents. Pots saltar amb penalització."));
      } else if (res.attempts >= 2 && puzzle.hint_key) {
        toast.message(t(puzzle.hint_key, undefined, t("puzzle.hintGeneric", undefined, "Pista: revisa l'ordre.")), {
          icon: "💡",
        });
      } else {
        toast.error(t("puzzle.wrong", { left: String(MAX_PUZZLE_ATTEMPTS - res.attempts) }, "Ordre incorrecte"));
      }
      reset();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    if (busy) return;
    if (!confirm(t("puzzle.skipConfirm", undefined, "Saltar el puzzle? Perdràs salut i bond."))) return;
    setBusy(true);
    try {
      await skipPuzzle(userId, runId, nodeId);
      toast.message(t("puzzle.skipped", undefined, "Has saltat el puzzle."));
      onSkipped();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={`glass border-accent/30 ${shake ? "animate-shake" : ""} ${glow ? "ring-2 ring-emerald-400/70" : ""}`}>
      <OnboardingDialog
        storageKey="onboarding:puzzle:v1"
        icon="🧩"
        title={t("onboarding.puzzle.title", "Puzzle d'ingredients")}
        bullets={[t("onboarding.puzzle.b1"), t("onboarding.puzzle.b2"), t("onboarding.puzzle.b3")]}
        ctaLabel={t("onboarding.cta", "Entesos!")}
      />
      <CardContent className="py-5 space-y-4">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-accent/80 mb-1">
            🧩 {t("puzzle.title", undefined, "Puzzle d'ingredients")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("puzzle.instruction", { n: String(puzzle.slots) }, `Col·loca ${puzzle.slots} ingredients en l'ordre correcte`)}
          </p>
        </div>

        {/* Slots */}
        <div className="flex justify-center gap-2">
          {slots.map((slot, idx) => {
            const item = slot ? palette.find((p) => p.item_id === slot) : null;
            return (
              <button
                key={idx}
                onClick={() => slot && clearSlot(idx)}
                disabled={busy}
                className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                  slot
                    ? "border-accent bg-accent/10 hover:bg-destructive/10"
                    : "border-dashed border-muted-foreground/30"
                }`}
                aria-label={slot ? `Slot ${idx + 1}: ${item?.item_name}` : `Slot ${idx + 1} buit`}
              >
                {item ? (
                  <>
                    <span className="text-xl leading-none">{item.item_icon}</span>
                    <span className="text-[8px] mt-0.5 text-muted-foreground">{idx + 1}</span>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground/50">{idx + 1}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Palette */}
        <div className="flex flex-wrap justify-center gap-2">
          {palette.map((p) => {
            const used = slots.includes(p.item_id);
            const disabled = !p.owned || used || allFilled || busy;
            return (
              <button
                key={p.item_id}
                onClick={() => addToSlot(p.item_id)}
                disabled={disabled}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                  disabled
                    ? "opacity-40 border-muted"
                    : "border-accent/40 hover:bg-accent/10 hover:border-accent"
                }`}
                title={!p.owned ? t("puzzle.missing", undefined, "No tens aquest ingredient") : p.item_name}
              >
                <span className="mr-1">{p.item_icon}</span>
                <span>{p.item_name}</span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button onClick={handleSubmit} disabled={!allFilled || busy} className="flex-1">
            {busy ? "..." : t("puzzle.check", undefined, "Comprovar")}
          </Button>
          <Button variant="outline" onClick={reset} disabled={busy || firstEmpty === 0}>
            {t("puzzle.reset", undefined, "Buidar")}
          </Button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{t("puzzle.attemptsLeft", { n: String(attemptsLeft) }, `Intents: ${attemptsLeft}/${MAX_PUZZLE_ATTEMPTS}`)}</span>
          <button
            onClick={handleSkip}
            disabled={busy}
            className="text-destructive/80 hover:text-destructive underline-offset-2 hover:underline"
          >
            {t("puzzle.skip", undefined, "Saltar (-salut)")}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
