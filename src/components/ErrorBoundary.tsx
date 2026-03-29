import { Component, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logError(error.message, error.stack, info.componentStack ?? undefined);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-xl font-bold mb-2">Alguna cosa ha fallat</h2>
            <p className="text-sm text-muted-foreground mb-4">
              L'error ha estat reportat automàticament. Torna-ho a provar.
            </p>
            <Button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/"; }}>
              Tornar al lobby
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export async function logError(
  message: string,
  stack?: string,
  component?: string,
  metadata?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    // Use rpc-style raw insert since error_logs may not be in generated types yet
    await (supabase as any).from("error_logs").insert({
      user_id: user?.id ?? null,
      error_message: message.slice(0, 1000),
      error_stack: stack?.slice(0, 5000) ?? null,
      component: component?.slice(0, 200) ?? null,
      url: window.location.href,
      user_agent: navigator.userAgent.slice(0, 500),
      metadata: metadata ?? {},
    });
  } catch {
    // silently fail - don't recurse errors
  }
}

// Global unhandled error/rejection catcher
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    logError(e.message, e.error?.stack, "window.onerror");
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = e.reason?.message ?? String(e.reason);
    logError(msg, e.reason?.stack, "unhandledrejection");
  });
}
