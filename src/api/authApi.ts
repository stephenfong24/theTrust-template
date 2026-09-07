import apiClient, { withJsonContentType } from "./apiClient";

export interface LoginRequest {
  email: string;
  password: string;
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

  async forgotPassword(email: string) {
    const data = { email };
    const response = await apiClient.post("/auth/forgot-password", data, withJsonContentType(data));
    return response.data;
  },

  async resetPassword(token: string, password: string) {
    const data = { token, password };
    const response = await apiClient.post("/auth/reset-password", data, withJsonContentType(data));
    return response.data;
  },

  async validateToken() {
    const response = await apiClient.get("/auth/validate-token");
    return response.data;
  }
};
