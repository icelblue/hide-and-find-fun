// ============================================================
// JoinGamePage.tsx — Entrada via enllaç compartit /join/:gameId
// ============================================================
// - Si no logat → redirigeix a /auth?redirect=/join/:gameId
// - Si logat → crida RPC join_game_by_link i navega a /game/:gameId
// - Errors traduïts via i18n
// ============================================================
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/i18n/LanguageProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ERROR_KEY: Record<string, string> = {
  not_authenticated: "join.errors.notAuth",
  game_not_found: "join.errors.notFound",
  cannot_join_story: "join.errors.story",
  game_not_joinable: "join.errors.notJoinable",
  game_is_private: "join.errors.private",
  game_full: "join.errors.full",
};

export default function JoinGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!gameId) {
      navigate("/", { replace: true });
      return;
    }
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/join/${gameId}`)}`, { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      setBusy(true);
      const { data, error: rpcErr } = await supabase.rpc("join_game_by_link" as any, { _game_id: gameId });
      if (cancelled) return;
      if (rpcErr) {
        const code = (rpcErr.message || "").trim();
        const i18nKey = ERROR_KEY[code] ?? "join.errors.generic";
        setError(t(i18nKey));
        setBusy(false);
        return;
      }
      const result = data as { game_id: string } | null;
      navigate(`/game/${result?.game_id ?? gameId}`, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId, user, authLoading, navigate, t]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-sm w-full glass">
        <CardContent className="py-8 text-center space-y-4">
          {busy && !error && (
            <>
              <div className="text-4xl animate-pulse">🔗</div>
              <p className="text-sm text-muted-foreground">{t("join.joining")}</p>
            </>
          )}
          {error && (
            <>
              <div className="text-4xl">⚠️</div>
              <p className="text-sm font-semibold">{error}</p>
              <Button onClick={() => navigate("/", { replace: true })} className="w-full">
                {t("common.lobby")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
