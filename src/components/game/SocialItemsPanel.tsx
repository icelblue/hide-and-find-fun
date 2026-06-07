// ============================================================
// SocialItemsPanel.tsx — Panel d'ítems socials
// ============================================================
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SOCIAL_ITEMS, SOCIAL_COSTS, type SocialItemType } from "@/lib/supabase-helpers";
import { useT } from "@/i18n/LanguageProvider";


interface SocialItemsPanelProps {
  showPanel: boolean;
  setShowPanel: (show: boolean) => void;
  player: any;
  onSendSocial: (type: SocialItemType, extraData?: { scenarioFrom?: string; scenarioTo?: string; itemId?: string }) => void;
  messageInput: string;
  setMessageInput: (msg: string) => void;
  actionLoading?: boolean;
  connectedScenarios?: any[];
  currentScenarioId?: string;
  currentScenarioItems?: any[];
}

/** Items with 2 daily uses tracked via special_data */
const MULTI_USE_ITEMS = new Set<string>(["barricada", "trampa"]);

function getMultiUseCount(player: any, type: string): number {
  const special = player?.special_data ?? {};
  const today = new Date().toISOString().split("T")[0];
  if (player?.tokens_last_reset < today) return 0;
  return (special as any)?.[`${type}_today`] ?? 0;
}

export default function SocialItemsPanel({
  showPanel, setShowPanel, player, onSendSocial, messageInput, setMessageInput, actionLoading,
  connectedScenarios, currentScenarioId, currentScenarioItems,
}: SocialItemsPanelProps) {
  const t = useT();
  const [barricadaTarget, setBarricadaTarget] = useState<string>("");

  const [trampaTarget, setTrampaTarget] = useState<string>("");
  const [showBarricadaPicker, setShowBarricadaPicker] = useState(false);
  const [showTrampaPicker, setShowTrampaPicker] = useState(false);

  const handleItemClick = (type: SocialItemType) => {
    if (type === "barricada") {
      setShowBarricadaPicker(true);
      setShowTrampaPicker(false);
      return;
    }
    if (type === "trampa") {
      setShowTrampaPicker(true);
      setShowBarricadaPicker(false);
      return;
    }
    onSendSocial(type);
  };

  const singleUseDisabled = player.social_item_used_today;
  const barricadaRemaining = 2 - getMultiUseCount(player, "barricada");
  const trampaRemaining = 2 - getMultiUseCount(player, "trampa");
  const allDisabled = singleUseDisabled && barricadaRemaining <= 0 && trampaRemaining <= 0;

  return (
    <div>
      <Button variant="outline" className="w-full h-12 text-base" size="lg"
        onClick={() => setShowPanel(!showPanel)}
        disabled={allDisabled}>
        {allDisabled ? t("game.social.exhausted") : t("game.social.useItemBtn")}
      </Button>

      {showPanel && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {SOCIAL_ITEMS.filter(i => i.type !== "message").map(item => {
            const isMultiUse = MULTI_USE_ITEMS.has(item.type);
            const isBombUsed = item.type === "smoke_bomb" && player.smoke_bomb_used;
            const multiRemaining = isMultiUse ? (item.type === "barricada" ? barricadaRemaining : trampaRemaining) : 0;
            const cost = SOCIAL_COSTS[item.type as SocialItemType] ?? 0;
            const notEnoughTokens = cost > 0 && (player.tokens_remaining ?? 0) < cost;
            const isDisabled = isBombUsed || actionLoading || notEnoughTokens ||
              (isMultiUse ? multiRemaining <= 0 : singleUseDisabled);

            return (
              <button key={item.type}
                onClick={() => !isDisabled && handleItemClick(item.type)}
                disabled={isDisabled}
                className={`glass rounded-xl p-3 text-center transition-all active:scale-[0.95] hover:border-accent/40 group relative ${isDisabled ? "opacity-30" : ""}`}>
                <span className="text-3xl block mb-1.5">{item.icon}</span>
                <span className="text-[11px] font-semibold block leading-tight">{t(item.nameKey)}</span>
                {cost > 0 && (
                  <span className="text-[10px] text-accent font-bold block mt-0.5">{cost}🪙</span>
                )}
                {isMultiUse && (
                  <span className="text-[9px] text-muted-foreground block mt-0.5">
                    {multiRemaining}/2
                  </span>
                )}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-popover border border-border text-[10px] text-popover-foreground shadow-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 max-w-[200px] text-wrap text-center">
                  {isBombUsed ? t("game.social.alreadyUsed") : t(item.descKey)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Barricada picker */}
      {showPanel && showBarricadaPicker && connectedScenarios && connectedScenarios.length > 0 && (
        <div className="mt-2 glass rounded-xl p-3">
          <p className="text-xs font-semibold mb-2 text-muted-foreground">{t("game.social.barricadeWhichPath")}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {connectedScenarios.map(s => (
              <button key={s.id}
                onClick={() => setBarricadaTarget(s.id)}
                className={`rounded-lg p-2 text-sm text-center transition-all ${barricadaTarget === s.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
                {s.icon} {s.name}
              </button>
            ))}
          </div>
          <Button size="sm" className="w-full mt-2" disabled={!barricadaTarget || actionLoading}
            onClick={() => {
              onSendSocial("barricada", { scenarioFrom: currentScenarioId, scenarioTo: barricadaTarget });
              setShowBarricadaPicker(false);
              setBarricadaTarget("");
            }}>
            {t("game.social.barricadeBtn")}
          </Button>
        </div>
      )}

      {/* Trampa picker */}
      {showPanel && showTrampaPicker && currentScenarioItems && currentScenarioItems.length > 0 && (
        <div className="mt-2 glass rounded-xl p-3">
          <p className="text-xs font-semibold mb-2 text-muted-foreground">{t("game.social.trapWhichItem")}</p>
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
            {currentScenarioItems.map(item => (
              <button key={item.id}
                onClick={() => setTrampaTarget(item.id)}
                className={`rounded-lg p-2 text-sm text-center transition-all ${trampaTarget === item.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
                {item.icon} {item.name}
              </button>
            ))}
          </div>
          <Button size="sm" className="w-full mt-2" disabled={!trampaTarget || actionLoading}
            onClick={() => {
              onSendSocial("trampa", { itemId: trampaTarget });
              setShowTrampaPicker(false);
              setTrampaTarget("");
            }}>
            {t("game.social.placeTrapBtn")}
          </Button>
        </div>
      )}

      {showPanel && (
        <div className="mt-2">
          <div className="flex gap-1.5 items-center glass rounded-xl p-2">
            <span className="text-xl pl-1">💡</span>
            <Input value={messageInput} onChange={e => setMessageInput(e.target.value)}
              placeholder={t("game.social.messagePlaceholder")} maxLength={80} className="text-sm bg-transparent border-0 focus-visible:ring-0 shadow-none h-9" />
            <Button size="sm" disabled={!messageInput.trim() || actionLoading} onClick={() => onSendSocial("message")} className="shrink-0">
              {t("game.social.sendBtn")}
            </Button>

          </div>
        </div>
      )}
    </div>
  );
}
