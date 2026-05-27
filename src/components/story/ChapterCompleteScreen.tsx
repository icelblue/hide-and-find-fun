// 🔒 CRITICAL: Component del Mode Història. NO toca PvP.
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RewardOutcome } from "@/lib/story-runs";
import { useT } from "@/i18n/LanguageProvider";

interface Props {
  completedChapter: number;
  nextChapter: number;
  rewards: RewardOutcome[];
  petName: string;
  petIcon: string;
  petXP: number;
  petMaxXP: number;
  onContinue: () => void;
  onPause: () => void;
  busy: boolean;
}

function rewardLine(r: RewardOutcome, idx: number) {
  if (r.xp) return <li key={idx}>⭐ +{r.xp} XP</li>;
  if (r.accessory) return <li key={idx}>{r.accessory.icon} {r.accessory.name}</li>;
  if (r.consumable) return <li key={idx}>{r.consumable.icon} {r.consumable.name}</li>;
  if (r.damage) return <li key={idx} className="text-destructive">💥 -{r.damage} salut</li>;
  return null;
}

export function ChapterCompleteScreen({
  completedChapter, nextChapter, rewards, petName, petIcon, petXP, petMaxXP,
  onContinue, onPause, busy,
}: Props) {
  const t = useT();
  const visible = rewards.filter(r => r.xp || r.accessory || r.consumable || r.damage);
  const healthPct = Math.min((petXP / petMaxXP) * 100, 100);

  return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto flex flex-col items-center justify-center">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-accent/10 blur-[100px] pointer-events-none" />
      <div className="text-center relative z-10 animate-fade-in w-full">
        <p className="text-xs uppercase tracking-widest text-accent font-bold mb-1">{t("story.chapterSaved")}</p>
        <div className="text-5xl mb-2">📖</div>
        <h2 className="text-2xl font-bold mb-1">{t("story.chapterComplete", { n: completedChapter })}</h2>
        <p className="text-xs text-muted-foreground mb-5">{t("story.chapterPauseHint")}</p>

        <Card className="glass border-accent/20 mb-4">
          <CardContent className="py-4 text-left">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{petIcon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{petName}</p>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1">
                  <div className="h-1.5 rounded-full bg-accent" style={{ width: `${healthPct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{petXP}/{petMaxXP} XP</p>
              </div>
            </div>
            {visible.length > 0 ? (
              <>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("story.rewardsTitle")}</p>
                <ul className="text-sm space-y-0.5">{visible.map(rewardLine)}</ul>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">{t("story.rewardsEmpty")}</p>
            )}
          </CardContent>
        </Card>

        <Button onClick={onContinue} size="lg" disabled={busy} className="w-full mb-2">
          ▶ {t("story.chapterContinue", { n: nextChapter })}
        </Button>
        <Button variant="outline" onClick={onPause} disabled={busy} className="w-full">
          ⏸ {t("story.chapterPause")}
        </Button>
      </div>
    </div>
  );
}
