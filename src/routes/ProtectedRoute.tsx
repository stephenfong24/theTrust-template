import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Permission } from "../config/permissions";
import { useAuth } from "../hooks/useAuth";
import { usePermission } from "../hooks/usePermission";

export function ProtectedRoute({ permission }: { permission?: Permission }) {
  const { session } = useAuth();
  const { can } = usePermission();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!can(permission)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}
