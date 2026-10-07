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

export interface BankListItem {
  RowID: number;
  BankCode?: string;
  BankName: string;
  BankNameDetail: string;
  isDeleted?: boolean;
  Status?: number;
  BankStatus?: number;
}

export interface AddBankRequest {
  BankCode: string;
  BankNameDetail: string;
  MerchantID: string;
}

export interface EditBankRequest {
  RowID: number;
  BankNameDetail: string;
  BankStatus: number;
  MerchantID: string;
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
  },

  async getBankList() {
    const response = await apiClient.get<ApiEnvelope<BankListItem[]>>("/config/bank-list");
    return unwrapArrayData(response.data);
  },

  async addBank(data: AddBankRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>(
      "/config/add-bank",
      data,
      withJsonContentType(data)
    );
    return response.data;
  },

  async editBank(data: EditBankRequest) {
    const response = await apiClient.put<ApiEnvelope<null>>(
      "/config/edit-bank",
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

function unwrapArrayData<TData>(response: ApiEnvelope<TData[]>) {
  return response.Data ?? response.data ?? [];
}
