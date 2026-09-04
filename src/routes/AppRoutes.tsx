import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { LoginPage } from "../pages/LoginPage";
import { AccessDeniedPage, BlankPage, DashboardPage, NotFoundPage } from "../pages/FeaturePages";
import { ProtectedRoute } from "./ProtectedRoute";

const blankRoutes = [
  "/admin-listing",
  "/agents-listing",
  "/trust/listing",
  "/trust/draft-listing",
  "/trust/payment",
  "/trust/dividend-scheduled",
  "/my-network",
  "/network",
  "/income",
  "/resources/memo",
  "/resources/forms-documents",
  "/resources/internal-training",
  "/audit/file-upload-log",
  "/audit/request-log",
  "/profile",
  "/preferences",
  "/notifications"
];

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
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
