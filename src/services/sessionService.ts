import type { LocalSession } from "../types";

export const sessionKey = "trust-fund-session";
export const sessionHashKey = "trust-fund-session-hash";

export type StoredSessionValidationResult =
  | { status: "none" }
  | { status: "valid"; session: LocalSession }
  | { status: "tampered" };

export async function saveSession(session: LocalSession) {
  const storage = session.rememberMe ? window.localStorage : window.sessionStorage;
  const otherStorage = session.rememberMe ? window.sessionStorage : window.localStorage;
  const sessionHash = await generateSessionHash(session);

  storage.setItem(sessionKey, JSON.stringify(session));
  storage.setItem(sessionHashKey, sessionHash);
  otherStorage.removeItem(sessionKey);
  otherStorage.removeItem(sessionHashKey);
}

export async function getSession(): Promise<StoredSessionValidationResult> {
  const sessionResult = await validateStoredSession(window.sessionStorage);
  if (sessionResult.status === "valid" || sessionResult.status === "tampered") {
    if (sessionResult.status === "tampered") signOut();
    return sessionResult;
  }

  const localResult = await validateStoredSession(window.localStorage);
  if (localResult.status === "valid" || localResult.status === "tampered") {
    if (localResult.status === "tampered") signOut();
    return localResult;
  }

  clearStaleSessionHash();
  return { status: "none" };
}

export async function validateStoredSession(storage: Storage): Promise<StoredSessionValidationResult> {
  const storedSession = storage.getItem(sessionKey);
  const storedHash = storage.getItem(sessionHashKey);

  if (!storedSession && !storedHash) return { status: "none" };

  if (!storedSession) {
    storage.removeItem(sessionHashKey);
    return { status: "none" };
  }

  if (!storedHash) return { status: "tampered" };

  const session = parseStoredSession(storedSession);
  if (!session || !isSupportedSessionRole(session.role)) return { status: "tampered" };

  const currentHash = await generateSessionHash(session);
  if (currentHash !== storedHash.toLowerCase()) return { status: "tampered" };

  return { status: "valid", session };
}

export async function generateSessionHash(session: LocalSession): Promise<string> {
  const input = new TextEncoder().encode(getSessionFingerprintData(session));
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function getSessionFingerprintData(session: LocalSession): string {
  // Frontend tamper detection only; backend JWT validation and authorization remain authoritative.
  return [
    session.userId ?? "",
    session.email ?? "",
    session.name ?? "",
    session.role ?? "",
    session.roleName ?? "",
    session.loginTime ?? "",
    String(session.rememberMe ?? ""),
    session.accessToken ?? "",
    session.token ?? "",
    session.jwt ?? "",
    session.jwtToken ?? "",
    session.authToken ?? "",
    session.rememberMeToken ?? "",
    session.signalRToken ?? ""
  ].join("|");
}

export function signOut() {
  window.localStorage.removeItem(sessionKey);
  window.localStorage.removeItem(sessionHashKey);
  window.sessionStorage.removeItem(sessionKey);
  window.sessionStorage.removeItem(sessionHashKey);
}

export async function getAuthToken(): Promise<string | null> {
  const result = await getSession();
  return result.status === "valid" ? getSessionToken(result.session) : null;
}

export function getSessionToken(session: LocalSession | null): string | null {
  return session?.accessToken ?? session?.token ?? session?.jwtToken ?? session?.jwt ?? session?.authToken ?? null;
}

function parseStoredSession(value: string): LocalSession | null {
  try {
    return JSON.parse(value) as LocalSession;
  } catch {
    return null;
  }
}

function isSupportedSessionRole(role: unknown) {
  return role === "SA" || role === "AD" || role === "OP" || role === "AC" || role === "AG";
}

function clearStaleSessionHash() {
  if (!window.sessionStorage.getItem(sessionKey)) {
    window.sessionStorage.removeItem(sessionHashKey);
  }

  if (!window.localStorage.getItem(sessionKey)) {
    window.localStorage.removeItem(sessionHashKey);
  }
}
