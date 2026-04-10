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

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  /** Envia email de recuperació de contrasenya */
  const handleForgotPassword = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Email enviat! Revisa la safata d'entrada.");
      setShowForgot(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  /** Gestiona submit del formulari (login o registre) */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success("Benvingut/da!");
      } else {
        await signUp(email, password, displayName);
        toast.success("Compte creat! Revisa el teu email.");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Efectes de fons decoratius (blur radial) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-accent/3 blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Hero — Logo + títol */}
        <div className="text-center pt-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center shadow-xl glow-primary">
            <span className="text-4xl">🔍</span>
          </div>
          <h1 className="text-2xl text-neon mb-2">DEDUCTION DUEL</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
            El joc de deducció PvP on la lògica guanya a la sort. 
            Amaga, investiga i dedueix! 🧠
          </p>
        </div>

        {/* Com funciona — 3 passos visuals */}
        <div className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Com funciona?</h2>
          <div className="flex gap-2">
            {HOW_IT_WORKS.map(h => (
              <div key={h.step} className="flex-1 glass rounded-xl p-3 text-center">
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
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "..." : isLogin ? "Entrar 🎮" : "Crear compte 🚀"}
              </Button>
            </form>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm" onClick={() => setShowForgot(false)}>
          <Card className="mx-4 max-w-sm glass" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6">
              <h3 className="text-lg font-bold mb-2">Recuperar contrasenya</h3>
              <p className="text-xs text-muted-foreground mb-3">Introdueix el teu email i t'enviarem un enllaç per restablir la contrasenya.</p>
              <Input
                type="email"
                placeholder="Email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
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
    </div>
  );
}
