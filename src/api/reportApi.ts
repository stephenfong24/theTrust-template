import apiClient from "./apiClient";

export interface OtpHistoryParams {
  page: number;
  pageSize: number;
  search?: string;
  type?: string;
  sentMethod?: string;
  status?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface OtpHistoryRecord {
  RowID: number;
  MerchantID: string | null;
  MemberID: number | null;
  FullName: string | null;
  Email: string | null;
  SentMethod: string | null;
  ReceiverAddress: string | null;
  Type: string | null;
  OTPcode?: string | null;
  OTPCode?: string | null;
  IP: string | null;
  CreatedAt: string | null;
  ExpiredAt: string | null;
  UpdatedAt: string | null;
  Status: number | null;
}

export interface ReportPagination {
  Page: number;
  PageSize: number;
  TotalRecords: number;
  TotalPages: number;
}

export const reportApi = {
  async getOtpHistory(params: OtpHistoryParams) {
    const response = await apiClient.get<{
      Status: number;
      Message: string;
      Data: { Records: OtpHistoryRecord[]; Pagination: ReportPagination };
    }>("/report/tac-history", {
      params: Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""))
    });
    if (response.data.Status !== 0) {
      throw new Error(response.data.Message || "Unable to load OTP history.");
    }
    return response.data.Data;
  }
};
