// ============================================================
// NotFound.tsx — Pàgina 404 (i18n)
// ============================================================
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/LanguageProvider";

const NotFound = () => {
  const navigate = useNavigate();
  const t = useT();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="text-6xl mb-4 opacity-60">🔍</div>
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground mb-6">{t("notFound.message", "Aquesta pàgina no existeix")}</p>
        <Button onClick={() => navigate("/")} variant="outline">
          {t("common.backToLobby")}
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
