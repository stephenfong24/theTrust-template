import { ToastContainer } from "react-toastify";

export function AppToastContainer() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      pauseOnHover
      draggable
      stacked
      limit={3}
    />
  );
}
