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
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} onToggleSidebar={() => setCollapsed((value) => !value)} />
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
  if (pathname.startsWith("/admin-listing")) return "adminListing.view";
  if (pathname.startsWith("/agents-listing")) return "agents.view";
  if (pathname.startsWith("/trust/draft-listing")) return "trustDraftListing.view";
  if (pathname.startsWith("/trust/payment-allocations")) return "trustPaymentAllocations.view";
  if (pathname.startsWith("/trust/payment")) return "trustPayment.view";
  if (pathname.startsWith("/trust/dividend-scheduled")) return "dividendScheduled.view";
  if (pathname.startsWith("/trust/listing")) return "trustListing.view";
  if (pathname.startsWith("/my-network")) return "myNetwork.view";
  if (pathname.startsWith("/network")) return "network.view";
  if (pathname.startsWith("/income")) return "income.view";
  if (pathname.startsWith("/resources/add")) return "resourcesAdd.view";
  if (pathname.startsWith("/resources/memo")) return "memo.view";
  if (pathname.startsWith("/resources/forms-documents")) return "formsDocuments.view";
  if (pathname.startsWith("/resources/internal-training")) return "internalTraining.view";
  if (pathname.startsWith("/audit/file-upload-log")) return "fileUploadLog.view";
  if (pathname.startsWith("/audit/request-log")) return "requestLog.view";
  if (pathname.startsWith("/settings/general")) return "settingsGeneral.view";
  if (pathname.startsWith("/settings/trust-plan")) return "settingsTrustPlan.view";
  return undefined;
}
