import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { RoleBasedDashboardPage } from "../features/dashboard/RoleDashboards";

export function DashboardPage() {
  return <RoleBasedDashboardPage />;
}

export function BlankPage() {
  return <div className="min-h-[70vh]" />;
}

export function AccessDeniedPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="max-w-lg rounded-lg border border-line bg-white p-8 text-center shadow-soft">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-600" />
        <h1 className="mt-4 text-2xl font-semibold">Access Denied</h1>
        <p className="mt-2 text-sm text-textSecondary">Your current role does not include permission for this page. Contact an administrator if access is required.</p>
        <Link to="/dashboard" className="mt-5 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Return to Dashboard</Link>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return <BlankPage />;
}
