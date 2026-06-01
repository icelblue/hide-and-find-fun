// ============================================================
// ScenarioPicker.tsx — Selecció d'escenari (fase amagar, pas 1)
// Extret de GamePage. Component pur, sense lògica de negoci.
// React.memo per evitar re-renders innecessaris.
// ============================================================
import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/HelpButton";
import { useT } from "@/i18n/LanguageProvider";

type Scenario = { id: string; name: string; icon: string };

type Props = {
  scenarios: Scenario[];
  onSelect: (id: string) => void;
  onBack: () => void;
};

function ScenarioPickerInner({ scenarios, onSelect, onBack }: Props) {
  const t = useT();
  return (
    <div>
      <h2 className="text-lg font-bold mb-1">{t("game.hide.whereTitle")}</h2>
      <Tip>{t("game.hide.whereTip")}</Tip>
      <div className="h-3" />
      <div className="grid grid-cols-2 gap-2.5">
        {scenarios.map(s => (
          <Card
            key={s.id}
            className="cursor-pointer glass hover:border-primary/40 hover:glow-primary transition-all active:scale-[0.97]"
            onClick={() => onSelect(s.id)}
          >
            <CardContent className="py-5 text-center">
              <div className="text-4xl mb-2">{s.icon}</div>
              <div className="text-sm font-semibold">{s.name}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="mt-3" onClick={onBack}>
        {t("game.hide.backToObject")}
      </Button>
    </div>
  );
}

export default memo(ScenarioPickerInner);
