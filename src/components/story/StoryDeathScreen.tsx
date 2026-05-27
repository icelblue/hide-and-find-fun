import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TypewriterText } from "@/components/TypewriterText";
import { useT } from "@/i18n/LanguageProvider";

interface Props {
  title: string;
  narrative: string;
  petName: string;
  petIcon: string;
  onAdoptNew: () => void;
  onLobby: () => void;
}

export function StoryDeathScreen({ title, narrative, petName, petIcon, onAdoptNew, onLobby }: Props) {
  const t = useT();
  const filled = narrative.split("{pet}").join(petName);
  return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto flex flex-col items-center justify-center">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-destructive/10 blur-[100px] pointer-events-none" />
      <div className="text-center relative z-10 animate-fade-in w-full">
        <div className="text-7xl mb-3">🪦</div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2 text-destructive">{t("story.deathTitle")}</p>
        <h2 className="text-2xl font-bold mb-1">{title}</h2>
        <p className="text-xs text-muted-foreground mb-4">{petIcon} {petName}</p>
        <Card className="glass border-destructive/20 mb-6">
          <CardContent className="py-5">
            <TypewriterText text={filled} speed={32} className="text-sm leading-relaxed" />
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground mb-4">
          {t("story.deathHint")}
        </p>
        <Button onClick={onAdoptNew} size="lg" className="w-full mb-2">
          {t("story.adoptNew")}
        </Button>
        <Button variant="ghost" onClick={onLobby} className="w-full">
          ← {t("common.lobby")}
        </Button>
      </div>
    </div>
  );
}
