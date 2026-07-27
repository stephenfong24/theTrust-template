import type { RoleId } from "../types";

export const roles: Record<RoleId, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  TRUST_OFFICER: "Trust Officer",
  ACCOUNTS: "Accounts Staff",
  AGENT: "Agent",
  CLIENT: "Client"
};
