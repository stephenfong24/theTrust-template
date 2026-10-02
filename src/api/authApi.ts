import apiClient, { withJsonContentType } from "./apiClient";

export interface LoginRequest {
  Username: string;
  Password: string;
  MerchantID: string;
  RememberMe: boolean;
  TurnstileToken: string;
}

export const authApi = {
  async login(data: LoginRequest) {
    const response = await apiClient.post("/auth/login", data, withJsonContentType(data));
    return response.data;
  },

  async logout() {
    const response = await apiClient.post("/auth/logout");
    return response.data;
  },

  async forgotPassword(email: string, turnstileToken: string) {
    const data = {
      Username: email,
      MerchantID: getMerchantId(),
      TurnstileToken: turnstileToken
    };
    const response = await apiClient.post("/account/request-reset-password", data, withJsonContentType(data));
    return response.data;
  },

  async resetPassword(token: string, password: string, confirmPassword: string) {
    const data = {
      MerchantID: getMerchantId(),
      UniqueID: token,
      NewLoginPassword: password,
      ConfirmLoginPassword: confirmPassword
    };
    const response = await apiClient.post("/account/reset-password", data, withJsonContentType(data));
    return response.data;
  },

  async validateToken() {
    const response = await apiClient.get("/auth/validate-token");
    return response.data;
  }
};

function getMerchantId() {
  const merchantId = import.meta.env.VITE_MERCHANT_ID;
  if (!merchantId) throw new Error("Merchant configuration is missing.");
  return merchantId;
}
