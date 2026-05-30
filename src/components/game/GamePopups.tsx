// ============================================================
// GamePopups.tsx — Modals i overlays del joc
// ============================================================
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/LanguageProvider";

interface SpecialFoundPopupProps {
  show: any;
  rival: any;
  objects: any[];
  specialFoundInput: string;
  specialFoundVariant: any;
  onInputChange: (value: string) => void;
  onVariantChange: (variant: any) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function SpecialFoundPopup({
  show,
  rival,
  objects,
  specialFoundInput,
  specialFoundVariant,
  onInputChange,
  onVariantChange,
  onSubmit,
  onClose,
}: SpecialFoundPopupProps) {
  const t = useT();
  if (!show) return null;

  const isChooseVariant = show.special.special_type === "choose_variant";
  const variants = Array.isArray(show.special.variants) ? show.special.variants : [];
  const canSubmit = isChooseVariant ? !!specialFoundVariant : !!specialFoundInput.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={t("game.popups.specialFoundTitle")}>
      <Card className="mx-4 max-w-sm glass glow-accent" onClick={e => e.stopPropagation()}>
        <CardContent className="py-6 text-center">
          <div className="text-5xl mb-3">{(rival?.special_data as any)?.custom_icon ?? objects.find((o: any) => o.id === rival?.hidden_object_id)?.icon ?? "⭐"}</div>
          <p className="font-bold text-lg mb-1">{t("game.popups.specialFoundTitle")}</p>
          {(() => {
            const sd = rival?.special_data as any;
            const hm = sd?.hide_message;
            return hm ? (
              <div className="mb-3 p-2 rounded-lg bg-accent/10 border border-accent/30">
                <p className="text-[10px] text-muted-foreground mb-1">{t("game.popups.secretMessageLabel")}</p>
                <p className="text-sm italic text-accent-foreground">"{hm}"</p>
              </div>
            ) : null;
          })()}
          <p className="text-sm text-muted-foreground mb-4">{show.special.prompt_text}</p>

          {isChooseVariant ? (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {variants.map((variant: any) => {
                const active = specialFoundVariant?.value === variant.value;
                return (
                  <button
                    key={variant.value}
                    type="button"
                    onClick={() => onVariantChange(variant)}
                    className={`rounded-xl border p-3 text-center transition-all active:scale-[0.98] ${
                      active ? "border-primary bg-primary/10" : "border-border/40 bg-muted/40 hover:border-primary/40"
                    }`}
                  >
                    <div className="text-3xl mb-1">{variant.icon ?? "⚽"}</div>
                    <div className="text-xs font-semibold">{variant.label}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <Input value={specialFoundInput} onChange={e => onInputChange(e.target.value)}
              placeholder={t("game.popups.specialPlaceholder")} maxLength={40} className="text-center bg-muted/50 mb-3" />
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>{t("game.popups.skipBtn")}</Button>
            <Button className="flex-1" disabled={!canSubmit} onClick={onSubmit}>
              {t("game.popups.saveTrophyBtn")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface HideMessagePopupProps {
  show: boolean;
  hideMessage: string;
  onMessageChange: (value: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
  loading?: boolean;
}

export function HideMessagePopup({ show, hideMessage, onMessageChange, onConfirm, onSkip, loading }: HideMessagePopupProps) {
  const t = useT();
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={t("game.popups.secretMessageTitle")}>
      <Card className="mx-4 max-w-sm glass glow-accent" onClick={e => e.stopPropagation()}>
        <CardContent className="py-6">
          <div className="text-center mb-4">
            <div className="text-5xl mb-2">💌</div>
            <p className="font-bold text-lg">{t("game.popups.secretMessageTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("game.popups.secretMessageSubtitle")}</p>
          </div>
          <Input value={hideMessage} onChange={e => onMessageChange(e.target.value)}
            placeholder={t("game.popups.secretPlaceholder")} maxLength={100}
            className="text-sm bg-accent/10 border-accent/30 placeholder:text-muted-foreground/50 mb-1" />
          <p className="text-[9px] text-muted-foreground/50 text-right mb-4">{hideMessage.length}/100</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onSkip} disabled={loading}>{t("game.popups.withoutMessage")}</Button>
            <Button className="flex-1" onClick={onConfirm} disabled={loading}>
              {loading ? t("game.popups.hideLoading") : t("game.popups.hideBtn")}
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
  const t = useT();
  if (!message) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={t("game.popups.rivalHintTitle")} onClick={onClose}>
      <Card className="mx-4 max-w-sm glass" onClick={e => e.stopPropagation()}>
        <CardContent className="py-6 text-center">
          <div className="text-4xl mb-2">💡</div>
          <p className="text-xs text-muted-foreground mb-1">{t("game.popups.rivalHintTitle")}</p>
          <p className="text-lg font-medium italic my-3 text-primary">"{message}"</p>
          <p className="text-[10px] text-muted-foreground mb-3">{t("game.popups.rivalHintWarn")}</p>
          <Button size="sm" onClick={onClose}>{t("common.close")}</Button>
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
  const t = useT();
  if (!effect) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" role="alert" aria-live="assertive">
      <div className={`text-center space-y-4 p-8 rounded-2xl glass max-w-sm mx-4 ${
        effect.animation === "shake" ? "animate-troll-shake" :
        effect.animation === "flash" ? "animate-troll-flash" :
        "animate-troll-bounce"
      }`}>
        <div className="text-8xl">{effect.emoji}</div>
        <p className="text-lg font-bold text-foreground leading-relaxed">{effect.message}</p>
        <Button onClick={onClose} variant="outline" size="sm">
          {t("game.popups.trollFunny")}
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
  const t = useT();
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("game.popups.bonusTitle")} onClick={onClose}>
      <Card className="mx-4 mb-8 max-w-xs w-full glass glow-accent shadow-2xl" onClick={e => e.stopPropagation()}>
        <CardContent className="py-5">
          <p className="text-sm font-bold mb-1 text-center">{t("game.popups.bonusTitle")}</p>
          <p className="text-[10px] text-muted-foreground text-center mb-4">{t("game.popups.bonusSubtitle", { n: bonusAvailable })}</p>
          <div className="flex items-center justify-center gap-4 mb-4">
            <button onClick={() => setBonusAmount(Math.max(0.1, Math.round((bonusAmount - 0.1) * 10) / 10))}
              disabled={bonusAmount <= 0.1} aria-label={t("game.popups.bonusDecrease")}
              className="w-10 h-10 rounded-full bg-muted/50 border border-border/40 text-lg font-bold hover:bg-muted transition-colors disabled:opacity-30">−</button>
            <span className="text-3xl font-bold min-w-[70px] text-center text-gradient">{bonusAmount}🪙</span>
            <button onClick={() => setBonusAmount(Math.min(bonusAvailable, Math.round((bonusAmount + 0.1) * 10) / 10))}
              disabled={bonusAmount >= bonusAvailable} aria-label={t("game.popups.bonusIncrease")}
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
            <Button variant="outline" className="flex-1" onClick={onClose}>{t("game.popups.bonusCancel")}</Button>
            <Button className="flex-1" disabled={actionLoading || bonusAmount > bonusAvailable || bonusAmount <= 0} onClick={onRedeem}>
              {t("game.popups.bonusAdd", { n: bonusAmount })}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface WinFoundPopupProps {
  show: boolean;
  objectIcon?: string;
  objectName?: string;
  itemIcon?: string;
  itemName?: string;
  positionLabel?: string;
  rivalName?: string;
  onClose: () => void;
}

export function WinFoundPopup({ show, objectIcon, objectName, itemIcon, itemName, positionLabel, rivalName, onClose }: WinFoundPopupProps) {
  const t = useT();
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in" role="dialog" aria-modal="true" aria-label={t("game.popups.winFoundTitle")}>
      <Card className="mx-4 max-w-sm glass glow-primary animate-scale-in" onClick={e => e.stopPropagation()}>
        <CardContent className="py-6 text-center">
          <div className="text-6xl mb-2 animate-scale-in">🏆</div>
          <p className="font-bold text-xl mb-1 text-gradient">{t("game.popups.winFoundTitle")}</p>
          {rivalName && <p className="text-xs text-muted-foreground mb-4">{t("game.popups.winFoundFrom", { name: rivalName })}</p>}

          <div className="my-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="text-5xl mb-2">{objectIcon ?? "❓"}</div>
            <p className="font-bold text-lg">{objectName ?? "?"}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {itemIcon} {itemName} {positionLabel && <span>· {positionLabel}</span>}
            </p>
          </div>

          <Button className="w-full" onClick={onClose}>{t("game.popups.continueBtn")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
