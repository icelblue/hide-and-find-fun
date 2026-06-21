// ============================================================
// App.tsx — Punt d'entrada de l'aplicació React
// ============================================================
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy-loaded toaster (not needed for FCP)
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));

// Lazy-loaded pages for code splitting
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const LobbyPage = lazy(() => import("./pages/LobbyPage"));
const GamePage = lazy(() => import("./pages/GamePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PlayerProfilePage = lazy(() => import("./pages/PlayerProfilePage"));
const StoryModePage = lazy(() => import("./pages/StoryModePage"));
const SpacePage = lazy(() => import("./pages/SpacePage"));
const ClaimReminderPage = lazy(() => import("./pages/ClaimReminderPage"));
const DemoPage = lazy(() => import("./pages/DemoPage"));
const JoinGamePage = lazy(() => import("./pages/JoinGamePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
