import apiClient from "./apiClient";

export const networkApi = {
  async getDownlineList(parentId?: string) {
    const response = await apiClient.get("/network/downline-list", {
      params: {
        ParentID: parentId
      }
    });
    return response.data;
  }
};
