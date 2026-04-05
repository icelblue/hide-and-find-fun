// ============================================================
// GamePopups.tsx — Modals i overlays del joc
// ============================================================
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SpecialFoundPopupProps {
  show: any;
  rival: any;
  objects: any[];
  specialFoundInput: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function SpecialFoundPopup({ show, rival, objects, specialFoundInput, onInputChange, onSubmit, onClose }: SpecialFoundPopupProps) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <Card className="mx-4 max-w-sm glass glow-accent" onClick={e => e.stopPropagation()}>
        <CardContent className="py-6 text-center">
          <div className="text-5xl mb-3">{objects.find((o: any) => o.id === rival?.hidden_object_id)?.icon ?? "⭐"}</div>
          <p className="font-bold text-lg mb-1">⭐ Objecte especial trobat!</p>
          {(() => {
            const sd = rival?.special_data as any;
            const hm = sd?.hide_message;
            return hm ? (
              <div className="mb-3 p-2 rounded-lg bg-accent/10 border border-accent/30">
                <p className="text-[10px] text-muted-foreground mb-1">💌 Missatge secret del rival:</p>
                <p className="text-sm italic text-accent-foreground">"{hm}"</p>
              </div>
            ) : null;
          })()}
          <p className="text-sm text-muted-foreground mb-4">{show.special.prompt_text}</p>
          <Input value={specialFoundInput} onChange={e => onInputChange(e.target.value)}
            placeholder="Escriu un nom..." maxLength={40} className="text-center bg-muted/50 mb-3" />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Saltar</Button>
            <Button className="flex-1" disabled={!specialFoundInput.trim()} onClick={onSubmit}>
              Desar trofeu 🏆
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MessagePopupProps {
  message: string | null;
  onClose: () => void;
}

export function MessagePopup({ message, onClose }: MessagePopupProps) {
  if (!message) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-md" onClick={onClose}>
      <Card className="mx-4 max-w-sm glass" onClick={e => e.stopPropagation()}>
        <CardContent className="py-6 text-center">
          <div className="text-4xl mb-2">💡</div>
          <p className="text-xs text-muted-foreground mb-1">Pista del rival:</p>
          <p className="text-lg font-medium italic my-3 text-primary">"{message}"</p>
          <p className="text-[10px] text-muted-foreground mb-3">⚠️ Pot ser veritat o un farol!</p>
          <Button size="sm" onClick={onClose}>Tancar</Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface TrollEffectProps {
  effect: { message: string; emoji: string; animation: string } | null;
  onClose: () => void;
}

export function TrollEffect({ effect, onClose }: TrollEffectProps) {
  if (!effect) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className={`text-center space-y-4 p-8 rounded-2xl glass max-w-sm mx-4 ${
        effect.animation === "shake" ? "animate-troll-shake" :
        effect.animation === "flash" ? "animate-troll-flash" :
        "animate-troll-bounce"
      }`}>
        <div className="text-8xl">{effect.emoji}</div>
        <p className="text-lg font-bold text-foreground leading-relaxed">{effect.message}</p>
        <Button onClick={onClose} variant="outline" size="sm">
          😂 Bona broma!
        </Button>
      </div>
    </div>
  );
}

interface BonusTokenPickerProps {
  bonusAvailable: number;
  bonusAmount: number;
  setBonusAmount: (amount: number) => void;
  onRedeem: () => void;
  onClose: () => void;
  actionLoading: boolean;
}

export function BonusTokenPicker({ bonusAvailable, bonusAmount, setBonusAmount, onRedeem, onClose, actionLoading }: BonusTokenPickerProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <Card className="mx-4 mb-8 max-w-xs w-full glass glow-accent shadow-2xl" onClick={e => e.stopPropagation()}>
        <CardContent className="py-5">
          <p className="text-sm font-bold mb-1 text-center">💰 Afegir bonus tokens</p>
          <p className="text-[10px] text-muted-foreground text-center mb-4">Quants tokens vols gastar? (Tens {bonusAvailable} disponibles)</p>
          <div className="flex items-center justify-center gap-4 mb-4">
            <button onClick={() => setBonusAmount(Math.max(0.1, Math.round((bonusAmount - 0.1) * 10) / 10))}
              disabled={bonusAmount <= 0.1}
              className="w-10 h-10 rounded-full bg-muted/50 border border-border/40 text-lg font-bold hover:bg-muted transition-colors disabled:opacity-30">−</button>
            <span className="text-3xl font-bold min-w-[70px] text-center text-gradient">{bonusAmount}🪙</span>
            <button onClick={() => setBonusAmount(Math.min(bonusAvailable, Math.round((bonusAmount + 0.1) * 10) / 10))}
              disabled={bonusAmount >= bonusAvailable}
              className="w-10 h-10 rounded-full bg-muted/50 border border-border/40 text-lg font-bold hover:bg-muted transition-colors disabled:opacity-30">+</button>
          </div>
          <div className="flex justify-center gap-2 mb-4 flex-wrap">
            {[0.1, 0.5, 1, Math.round(bonusAvailable * 10) / 10]
              .filter(v => v <= bonusAvailable && v > 0)
              .filter((v, i, a) => a.indexOf(v) === i)
              .map(v => (
              <button key={v} onClick={() => setBonusAmount(v)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${bonusAmount === v ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
                {v}🪙
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel·lar</Button>
            <Button className="flex-1" disabled={actionLoading || bonusAmount > bonusAvailable || bonusAmount <= 0} onClick={onRedeem}>
              Afegir {bonusAmount}🪙 ✓
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
