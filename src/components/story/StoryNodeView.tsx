import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TypewriterText } from "@/components/TypewriterText";
import type { StoryNode, StoryChoice, ChoiceResult } from "@/lib/story-runs";

interface Props {
  node: StoryNode;
  choices: StoryChoice[];
  petName: string;
  onChoose: (choice: StoryChoice) => Promise<ChoiceResult | void>;
  busy: boolean;
}

function fillPet(text: string, petName: string) {
  return text.replaceAll("{pet}", petName);
}

function rewardBadge(c: StoryChoice): string | null {
  if (!c.reward_type || !c.reward_value) return null;
  if (c.reward_type === "xp") return `+${c.reward_value.xp} XP`;
  if (c.reward_type === "damage") {
    const d = c.reward_value.damage;
    return d >= 9999 ? "⚠️ Risc letal" : `⚠️ -${d} salut`;
  }
  if (c.reward_type === "accessory") return `🎁 ${c.reward_value.icon ?? ""} ${c.reward_value.accessory}`;
  if (c.reward_type === "consumable") return `💊 ${c.reward_value.consumable}`;
  return null;
}

export function StoryNodeView({ node, choices, petName, onChoose, busy }: Props) {
  const [revealChoices, setRevealChoices] = useState(false);
  const filled = useMemo(() => fillPet(node.narrative, petName), [node, petName]);

  // Reset reveal on node change
  useEffect(() => { setRevealChoices(false); }, [node.id]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Capítol {node.chapter}
        </p>
        <h2 className="text-lg font-bold">{node.title}</h2>
      </div>

      <Card className="glass border-accent/20">
        <CardContent className="py-5">
          <TypewriterText
            text={filled}
            speed={28}
            onComplete={() => setRevealChoices(true)}
            className="text-sm leading-relaxed text-foreground/90"
          />
        </CardContent>
      </Card>

      {revealChoices && (
        <div className="space-y-2 animate-fade-in">
          {choices.map((c, i) => {
            const badge = rewardBadge(c);
            return (
              <Button
                key={c.id}
                variant="outline"
                disabled={busy}
                onClick={() => onChoose(c)}
                className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal"
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                    {i + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{fillPet(c.label, petName)}</p>
                    {badge && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{badge}</p>
                    )}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
