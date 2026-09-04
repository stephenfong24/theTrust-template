import { AppRoutes } from "./routes/AppRoutes";
import { AppToastContainer } from "./components/feedback/AppToastContainer";

export default function App() {
  return (
    <>
      <AppRoutes />
      <AppToastContainer />
    </>
  );
}
