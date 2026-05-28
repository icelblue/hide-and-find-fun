// 🔒 CRITICAL: Component del Mode Història. NO toca PvP.
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TypewriterText } from "@/components/TypewriterText";
import {
  getTodayChallenge, submitDailyChoice, rewardToReveal,
  type DailyChallengeState, type StoryChoice, type RewardOutcome,
} from "@/lib/story-runs";
import { RewardReveal } from "./RewardReveal";
import { toast } from "sonner";
import { useT } from "@/i18n/LanguageProvider";

interface Props {
  userId: string;
  petName: string;
  onRewardApplied?: () => void;
  variant?: "card" | "icon";
}

function timeUntilMidnight(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const ms = tomorrow.getTime() - now.getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function rewardLabel(reward_type: string | null, reward_value: any): string {
  if (!reward_type) return "—";
  if (reward_type === "xp") return `⭐ +${reward_value?.xp ?? 0} XP`;
  if (reward_type === "accessory") return `${reward_value?.icon ?? "🎁"} ${reward_value?.accessory ?? ""}`;
  if (reward_type === "consumable") return `${reward_value?.consumable ?? ""}`;
  return "—";
}

export function DailyChallengeCard({ userId, petName, onRewardApplied, variant = "card" }: Props) {
  const [state, setState] = useState<DailyChallengeState | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<ReturnType<typeof rewardToReveal> | null>(null);
  const [countdown, setCountdown] = useState(timeUntilMidnight());

  useEffect(() => {
    getTodayChallenge(userId).then(setState).catch(() => setState(null));
    const t = setInterval(() => setCountdown(timeUntilMidnight()), 60_000);
    return () => clearInterval(t);
  }, [userId]);

  if (!state || !state.node) return null;

  const handleChoose = async (c: StoryChoice) => {
    setBusy(true);
    try {
      const { reward, alreadyDone } = await submitDailyChoice(userId, c);
      if (alreadyDone) {
        toast.info("Ja has fet el repte d'avui");
        setOpen(false);
        const fresh = await getTodayChallenge(userId);
        setState(fresh);
        return;
      }
      setReveal(rewardToReveal(reward as RewardOutcome));
      onRewardApplied?.();
      const fresh = await getTodayChallenge(userId);
      setState(fresh);
    } catch (e: any) {
      toast.error(e.message ?? "Error al repte diari");
    } finally {
      setBusy(false);
    }
  };

  const fillPet = (s: string) => s.split("{pet}").join(petName);

  const isIcon = variant === "icon";

  if (state.alreadyDone) {
    if (isIcon) {
      return (
        <Button variant="ghost" size="sm" disabled className="relative h-8 px-2 opacity-60" title={`Repte completat · torna en ${countdown}`}>
          <span className="text-xl">🌟</span>
          <span className="absolute -top-1 -right-1 bg-muted text-muted-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">✓</span>
        </Button>
      );
    }
    return (
      <Card className="glass border-muted/30 mt-4 opacity-80">
        <CardContent className="py-3 px-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">✓ Repte diari completat</p>
          <p className="text-sm font-medium">{rewardLabel(state.lastReward?.reward_type ?? null, state.lastReward?.reward_value)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Torna en {countdown}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {isIcon ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="relative h-8 px-2"
          title={`Repte diari: ${state.node.title}`}
        >
          <span className="text-xl">🌟</span>
          <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold animate-pulse">!</span>
        </Button>
      ) : (
        <Card
          className="glass border-accent/40 mt-4 cursor-pointer hover:border-accent/70 transition-colors animate-fade-in"
          onClick={() => setOpen(true)}
        >
          <CardContent className="py-3 px-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-accent font-bold mb-0.5">🌟 Repte diari · disponible</p>
            <p className="text-sm font-bold">{state.node.title}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Acaba en {countdown}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-accent font-bold">🌟 Repte diari</p>
              <h3 className="text-lg font-bold">{state.node.title}</h3>
            </div>
            <Card className="glass border-accent/20">
              <CardContent className="py-4">
                <TypewriterText text={fillPet(state.node.narrative)} speed={22} className="text-sm leading-relaxed" />
              </CardContent>
            </Card>
            <div className="space-y-2">
              {state.choices.map((c, i) => (
                <Button
                  key={c.id}
                  variant="outline"
                  disabled={busy}
                  onClick={() => handleChoose(c)}
                  className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal"
                >
                  <span className="text-xs font-bold text-muted-foreground shrink-0 mr-2">{i + 1}.</span>
                  <span className="text-sm flex-1">{fillPet(c.label)}</span>
                </Button>
              ))}
              <p className="text-[10px] text-center text-muted-foreground/70 italic">Les conseqüències es revelaran després de triar</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {reveal && <RewardReveal reveal={reveal} onDone={() => { setReveal(null); setOpen(false); }} />}
    </>
  );
}
