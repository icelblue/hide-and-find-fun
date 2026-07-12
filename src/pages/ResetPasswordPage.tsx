// ============================================================
// ResetPasswordPage.tsx — Restablir contrasenya
// ============================================================
// L'usuari hi arriba via l'enllaç d'email de recuperació.
// Escolta l'event PASSWORD_RECOVERY de Supabase Auth i
// permet introduir una nova contrasenya (mínim 6 caràcters).
//
// Flux:
//   1. L'usuari clica "Has oblidat la contrasenya?" a AuthPage
//   2. Rep un email amb un enllaç a /reset-password#type=recovery
//   3. Supabase Auth injecta el token al hash de la URL
//   4. onAuthStateChange detecta PASSWORD_RECOVERY → mostra formulari
//   5. updateUser({ password }) canvia la contrasenya
//   6. Redirigeix al Lobby
// ============================================================

import { useState, useEffect } from "react";
import { asError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useT } from "@/i18n/LanguageProvider";
import { useNavigate } from "react-router-dom";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const t = useT();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false); // true quan el token és vàlid

  useEffect(() => {
    // Escolta l'event PASSWORD_RECOVERY de Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    // Fallback: comprova si el hash ja conté type=recovery
    if (window.location.hash.includes("type=recovery")) {
      setReady(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  /** Canvia la contrasenya i redirigeix al Lobby */
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t("auth.passwordsMismatch"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("auth.passwordMin"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Contrasenya actualitzada! 🎉");
      navigate("/");
    } catch (_raw_err) { const err = asError(_raw_err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Efectes de fons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <Card className="w-full max-w-sm glass glow-primary relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl gradient-primary flex items-center justify-center shadow-lg glow-primary">
            <span className="text-3xl">🔑</span>
          </div>
          <CardTitle className="text-xl text-neon">NOVA CONTRASENYA</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Introdueix la teva nova contrasenya
          </p>
        </CardHeader>
        <CardContent>
          {!ready ? (
            // Esperant que Supabase Auth validi el token
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground animate-pulse">Verificant enllaç...</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-3">
              <Input
                type="password"
                placeholder="Nova contrasenya"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-muted/50 border-border/50 h-11"
              />
              <Input
                type="password"
                placeholder="Repeteix la contrasenya"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="bg-muted/50 border-border/50 h-11"
              />
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "..." : "Canviar contrasenya"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
