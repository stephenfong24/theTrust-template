import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { LoginPage } from "../pages/LoginPage";
import {
  AccessDeniedPage,
  AgentDirectoryPage,
  AgentProfilePage,
  ApplicationDetailsPage,
  ApplicationsPage,
  AuditLogsPage,
  ClientDirectoryPage,
  ClientProfilePage,
  DashboardPage,
  DocumentLibraryPage,
  NewApplicationPage,
  NotFoundPage,
  NotificationsPage,
  PaymentsPage,
  ProfilePage,
  ReportDashboardPage,
  RoleMatrixPage,
  SecondaryPage,
  SystemSettingsPage,
  TaskListPage,
  TrustAccountDetailsPage,
  TrustAccountsPage,
  TrustProductFormPage,
  TrustProductsPage,
  UserManagementPage
} from "../pages/FeaturePages";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/applications/new" element={<NewApplicationPage />} />
          <Route path="/applications/pending" element={<ApplicationsPage status="Pending Review" />} />
          <Route path="/applications/approved" element={<ApplicationsPage status="Approved" />} />
          <Route path="/applications/rejected" element={<ApplicationsPage status="Rejected" />} />
          <Route path="/applications/:id" element={<ApplicationDetailsPage />} />
          <Route path="/trust/accounts" element={<TrustAccountsPage />} />
          <Route path="/trust/accounts/:id" element={<TrustAccountDetailsPage />} />
          <Route path="/trust/products" element={<TrustProductsPage />} />
          <Route path="/trust/products/new" element={<TrustProductFormPage />} />
          <Route path="/trust/products/:id" element={<TrustProductFormPage />} />
          <Route path="/trust/investments" element={<SecondaryPage title="Investment Records" description="Review local investment allocations, account references and portfolio statuses." />} />
          <Route path="/trust/returns" element={<SecondaryPage title="Return Information" description="Review indicative return information for client-facing discussion and internal review." />} />
          <Route path="/trust/beneficiaries" element={<SecondaryPage title="Beneficiaries" description="Review beneficiary assignments, allocation summaries and account relationships." />} />
          <Route path="/clients" element={<ClientDirectoryPage />} />
          <Route path="/clients/:id" element={<ClientProfilePage />} />
          <Route path="/clients/kyc" element={<SecondaryPage title="KYC Review" description="Review verification status, missing documents and risk classification actions." />} />
          <Route path="/clients/documents" element={<DocumentLibraryPage />} />
          <Route path="/agents" element={<AgentDirectoryPage />} />
          <Route path="/agents/:id" element={<AgentProfilePage />} />
          <Route path="/agents/applications" element={<SecondaryPage title="Agent Applications" description="Monitor agent-submitted applications, pending work and conversion status." />} />
          <Route path="/agents/performance" element={<SecondaryPage title="Agent Performance" description="Review agent pipeline contribution, assets introduced and application quality." />} />
          <Route path="/agents/documents" element={<DocumentLibraryPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/receipts" element={<PaymentsPage receipts />} />
          <Route path="/payments/pending" element={<SecondaryPage title="Pending Payments" description="Review expected collections, partial payments and follow-up items." />} />
          <Route path="/payments/reconciliation" element={<SecondaryPage title="Payment Reconciliation" description="Review collection matching, exceptions and local reconciliation notes." />} />
          <Route path="/accounts" element={<SecondaryPage title="Financial Overview" description="Review account-level financial summaries and local transaction presentation." />} />
          <Route path="/accounts/transactions" element={<SecondaryPage title="Transaction Records" description="Search and review fictional trust account transaction movement." />} />
          <Route path="/accounts/disbursements" element={<SecondaryPage title="Disbursement Records" description="Review local disbursement requests, approvals and statuses." />} />
          <Route path="/accounts/reconciliation" element={<SecondaryPage title="Account Reconciliation" description="Track local reconciliation progress and exceptions." />} />
          <Route path="/tasks" element={<TaskListPage />} />
          <Route path="/tasks/team" element={<TaskListPage />} />
          <Route path="/tasks/approvals" element={<TaskListPage filter="Pending Approval" />} />
          <Route path="/tasks/completed" element={<TaskListPage filter="Completed" />} />
          <Route path="/documents" element={<DocumentLibraryPage />} />
          <Route path="/documents/templates" element={<SecondaryPage title="Document Templates" description="Manage trust deed, declaration and operational document templates." />} />
          <Route path="/documents/generated" element={<SecondaryPage title="Generated Documents" description="Review documents prepared from local records for client review." />} />
          <Route path="/documents/expiring" element={<DocumentLibraryPage />} />
          <Route path="/reports" element={<ReportDashboardPage />} />
          <Route path="/reports/financial" element={<ReportDashboardPage />} />
          <Route path="/reports/applications" element={<ReportDashboardPage />} />
          <Route path="/reports/agents" element={<ReportDashboardPage />} />
          <Route path="/reports/audit" element={<ReportDashboardPage />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/roles" element={<RoleMatrixPage />} />
          <Route path="/login-activities" element={<AuditLogsPage />} />
          <Route path="/administration/company" element={<SystemSettingsPage />} />
          <Route path="/settings" element={<SystemSettingsPage />} />
          <Route path="/administration/notifications" element={<SystemSettingsPage />} />
          <Route path="/administration/numbering" element={<SystemSettingsPage />} />
          <Route path="/administration/lookups" element={<SystemSettingsPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/security-events" element={<AuditLogsPage />} />
          <Route path="/session-history" element={<AuditLogsPage />} />
          <Route path="/system-activity" element={<AuditLogsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/preferences" element={<ProfilePage preferences />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
