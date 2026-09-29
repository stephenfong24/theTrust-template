import apiClient from "./apiClient";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code: string;
  Data: TData;
}

export type TrustDividendStatus = "SCHEDULED" | "DUE" | "PAID" | "CANCELLED";
export type TrustDividendReturnOption = "TRANSFER_TO_BANK" | "REDEPOSIT_AS_TRUST_ASSET";
export type TrustDividendSortBy = "FINANCE_PRIORITY" | "PAYOUT_DATE" | "TRUST_ID" | "SETTLOR_NAME" | "DIVIDEND_AMOUNT" | "STATUS";
export type TrustDividendSortDirection = "ASC" | "DESC";

export interface TrustDividendListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: TrustDividendStatus;
  productCode?: string;
  returnOption?: TrustDividendReturnOption;
  payoutDateFrom?: string;
  payoutDateTo?: string;
  sortBy?: TrustDividendSortBy;
  sortDirection?: TrustDividendSortDirection;
}

export interface TrustDividendStatistic {
  Total: number;
  Scheduled: number;
  Due: number;
  Paid: number;
  Cancelled: number;
  TotalAmount: number;
  ScheduledAmount: number;
  DueAmount: number;
  PaidAmount: number;
  CancelledAmount: number;
}

export interface TrustDividendListItem {
  DividendScheduleID: number;
  TrustApplicationID: number;
  TrustID: number;
  TrustNo?: string | null;
  ProductCode?: string | null;
  ProductName?: string | null;
  SettlorName?: string | null;
  SettlorIdentityNo?: string | null;
  ScheduleNo: number;
  ReturnYear: number;
  PeriodNo: number;
  PayoutDate?: string | null;
  CalculationBasisAmount: number;
  AnnualRate: number;
  PeriodRate: number;
  DividendAmount: number;
  PayoutAmount: number;
  RedepositAmount: number;
  ReturnOption?: string | null;
  PayoutFrequency?: string | null;
  IsRedeposit: boolean;
  Status?: string | null;
  PaidAt?: string | null;
  CancelledAt?: string | null;
  SettlorBankName?: string | null;
  SettlorBankNameDetail?: string | null;
  SettlorBankAccountNumber?: string | null;
  SettlorBankAccountHolder?: string | null;
  CanProcess: boolean;
  CanMarkPaid: boolean;
  CanCancel: boolean;
}

export interface TrustDividendDetail extends TrustDividendListItem {
  SettlorIdentityType?: string | null;
  SettlorEmail?: string | null;
  SettlorContactNo?: string | null;
  TrustAssetAmount?: number | null;
  DividendMethod?: string | null;
  PayoutFrequency?: string | null;
  CalculationStart?: string | null;
  PeriodStartDate?: string | null;
  PeriodEndDate?: string | null;
  BaseDividendAmount: number;
  BonusAmount: number;
  TotalReturnAmount: number;
  StatusRemark?: string | null;
  SettlorSwiftCode?: string | null;
  SettlorBankAddress?: string | null;
  CreatedAt?: string | null;
  CreatedBy?: number | null;
  UpdatedAt?: string | null;
  UpdatedBy?: number | null;
}

export interface TrustDividendListResponse {
  Page: number;
  PageSize: number;
  TotalRecords: number;
  TotalPages: number;
  TotalStatistics?: Partial<TrustDividendStatistic> | null;
  SearchStatistics?: Partial<TrustDividendStatistic> | null;
  Dividends?: TrustDividendListItem[] | null;
}

export interface TrustDividendStatusRequest {
  Status: "PAID" | "CANCELLED";
  Remark?: string;
}

export const trustDividendApi = {
  async getDividendList(params: TrustDividendListParams) {
    const response = await apiClient.get<ApiEnvelope<TrustDividendListResponse>>("/trust-dividend", {
      params: removeEmptyParams(params)
    });

    const data = unwrapResponse(response.data, "Unable to load trust dividend list.");
    return {
      records: Array.isArray(data.Dividends) ? data.Dividends : [],
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

  async getDividendDetail(dividendScheduleId: number) {
    const response = await apiClient.get<ApiEnvelope<TrustDividendDetail>>(
      `/trust-dividend/${encodeURIComponent(String(dividendScheduleId))}`
    );
    return unwrapResponse(response.data, "Unable to load trust dividend detail.");
  },

  async updateDividendStatus(dividendScheduleId: number, payload: TrustDividendStatusRequest) {
    const response = await apiClient.post<ApiEnvelope<TrustDividendDetail>>(
      `/trust-dividend/${encodeURIComponent(String(dividendScheduleId))}/status`,
      payload
    );
    return unwrapResponse(response.data, "Unable to update dividend status.");
  }
};

function unwrapResponse<TData>(response: ApiEnvelope<TData>, fallbackMessage: string): TData {
  if (response.Status !== 0) {
    throw new Error(response.Message || fallbackMessage);
  }

  return response.Data as TData;
}

function removeEmptyParams(params: TrustDividendListParams) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function normalizeStatistic(statistic?: Partial<TrustDividendStatistic> | null): TrustDividendStatistic {
  return {
    Total: toNumber(statistic?.Total),
    Scheduled: toNumber(statistic?.Scheduled),
    Due: toNumber(statistic?.Due),
    Paid: toNumber(statistic?.Paid),
    Cancelled: toNumber(statistic?.Cancelled),
    TotalAmount: toNumber(statistic?.TotalAmount),
    ScheduledAmount: toNumber(statistic?.ScheduledAmount),
    DueAmount: toNumber(statistic?.DueAmount),
    PaidAmount: toNumber(statistic?.PaidAmount),
    CancelledAmount: toNumber(statistic?.CancelledAmount)
  };
}

function toNumber(value: unknown) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}
