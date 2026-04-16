// ============================================================
// SocialItemsPanel.tsx — Panel d'ítems socials
// ============================================================
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SOCIAL_ITEMS, type SocialItemType } from "@/lib/supabase-helpers";

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

export default function SocialItemsPanel({
  showPanel, setShowPanel, player, onSendSocial, messageInput, setMessageInput, actionLoading,
  connectedScenarios, currentScenarioId, currentScenarioItems,
}: SocialItemsPanelProps) {
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

  return (
    <div>
      <Button variant="outline" className="w-full h-12 text-base" size="lg"
        onClick={() => setShowPanel(!showPanel)}
        disabled={player.social_item_used_today}>
        {player.social_item_used_today ? "⏳ Ítem social usat avui" : "⚡ Usar ítem social (1/dia)"}
      </Button>

      {showPanel && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {SOCIAL_ITEMS.filter(i => i.type !== "message").map(item => {
            const isBombUsed = item.type === "smoke_bomb" && player.smoke_bomb_used;
            return (
              <button key={item.type}
                onClick={() => !isBombUsed && !actionLoading && handleItemClick(item.type)}
                disabled={isBombUsed || actionLoading}
                className={`glass rounded-xl p-3 text-center transition-all active:scale-[0.95] hover:border-accent/40 group relative ${isBombUsed ? "opacity-30" : ""}`}>
                <span className="text-3xl block mb-1.5">{item.icon}</span>
                <span className="text-[11px] font-semibold block leading-tight">{item.name}</span>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-popover border border-border text-[10px] text-popover-foreground shadow-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 max-w-[200px] text-wrap text-center">
                  {isBombUsed ? "Ja usat en aquesta partida" : item.desc}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Barricada picker */}
      {showPanel && showBarricadaPicker && connectedScenarios && connectedScenarios.length > 0 && (
        <div className="mt-2 glass rounded-xl p-3">
          <p className="text-xs font-semibold mb-2 text-muted-foreground">🚧 Quin camí vols barricadar?</p>
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
            Barricadar camí
          </Button>
        </div>
      )}

      {/* Trampa picker */}
      {showPanel && showTrampaPicker && currentScenarioItems && currentScenarioItems.length > 0 && (
        <div className="mt-2 glass rounded-xl p-3">
          <p className="text-xs font-semibold mb-2 text-muted-foreground">🪤 On vols posar la trampa?</p>
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
            Col·locar trampa
          </Button>
        </div>
      )}

      {showPanel && (
        <div className="mt-2">
          <div className="flex gap-1.5 items-center glass rounded-xl p-2">
            <span className="text-xl pl-1">💡</span>
            <Input value={messageInput} onChange={e => setMessageInput(e.target.value)}
              placeholder="Pista o farol pel rival..." maxLength={80} className="text-sm bg-transparent border-0 focus-visible:ring-0 shadow-none h-9" />
            <Button size="sm" disabled={!messageInput.trim() || actionLoading} onClick={() => onSendSocial("message")} className="shrink-0">
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
