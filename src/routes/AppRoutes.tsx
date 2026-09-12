import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { AdministratorListPage } from "../pages/AdministratorListPage";
import { AgentSignupPage } from "../pages/AgentSignupPage";
import { AuditLogPage } from "../pages/AuditLogPage";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { CommissionPage } from "../pages/CommissionPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { LoginPage } from "../pages/LoginPage";
import { NetworkPage } from "../pages/NetworkPage";
import { ProfilePage } from "../pages/ProfilePage";
import { AddResourcePage } from "../pages/AddResourcePage";
import { AgentsListingPage } from "../pages/AgentsListingPage";
import { ResourceCentrePage } from "../pages/ResourceCentrePage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { GeneralSettingsPage } from "../pages/GeneralSettingsPage";
import { TrustApplicationPage } from "../pages/TrustApplicationPage";
import { TrustCategoriesPage } from "../pages/TrustCategoriesPage";
import { TrustListingPage } from "../pages/TrustListingPage";
import { TrustPaymentPage } from "../pages/TrustPaymentPage";
import { TrustPlanForm } from "../pages/trust-plan/TrustPlanForm";
import { TrustPlanList } from "../pages/trust-plan/TrustPlanList";
import { AccessDeniedPage, BlankPage, DashboardPage, NotFoundPage } from "../pages/FeaturePages";
import { ProtectedRoute } from "./ProtectedRoute";

const blankRoutes = [
  "/trust/draft-listing",
  "/trust/payment-allocations",
  "/trust/dividend-scheduled",
  "/income",
  "/income/overriding-bonus",
  "/preferences",
  "/notifications"
];

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/agent/signup" element={<AgentSignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:resetToken" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin-listing" element={<AdministratorListPage />} />
          <Route path="/agents-listing" element={<AgentsListingPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/resources/add" element={<AddResourcePage />} />
          <Route path="/resources/edit/:resourceId" element={<AddResourcePage />} />
          <Route path="/resources/memo" element={<ResourceCentrePage />} />
          <Route path="/resources/forms-documents" element={<ResourceCentrePage />} />
          <Route path="/resources/internal-training" element={<ResourceCentrePage />} />
          <Route path="/my-network" element={<Navigate to="/my-network/the-trust" replace />} />
          <Route path="/my-network/the-trust" element={<NetworkPage scope="mine" category="The Trust" />} />
          <Route path="/my-network/the-will" element={<NetworkPage scope="mine" category="The Will" />} />
          <Route path="/network" element={<Navigate to="/network/the-trust" replace />} />
          <Route path="/network/the-trust" element={<NetworkPage category="The Trust" />} />
          <Route path="/network/the-will" element={<NetworkPage category="The Will" />} />
          <Route path="/income/commission" element={<CommissionPage />} />
          <Route path="/audit/file-upload-log" element={<AuditLogPage variant="file-upload" />} />
          <Route path="/audit/request-log" element={<AuditLogPage variant="request" />} />
          <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
          <Route path="/settings/general" element={<GeneralSettingsPage />} />
          <Route path="/settings/trust-categories" element={<TrustCategoriesPage />} />
          <Route path="/settings/trust-plan" element={<Navigate to="/trust-plan" replace />} />
          <Route path="/trust/listing" element={<TrustListingPage />} />
          <Route path="/trust/payment" element={<TrustPaymentPage />} />
          <Route path="/trust/applications/:applicationId/:step" element={<TrustApplicationPage />} />
          <Route path="/trust-plan" element={<TrustPlanList />} />
          <Route path="/trust-plan/add" element={<TrustPlanForm />} />
          <Route path="/trust-plan/edit/:id" element={<TrustPlanForm />} />
          {blankRoutes.map((path) => (
            <Route key={path} path={path} element={<BlankPage />} />
          ))}
          <Route path="/access-denied" element={<AccessDeniedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
