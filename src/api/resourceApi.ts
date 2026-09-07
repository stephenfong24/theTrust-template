import apiClient, { withJsonContentType } from "./apiClient";

export const resourceApi = {
  async getResources(params?: Record<string, unknown>) {
    const response = await apiClient.get("/resource", { params });
    return response.data;
  },

  async uploadFile(formData: FormData) {
    const response = await apiClient.post("/resource/upload", formData);
    return response.data;
  },

  async createResource(data: unknown) {
    const response = await apiClient.post("/resource", data, withJsonContentType(data));
    return response.data;
  },

  async updateResource(id: string, data: unknown) {
    const response = await apiClient.put(`/resource/${encodeURIComponent(id)}`, data, withJsonContentType(data));
    return response.data;
  },

  async deleteResource(id: string) {
    const response = await apiClient.delete(`/resource/${encodeURIComponent(id)}`);
    return response.data;
  }
};
