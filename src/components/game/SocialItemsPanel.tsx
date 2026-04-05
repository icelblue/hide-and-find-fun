// ============================================================
// SocialItemsPanel.tsx — Panel d'ítems socials
// ============================================================
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SOCIAL_ITEMS, type SocialItemType } from "@/lib/supabase-helpers";

interface SocialItemsPanelProps {
  showPanel: boolean;
  setShowPanel: (show: boolean) => void;
  player: any;
  onSendSocial: (type: SocialItemType) => void;
  messageInput: string;
  setMessageInput: (msg: string) => void;
}

export default function SocialItemsPanel({
  showPanel, setShowPanel, player, onSendSocial, messageInput, setMessageInput,
}: SocialItemsPanelProps) {
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
                onClick={() => !isBombUsed && onSendSocial(item.type)}
                disabled={isBombUsed}
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

      {showPanel && (
        <div className="mt-2">
          <div className="flex gap-1.5 items-center glass rounded-xl p-2">
            <span className="text-xl pl-1">💡</span>
            <Input value={messageInput} onChange={e => setMessageInput(e.target.value)}
              placeholder="Pista o farol pel rival..." maxLength={80} className="text-sm bg-transparent border-0 focus-visible:ring-0 shadow-none h-9" />
            <Button size="sm" disabled={!messageInput.trim()} onClick={() => onSendSocial("message")} className="shrink-0">
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
