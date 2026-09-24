import apiClient, { withJsonContentType } from "./apiClient";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code: string;
  Data: TData;
}

export interface AdministratorListItem {
  Id: number;
  UserID: number;
  DisplayName?: string;
  Username?: string;
  FullName?: string;
  UserType?: string;
  RoleCode?: string;
  RoleName?: string;
  Email?: string;
  WillAccess?: boolean | number;
  LastLogin?: string;
  LoginStatus: boolean;
}

export interface AdministratorPagination {
  Page: number;
  PageSize: number;
  TotalRecords: number;
  TotalPages: number;
}

export interface AdministratorListParams {
  page: number;
  pageSize: number;
  search?: string;
  roleCode?: string;
  status?: boolean;
}

export interface AdminChangePasswordRequest {
  UserID: number;
  LoginPassword: string;
  ConfirmLoginPassword: string;
  CreatedBy: string;
}

export interface AddAdministratorRequest {
  Username: string;
  Fullname: string;
  RoleCode: string;
  LoginPassword: string;
  ConfirmLoginPassword: string;
  TrustAccess: number;
  WillAccess: number;
  LoginStatus: number;
}

export interface EditAdministratorRequest {
  Username: string;
  Fullname: string;
  RoleCode: string;
  TrustAccess: number;
  WillAccess: number;
  LoginStatus: number;
}

export interface AdministratorChangeProfileRequest {
  Username: string;
  Fullname: string;
}

export const administratorApi = {
  async getAdministratorList(params: AdministratorListParams) {
    const response = await apiClient.get<
      ApiEnvelope<{
        AdministratorLists: AdministratorListItem[];
        Pagination: AdministratorPagination;
      }>
    >("/administrator/administrator-list", {
      params: removeEmptyParams(params)
    });

    const data = unwrapResponse(response.data);
    return {
      records: data.AdministratorLists,
      pagination: data.Pagination
    };
  },

  async changePassword(id: number, data: AdminChangePasswordRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>(`/administrator/edit-passsword/${id}`, data);
    unwrapResponse(response.data);
  },

  async addAdministrator(data: AddAdministratorRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/administrator/add", data);
    unwrapResponse(response.data);
  },

  async editAdministrator(id: number, data: EditAdministratorRequest) {
    const response = await apiClient.put<ApiEnvelope<null>>(`/administrator/edit-profile/${id}`, data);
    unwrapResponse(response.data);
  },

  async changeProfile(data: AdministratorChangeProfileRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/administrator/change-profile", data, withJsonContentType(data));
    unwrapResponse(response.data);
  }
};

function unwrapResponse<TData>(response: ApiEnvelope<TData>) {
  if (response.Status !== 0) {
    throw new Error(response.Message || "Unable to load administrator list.");
  }

  return response.Data;
}

function removeEmptyParams(params: AdministratorListParams) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}
