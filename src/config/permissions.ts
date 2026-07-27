import type { RoleId } from "../types";

export const permissions = [
  "dashboard.view",
  "applications.view",
  "applications.create",
  "applications.edit",
  "applications.approve",
  "applications.reject",
  "trustAccounts.view",
  "trustAccounts.create",
  "trustAccounts.edit",
  "trustProducts.view",
  "trustProducts.manage",
  "investments.view",
  "beneficiaries.view",
  "clients.view",
  "clients.create",
  "clients.edit",
  "agents.view",
  "agents.create",
  "agents.edit",
  "payments.view",
  "payments.record",
  "receipts.view",
  "receipts.record",
  "accounts.view",
  "tasks.view",
  "tasks.assign",
  "documents.view",
  "reports.view",
  "reports.export",
  "users.view",
  "users.create",
  "users.edit",
  "users.disable",
  "roles.view",
  "roles.manage",
  "settings.view",
  "settings.manage",
  "auditLogs.view",
  "securityEvents.view"
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<RoleId, Permission[]> = {
  SUPER_ADMIN: [...permissions],
  ADMIN: permissions.filter((permission) => !permission.startsWith("securityEvents")),
  TRUST_OFFICER: permissions.filter((permission) =>
    /dashboard|applications|trustAccounts|trustProducts|investments|beneficiaries|clients|agents|tasks|documents|reports/.test(permission)
  ),
  ACCOUNTS: permissions.filter((permission) => /dashboard|payments|receipts|accounts|reports|tasks|documents/.test(permission)),
  AGENT: permissions.filter((permission) => /dashboard|applications|clients|tasks|documents/.test(permission)),
  CLIENT: permissions.filter((permission) => /dashboard|documents|notifications/.test(permission))
};
