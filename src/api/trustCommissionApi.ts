import apiClient from "./apiClient";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code: string;
  Data: TData;
}

export type TrustCommissionStatus = "CALCULATED" | "PAID" | "CANCELLED";
export type TrustCommissionSortBy = "PAYOUT_DATE" | "TRUST_ID" | "COMMISSION_NO" | "COMMISSION_AMOUNT" | "STATUS" | "CREATED_AT";
export type TrustCommissionSortDirection = "ASC" | "DESC";
export type TrustCommissionBatchSortBy = "CREATED_AT" | "BATCH_NO" | "CUTOFF_DATE" | "STARTED_AT" | "COMPLETED_AT";

export interface TrustCommissionAgent {
  MemberID: number;
  Username?: string | null;
  FullName?: string | null;
  IdentityNo?: string | null;
  Email?: string | null;
  ContactNo?: string | null;
}

export interface TrustCommissionSettlor {
  FullName?: string | null;
  IdentityType?: string | null;
  IdentityNo?: string | null;
  Email?: string | null;
  ContactNo?: string | null;
}

export interface TrustCommissionBank {
  BankID: number;
  AccountName?: string | null;
  AccountNumber?: string | null;
  BankName?: string | null;
  BankNameDetail?: string | null;
  BankBranch?: string | null;
  SwiftCode?: string | null;
  IBAN?: string | null;
  BankCountry?: string | null;
}

export interface TrustCommissionBatch {
  BatchID: number;
  BatchNo?: string | null;
  CutoffDate?: string | null;
  StartedAt?: string | null;
  CompletedAt?: string | null;
  BatchStatus?: string | null;
  TotalSource: number;
  ProcessedSource: number;
  FailedSource: number;
  TotalCommissionRecords: number;
  TotalCommissionAmount: number;
  ErrorMessage?: string | null;
  CreatedAt?: string | null;
}

export interface TrustCommissionApplication {
  TrustApplicationID: number;
  TrustID: number;
  TrustNo?: string | null;
  ProductCode?: string | null;
  ApplicationStatus?: string | null;
  CommencementDate?: string | null;
  MaturityDate?: string | null;
  CompletedAt?: string | null;
}

export interface TrustCommissionListItem {
  CommissionID: number;
  CommissionNo?: string | null;
  BatchID: number;
  BatchNo?: string | null;
  TrustApplicationID: number;
  TrustID: number;
  TrustNo?: string | null;
  ProductCode?: string | null;
  SellingAgent?: TrustCommissionAgent | null;
  RecipientAgent?: TrustCommissionAgent | null;
  Settlor?: TrustCommissionSettlor | null;
  CommissionMethod?: string | null;
  CommissionType?: string | null;
  RequiredRankCode?: string | null;
  RecipientRankCode?: string | null;
  NetworkLevel: number;
  IsCompressed: boolean;
  CompressedLevels: number;
  CalculationBasis?: string | null;
  PlacementAmount: number;
  CommissionRate: number;
  CommissionAmount: number;
  CommissionPeriod?: string | null;
  PayoutDate?: string | null;
  CommissionStatus?: string | null;
  StatusRemark?: string | null;
  StatusUpdatedAt?: string | null;
  StatusUpdatedBy?: number | null;
  StatusUpdatedByUsername?: string | null;
  StatusUpdatedByFullName?: string | null;
  CreatedAt?: string | null;
}

export interface TrustCommissionDetail extends TrustCommissionListItem {
  Batch?: TrustCommissionBatch | null;
  Application?: TrustCommissionApplication | null;
  CommissionSourceID: number;
  RecipientBank?: TrustCommissionBank | null;
}

export interface TrustCommissionStatistic {
  TotalRecords: number;
  CalculatedRecords: number;
  PaidRecords: number;
  CancelledRecords: number;
  TotalAmount: number;
  CalculatedAmount: number;
  PaidAmount: number;
  CancelledAmount: number;
}

export interface TrustCommissionListParams {
  page: number;
  pageSize: number;
  batchNo?: string;
  trustSearch?: string;
  sellingAgentSearch?: string;
  recipientAgentSearch?: string;
  settlorSearch?: string;
  payoutDateFrom?: string;
  payoutDateTo?: string;
  commissionStatus?: TrustCommissionStatus;
  sortBy?: TrustCommissionSortBy;
  sortDirection?: TrustCommissionSortDirection;
}

export interface TrustCommissionBatchListParams {
  page: number;
  pageSize: number;
  search?: string;
  batchStatus?: string;
  cutoffDateFrom?: string;
  cutoffDateTo?: string;
  sortBy?: TrustCommissionBatchSortBy;
  sortDirection?: TrustCommissionSortDirection;
}

interface TrustCommissionListResponse {
  Page: number;
  PageSize: number;
  TotalRecords: number;
  TotalPages: number;
  TotalStatistics?: Partial<TrustCommissionStatistic> | null;
  SearchStatistics?: Partial<TrustCommissionStatistic> | null;
  Commissions?: TrustCommissionListItem[] | null;
}

interface TrustCommissionBatchListResponse {
  Page: number;
  PageSize: number;
  TotalRecords: number;
  TotalPages: number;
  Batches?: TrustCommissionBatch[] | null;
}

export interface TrustCommissionStatusRequest {
  Status: "PAID" | "CANCELLED";
  Remark?: string;
}

export const trustCommissionApi = {
  async getCommissionList(params: TrustCommissionListParams) {
    const response = await apiClient.get<ApiEnvelope<TrustCommissionListResponse>>("/trust-commission/list", {
      params: removeEmptyParams(params)
    });
    const data = unwrapResponse(response.data, "Unable to load commission list.");
    return {
      records: Array.isArray(data.Commissions) ? data.Commissions : [],
      pagination: {
        Page: data.Page,
        PageSize: data.PageSize,
        TotalRecords: data.TotalRecords,
        TotalPages: data.TotalPages
      },
      totalStatistics: normalizeStatistic(data.TotalStatistics),
      searchStatistics: normalizeStatistic(data.SearchStatistics)
    };
  },

  async getCommissionDetail(commissionId: number) {
    const response = await apiClient.get<ApiEnvelope<TrustCommissionDetail>>(
      `/trust-commission/${encodeURIComponent(String(commissionId))}`
    );
    return unwrapResponse(response.data, "Unable to load commission detail.");
  },

  async updateCommissionStatus(commissionId: number, payload: TrustCommissionStatusRequest) {
    const response = await apiClient.post<ApiEnvelope<TrustCommissionDetail>>(
      `/trust-commission/${encodeURIComponent(String(commissionId))}/status`,
      payload
    );
    return unwrapResponse(response.data, "Unable to update commission status.");
  },

  async getBatchList(params: TrustCommissionBatchListParams) {
    const response = await apiClient.get<ApiEnvelope<TrustCommissionBatchListResponse>>("/trust-commission/batch/list", {
      params: removeEmptyParams(params)
    });
    const data = unwrapResponse(response.data, "Unable to load commission batch list.");
    return {
      records: Array.isArray(data.Batches) ? data.Batches : [],
      pagination: {
        Page: data.Page,
        PageSize: data.PageSize,
        TotalRecords: data.TotalRecords,
        TotalPages: data.TotalPages
      }
    };
  }
};

function unwrapResponse<TData>(response: ApiEnvelope<TData>, fallbackMessage: string): TData {
  if (response.Status !== 0) {
    throw new Error(response.Message || fallbackMessage);
  }
  return response.Data as TData;
}

function removeEmptyParams<TParams extends object>(params: TParams) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function normalizeStatistic(statistic?: Partial<TrustCommissionStatistic> | null): TrustCommissionStatistic {
  return {
    TotalRecords: toNumber(statistic?.TotalRecords),
    CalculatedRecords: toNumber(statistic?.CalculatedRecords),
    PaidRecords: toNumber(statistic?.PaidRecords),
    CancelledRecords: toNumber(statistic?.CancelledRecords),
    TotalAmount: toNumber(statistic?.TotalAmount),
    CalculatedAmount: toNumber(statistic?.CalculatedAmount),
    PaidAmount: toNumber(statistic?.PaidAmount),
    CancelledAmount: toNumber(statistic?.CancelledAmount)
  };
}

function toNumber(value: unknown) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}
