// ============================================================
// OnboardingDialog — Reusable first-time tutorial dialog
// ============================================================
// Uses localStorage flag; renders once per user+key combination.
// ============================================================
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  storageKey: string;         // e.g. "onboarding:space:v1"
  title: string;
  icon?: string;
  bullets: string[];
  ctaLabel: string;
  /** If true, always show (dev/testing). Default false. */
  force?: boolean;
}

export function OnboardingDialog({ storageKey, title, icon, bullets, ctaLabel, force }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (force) { setOpen(true); return; }
    try {
      if (!localStorage.getItem(storageKey)) setOpen(true);
    } catch {
      // storage disabled → skip
    }
  }, [storageKey, force]);

  const dismiss = () => {
    try { localStorage.setItem(storageKey, "1"); } catch { /* noop */ }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">
            {icon && <span className="mr-1.5">{icon}</span>}
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-accent">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Button className="w-full mt-2" onClick={dismiss}>{ctaLabel}</Button>
      </DialogContent>
    </Dialog>
  );
}
