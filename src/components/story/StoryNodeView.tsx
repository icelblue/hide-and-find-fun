import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TypewriterText } from "@/components/TypewriterText";
import type { StoryNode, StoryChoice, ChoiceResult } from "@/lib/story-runs";
import type { InventoryItem, PetState } from "@/lib/story-state";
import { hasItems } from "@/lib/story-state";
import { checkTraitRequirement, TRAIT_META, type Personality, type Trait } from "@/lib/pet-personality";
import { useT } from "@/i18n/LanguageProvider";

interface Props {
  node: StoryNode;
  choices: StoryChoice[];
  petName: string;
  inventory: InventoryItem[];
  state: PetState;
  unlockedSkills: Set<string>;
  nodeVisitCount: number;
  worldLabel?: string;
  personality?: Personality;
  onChoose: (choice: StoryChoice) => Promise<ChoiceResult | void>;
  busy: boolean;
  hideChoices?: boolean;
}

function fillPet(text: string, petName: string) {
  return text.split("{pet}").join(petName);
}

export function StoryNodeView({ node, choices, petName, inventory, state, unlockedSkills, nodeVisitCount, worldLabel, personality, onChoose, busy, hideChoices }: Props) {
  const t = useT();
  const [revealChoices, setRevealChoices] = useState(false);
  const filled = useMemo(() => fillPet(node.narrative, petName), [node, petName]);

  useEffect(() => { setRevealChoices(false); }, [node.id]);

  // Filter visible choices (hides locked-by-trait too)
  const visibleChoices = useMemo(() => {
    return choices.filter((c) => {
      if (c.requires_items && c.requires_items.length > 0 && !hasItems(inventory, c.requires_items)) return false;
      if (typeof c.requires_bond === "number" && state.bond < c.requires_bond) return false;
      if (c.requires_skill && !unlockedSkills.has(c.requires_skill)) return false;
      if (typeof c.min_visits === "number" && nodeVisitCount < c.min_visits) return false;
      if (typeof c.max_visits === "number" && nodeVisitCount > c.max_visits) return false;
      // Trait-gated options: only visible if personality meets requirement
      if (c.requires_traits && personality) {
        const { ok } = checkTraitRequirement(personality, c.requires_traits);
        if (!ok) return false;
      }
      return true;
    });
  }, [choices, inventory, state, unlockedSkills, nodeVisitCount, personality]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          {worldLabel ? `${worldLabel} · ` : ""}{t("story.chapter")} {node.chapter}
          {nodeVisitCount > 1 ? ` · ${t("story.visit")} #${nodeVisitCount}` : ""}
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

      {revealChoices && !hideChoices && (
        <div className="space-y-2 animate-fade-in">
          {visibleChoices.map((c, i) => {
            const usesItems = c.requires_items && c.requires_items.length > 0;
            const usesBond = typeof c.requires_bond === "number";
            const usesTraits = c.requires_traits && Object.keys(c.requires_traits).length > 0;
            // Bug A fix: NO reveal trait reward bonuses before the choice is made
            // (the RewardReveal animation handles that after the choice).
            const isPersonalityChoice = usesTraits;
            return (
              <Button
                key={c.id}
                variant="outline"
                disabled={busy}
                onClick={() => onChoose(c)}
                className={`w-full justify-start text-left h-auto py-3 px-4 whitespace-normal ${
                  isPersonalityChoice ? "border-purple-400/60 bg-purple-500/5"
                  : usesItems || usesBond ? "border-accent/50" : ""
                }`}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                    {i + 1}.
                  </span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium">
                      {usesItems && <span className="text-accent mr-1">✨</span>}
                      {usesBond && <span className="text-pink-400 mr-1">❤️</span>}
                      {fillPet(c.label, petName)}
                    </p>
                    {usesTraits && c.requires_traits && (
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(c.requires_traits).map((tr) => {
                          const meta = TRAIT_META[tr as Trait];
                          if (!meta) return null;
                          return (
                            <span key={tr} className={`text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 ${meta.color} font-semibold`}>
                              {meta.icon} {t(`petTrait.${meta.key}`, meta.label)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            );
          })}
          <p className="text-[10px] text-center text-muted-foreground/70 italic pt-1">
            {t("story.consequencesHint")}
          </p>
        </div>
      )}
    </div>
  );
}
