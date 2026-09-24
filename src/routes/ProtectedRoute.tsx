import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { Permission } from "../config/permissions";
import { useAuth } from "../hooks/useAuth";
import { usePermission } from "../hooks/usePermission";

export function ProtectedRoute({ permission }: { permission?: Permission }) {
  const { session, status } = useAuth();
  const { can } = usePermission();
  const location = useLocation();

  if (status === "initializing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-white px-6 py-5 shadow-[0_24px_70px_rgba(17,17,17,0.18)]">
          <Loader2 className="h-8 w-8 animate-spin text-brandGold" />
          <div className="text-sm font-semibold text-textPrimary">Loading...</div>
        </div>
      </div>
    );
  }

  if (status === "tampered") {
    return <Navigate to="/session-invalid" replace />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!can(permission)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}
