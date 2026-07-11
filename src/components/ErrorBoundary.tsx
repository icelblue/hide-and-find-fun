// ============================================================
// ErrorBoundary.tsx — Captura d'errors globals de React
// ============================================================
// Dos mecanismes de captura:
//
// 1. ErrorBoundary (component de classe):
//    Envolta tota l'app. Si un component fill llança un error
//    durant el renderitzat, mostra un fallback amigable en lloc
//    d'una pantalla en blanc. L'error es logeja a `error_logs`.
//
// 2. logError() + window listeners:
//    Captura errors no controlats (window.onerror) i rebuigs
//    de promeses (unhandledrejection) i els desa a la taula
//    `error_logs` de la base de dades per debugging remot.
//
// Ús: <ErrorBoundary><App /></ErrorBoundary> a main.tsx
// ============================================================

import { Component, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import caStrings from "@/i18n/ca.json";
import enStrings from "@/i18n/en.json";

/** Traducció mínima per a aquest fitxer (ErrorBoundary és un
 *  component de classe i no pot usar el hook useT). */
function tBoundary(key: string): string {
  const lang = typeof window !== "undefined" && localStorage.getItem("lang") === "en" ? "en" : "ca";
  const bundle: Record<string, unknown> = lang === "en" ? enStrings : caStrings;
  const val = key.split(".").reduce<unknown>((acc, k) =>
    acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined, bundle);
  return typeof val === "string" ? val : key;
}

// ---- Anti-spam: dedupe + límit de freqüència ----
// Un bucle de renderitzat o un error recurrent no ha d'inundar
// la taula error_logs: màxim 10 informes per sessió i mai el
// mateix missatge dues vegades en 60s.
const _reported = new Map<string, number>();
let _reportCount = 0;
const MAX_REPORTS_PER_SESSION = 10;
const DEDUPE_WINDOW_MS = 60_000;

function shouldReport(message: string): boolean {
  if (_reportCount >= MAX_REPORTS_PER_SESSION) return false;
  const now = Date.now();
  const last = _reported.get(message);
  if (last && now - last < DEDUPE_WINDOW_MS) return false;
  _reported.set(message, now);
  _reportCount++;
  return true;
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — captura errors de renderitzat.
 * Mostra un fallback visual i logeja l'error a la DB.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /** React lifecycle — marca que hi ha error per renderitzar el fallback */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /** React lifecycle — logeja l'error amb stack i component info */
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logError(error.message, error.stack, info.componentStack ?? undefined);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-xl font-bold mb-2">{tBoundary("errors.somethingFailed")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {tBoundary("errors.autoReported")}
            </p>
            <Button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/"; }}>
              {tBoundary("common.lobby")}
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Logeja un error a la taula `error_logs` de la base de dades.
 * Inclou: missatge, stack trace, component, URL, user agent i metadata.
 * Falla silenciosament si la inserció no funciona (evita recursió).
 */
export async function logError(
  message: string,
  stack?: string,
  component?: string,
  metadata?: Record<string, any>
) {
  try {
    if (!shouldReport(message)) return;
    const { data: { user } } = await supabase.auth.getUser();
    // Only log if user is authenticated (anon insert policy removed for security)
    if (!user) return;
    await (supabase as any).from("error_logs").insert({
      user_id: user.id,
      error_message: message.slice(0, 1000),
      error_stack: stack?.slice(0, 2000) ?? null,
      component: component?.slice(0, 200) ?? null,
      url: window.location.pathname,
      user_agent: navigator.userAgent.slice(0, 300),
      metadata: metadata ?? {},
    });
  } catch {
    // Falla silenciosament — no volem errors dins l'error handler
  }
}

// Captura global d'errors no gestionats i rebuigs de promeses
if (typeof window !== "undefined") {
  /** Captura errors JS globals (ex: TypeError, ReferenceError) */
  window.addEventListener("error", (e) => {
    logError(e.message, e.error?.stack, "window.onerror");
  });

  /** Captura promeses rebutjades no gestionades */
  window.addEventListener("unhandledrejection", (e) => {
    const msg = e.reason?.message ?? String(e.reason);
    logError(msg, e.reason?.stack, "unhandledrejection");
  });
}
