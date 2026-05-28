// WhileAwayDialog — Popup que es mostra en entrar al Mode Història
// resumint visites de mascotes i regals rebuts mentre estaves fora.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { outcomeLabel, type ResolvedVisit, type PetNotification } from "@/lib/pet-social";
import { useT } from "@/i18n/LanguageProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  visits: ResolvedVisit[];
  notifications: PetNotification[];
  petName?: string;
}

export function WhileAwayDialog({ open, onClose, visits, notifications, petName }: Props) {
  const t = useT();
  const total = visits.length + notifications.length;
  if (total === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">📬</span>
            <span>{t("whileAway.title")}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {notifications.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                {t("whileAway.giftsHeader", { name: petName ?? t("whileAway.yourPet") })}
              </p>
              <div className="space-y-1.5">
                {notifications.map((n) => {
                  const p = n.payload ?? {};
                  if (n.notif_type === "gift_consumable") {
                    return (
                      <div key={n.id} className="glass rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                        <span className="text-2xl">{p.icon ?? "💊"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{n.from_display_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {t("whileAway.gaveYou")} <strong>{p.consumable_name}</strong>
                            {p.cured_event ? ` · ${t("whileAway.cured")}` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  if (n.notif_type === "gift_item") {
                    return (
                      <div key={n.id} className="glass rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                        <span className="text-2xl">{p.icon ?? "🎁"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{n.from_display_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {t("whileAway.gifted")} <strong>{p.item_name}</strong>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {visits.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                {t("whileAway.visitsHeader")}
              </p>
              <div className="space-y-1.5">
                {visits.map((v) => {
                  const o = outcomeLabel(v.outcome);
                  const action = v.role === "host" ? t("whileAway.hostAction") : t("whileAway.visitorAction");
                  const outcomeText = t(`visitOutcome.${v.outcome}`);
                  return (
                    <div key={v.id} className="glass rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                      <span className="text-2xl">{v.other_pet_icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{v.other_pet_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {action} · <span className={`font-semibold ${o.color}`}>{o.icon} {outcomeText}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">{t("whileAway.continue")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
