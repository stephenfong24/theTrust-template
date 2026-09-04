import { toast, type Id } from "react-toastify";

const getToastId = (message: string, toastId?: Id) => toastId ?? message;

export const notifySuccess = (message: string, toastId?: Id) => {
  toast.success(message, {
    toastId: getToastId(message, toastId)
  });
};

export const notifyError = (message: string, toastId?: Id) => {
  toast.error(message, {
    toastId: getToastId(message, toastId)
  });
};

export const notifyWarning = (message: string, toastId?: Id) => {
  toast.warning(message, {
    toastId: getToastId(message, toastId)
  });
};

export const notifyInfo = (message: string, toastId?: Id) => {
  toast.info(message, {
    toastId: getToastId(message, toastId)
  });
};
