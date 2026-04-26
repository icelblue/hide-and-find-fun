// ============================================================
// AuthPage.tsx — Pàgina de login i registre
// ============================================================
// Landing page pública amb:
//   - Hero amb logo, títol i descripció del joc
//   - Secció "Com funciona?" amb 3 passos visuals
//   - Grid de features (deducció, PvP, pistes, Elo)
//   - Formulari d'autenticació (login/registre toggle)
//   - Modal de "recuperar contrasenya"
//
// L'autenticació és via email+password (Supabase Auth).
// Al registrar-se, el trigger `handle_new_user()` crea el perfil.
// ============================================================

import { useState, useEffect } from "react";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { translateAuthError, validateAuthForm } from "@/lib/auth-errors";
import { savePendingReferralCode, getPendingReferralCode } from "@/lib/referral-helpers";

/** Features destacades del joc per la landing */
const FEATURES = [
  { icon: "🧩", title: "Deducció pura", desc: "Res de sort. Observa, dedueix i troba!" },
  { icon: "⚔️", title: "PvP en temps real", desc: "Amaga el teu objecte i busca el del rival" },
  { icon: "🌡️", title: "Pistes progressives", desc: "Fred... Calent... MOLT CALENT! 🔥" },
  { icon: "🏆", title: "Elo i Lligues", desc: "Puja de Bronze a Diamond amb cada victòria" },
];

/** Resum visual del flux de joc en 3 passos */
const HOW_IT_WORKS = [
  { step: "1", icon: "🫣", text: "Amaga un objecte en un moble d'una habitació" },
  { step: "2", icon: "👀", text: "Observa posicions per rebre pistes (fred/calent/molt calent)" },
  { step: "3", icon: "🔍", text: "Quan ho tinguis clar, confirma per trobar l'objecte i guanyar!" },
];

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);        // Toggle login/registre
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);  // Modal recuperar password
  const [forgotEmail, setForgotEmail] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Capturar codi de referral de la URL (?ref=XXX) i guardar-lo
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      savePendingReferralCode(ref);
      setReferralCode(ref.toUpperCase().trim());
      setIsLogin(false); // Si venen amb codi, mostrem registre per defecte
    } else {
      const pending = getPendingReferralCode();
      if (pending) setReferralCode(pending);
    }
  }, []);

  /** Envia email de recuperació de contrasenya */
  const handleForgotPassword = async () => {
    const trimmed = forgotEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Introdueix un email vàlid.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Email enviat! Revisa la safata d'entrada (i el correu brossa).", { duration: 6000 });
      setShowForgot(false);
    } catch (err) {
      toast.error(translateAuthError(err), { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  /** Gestiona submit del formulari (login o registre) */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validació local primer (evita anar a la xarxa amb dades invàlides)
    const validationError = validateAuthForm({
      email,
      password,
      displayName,
      isSignup: !isLogin,
    });
    if (validationError) {
      toast.error(validationError, { duration: 5000 });
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
        toast.success("Benvingut/da!");
      } else {
        await signUp(email.trim(), password, displayName.trim());
        toast.success("Compte creat! Revisa el teu email per confirmar.", { duration: 7000 });
      }
    } catch (err) {
      toast.error(translateAuthError(err), { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden" role="main">
      {/* Efectes de fons decoratius (blur radial) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-accent/3 blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Hero — Logo + títol */}
        <header className="text-center pt-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center shadow-xl glow-primary" aria-hidden="true">
            <span className="text-4xl">🔍</span>
          </div>
          <h1 className="text-2xl text-neon mb-2">DEDUCTION DUEL</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
            El joc de deducció PvP on la lògica guanya a la sort. 
            Amaga, investiga i dedueix! 🧠
          </p>
          {referralCode && (
            <div className="mt-3 inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs">
              <span>🎁</span>
              <span className="text-muted-foreground">Codi convidat:</span>
              <span className="font-bold text-primary">{referralCode}</span>
            </div>
          )}
          {referralCode && (
            <p className="text-[10px] text-muted-foreground/80 mt-1">+5 tokens benvinguda en registrar-te</p>
          )}
        </header>

        {/* Com funciona — 3 passos visuals */}
        <div className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Com funciona?</h2>
          <div className="flex gap-2" role="list">
            {HOW_IT_WORKS.map(h => (
              <div key={h.step} className="flex-1 glass rounded-xl p-3 text-center" role="listitem">
                <div className="text-2xl mb-1">{h.icon}</div>
                <p className="text-[10px] text-muted-foreground leading-tight">{h.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Grid de features */}
        <div className="grid grid-cols-2 gap-2">
          {FEATURES.map(f => (
            <div key={f.title} className="glass rounded-xl p-3">
              <div className="text-xl mb-1">{f.icon}</div>
              <div className="text-xs font-semibold mb-0.5">{f.title}</div>
              <p className="text-[10px] text-muted-foreground leading-tight">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Formulari d'autenticació */}
        <Card className="glass glow-primary">
          <CardContent className="pt-5 pb-4">
            <form onSubmit={handleSubmit} className="space-y-3" aria-label={isLogin ? "Formulari d'inici de sessió" : "Formulari de registre"}>
              {/* Camp nom de jugador (només registre) */}
              {!isLogin && (
                <Input
                  placeholder="Nom de jugador"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  aria-label="Nom de jugador"
                  className="bg-muted/50 border-border/50 h-11"
                />
              )}
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Adreça de correu electrònic"
                autoComplete="email"
                className="bg-muted/50 border-border/50 h-11"
              />
              <Input
                type="password"
                placeholder="Contrasenya"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                aria-label="Contrasenya"
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="bg-muted/50 border-border/50 h-11"
              />
              {!isLogin && (
                <p className="text-[10px] text-muted-foreground -mt-1 px-1">
                  Mínim 6 caràcters. Tria una contrasenya segura.
                </p>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "..." : isLogin ? "Entrar 🎮" : "Crear compte 🚀"}
              </Button>
            </form>
            {/* Separador */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-[10px] text-muted-foreground uppercase">o</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
            {/* Google Sign-In */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const result = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (result.error) {
                    toast.error((result.error as Error).message || "Error amb Google");
                  }
                  if (result.redirected) return;
                } catch (err: any) {
                  toast.error(err.message || "Error amb Google");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continuar amb Google
            </Button>
            {/* Enllaç recuperar contrasenya (només login) */}
            {isLogin && (
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Has oblidat la contrasenya?
              </button>
            )}
            {/* Toggle login ↔ registre */}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "No tens compte? Registra't" : "Ja tens compte? Entra"}
            </button>
          </CardContent>
        </Card>

        {/* Tagline final */}
        <p className="text-center text-[10px] text-muted-foreground/50">
          🧠 No és qüestió de sort. És qüestió de lògica.
        </p>
      </div>

      {/* Modal recuperar contrasenya */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Recuperar contrasenya" onClick={() => setShowForgot(false)}>
          <Card className="mx-4 max-w-sm glass" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6">
              <h3 className="text-lg font-bold mb-2">Recuperar contrasenya</h3>
              <p className="text-xs text-muted-foreground mb-3">Introdueix el teu email i t'enviarem un enllaç per restablir la contrasenya.</p>
              <Input
                type="email"
                placeholder="Email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                aria-label="Email per recuperar contrasenya"
                className="mb-3 bg-muted/50 border-border/50 h-11"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowForgot(false)}>Cancel·lar</Button>
                <Button className="flex-1" disabled={loading || !forgotEmail} onClick={handleForgotPassword}>Enviar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
