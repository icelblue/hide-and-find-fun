// ============================================================
// App.tsx — Punt d'entrada de l'aplicació React
// ============================================================
// Rutes amb lazy loading per reduir bundle inicial.
// ============================================================
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy-loaded pages for code splitting
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const LobbyPage = lazy(() => import("./pages/LobbyPage"));
const GamePage = lazy(() => import("./pages/GamePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PlayerProfilePage = lazy(() => import("./pages/PlayerProfilePage"));
const StoryModePage = lazy(() => import("./pages/StoryModePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground animate-pulse">Carregant...</p>
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
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;