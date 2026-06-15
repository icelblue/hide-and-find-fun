// ============================================================
// ItemActions.tsx — Component per moble expandible amb accions
// ============================================================
import { useState } from "react";
import { getTagActions, TOKEN_COSTS } from "@/lib/supabase-helpers";
import type { PlayerTools, Position } from "@/lib/game-types";
import { useT } from "@/i18n/LanguageProvider";


interface ItemActionsProps {
  item: any;
  positions: readonly { value: Position; label: string; icon: string }[];
  onLook: (id: string, pos: Position) => void;
  disabled: boolean;
  tokensRemaining: number;
  lookedSpots: Set<string>;
  bananaBlockedSpot: string | null;
  revealedSpecials?: Map<string, { type: "curse" | "bonus"; value: number }>;
  interactions?: any[];
  onInteraction?: (interaction: any) => void;
  moveHistory?: any[];
  playerTools?: PlayerTools;
  gameBreaks?: Set<string>;
  onTagAction?: (itemId: string, actionKey: string) => void;
  dirtyItems?: Set<string>;
  breakableItems?: Set<string>;
}

export default function ItemActions({
  item, positions, onLook, disabled, tokensRemaining, lookedSpots, bananaBlockedSpot,
  revealedSpecials,
  interactions, onInteraction, moveHistory, playerTools, gameBreaks, onTagAction, dirtyItems, breakableItems,
}: ItemActionsProps) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const hasInteractions = interactions && interactions.length > 0;
  const tagActions = getTagActions(item, playerTools ?? {}, gameBreaks ?? new Set(), dirtyItems, breakableItems);
  const hasAnySpecial = hasInteractions || tagActions.length > 0;
  const isBroken = gameBreaks?.has(item.id);
  const isDirty = dirtyItems?.has(item.id) && !gameBreaks?.has(`clean:${item.id}`);

  return (
    <div className={`glass rounded-xl overflow-hidden ${isBroken ? "border-destructive/30" : isDirty ? "border-accent/20" : ""}`}>
      <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-label={`${item.icon} ${item.name} - ${expanded ? t("game.items.closeActions") : t("game.items.openActions")}`}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
        <span className="font-semibold text-sm">
          {item.icon} {item.name}
          {isBroken && <span className="ml-1 text-xs text-destructive">💥</span>}
          {isDirty && !isBroken && <span className="ml-1 text-xs">🧹</span>}
          {hasAnySpecial && !isBroken && !isDirty && <span className="ml-1 text-xs">⚡</span>}
        </span>
        <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-border/30 p-2.5">
          {/* Tag-based actions */}
          {tagActions.length > 0 && onTagAction && (
            <div className="mb-2 space-y-1">
              {tagActions.map((ta) => (
                <button key={ta.actionKey}
                  onClick={() => onTagAction(item.id, ta.actionKey)}
                  disabled={disabled || tokensRemaining < ta.cost || !ta.hasTool}
                  className={`w-full rounded-lg p-2.5 text-xs font-medium transition-all active:scale-[0.97] flex items-center gap-2 ${
                    !ta.hasTool ? "bg-muted/20 opacity-50 border border-muted/30" :
                    "bg-primary/10 hover:bg-primary/20 border border-primary/20"
                  }`}>
                  <span className="text-lg">{ta.icon}</span>
                  <span className="flex-1 text-left">
                    {ta.label}
                    {ta.requiresTool && !ta.hasTool && (
                      <span className="text-[9px] text-muted-foreground ml-1">
                        ({t("game.items.needs")} {ta.requiresTool === "drap" ? "🧹" : ta.requiresTool === "martell" ? "🔨" : ta.requiresTool === "galleda" ? "🪣+🧹" : ta.requiresTool === "drap_mullat" ? "✨" : "🔧"})
                      </span>
                    )}
                    {ta.requiresTool && ta.hasTool && (ta.requiresTool === "drap" || ta.requiresTool === "martell" || ta.requiresTool === "galleda" || ta.requiresTool === "drap_mullat") && (
                      <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-destructive/20 text-destructive font-semibold">
                        {t("game.items.consumable")}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{ta.cost}🪙</span>
                </button>
              ))}
            </div>
          )}
          {/* Special interaction buttons */}
          {hasInteractions && onInteraction && (
            <div className="mb-2 space-y-1">
              {interactions!.map((ia: any) => {
                const alreadyUsed = ia.one_time && moveHistory?.some((m: any) =>
                  m.target_item_id === ia.item_id && m.action === "look" &&
                  (m as any).bonus_value === `interact:${ia.action_name}`
                );
                return (
                  <button key={ia.id}
                    onClick={() => onInteraction(ia)}
                    disabled={disabled || tokensRemaining < ia.cost || !!alreadyUsed}
                    className={`w-full rounded-lg p-2.5 text-xs font-medium transition-all active:scale-[0.97] flex items-center gap-2 ${
                      alreadyUsed ? "bg-muted/20 opacity-40" :
                      "bg-primary/10 hover:bg-primary/20 border border-primary/20"
                    }`}>
                    <span className="text-lg">{ia.action_icon}</span>
                    <span className="flex-1 text-left">{ia.action_label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {alreadyUsed ? t("game.items.done") : `${ia.cost}🪙`}
                    </span>
                  </button>

                );
              })}
            </div>
          )}
          {/* Position grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {positions.map(pos => {
              const spotKey = `${item.id}:${pos.value}`;
              const alreadyLooked = lookedSpots.has(spotKey);
              const isBananaBlocked = bananaBlockedSpot === spotKey;
              // Dirty blocks "dins", Broken blocks "sobre" + "dins"
              const blockedByDirty = isDirty && pos.value === "dins";
              const blockedByBroken = isBroken && (pos.value === "sobre" || pos.value === "dins");
              // Logical block: "darrere" not possible for some furniture
              const blockedByBehind = pos.value === "darrere" && item?.can_behind === false;
              // Logical block: object too big for "dins" (capacity 0 = nothing fits)
              const blockedByCapacity = pos.value === "dins" && (item?.inner_capacity ?? 2) === 0;
              const isBlocked = blockedByDirty || blockedByBroken || blockedByBehind || blockedByCapacity;
              const blockLabel = blockedByBroken ? t("game.items.fixFirst")
                : blockedByDirty ? t("game.items.cleanFirst")
                : blockedByBehind ? t("game.items.cannot")
                : blockedByCapacity ? t("game.items.noFit")
                : "";
              const reveal = revealedSpecials?.get(spotKey);
              const revealRing = reveal?.type === "curse"
                ? "ring-1 ring-destructive/50"
                : reveal?.type === "bonus" ? "ring-1 ring-amber-400/60" : "";
              return (
                <button key={pos.value}
                  onClick={() => onLook(item.id, pos.value)} aria-label={`${t(`game.pos.${pos.value}`, pos.label)} ${item.name}`}
                  disabled={disabled || tokensRemaining < TOKEN_COSTS.look || alreadyLooked || isBananaBlocked || isBlocked}
                  title={reveal ? (reveal.type === "curse"
                    ? `💀 ${reveal.value}🪙`
                    : `🎁 +${reveal.value}🪙`) : undefined}
                  className={`relative w-full rounded-lg p-3 text-xs transition-colors active:scale-[0.97] font-medium ${revealRing} ${
                    isBlocked ? "bg-muted/20 opacity-50 border border-accent/30" :
                    isBananaBlocked ? "bg-destructive/20 opacity-60 border border-destructive/30" :
                    alreadyLooked ? "bg-muted/20 opacity-40 line-through" :
                    "bg-muted/40 hover:bg-primary/10 disabled:opacity-30"
                  }`}>
                  {reveal && (
                    <span className="absolute top-0.5 right-1 text-[10px] leading-none">
                      {reveal.type === "curse" ? "💀" : "🎁"}
                    </span>
                  )}
                  {isBlocked ? blockLabel : isBananaBlocked ? "🍌" : `${pos.icon} ${t(`game.pos.${pos.value}`, pos.label)}`}
                  <span className="block text-[9px] text-muted-foreground mt-0.5">
                    {isBlocked ? t("game.items.blocked") : isBananaBlocked ? t("game.items.blocked") : alreadyLooked ? t("game.items.seen") : `${TOKEN_COSTS.look}🪙`}
                  </span>
                </button>

              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
