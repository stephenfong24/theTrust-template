import type { Permission } from "../../config/permissions";
import { usePermission } from "../../hooks/usePermission";

export function PermissionGuard({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { can } = usePermission();
  return can(permission) ? <>{children}</> : null;
}
