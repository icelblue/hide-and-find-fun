import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TypewriterText } from "@/components/TypewriterText";
import type { StoryNode, StoryChoice, ChoiceResult } from "@/lib/story-runs";
import type { InventoryItem, PetState } from "@/lib/story-state";
import { hasItems } from "@/lib/story-state";

interface Props {
  node: StoryNode;
  choices: StoryChoice[];
  petName: string;
  inventory: InventoryItem[];
  state: PetState;
  onChoose: (choice: StoryChoice) => Promise<ChoiceResult | void>;
  busy: boolean;
}

function fillPet(text: string, petName: string) {
  return text.split("{pet}").join(petName);
}

export function StoryNodeView({ node, choices, petName, inventory, state, onChoose, busy }: Props) {
  const [revealChoices, setRevealChoices] = useState(false);
  const filled = useMemo(() => fillPet(node.narrative, petName), [node, petName]);

  // Reset reveal on node change
  useEffect(() => { setRevealChoices(false); }, [node.id]);

  // Filter visible choices based on requirements
  const visibleChoices = useMemo(() => {
    return choices.filter((c) => {
      if (c.requires_items && c.requires_items.length > 0 && !hasItems(inventory, c.requires_items)) return false;
      if (typeof c.requires_bond === "number" && state.bond < c.requires_bond) return false;
      return true;
    });
  }, [choices, inventory, state]);

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
          {visibleChoices.map((c, i) => {
            const usesItems = c.requires_items && c.requires_items.length > 0;
            const usesBond = typeof c.requires_bond === "number";
            return (
              <Button
                key={c.id}
                variant="outline"
                disabled={busy}
                onClick={() => onChoose(c)}
                className={`w-full justify-start text-left h-auto py-3 px-4 whitespace-normal ${usesItems || usesBond ? "border-accent/50" : ""}`}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                    {i + 1}.
                  </span>
                  <p className="text-sm font-medium flex-1 min-w-0">
                    {usesItems && <span className="text-accent mr-1">✨</span>}
                    {usesBond && <span className="text-pink-400 mr-1">❤️</span>}
                    {fillPet(c.label, petName)}
                  </p>
                </div>
              </Button>
            );
          })}
          <p className="text-[10px] text-center text-muted-foreground/70 italic pt-1">
            Les conseqüències es revelaran després de triar
          </p>
        </div>
      )}
    </div>
  );
}
