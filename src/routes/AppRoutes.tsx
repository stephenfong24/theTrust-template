import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { AdministratorListPage } from "../pages/AdministratorListPage";
import { AgentSignupPage } from "../pages/AgentSignupPage";
import { AuditLogPage } from "../pages/AuditLogPage";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { LoginPage } from "../pages/LoginPage";
import { NetworkPage } from "../pages/NetworkPage";
import { ProfilePage } from "../pages/ProfilePage";
import { AddResourcePage } from "../pages/AddResourcePage";
import { ResourceCentrePage } from "../pages/ResourceCentrePage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { GeneralSettingsPage } from "../pages/GeneralSettingsPage";
import { AccessDeniedPage, BlankPage, DashboardPage, NotFoundPage } from "../pages/FeaturePages";
import { ProtectedRoute } from "./ProtectedRoute";

const blankRoutes = [
  "/agents-listing",
  "/trust/listing",
  "/trust/draft-listing",
  "/trust/payment",
  "/trust/payment-allocations",
  "/trust/dividend-scheduled",
  "/income",
  "/income/commission",
  "/income/overriding-bonus",
  "/settings/trust-plan",
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
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/resources/add" element={<AddResourcePage />} />
          <Route path="/resources/memo" element={<ResourceCentrePage />} />
          <Route path="/resources/forms-documents" element={<ResourceCentrePage />} />
          <Route path="/resources/internal-training" element={<ResourceCentrePage />} />
          <Route path="/my-network" element={<Navigate to="/my-network/the-trust" replace />} />
          <Route path="/my-network/the-trust" element={<NetworkPage scope="mine" category="The Trust" />} />
          <Route path="/my-network/the-will" element={<NetworkPage scope="mine" category="The Will" />} />
          <Route path="/network" element={<Navigate to="/network/the-trust" replace />} />
          <Route path="/network/the-trust" element={<NetworkPage category="The Trust" />} />
          <Route path="/network/the-will" element={<NetworkPage category="The Will" />} />
          <Route path="/audit/file-upload-log" element={<AuditLogPage variant="file-upload" />} />
          <Route path="/audit/request-log" element={<AuditLogPage variant="request" />} />
          <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
          <Route path="/settings/general" element={<GeneralSettingsPage />} />
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
