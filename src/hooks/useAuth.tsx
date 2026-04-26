// ============================================================
// useAuth.tsx — Proveïdor d'autenticació (Context API)
// ============================================================
// Gestiona l'estat d'autenticació global de l'app:
//   - Escolta canvis de sessió (login/logout/token refresh)
//   - Proveeix funcions signUp, signIn, signOut
//   - Carrega la sessió existent a l'arrencada
//
// Ús: <AuthProvider> envolta tota l'app a App.tsx
//      useAuth() dins qualsevol component fill
//
// NOTA: El perfil de l'usuari es crea automàticament via trigger
// PostgreSQL `handle_new_user()` — no cal fer-ho aquí.
// ============================================================

import { useState, useEffect, useRef, createContext, useContext, ReactNode } from "react";
import { registerServiceWorker, subscribeToPush, isPushSupported } from "@/lib/push-notifications";
import { applyPendingReferral, getPendingReferralCode } from "@/lib/referral-helpers";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/** Interfície del context d'autenticació */
interface AuthCtx {
  user: User | null;       // Usuari actual o null si no autenticat
  loading: boolean;        // true durant la càrrega inicial de sessió
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

/**
 * AuthProvider — Envolta l'app i proporciona l'estat d'autenticació.
 * Utilitza onAuthStateChange per reaccionar a canvis de sessió
 * (login, logout, token refresh, etc.) en temps real.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const pushInitRef = useRef(false);

  useEffect(() => {
    // Subscripció reactiva a canvis d'autenticació
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Carrega sessió existent (cookie/localStorage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Register service worker on mount
    registerServiceWorker();

    return () => subscription.unsubscribe();
  }, []);

  // Auto-subscribe to push when user logs in + apply pending referral
  useEffect(() => {
    if (user && !pushInitRef.current && isPushSupported()) {
      pushInitRef.current = true;
      // Small delay to not block UI
      const timer = setTimeout(() => {
        subscribeToPush().catch(() => {});
      }, 3000);
      // Apply pending referral if any (fire-and-forget, no UI block)
      if (getPendingReferralCode()) {
        setTimeout(() => { applyPendingReferral().catch(() => {}); }, 1500);
      }
      return () => clearTimeout(timer);
    }
    if (!user) {
      pushInitRef.current = false;
    }
  }, [user]);

  /** Registre amb email, password i nom de jugador */
  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
  };

  /** Login amb email i password */
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  /** Tancar sessió */
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook per accedir al context d'autenticació des de qualsevol component */
export const useAuth = () => useContext(AuthContext);
