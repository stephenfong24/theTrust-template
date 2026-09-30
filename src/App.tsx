import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AppRoutes } from "./routes/AppRoutes";
import { AppToastContainer } from "./components/feedback/AppToastContainer";
import { PageLoadingOverlay } from "./components/feedback/PageLoadingOverlay";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <AppRoutes />
      <PageLoadingOverlay />
      <AppToastContainer />
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
