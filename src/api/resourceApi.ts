import apiClient from "./apiClient";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code: string;
  Data: TData;
}

export type ResourceCategoryCode = string;
export type ResourceApiType = "FILE" | "CONTENT" | "HYPERLINK" | "EMBED_VIDEO";
export type ResourceStatusCode = 0 | 4;

export interface ResourceCategoryItem {
  RowID: number;
  CategoryCode: ResourceCategoryCode;
  CategoryName: string;
}

export interface ManagedResourceItem {
  RowID: number;
  CategoryCode: ResourceCategoryCode | string;
  CategoryName?: string | null;
  Name?: string | null;
  Description?: string | null;
  Type?: ResourceApiType | string | null;
  FileUrl?: string | null;
  UploadedFile?: string | null;
  OriginalFileName?: string | null;
  StoredFileName?: string | null;
  FileExtension?: string | null;
  ContentType?: string | null;
  FileSize?: number | null;
  Url?: string | null;
  StartDate?: string | null;
  EndDate?: string | null;
  Status?: ResourceStatusCode | number | null;
  ScheduleStatus?: string | null;
  RoleCodes?: string[];
  CreatedAt?: string | null;
}

export interface CreateResourcePayload {
  categoryCode: ResourceCategoryCode;
  name: string;
  description: string;
  type: ResourceApiType;
  url: string;
  roleCodes: string[];
  status: ResourceStatusCode;
  startDate: string;
  endDate: string;
  file?: File | null;
}

export interface UpdateResourcePayload extends CreateResourcePayload {
  resourceId: string;
}

export const resourceApi = {
  async getCategories() {
    const response = await apiClient.get<ApiEnvelope<ResourceCategoryItem[]>>("/resource/categories");
    return unwrapResourceResponse(response.data);
  },

  async getManagedResources(categoryCode: ResourceCategoryCode) {
    const response = await apiClient.get<ApiEnvelope<ManagedResourceItem[]>>("/resource/manage/list", {
      params: { categoryCode }
    });
    return unwrapResourceResponse(response.data);
  },

  async getAvailableResources(categoryCode: ResourceCategoryCode) {
    const response = await apiClient.get<ApiEnvelope<ManagedResourceItem[]>>("/resource/list", {
      params: { categoryCode }
    });
    return unwrapResourceResponse(response.data);
  },

  async getResourceDetail(id: string) {
    const response = await apiClient.get<ApiEnvelope<ManagedResourceItem>>(`/resource/manage/${encodeURIComponent(id)}`);
    return unwrapResourceResponse(response.data);
  },

  async uploadFile(formData: FormData) {
    const response = await apiClient.post("/resource/upload", formData);
    return response.data;
  },

  async createResource(data: CreateResourcePayload) {
    const formData = createResourceFormData(data);
    const response = await apiClient.post<ApiEnvelope<{ ResourceID: number; FileUrl?: string; UploadedFile?: string }>>("/resource/create", formData);
    return unwrapResourceResponse(response.data);
  },

  async updateResource(data: UpdateResourcePayload) {
    const formData = createResourceFormData(data);
    formData.append("resourceId", data.resourceId);

    const response = await apiClient.post<ApiEnvelope<undefined>>("/resource/update", formData);
    return unwrapResourceResponse(response.data);
  },

  async deleteResource(id: string) {
    const response = await apiClient.post<ApiEnvelope<undefined>>("/resource/delete", undefined, {
      params: { id }
    });
    return unwrapResourceResponse(response.data);
  }
};

function createResourceFormData(data: CreateResourcePayload) {
  const formData = new FormData();
  formData.append("categoryCode", data.categoryCode);
  formData.append("name", data.name);
  formData.append("description", data.description);
  formData.append("type", data.type);
  formData.append("url", data.url);
  formData.append("roleCodes", data.roleCodes.join(","));
  formData.append("status", String(data.status));
  if (data.startDate) formData.append("startDate", data.startDate);
  if (data.endDate) formData.append("endDate", data.endDate);
  if (data.file) formData.append("file", data.file);
  return formData;
}

function unwrapResourceResponse<TData>(response: ApiEnvelope<TData>) {
  if (response.Status !== 0) {
    throw new Error(response.Message || "Unable to load resource data.");
  }

  return response.Data;
}
