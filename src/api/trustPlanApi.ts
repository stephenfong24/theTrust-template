import apiClient, { withJsonContentType } from "./apiClient";
import type { TrustPlanRequestDto, TrustPlanStatus } from "../types/trustPlan";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code: string;
  Data: TData;
}

export interface TrustProductListParams {
  Search?: string;
  ProductCategory?: string;
  Status?: string;
  ReturnMethod?: string;
  CommissionMethod?: string;
  Page: number;
  PageSize: number;
}

export interface TrustProductListItem {
  ProductCode: string;
  ProductName: string;
  ProductCategory: string;
  ProductCategoryName?: string;
  MinimumPlacement: number;
  MaximumPlacement?: number | null;
  FundManagementPeriod: number;
  FundManagementPeriodUnit: string;
  ReturnMethod?: string;
  PayoutFrequency?: string;
  CommissionMethod?: string;
  ProductStatus: string;
}

export interface TrustProductListResponse {
  TotalRecords: number;
  TotalPages: number;
  CurrentPage: number;
  PageSize: number;
  Records: TrustProductListItem[];
}

export interface CreateTrustPlanResponse {
  ProductCode: string;
}

export type UpdateTrustPlanResponse = CreateTrustPlanResponse;

export interface TrustProductDetailsResponse {
  ProductCode: string;
  Steps: Record<string, unknown>;
}

export const trustPlanApi = {
  async createTrustPlan(data: TrustPlanRequestDto) {
    const response = await apiClient.post<ApiEnvelope<CreateTrustPlanResponse>>(
      "/trust-plan/create-trust-plan",
      data,
      withJsonContentType(data)
    );
    return unwrapTrustPlanResponse(response.data, "Unable to create trust plan.");
  },

  async updateTrustPlan(productCode: string, data: TrustPlanRequestDto) {
    const response = await apiClient.put<ApiEnvelope<UpdateTrustPlanResponse>>(
      `/trust-plan/${encodeURIComponent(productCode)}`,
      data,
      withJsonContentType(data)
    );
    return unwrapTrustPlanResponse(response.data, "Unable to update trust plan.");
  },

  async getTrustProductList(params: TrustProductListParams) {
    const response = await apiClient.get<ApiEnvelope<TrustProductListResponse>>(
      "/trust-plan/get-trust-product-list",
      { params: removeEmptyParams(params) }
    );
    return unwrapTrustPlanResponse(response.data, "Unable to load trust product list.");
  },

  async getTrustProductDetails(productCode: string) {
    const response = await apiClient.get<ApiEnvelope<TrustProductDetailsResponse>>(
      `/trust-plan/get-trust-product-details/${encodeURIComponent(productCode)}`
    );
    return unwrapTrustPlanResponse(response.data, "Unable to load trust product details.");
  }
};

export function normalizeTrustPlanStatus(value: string | undefined): TrustPlanStatus {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "ACTIVE") return "Active";
  if (normalized === "INACTIVE") return "Inactive";
  return "Draft";
}

function unwrapTrustPlanResponse<TData>(response: ApiEnvelope<TData>, fallbackMessage: string) {
  if (response.Status !== 0) {
    throw new Error(response.Message || fallbackMessage);
  }

  return response.Data;
}

function removeEmptyParams(params: TrustProductListParams) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}
