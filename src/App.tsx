// ============================================================
// App.tsx — Punt d'entrada de l'aplicació React
// ============================================================
import { lazy, Suspense, type ComponentType } from "react";
import { asError } from "@/lib/errors";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Retry-on-chunk-error: després d'un deploy el navegador pot tenir un index.html
// antic apuntant a chunks que ja no existeixen. Detectem l'error d'import del
// mòdul i forcem UN sol reload per obtenir l'index.html actualitzat.
// Sense això, la Suspense es quedaria penjada per sempre al PageLoader.
function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (_raw_err) { const err = asError(_raw_err);
      const msg = String(err?.message || err || "");
      const isChunkError = /Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk .* failed/i.test(msg);
      if (isChunkError && typeof window !== "undefined") {
        const KEY = "__ddl_chunk_reload__";
        if (!sessionStorage.getItem(KEY)) {
          sessionStorage.setItem(KEY, "1");
          window.location.reload();
          // Return a never-resolving promise so React doesn't render a broken state before reload.
          return await new Promise<{ default: T }>(() => {});
        }
      }
      throw err;
    }
  });
}

// Lazy-loaded toaster (not needed for FCP)
const Sonner = lazyWithReload(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));

// Lazy-loaded pages for code splitting
const AuthPage = lazyWithReload(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazyWithReload(() => import("./pages/ResetPasswordPage"));
const LobbyPage = lazyWithReload(() => import("./pages/LobbyPage"));
const GamePage = lazyWithReload(() => import("./pages/GamePage"));
const ProfilePage = lazyWithReload(() => import("./pages/ProfilePage"));
const PlayerProfilePage = lazyWithReload(() => import("./pages/PlayerProfilePage"));
const StoryModePage = lazyWithReload(() => import("./pages/StoryModePage"));
const SpacePage = lazyWithReload(() => import("./pages/SpacePage"));
const RoomPage = lazyWithReload(() => import("./pages/RoomPage"));
const ClaimReminderPage = lazyWithReload(() => import("./pages/ClaimReminderPage"));
const DemoPage = lazyWithReload(() => import("./pages/DemoPage"));
const JoinGamePage = lazyWithReload(() => import("./pages/JoinGamePage"));
const NotFound = lazyWithReload(() => import("./pages/NotFound"));


function PageLoader() {
  // Llegim lang directament de localStorage per evitar dependència del context
  // (PageLoader es renderitza també abans que LanguageProvider hidrati)
  const lang = typeof window !== "undefined" && localStorage.getItem("lang") === "en" ? "en" : "ca";
  const label = lang === "en" ? "Loading..." : "Carregant...";
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label={label}>
      <p className="text-muted-foreground animate-pulse">{label}</p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    const redirect = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
    const safe = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
    return <Navigate to={safe} replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <LanguageProvider>
        <Suspense fallback={null}>
          <Sonner />
        </Suspense>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
              <Route path="/game/:gameId" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/player/:userId" element={<ProtectedRoute><PlayerProfilePage /></ProtectedRoute>} />
              <Route path="/story" element={<ProtectedRoute><StoryModePage /></ProtectedRoute>} />
              <Route path="/space" element={<ProtectedRoute><SpacePage /></ProtectedRoute>} />
              <Route path="/space/room/:roomId" element={<ProtectedRoute><RoomPage /></ProtectedRoute>} />
              <Route path="/claim" element={<ClaimReminderPage />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/join/:gameId" element={<JoinGamePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
