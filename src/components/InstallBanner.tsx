// ============================================================
// InstallBanner.tsx — Banner intel·ligent d'instal·lació PWA
// ============================================================
// Detecta plataforma (Android/iOS/Desktop) i si ja està instal·lada.
// Android: usa beforeinstallprompt per instal·lació en 1 clic.
// iOS: mostra guia visual pas a pas (Compartir → Afegir).
// Descartat per sessió (sessionStorage).
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { useT } from "@/i18n/LanguageProvider";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "dd_install_banner_dismissed";

type Platform = "android" | "ios" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function getPlatform(): Platform {
  const ua = navigator.userAgent || "";
  // iOS: iPhone, iPad, iPod — iPadOS 13+ reports as Mac but has touch
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "ios";
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios"; // iPadOS 13+
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (navigator.standalone === true) return true; // iOS Safari
  return false;
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Detect browser for Android fallback instructions */
function getAndroidBrowser(): "chrome" | "firefox" | "samsung" | "other" {
  const ua = navigator.userAgent || "";
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) return "chrome";
  return "other";
}

export function InstallBanner() {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [showGuide, setShowGuide] = useState(false);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show in iframe (Lovable preview) or if already installed
    if (isInIframe() || isStandalone() || isDismissed()) return;

    const plat = getPlatform();
    setPlatform(plat);

    // Desktop: no mostrar banner
    if (plat === "desktop") return;

    // iOS: mostrar directament
    if (plat === "ios") {
      setVisible(true);
      return;
    }

    // Android: esperar l'event beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setHasNativePrompt(true);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Fallback: si no arriba l'event en 3s, mostrar igualment amb instruccions manuals
    const fallbackTimer = setTimeout(() => {
      if (!deferredPrompt.current) setVisible(true);
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Detectar quan s'instal·la per amagar el banner
  useEffect(() => {
    const handler = () => setVisible(false);
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch { /* ignore */ }
  }, []);

  const handleInstallAndroid = useCallback(async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      }
      deferredPrompt.current = null;
    } else {
      // No native prompt available — show manual instructions
      setShowGuide(true);
    }
  }, []);

  if (!visible) return null;

  const androidBrowser = getAndroidBrowser();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))", paddingLeft: "0.75rem", paddingRight: "0.75rem", paddingTop: "0.75rem" }}
      role="banner"
      aria-label={t("common.installApp")}
    >
      <div className="mx-auto max-w-md rounded-xl bg-card border border-border/60 shadow-lg shadow-primary/10 p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <img
            src="/icons/icon-192.png"
            alt="Deduction Duel"
            width={48}
            height={48}
            className="rounded-xl flex-shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                📲 Instal·la Deduction Duel
              </h3>
              <button
                onClick={dismiss}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1"
                aria-label="Tancar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Android with native prompt */}
            {platform === "android" && !showGuide && hasNativePrompt && (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  Afegeix-la a la pantalla d'inici per accés ràpid 🎮
                </p>
                <Button
                  size="sm"
                  className="mt-2 w-full text-xs h-8"
                  onClick={handleInstallAndroid}
                >
                  Instal·lar
                </Button>
              </>
            )}

            {/* Android without native prompt — show instructions */}
            {platform === "android" && !showGuide && !hasNativePrompt && (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  Afegeix-la a la pantalla d'inici per jugar com una app real
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2 w-full text-xs h-8"
                  onClick={() => setShowGuide(true)}
                >
                  Com s'instal·la? 📱
                </Button>
              </>
            )}

            {/* iOS initial */}
            {platform === "ios" && !showGuide && (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  Afegeix-la a la pantalla d'inici per jugar com una app real
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2 w-full text-xs h-8"
                  onClick={() => setShowGuide(true)}
                >
                  Com s'instal·la? 👆
                </Button>
              </>
            )}

            {/* iOS guide */}
            {showGuide && platform === "ios" && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex-shrink-0">1</span>
                  <span>Toca <span className="inline-block text-base leading-none align-middle">⬆️</span> <strong>Compartir</strong> a la barra de Safari</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex-shrink-0">2</span>
                  <span>Busca <strong>"Afegir a pantalla d'inici"</strong> ➕</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex-shrink-0">3</span>
                  <span>Toca <strong>"Afegir"</strong> — ja la tens! 🎉</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-7 mt-1"
                  onClick={dismiss}
                >
                  Entès!
                </Button>
              </div>
            )}

            {/* Android guide (Firefox, Samsung, etc.) */}
            {showGuide && platform === "android" && (
              <div className="mt-2 space-y-2">
                {androidBrowser === "firefox" ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-foreground">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex-shrink-0">1</span>
                      <span>Toca <strong>⋮</strong> (menú) a dalt a la dreta</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-foreground">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex-shrink-0">2</span>
                      <span>{t("install.selectInstall")} <strong>"{t("common.install")}"</strong> 📥</span>
                    </div>
                  </>
                ) : androidBrowser === "samsung" ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-foreground">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex-shrink-0">1</span>
                      <span>Toca <strong>☰</strong> (menú) a baix a la dreta</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-foreground">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex-shrink-0">2</span>
                      <span>Selecciona <strong>"Afegir a pantalla d'inici"</strong> ➕</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs text-foreground">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex-shrink-0">1</span>
                      <span>Toca <strong>⋮</strong> (menú) a dalt a la dreta</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-foreground">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex-shrink-0">2</span>
                      <span>Selecciona <strong>"Afegir a pantalla d'inici"</strong> ➕</span>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex-shrink-0">✓</span>
                  <span>Confirma — ja la tens! 🎉</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-7 mt-1"
                  onClick={dismiss}
                >
                  Entès!
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
