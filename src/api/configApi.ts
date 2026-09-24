import apiClient, { withJsonContentType } from "./apiClient";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code?: string;
  code?: string;
  Data?: TData;
  data?: TData;
}

export interface GeneralConfig {
  SST: number;
}

export interface UpdateConfigRequest {
  SST: number;
}

export const configApi = {
  async getConfigList() {
    const response = await apiClient.get<ApiEnvelope<GeneralConfig>>("/config/get-config-list");
    return unwrapData(response.data);
  },

  async updateConfig(data: UpdateConfigRequest) {
    const response = await apiClient.put<ApiEnvelope<null>>(
      "/config/update-config",
      data,
      withJsonContentType(data)
    );
    return response.data;
  }
};

function unwrapData<TData>(response: ApiEnvelope<TData>) {
  const data = response.Data ?? response.data;

  if (!data) {
    throw new Error(response.Message || "Configuration data is missing.");
  }

  return data;
}
