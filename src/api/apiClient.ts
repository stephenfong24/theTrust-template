import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { getAuthToken, signOut } from "../services/authService";
import { beginLoading, endLoading } from "../services/loadingService";

export interface ApiErrorPayload {
  Status?: number;
  Message?: string;
  Code?: string;
  Data?: unknown;
  [key: string]: unknown;
}

export class ApiError extends Error {
  status?: number;
  code?: string;
  payload?: ApiErrorPayload;
  isNetworkError: boolean;
  isServerUnavailable: boolean;
  isAuthSessionError: boolean;

  constructor({
    message,
    status,
    code,
    payload,
    isNetworkError = false,
    isServerUnavailable = false,
    isAuthSessionError = false
  }: {
    message: string;
    status?: number;
    code?: string;
    payload?: ApiErrorPayload;
    isNetworkError?: boolean;
    isServerUnavailable?: boolean;
    isAuthSessionError?: boolean;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
    this.isNetworkError = isNetworkError;
    this.isServerUnavailable = isServerUnavailable;
    this.isAuthSessionError = isAuthSessionError;
  }
}

const authSessionErrorCodes = new Set([
  "AUTHORIZATION_FAILED",
  "INVALID_TOKEN",
  "INVALID_TOKEN_SIGNATURE",
  "INVALID_TOKEN_USER",
  "TOKEN_EXPIRED",
  "TOKEN_NOT_FOUND"
]);

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    Accept: "application/json"
  }
});

const requestLoadingIds = new WeakMap<object, string>();

apiClient.interceptors.request.use((config) => {
  requestLoadingIds.set(config, beginLoading());
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    endLoading(requestLoadingIds.get(response.config));
    requestLoadingIds.delete(response.config);
    return response;
  },
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.config) {
      endLoading(requestLoadingIds.get(error.config));
      requestLoadingIds.delete(error.config);
    }

    const apiError = normalizeApiError(error);

    if (apiError.isAuthSessionError) handleAuthSessionError();

    return Promise.reject(apiError);
  }
);

export function isFormDataPayload(data: unknown): data is FormData {
  return typeof FormData !== "undefined" && data instanceof FormData;
}

export function withJsonContentType<TData>(data: TData, config: AxiosRequestConfig = {}) {
  if (isFormDataPayload(data)) return config;
  return {
    ...config,
    headers: {
      "Content-Type": "application/json",
      ...config.headers
    }
  };
}

function normalizeApiError(error: AxiosError<ApiErrorPayload>) {
  if (!error.response) {
    const serverUnavailable = error.code === "ECONNABORTED" || error.message.toLowerCase().includes("network");
    return new ApiError({
      message: serverUnavailable ? "API server unavailable." : "Network error.",
      isNetworkError: true,
      isServerUnavailable: serverUnavailable
    });
  }

  const status = error.response.status;
  const payload = error.response.data;
  const message = payload?.Message ?? getDefaultHttpMessage(status);

  return new ApiError({
    message,
    status,
    code: payload?.Code,
    payload,
    isServerUnavailable: status >= 500,
    isAuthSessionError: isAuthSessionError(status, payload?.Code)
  });
}

function handleAuthSessionError() {
  signOut();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

function isAuthSessionError(status: number, code?: string) {
  return status === 401 || Boolean(code && authSessionErrorCodes.has(code));
}

function getDefaultHttpMessage(status: number) {
  switch (status) {
    case 400:
      return "Bad request.";
    case 401:
      return "Your login session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 500:
      return "Internal server error.";
    default:
      return "API request failed.";
  }
}

export default apiClient;
