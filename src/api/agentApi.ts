import apiClient, { withJsonContentType } from "./apiClient";

export const agentApi = {
  async signup(formData: FormData) {
    const response = await apiClient.post("/agent/signup", formData);
    return response.data;
  },

  async getProfile() {
    const response = await apiClient.get("/agent/profile");
    return response.data;
  },

  async updateProfile(data: unknown) {
    const response = await apiClient.put("/agent/profile", data, withJsonContentType(data));
    return response.data;
  },

  async uploadProfilePhoto(formData: FormData) {
    const response = await apiClient.post("/agent/profile/photo", formData);
    return response.data;
  }
};
