// ============================================================
// InstallBanner.tsx — Banner intel·ligent d'instal·lació PWA
// ============================================================
// Detecta plataforma (Android/iOS/Desktop) i si ja està instal·lada.
// Android: usa beforeinstallprompt per instal·lació en 1 clic.
// iOS: mostra guia visual pas a pas (Compartir → Afegir).
// Un cop descartat, no torna a aparèixer (localStorage).
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
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
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((navigator as any).standalone === true) return true; // iOS Safari
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
    // Dismiss is per-session: uses sessionStorage instead of localStorage
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [showIOSGuide, setShowIOSGuide] = useState(false);
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
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Fallback: si no arriba l'event en 3s, mostrar igualment (Chrome pot no enviar-lo)
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
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
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
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-3 animate-in slide-in-from-bottom duration-300"
      role="banner"
      aria-label="Instal·lar aplicació"
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

            {platform === "android" && !showIOSGuide && (
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

            {platform === "ios" && !showIOSGuide && (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  Afegeix-la a la pantalla d'inici per jugar com una app real
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2 w-full text-xs h-8"
                  onClick={() => setShowIOSGuide(true)}
                >
                  Com s'instal·la? 👆
                </Button>
              </>
            )}

            {showIOSGuide && (
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
          </div>
        </div>
      </div>
    </div>
  );
}
