import apiClient, { withJsonContentType } from "./apiClient";

export const trustApi = {
  async getTrustList(params?: Record<string, unknown>) {
    const response = await apiClient.get("/trust/list", { params });
    return response.data;
  },

  async getTrustById(id: string) {
    const response = await apiClient.get(`/trust/${encodeURIComponent(id)}`);
    return response.data;
  },

  async createTrust(data: unknown) {
    const response = await apiClient.post("/trust", data, withJsonContentType(data));
    return response.data;
  },

  async updateTrust(id: string, data: unknown) {
    const response = await apiClient.put(`/trust/${encodeURIComponent(id)}`, data, withJsonContentType(data));
    return response.data;
  },

  async deleteTrust(id: string) {
    const response = await apiClient.delete(`/trust/${encodeURIComponent(id)}`);
    return response.data;
  }
};
