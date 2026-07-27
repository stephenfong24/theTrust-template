import type { Permission } from "../config/permissions";
import { rolePermissions } from "../config/permissions";
import { useAuth } from "./useAuth";

export function usePermission() {
  const { session } = useAuth();
  const can = (permission?: Permission) => {
    if (!permission) return true;
    if (!session) return false;
    return rolePermissions[session.role].includes(permission);
  };
  return { can };
}
