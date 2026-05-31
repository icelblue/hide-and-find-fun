// ============================================================
// WaitingScreen.tsx — Pantalla d'espera de rival
// Extret de GamePage per reduir re-renders.
// Pur, sense lògica de negoci. React.memo per evitar re-renders.
// ============================================================
import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n/LanguageProvider";

type Props = {
  code: string;
  hasHidden: boolean;
};

function WaitingScreenInner({ code, hasHidden }: Props) {
  const t = useT();

  if (hasHidden) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-secondary flex items-center justify-center text-4xl shadow-lg">✅</div>
        <h2 className="text-xl font-bold mb-2">{t("game.hide.doneTitle")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("game.waiting.alreadyHidden")}</p>
        <Card className="glass glow-primary">
          <CardContent className="py-4">
            <div className="font-mono text-3xl tracking-[0.5em] font-bold text-gradient text-center">{code}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="glass glow-primary mb-4">
      <CardContent className="py-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">{t("game.waiting.shareCode")}</p>
        <div className="font-mono text-3xl tracking-[0.5em] font-bold text-gradient">{code}</div>
        <p className="text-[11px] text-muted-foreground/60 mt-2">{t("game.waiting.whileWaiting")}</p>
      </CardContent>
    </Card>
  );
}

export default memo(WaitingScreenInner);
