import users from "../data/users.json";
import type { LocalSession, User } from "../types";
import { readStorage, removeStorage, writeStorage } from "./storageService";

const sessionKey = "trust-fund-session";

const delay = () => new Promise((resolve) => setTimeout(resolve, 450));

export async function signIn(username: string, password: string): Promise<LocalSession> {
  await delay();
  const user = (users as User[]).find((entry) => entry.username === username && entry.password === password);
  if (!user || user.status !== "ACTIVE") {
    throw new Error("Invalid credentials or inactive account.");
  }
  const session: LocalSession = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    loginTime: new Date().toISOString()
  };
  writeStorage(sessionKey, session);
  return session;
}

export function getSession(): LocalSession | null {
  return readStorage<LocalSession | null>(sessionKey, null);
}

export function signOut() {
  removeStorage(sessionKey);
}
