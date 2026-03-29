import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <Card className="w-full max-w-sm glass glow-primary relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl gradient-primary flex items-center justify-center shadow-lg glow-primary">
            <span className="text-3xl">🔍</span>
          </div>
          <CardTitle className="text-xl text-neon">🔍 DEDUCTION DUEL</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Amaga. Busca. Guanya.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <Input
                placeholder="Nom de jugador"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="bg-muted/50 border-border/50 h-11"
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-muted/50 border-border/50 h-11"
            />
            <Input
              type="password"
              placeholder="Contrasenya"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-muted/50 border-border/50 h-11"
            />
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "..." : isLogin ? "Entrar" : "Crear compte"}
            </Button>
          </form>
          {isLogin && (
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Has oblidat la contrasenya?
            </button>
          )}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "No tens compte? Registra't" : "Ja tens compte? Entra"}
          </button>

          {/* Forgot password modal */}
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
        </CardContent>
      </Card>
    </div>
  );
}
