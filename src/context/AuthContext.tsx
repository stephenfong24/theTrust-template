import { createContext, useMemo, useState } from "react";
import type { LocalSession } from "../types";
import { getSession, signIn, signOut } from "../services/authService";

interface AuthContextValue {
  session: LocalSession | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<LocalSession | null>(() => getSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      login: async (username, password) => {
        const nextSession = await signIn(username, password);
        setSession(nextSession);
      },
      logout: () => {
        signOut();
        setSession(null);
      }
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
