// ============================================================
// AuthPage.tsx — Landing pública (login/registre) amb i18n CA/EN
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
import { useLanguage, useT, type Lang } from "@/i18n/LanguageProvider";

/** Compact CA/EN switcher — el mateix component s'usa a Lobby */
export function LanguageSwitcherCompact({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  const t = useT();
  return (
    <div
      role="group"
      aria-label={t("lobby.languageToggle")}
      className={`inline-flex items-center rounded-lg border border-border/50 bg-muted/40 p-0.5 text-[11px] font-semibold ${className}`}
    >
      {(["ca", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2 py-1 rounded-md transition-colors uppercase tracking-wider ${
            lang === l
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export default function AuthPage() {
  const t = useT();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const FEATURES = [
    { icon: "🧩", title: t("auth.feat1Title"), desc: t("auth.feat1Desc") },
    { icon: "⚔️", title: t("auth.feat2Title"), desc: t("auth.feat2Desc") },
    { icon: "🌡️", title: t("auth.feat3Title"), desc: t("auth.feat3Desc") },
    { icon: "🏆", title: t("auth.feat4Title"), desc: t("auth.feat4Desc") },
  ];
  const HOW = [
    { step: "1", icon: "🫣", text: t("auth.how1") },
    { step: "2", icon: "👀", text: t("auth.how2") },
    { step: "3", icon: "🔍", text: t("auth.how3") },
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      savePendingReferralCode(ref);
      setReferralCode(ref.toUpperCase().trim());
      setIsLogin(false);
    } else {
      const pending = getPendingReferralCode();
      if (pending) setReferralCode(pending);
    }
  }, []);

  const handleForgotPassword = async () => {
    const trimmed = forgotEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error(t("auth.emailInvalid"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(t("auth.resetSent"), { duration: 6000 });
      setShowForgot(false);
    } catch (err) {
      toast.error(translateAuthError(err), { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateAuthForm({ email, password, displayName, isSignup: !isLogin });
    if (validationError) {
      toast.error(validationError, { duration: 5000 });
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
        toast.success(t("auth.welcome"));
      } else {
        await signUp(email.trim(), password, displayName.trim());
        toast.success(t("auth.accountCreated"), { duration: 7000 });
      }
    } catch (err) {
      toast.error(translateAuthError(err), { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden" role="main">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-accent/3 blur-[150px]" />
      </div>

      {/* Language switcher — top right */}
      <div className="absolute top-3 right-3 z-20">
        <LanguageSwitcherCompact />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-8 space-y-6">
        <header className="text-center pt-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center shadow-xl glow-primary" aria-hidden="true">
            <span className="text-4xl">🔍</span>
          </div>
          <h1 className="text-2xl text-neon mb-2">{t("auth.title")}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
            {t("auth.tagline")}
          </p>
          {referralCode && (
            <>
              <div className="mt-3 inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs">
                <span>🎁</span>
                <span className="text-muted-foreground">{t("auth.referralLabel")}</span>
                <span className="font-bold text-primary">{referralCode}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/80 mt-1">{t("auth.referralBonus")}</p>
            </>
          )}
        </header>

        <div className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">{t("auth.howTitle")}</h2>
          <div className="flex gap-2" role="list">
            {HOW.map(h => (
              <div key={h.step} className="flex-1 glass rounded-xl p-3 text-center" role="listitem">
                <div className="text-2xl mb-1">{h.icon}</div>
                <p className="text-[10px] text-muted-foreground leading-tight">{h.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {FEATURES.map(f => (
            <div key={f.title} className="glass rounded-xl p-3">
              <div className="text-xl mb-1">{f.icon}</div>
              <div className="text-xs font-semibold mb-0.5">{f.title}</div>
              <p className="text-[10px] text-muted-foreground leading-tight">{f.desc}</p>
            </div>
          ))}
        </div>

        <Card className="glass glow-primary">
          <CardContent className="pt-5 pb-4">
            <form onSubmit={handleSubmit} className="space-y-3" aria-label={isLogin ? t("auth.formSignIn") : t("auth.formSignUp")}>
              {!isLogin && (
                <Input
                  placeholder={t("auth.displayNamePlaceholder")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  aria-label={t("auth.displayNamePlaceholder")}
                  className="bg-muted/50 border-border/50 h-11"
                />
              )}
              <Input
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label={t("auth.emailPlaceholder")}
                autoComplete="email"
                className="bg-muted/50 border-border/50 h-11"
              />
              <Input
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                aria-label={t("auth.passwordPlaceholder")}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="bg-muted/50 border-border/50 h-11"
              />
              {!isLogin && (
                <p className="text-[10px] text-muted-foreground -mt-1 px-1">
                  {t("auth.passwordHint")}
                </p>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? t("auth.loading") : isLogin ? t("auth.signInBtn") : t("auth.signUpBtn")}
              </Button>
            </form>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-[10px] text-muted-foreground uppercase">{t("auth.or")}</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
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
                    toast.error((result.error as Error).message || t("auth.googleError"));
                  }
                  if (result.redirected) return;
                } catch (err: any) {
                  toast.error(err.message || t("auth.googleError"));
                } finally {
                  setLoading(false);
                }
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {t("auth.google")}
            </Button>
            {isLogin && (
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {t("auth.forgot")}
              </button>
            )}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}
            </button>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground/50">
          {t("auth.footerTag")}
        </p>
      </div>

      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("auth.resetTitle")} onClick={() => setShowForgot(false)}>
          <Card className="mx-4 max-w-sm glass" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6">
              <h3 className="text-lg font-bold mb-2">{t("auth.resetTitle")}</h3>
              <p className="text-xs text-muted-foreground mb-3">{t("auth.resetDesc")}</p>
              <Input
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                aria-label={t("auth.emailPlaceholder")}
                className="mb-3 bg-muted/50 border-border/50 h-11"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowForgot(false)}>{t("auth.cancel")}</Button>
                <Button className="flex-1" disabled={loading || !forgotEmail} onClick={handleForgotPassword}>{t("auth.send")}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
