import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TypewriterText } from "@/components/TypewriterText";
import { useT } from "@/i18n/LanguageProvider";

interface Props {
  title: string;
  narrative: string;
  endingType: string | null;
  petName: string;
  petIcon: string;
  onPlayAgain: () => void;
  onLobby: () => void;
}

const ENDING_META: Record<string, { emoji: string; color: string }> = {
  hero:       { emoji: "🦸", color: "text-yellow-400" },
  peaceful:   { emoji: "🌿", color: "text-green-400" },
  mystic:     { emoji: "🐉", color: "text-purple-400" },
  redeemed:   { emoji: "❤️", color: "text-pink-400" },
  adventure:  { emoji: "⚔️", color: "text-orange-400" },
  lonely:     { emoji: "🌑", color: "text-slate-400" },
};

export function StoryEndingScreen({ title, narrative, endingType, petName, petIcon, onPlayAgain, onLobby }: Props) {
  const t = useT();
  const meta = ENDING_META[endingType ?? ""] ?? { emoji: "✨", color: "text-accent" };
  const label = t(`story.endingType.${endingType ?? "default"}`, t("story.endingType.default"));
  const filled = narrative.split("{pet}").join(petName);
  return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto flex flex-col items-center justify-center">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />
      <div className="text-center relative z-10 animate-fade-in w-full">
        <div className="text-7xl mb-3">{meta.emoji}</div>
        <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${meta.color}`}>{label}</p>
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <Card className="glass border-accent/20 mb-6">
          <CardContent className="py-5">
            <TypewriterText text={filled} speed={30} className="text-sm leading-relaxed" />
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground mb-4">
          {petIcon} {petName} · {t("story.endingTrack")}
        </p>
        <Button onClick={onPlayAgain} size="lg" className="w-full mb-2">
          {t("story.playAgain")}
        </Button>
        <Button variant="ghost" onClick={onLobby} className="w-full">
          ← {t("common.lobby")}
        </Button>
      </div>
    </div>
  );
}
