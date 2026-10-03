import { createContext, useEffect, useMemo, useState } from "react";
import type { LocalSession } from "../types";
import { getSession, signIn, signOut } from "../services/authService";
import { saveSession } from "../services/sessionService";

type AuthStatus = "initializing" | "authenticated" | "unauthenticated" | "tampered";

interface AuthContextValue {
  session: LocalSession | null;
  status: AuthStatus;
  login: (username: string, password: string, rememberMe: boolean, turnstileToken: string) => Promise<void>;
  logout: () => void;
  updateSessionProfile: (profile: Pick<LocalSession, "name" | "email">) => Promise<void>;
  clearSessionValidationFailure: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("initializing");

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const result = await getSession();
      if (cancelled) return;

      if (result.status === "valid") {
        setSession(result.session);
        setStatus("authenticated");
        return;
      }

      setSession(null);
      setStatus(result.status === "tampered" ? "tampered" : "unauthenticated");
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      login: async (email, password, rememberMe, turnstileToken) => {
        const nextSession = await signIn(email, password, rememberMe, turnstileToken);
        setSession(nextSession);
        setStatus("authenticated");
      },
      logout: () => {
        signOut();
        setSession(null);
        setStatus("unauthenticated");
      },
      updateSessionProfile: async (profile) => {
        if (!session) return;
        const nextSession = { ...session, name: profile.name, email: profile.email };
        await saveSession(nextSession);
        setSession(nextSession);
      },
      clearSessionValidationFailure: () => {
        signOut();
        setSession(null);
        setStatus("unauthenticated");
      }
    }),
    [session, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
