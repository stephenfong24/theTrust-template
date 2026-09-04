import type { RoleId } from "../types";

export const roles: Record<RoleId, string> = {
  SA: "Super Administrator",
  AD: "Administrator",
  OP: "Operation",
  AC: "Account",
  AG: "Agent"
};
