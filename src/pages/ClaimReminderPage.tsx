// ============================================================
// ClaimReminderPage.tsx — Reclama bonus d'un email recordatori
// ============================================================
// L'usuari arriba aquí des d'un enllaç dins l'email amb ?token=XXX
// Crida l'RPC `claim_reminder_bonus` per atorgar tokens + ítem.
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { claimReminderBonus } from "@/lib/referral-helpers";

export default function ClaimReminderPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"idle" | "claiming" | "success" | "error">("idle");
  const [result, setResult] = useState<{ tokens?: number; reward_rarity?: string; error?: string } | null>(null);

  const token = params.get("token");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Guardem el token a localStorage perquè es recuperi després del login
      if (token) localStorage.setItem("dd_pending_claim_token", token);
      navigate("/auth");
      return;
    }
    if (!token) {
      setStatus("error");
      setResult({ error: "no_token" });
      return;
    }

    setStatus("claiming");
    claimReminderBonus(token)
      .then((r) => {
        if (r?.success) {
          setStatus("success");
          setResult({ tokens: r.tokens, reward_rarity: r.reward_rarity });
          localStorage.removeItem("dd_pending_claim_token");
        } else {
          setStatus("error");
          setResult({ error: r?.error || "unknown" });
        }
      })
      .catch((e) => {
        setStatus("error");
        setResult({ error: e.message });
      });
  }, [user, authLoading, token, navigate]);

  const errorMessages: Record<string, string> = {
    no_token: "Aquest enllaç no és vàlid.",
    invalid_token: "Aquest enllaç no és teu o ja no és vàlid.",
    already_claimed: "Ja has reclamat aquest bonus!",
    expired: "Aquest enllaç ha caducat (els bonus expiren als 30 dies).",
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="glass max-w-sm w-full glow-primary">
        <CardContent className="py-8 text-center space-y-4">
          {status === "claiming" && (
            <>
              <div className="text-5xl animate-pulse">🎁</div>
              <p className="text-muted-foreground">Reclamant el teu bonus...</p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="text-6xl">🎉</div>
              <h1 className="text-xl font-bold">Bonus reclamat!</h1>
              <div className="space-y-2 text-sm">
                {result?.tokens ? <p>+{result.tokens} tokens 🪙</p> : null}
                {result?.reward_rarity ? (
                  <p>+1 ítem {result.reward_rarity === "epic" ? "èpic 🟣" : result.reward_rarity === "rare" ? "rar 🔵" : "comú"}</p>
                ) : null}
              </div>
              <Button className="w-full" onClick={() => navigate("/")}>
                Anar a jugar 🎮
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <div className="text-5xl opacity-50">😔</div>
              <h1 className="text-lg font-bold">Ups</h1>
              <p className="text-sm text-muted-foreground">
                {errorMessages[result?.error ?? ""] ?? "Hi ha hagut un error."}
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
                Tornar al lobby
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
