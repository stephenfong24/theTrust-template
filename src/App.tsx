import { AppRoutes } from "./routes/AppRoutes";
import { AppToastContainer } from "./components/feedback/AppToastContainer";
import { PageLoadingOverlay } from "./components/feedback/PageLoadingOverlay";

export default function App() {
  return (
    <>
      <AppRoutes />
      <PageLoadingOverlay />
      <AppToastContainer />
    </>
  );
}
