import users from "../data/users.json";
import type { LocalSession, User } from "../types";
import { readStorage, removeStorage, writeStorage } from "./storageService";

const sessionKey = "trust-fund-session";

const delay = () => new Promise((resolve) => setTimeout(resolve, 450));

export async function signIn(email: string, password: string): Promise<LocalSession> {
  await delay();
  const normalizedEmail = email.trim().toLowerCase();
  const user = (users as User[]).find((entry) => entry.email.toLowerCase() === normalizedEmail && entry.password === password);
  if (!user || user.status !== "ACTIVE") {
    throw new Error("Invalid credentials or inactive account.");
  }
  const session: LocalSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    loginTime: new Date().toISOString()
  };
  writeStorage(sessionKey, session);
  return session;
}

export function getSession(): LocalSession | null {
  const session = readStorage<LocalSession | null>(sessionKey, null);
  if (!session || ["SA", "AD", "OP", "AC", "AG"].includes(session.role)) {
    return session;
  }
  removeStorage(sessionKey);
  return null;
}

export function signOut() {
  removeStorage(sessionKey);
}
