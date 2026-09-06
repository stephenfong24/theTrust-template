import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { AgentSignupPage } from "../pages/AgentSignupPage";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { LoginPage } from "../pages/LoginPage";
import { NetworkPage } from "../pages/NetworkPage";
import { ProfilePage } from "../pages/ProfilePage";
import { ResourceCentrePage } from "../pages/ResourceCentrePage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { AccessDeniedPage, BlankPage, DashboardPage, NotFoundPage } from "../pages/FeaturePages";
import { ProtectedRoute } from "./ProtectedRoute";

const blankRoutes = [
  "/admin-listing",
  "/agents-listing",
  "/trust/listing",
  "/trust/draft-listing",
  "/trust/payment",
  "/trust/dividend-scheduled",
  "/income",
  "/income/commission",
  "/income/overriding-bonus",
  "/audit/file-upload-log",
  "/audit/request-log",
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
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/resources/memo" element={<ResourceCentrePage />} />
          <Route path="/resources/forms-documents" element={<ResourceCentrePage />} />
          <Route path="/resources/internal-training" element={<ResourceCentrePage />} />
          <Route path="/my-network" element={<NetworkPage scope="mine" />} />
          <Route path="/network" element={<NetworkPage />} />
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
