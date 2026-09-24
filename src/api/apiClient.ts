import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { getAuthToken, signOut } from "../services/sessionService";
import { beginLoading, endLoading } from "../services/loadingService";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipGlobalLoading?: boolean;
    skipInFlightDedupe?: boolean;
  }
}

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
const inFlightGetRequests = new Map<string, Promise<AxiosResponse<unknown>>>();
const originalGet = apiClient.get.bind(apiClient);

apiClient.get = ((url: string, config?: AxiosRequestConfig) => {
  if (config?.skipInFlightDedupe) {
    return originalGet(url, config);
  }

  const requestKey = createGetRequestKey(url, config);
  const inFlightRequest = inFlightGetRequests.get(requestKey);

  if (inFlightRequest) {
    return inFlightRequest;
  }

  const request = originalGet(url, config).finally(() => {
    inFlightGetRequests.delete(requestKey);
  });

  inFlightGetRequests.set(requestKey, request);
  return request;
}) as typeof apiClient.get;

apiClient.interceptors.request.use(async (config) => {
  if (!config.skipGlobalLoading) {
    requestLoadingIds.set(config, beginLoading());
  }

  const token = await getAuthToken();
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
      message: error.code === "ECONNABORTED" ? "Request timed out. Please try again." : serverUnavailable ? "API server unavailable." : "Network error.",
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

function createGetRequestKey(url: string, config?: AxiosRequestConfig) {
  return stableStringify({
    baseURL: config?.baseURL ?? apiClient.defaults.baseURL ?? "",
    url,
    params: config?.params ?? null,
    responseType: config?.responseType ?? null
  });
}

function stableStringify(value: unknown): string {
  if (value instanceof URLSearchParams) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export default apiClient;
