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

export interface FileUploadAuditListParams {
  page: number;
  pageSize: number;
  search?: string;
  moduleCode?: string;
  uploadType?: string;
  scanCode?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface OpenAiRequestLogListParams {
  page: number;
  pageSize: number;
  search?: string;
  requestType?: string;
  source?: string;
  model?: string;
  isSuccess?: boolean;
  costCalculated?: boolean;
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

export interface FileUploadAuditItem {
  Id: number;
  RowID: number;
  MerchantID?: string | null;
  MemberID?: number | null;
  MemberName?: string | null;
  MemberUsername?: string | null;
  ModuleCode?: string | null;
  UploadType?: string | null;
  OriginalFileName?: string | null;
  StoredFileName?: string | null;
  FileExtension?: string | null;
  ContentType?: string | null;
  FileSize?: number | null;
  FileSizeDisplay?: string | null;
  SHA256?: string | null;
  ScanStatus: number;
  ScanStatusName?: string | null;
  ScanCode?: string | null;
  ScanMessage?: string | null;
  AntivirusExitCode?: number | null;
  FileUrl?: string | null;
  UploadedFile?: string | null;
  CreatedAt: string;
  CreatedBy?: string | null;
}

export interface OpenAiRequestLogItem {
  Id: number;
  RowID: number;
  RequestType?: string | null;
  Source?: string | null;
  UserID?: number | null;
  MerchantID?: string | null;
  MemberName?: string | null;
  MemberUsername?: string | null;
  MemberEmail?: string | null;
  OpenAiResponseID?: string | null;
  Model?: string | null;
  InputTokens?: number | null;
  CachedInputTokens?: number | null;
  OutputTokens?: number | null;
  ReasoningTokens?: number | null;
  TotalTokens?: number | null;
  InputPricePerMillion?: number | null;
  CachedInputPricePerMillion?: number | null;
  OutputPricePerMillion?: number | null;
  InputCostUSD?: number | null;
  CachedInputCostUSD?: number | null;
  OutputCostUSD?: number | null;
  TotalCostUSD?: number | null;
  CostCalculated: boolean;
  ImageSizeBytes?: number | null;
  ImageSizeDisplay?: string | null;
  DurationMs?: number | null;
  DurationDisplay?: string | null;
  HttpStatusCode?: number | null;
  IsSuccess: boolean;
  ErrorMessage?: string | null;
  CreatedAt: string;
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
  },

  async getFileUploadList(params: FileUploadAuditListParams) {
    const response = await apiClient.get<
      ApiEnvelope<{
        FileUploadAuditLists: FileUploadAuditItem[];
        Pagination: AuditPagination;
      }>
    >("/audit/file-upload-list", {
      params: removeEmptyParams(params)
    });

    const data = unwrapResponse(response.data);
    return {
      records: data.FileUploadAuditLists,
      pagination: data.Pagination
    };
  },

  async getOpenAiRequestList(params: OpenAiRequestLogListParams) {
    const response = await apiClient.get<
      ApiEnvelope<{
        OpenAiRequestLogs: OpenAiRequestLogItem[];
        Pagination: AuditPagination;
      }>
    >("/audit/openai-request-list", {
      params: removeEmptyParams(params)
    });

    const data = unwrapResponse(response.data);
    return {
      records: data.OpenAiRequestLogs,
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

function removeEmptyParams(params: AuditRequestListParams | FileUploadAuditListParams | OpenAiRequestLogListParams) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}
