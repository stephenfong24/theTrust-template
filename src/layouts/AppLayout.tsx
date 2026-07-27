import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { Sidebar } from "../components/layout/Sidebar";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useState } from "react";
import { usePermission } from "../hooks/usePermission";
import type { Permission } from "../config/permissions";

export function AppLayout() {
  const [collapsed, setCollapsed] = useLocalStorage("trust-fund-sidebar-collapsed", false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { can } = usePermission();
  const permission = getRoutePermission(location.pathname);

  if (permission && !can(permission)) {
    return <Navigate to="/access-denied" replace />;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="min-w-0 flex-1">
        <Header onToggleSidebar={() => setCollapsed((value) => !value)} onToggleMobile={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function getRoutePermission(pathname: string): Permission | undefined {
  if (pathname === "/access-denied") return undefined;
  if (pathname.startsWith("/dashboard")) return "dashboard.view";
  if (pathname.startsWith("/applications/new")) return "applications.create";
  if (pathname.startsWith("/applications")) return "applications.view";
  if (pathname.startsWith("/trust/products/new")) return "trustProducts.manage";
  if (pathname.startsWith("/trust/products")) return "trustProducts.view";
  if (pathname.startsWith("/trust/accounts")) return "trustAccounts.view";
  if (pathname.startsWith("/trust/investments") || pathname.startsWith("/trust/returns")) return "investments.view";
  if (pathname.startsWith("/trust/beneficiaries")) return "beneficiaries.view";
  if (pathname.startsWith("/clients")) return "clients.view";
  if (pathname.startsWith("/agents")) return "agents.view";
  if (pathname.startsWith("/payments")) return "payments.view";
  if (pathname.startsWith("/receipts")) return "receipts.view";
  if (pathname.startsWith("/accounts")) return "accounts.view";
  if (pathname.startsWith("/tasks")) return "tasks.view";
  if (pathname.startsWith("/documents")) return "documents.view";
  if (pathname.startsWith("/reports")) return "reports.view";
  if (pathname.startsWith("/users")) return "users.view";
  if (pathname.startsWith("/roles")) return "roles.view";
  if (pathname.startsWith("/settings") || pathname.startsWith("/administration")) return "settings.view";
  if (pathname.startsWith("/security-events")) return "securityEvents.view";
  if (pathname.startsWith("/audit-logs") || pathname.startsWith("/session-history") || pathname.startsWith("/system-activity") || pathname.startsWith("/login-activities")) return "auditLogs.view";
  return undefined;
}
