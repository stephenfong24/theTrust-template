import apiClient from "./apiClient";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code: string;
  Data: TData;
}

export interface AuditRequestListParams {
  page: number;
  pageSize: number;
  activitykeyword?: string;
  userkeyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditRequestLogItem {
  Id: number;
  RowID: number;
  RequestID: string;
  RequestTime: string;
  ResponseTime?: string | null;
  DurationMs?: number | null;
  UserID?: string | null;
  UserName?: string | null;
  UserEmail?: string | null;
  UserType?: string | null;
  MerchantID?: string | null;
  HttpMethod?: string | null;
  RequestUrl?: string | null;
  ControllerName?: string | null;
  ActionName?: string | null;
  IpAddress?: string | null;
  UserAgent?: string | null;
  RequestHeaders?: string | null;
  RequestBody?: string | null;
  ResponseStatusCode?: number | null;
  ResponseBody?: string | null;
  ActivityTitle?: string | null;
  Description?: string | null;
  IsSuccess?: boolean | null;
  ExceptionMessage?: string | null;
  CreatedAt?: string | null;
}

export interface AuditPagination {
  Page: number;
  PageSize: number;
  TotalRecords: number;
  TotalPages: number;
}

export const auditApi = {
  async getRequestList(params: AuditRequestListParams) {
    const response = await apiClient.get<
      ApiEnvelope<{
        AuditLogs: AuditRequestLogItem[];
        Pagination: AuditPagination;
      }>
    >("/audit/request-list", {
      params: removeEmptyParams(params)
    });

    const data = unwrapResponse(response.data);
    return {
      records: data.AuditLogs,
      pagination: data.Pagination
    };
  }
};

function unwrapResponse<TData>(response: ApiEnvelope<TData>) {
  if (response.Status !== 0) {
    throw new Error(response.Message || "Unable to load audit log.");
  }

  return response.Data;
}

function removeEmptyParams(params: AuditRequestListParams) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}
