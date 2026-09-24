import { authApi } from "../api/authApi";
import type { LocalSession, RoleId } from "../types";
import { getAuthToken, getSession, getSessionToken, saveSession, sessionKey, signOut } from "./sessionService";

export { getAuthToken, getSession, getSessionToken, sessionKey, signOut };

interface LoginResponse {
  Status?: number;
  Message?: string;
  Data?: LoginResponseData;
}

interface LoginResponseData {
  Token?: string;
  SignalRToken?: string;
  RememberMeToken?: string | null;
  UserId?: number | string;
  UserID?: number | string;
  DisplayName?: string;
  UserName?: string;
  Username?: string;
  Name?: string;
  Email?: string;
  Role?: string;
  RoleName?: string;
}

const knownAccounts: Record<string, { userId: string; role: RoleId; name: string }> = {
  superadmin: { userId: "1", role: "SA", name: "Super Administrator" },
  admin: { userId: "5", role: "AD", name: "Administrator" },
  jiayi: { userId: "10029", role: "AG", name: "jiayi" }
};

export async function signIn(username: string, password: string, rememberMe: boolean): Promise<LocalSession> {
  const normalizedUsername = username.trim();
  const merchantId = import.meta.env.VITE_MERCHANT_ID;

  if (!merchantId) {
    throw new Error("Merchant configuration is missing.");
  }

  const response = (await authApi.login({
    Username: normalizedUsername,
    Password: password,
    MerchantID: merchantId,
    RememberMe: rememberMe
  })) as LoginResponse;

  if (typeof response.Status === "number" && response.Status !== 0) {
    throw new Error(response.Message ?? "Invalid credentials.");
  }

  const data = response.Data;
  if (!data) {
    throw new Error(response.Message ?? "Invalid login response.");
  }

  const session = mapLoginResponseToSession(data, normalizedUsername, rememberMe);
  await saveSession(session);
  return session;
}

function mapLoginResponseToSession(data: LoginResponseData, fallbackUsername: string, rememberMe: boolean): LocalSession {
  const username = data.UserName ?? data.Username ?? fallbackUsername;
  const knownAccount = knownAccounts[username.trim().toLowerCase()];
  const role = normalizeRole(data.Role, username);

  return {
    userId: String(data.UserId ?? data.UserID ?? knownAccount?.userId ?? ""),
    email: data.Email ?? username,
    name: data.DisplayName ?? data.Name ?? knownAccount?.name ?? username,
    role,
    loginTime: new Date().toISOString(),
    token: data.Token,
    accessToken: data.Token,
    rememberMe,
    rememberMeToken: data.RememberMeToken ?? undefined,
    signalRToken: data.SignalRToken,
    roleName: data.RoleName
  };
}

function normalizeRole(role: string | undefined, username: string): RoleId {
  if (role === "SA" || role === "AD" || role === "OP" || role === "AC" || role === "AG") {
    return role;
  }

  const knownAccount = knownAccounts[username.trim().toLowerCase()];
  if (knownAccount) return knownAccount.role;

  throw new Error("Unsupported account role.");
}
