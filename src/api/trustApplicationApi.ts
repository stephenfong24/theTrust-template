import apiClient from "./apiClient";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code: string;
  Data: TData;
}

export type TrustMalaysiaIcSource = "TRUST_APPLICANT" | "TRUST_BENEFICIARY";

export interface TrustApplicationStepResult {
  TrustApplicationID: number;
  TrustID: number;
  TrustNo: string;
  ApplicationStatus: string;
  CurrentStep: number;
  LastCompletedStep: number;
}

export type TrustApplicationWorkflowStatus = "PENDING_ADMIN_APPROVAL" | "SENT_OUT" | "STAMPING" | "COMPLETED" | "REJECTED";

export interface TrustApplicationWorkflowRequest {
  Remark?: string;
}

export interface TrustApplicationWorkflowResult {
  TrustID: number;
  PreviousStatus?: string | null;
  ApplicationStatus: string;
  CommencementDate?: string | null;
  MaturityDate?: string | null;
  UpdatedAt?: string | null;
  RejectedAt?: string | null;
  EarlyWithdrawnAt?: string | null;
}

export interface TrustApplicationStepStatus {
  Step1Completed: boolean;
  Step2Completed: boolean;
  Step3Completed: boolean;
  Step4Completed: boolean;
  Step5Completed: boolean;
  Step6Completed: boolean;
  Step7Completed: boolean;
}

export interface TrustApplicationPlanDetail {
  ProductCode?: string | null;
  ProductName?: string | null;
  ProductCategory?: string | null;
  ProductDescription?: string | null;
  MinimumPlacement?: number | null;
  MaximumPlacement?: number | null;
  FundManagementPeriod?: number | null;
  FundManagementPeriodUnit?: string | null;
}

export interface TrustApplicationDetail {
  TrustApplicationID: number;
  TrustID: number;
  TrustNo: string;
  ProductCode: string;
  TrustPlan?: TrustApplicationPlanDetail | null;
  MemberID: number;
  ApplicationStatus: string;
  CurrentStep: number;
  LastCompletedStep: number;
  Payment?: TrustApplicationPaymentList | null;
  StepStatus?: TrustApplicationStepStatus | null;
  Step1?: Record<string, unknown> | null;
  Step2?: Record<string, unknown> | null;
  Step3?: Record<string, unknown> | null;
  Step4?: Record<string, unknown> | null;
  Step5?: Record<string, unknown> | null;
  Step6?: Record<string, unknown> | null;
  Step7?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface TrustApplicationPaymentDocument {
  PaymentDocumentID: number;
  OriginalFileName?: string | null;
  FileExtension?: string | null;
  FileUrl?: string | null;
  UploadedFile?: string | null;
  FileSize?: number | null;
  SHA256?: string | null;
  CreatedAt?: string | null;
  CreatedBy?: number | null;
}

export interface TrustApplicationPaymentAllocation {
  PaymentID: number;
  PaymentNo: number;
  PaymentAmount: number;
  PaymentDate?: string | null;
  ReferenceNo?: string | null;
  PaymentStatus?: string | null;
  FinanceRemark?: string | null;
  ApprovedAt?: string | null;
  ApprovedBy?: number | null;
  Document?: TrustApplicationPaymentDocument | null;
}

export interface TrustApplicationPaymentList {
  TrustID: number;
  ApplicationStatus?: string | null;
  TrustAssetAmount: number;
  AllocatedAmount: number;
  PaymentSource?: string | null;
  SubmittedAmount: number;
  ApprovedAmount: number;
  PendingAmount: number;
  RemainingToSubmit: number;
  RemainingToApprove: number;
  UnallocatedAmount: number;
  Payments?: TrustApplicationPaymentAllocation[] | null;
}

export interface TrustApplicationPaymentApprovalRequest {
  FinanceRemark?: string;
  CommencementDate?: string;
}

export interface TrustApplicationPaymentSlipUploadRequest {
  paymentDate: string;
  referenceNo?: string;
  file: File;
}

export interface TrustApplicationPagination {
  Page: number;
  PageSize: number;
  TotalRecords: number;
  TotalPages: number;
}

export interface TrustApplicationStatusStatistic {
  Total: number;
  Draft: number;
  PendingPaymentApproval: number;
  PaymentApproved: number;
  PendingAdminApproval: number;
  SentOut: number;
  Stamping: number;
  Completed: number;
  EarlyWithdrawn: number;
  Matured: number;
  Rejected: number;
}

export interface TrustApplicationListItem {
  TrustApplicationID: number;
  TrustID: number;
  TrustNo?: string | null;
  ProductCode?: string | null;
  ProductName?: string | null;
  MemberID: number;
  TrustRepresentativeUsername?: string | null;
  TrustRepresentativeFullName?: string | null;
  FullName?: string | null;
  IdentityType?: string | null;
  IdentityNo?: string | null;
  Email?: string | null;
  ContactNo?: string | null;
  TrustAssetAmount?: number | null;
  ApplicationStatus?: string | null;
  CurrentStep: number;
  LastCompletedStep: number;
  CreatedAt?: string | null;
  CreatedBy?: number | null;
  UpdatedAt?: string | null;
  SubmittedAt?: string | null;
  SubmittedBy?: number | null;
}

export interface TrustApplicationListParams {
  page: number;
  pageSize: number;
  search?: string;
  productCode?: string;
  applicationStatus?: string;
  agentSearch?: string;
  createdFrom?: string;
  createdTo?: string;
  submittedFrom?: string;
  submittedTo?: string;
  sortBy?: "CREATED_AT" | "UPDATED_AT" | "SUBMITTED_AT" | "TRUST_ID";
  sortDirection?: "ASC" | "DESC";
}

export interface TrustApplicationListResponse {
  Page: number;
  PageSize: number;
  TotalRecords: number;
  TotalPages: number;
  TotalStatistics?: Partial<TrustApplicationStatusStatistic> | null;
  SearchStatistics?: Partial<TrustApplicationStatusStatistic> | null;
  Applications: TrustApplicationListItem[];
}

export interface TrustApplicationSupportingDocumentResult {
  SupportingDocumentID: number;
  TrustID: number;
  OriginalFileName: string;
  FileExtension?: string | null;
  FileSize: number;
  FileSHA256?: string | null;
  SHA256?: string | null;
  FileUrl: string;
  UploadedFile?: string | null;
  CreatedAt?: string | null;
}

export interface TrustMalaysiaIcFieldResult {
  Value?: string | null;
  Confidence?: number | null;
}

export interface TrustMalaysiaIcExtractionResult {
  IsValidIC: boolean;
  DocumentType?: string | null;
  ICNumber?: TrustMalaysiaIcFieldResult | null;
  Name?: TrustMalaysiaIcFieldResult | null;
  Postcode?: TrustMalaysiaIcFieldResult | null;
  City?: TrustMalaysiaIcFieldResult | null;
  State?: TrustMalaysiaIcFieldResult | null;
  Address1?: TrustMalaysiaIcFieldResult | null;
  Address2?: TrustMalaysiaIcFieldResult | null;
}

export const trustApplicationApi = {
  async getTrustApplicationList(params: TrustApplicationListParams) {
    const response = await apiClient.get<ApiEnvelope<TrustApplicationListResponse>>("/trust-application/list", {
      params: removeEmptyParams(params)
    });

    const data = unwrapResponse(response.data, "Unable to load trust application list.");
    return {
      records: Array.isArray(data.Applications) ? data.Applications : [],
      pagination: {
        Page: data.Page,
        PageSize: data.PageSize,
        TotalRecords: data.TotalRecords,
        TotalPages: data.TotalPages
      },
      totalStatistics: normalizeStatusStatistic(data.TotalStatistics),
      searchStatistics: normalizeStatusStatistic(data.SearchStatistics)
    };
  },

  async getTrustApplication(trustId: number) {
    const response = await apiClient.get<ApiEnvelope<TrustApplicationDetail>>(`/trust-application/${trustId}`);
    return unwrapResponse(response.data, "Unable to load trust application.");
  },

  async initializePaymentAllocations(trustId: number, amounts: number[]) {
    const response = await apiClient.post<ApiEnvelope<TrustApplicationPaymentList>>(
      `/trust-payment/${trustId}/payment/allocation/initialize`,
      toPaymentAllocationPayload(amounts)
    );
    return unwrapResponse(response.data, "Unable to create payment allocations.");
  },

  async addPaymentAllocations(trustId: number, amounts: number[]) {
    const response = await apiClient.post<ApiEnvelope<TrustApplicationPaymentList>>(
      `/trust-payment/${trustId}/payment/allocation`,
      toPaymentAllocationPayload(amounts)
    );
    return unwrapResponse(response.data, "Unable to add payment allocations.");
  },

  async cancelPaymentAllocation(trustId: number, paymentId: number) {
    const response = await apiClient.delete<ApiEnvelope<TrustApplicationPaymentAllocation>>(
      `/trust-payment/${trustId}/payment/${paymentId}/delete`
    );
    return unwrapResponse(response.data, "Unable to remove payment allocation.");
  },

  async uploadPaymentSlip(trustId: number, paymentId: number, payload: TrustApplicationPaymentSlipUploadRequest) {
    const formData = new FormData();
    formData.append("paymentDate", payload.paymentDate);
    if (payload.referenceNo?.trim()) formData.append("referenceNo", payload.referenceNo.trim());
    formData.append("file", payload.file);

    const response = await apiClient.post<ApiEnvelope<TrustApplicationPaymentAllocation>>(
      `/trust-payment/${trustId}/payment/${paymentId}/slip`,
      formData
    );
    return unwrapResponse(response.data, "Unable to upload payment slip.");
  },

  async rejectPayment(trustId: number, paymentId: number, payload: TrustApplicationPaymentApprovalRequest) {
    const response = await apiClient.post<ApiEnvelope<TrustApplicationPaymentAllocation>>(
      `/trust-payment/${trustId}/payment/${paymentId}/reject`,
      payload
    );
    return unwrapResponse(response.data, "Unable to reject payment.");
  },

  async approvePayment(trustId: number, paymentId: number, payload: TrustApplicationPaymentApprovalRequest) {
    const response = await apiClient.post<ApiEnvelope<TrustApplicationPaymentAllocation>>(
      `/trust-payment/${trustId}/payment/${paymentId}/approve`,
      payload
    );
    return unwrapResponse(response.data, "Unable to approve payment.");
  },

  async getTrustApplicationDocumentPdf(trustId: number, documentCode: string) {
    const response = await apiClient.get<Blob>(getTrustApplicationDocumentPdfPath(trustId, documentCode), {
      responseType: "blob",
      skipInFlightDedupe: true
    });

    return {
      blob: response.data,
      fileName: getFileNameFromContentDisposition(getResponseHeader(response.headers, "content-disposition"))
    };
  },

  getTrustApplicationDocumentPdfUrl(trustId: number, documentCode: string) {
    return buildApiUrl(getTrustApplicationDocumentPdfPath(trustId, documentCode));
  },

  getTrustApplicationDocumentViewerPath(trustId: number, documentCode: string) {
    return `/trust/application-documents/${encodeURIComponent(String(trustId))}/${encodeURIComponent(documentCode.toLowerCase())}`;
  },

  async deleteTrustApplication(trustId: number) {
    const response = await apiClient.delete<ApiEnvelope<undefined>>(`/trust-application/${trustId}`);
    unwrapResponse(response.data, "Unable to delete trust application.");
  },

  async submitWorkflowDecision(trustId: number, status: TrustApplicationWorkflowStatus, payload: TrustApplicationWorkflowRequest = {}) {
    const endpoint = workflowDecisionEndpoints[status];
    if (!endpoint) {
      throw new Error("Unsupported trust application decision status.");
    }

    const response = await apiClient.post<ApiEnvelope<TrustApplicationWorkflowResult>>(
      `/trust-application/${encodeURIComponent(String(trustId))}/${endpoint}`,
      payload
    );

    return unwrapResponse(response.data, "Unable to submit trust application decision.");
  },

  async saveStep(step: number, payload: Record<string, unknown>) {
    const endpoint = step === 8 ? "/trust-application/submit" : `/trust-application/step-${step}`;
    const response = await apiClient.post<ApiEnvelope<TrustApplicationStepResult>>(endpoint, payload);
    return response.data.Data;
  },

  async uploadSupportingDocument({ trustId, file }: { trustId: number; file: File }) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<ApiEnvelope<TrustApplicationSupportingDocumentResult>>(
      "/trust-application/supporting-document",
      formData,
      {
        params: { trustId }
      }
    );

    return unwrapResponse(response.data, "Unable to upload supporting document.");
  },

  async removeSupportingDocument(supportingDocumentId: number) {
    const response = await apiClient.delete<ApiEnvelope<{ SupportingDocumentID: number }>>(
      `/trust-application/supporting-document/${supportingDocumentId}`
    );

    return unwrapResponse(response.data, "Unable to remove supporting document.");
  },

  async extractMalaysiaIc({ file, source }: { file: File; source: TrustMalaysiaIcSource }) {
    const formData = new FormData();
    formData.append("source", source);
    formData.append("file", file);

    const endpoint = "/trust-application/extract-malaysia-ic";

    const response = await apiClient.post<ApiEnvelope<TrustMalaysiaIcExtractionResult>>(endpoint, formData, {
      skipGlobalLoading: true,
      timeout: 60000
    });

    return response.data.Data;
  }
};

const workflowDecisionEndpoints: Record<TrustApplicationWorkflowStatus, string> = {
  PENDING_ADMIN_APPROVAL: "submit-admin-approval",
  SENT_OUT: "admin-approve",
  STAMPING: "submit-stamping",
  COMPLETED: "complete",
  REJECTED: "reject"
};

function unwrapResponse<TData>(response: ApiEnvelope<TData>, fallbackMessage: string): TData {
  if (response.Status !== 0) {
    throw new Error(response.Message || fallbackMessage);
  }

  return response.Data as TData;
}

function removeEmptyParams(params: TrustApplicationListParams) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function toPaymentAllocationPayload(amounts: number[]) {
  return {
    Payments: amounts.map((amount) => ({ Amount: amount }))
  };
}

function normalizeStatusStatistic(statistic?: Partial<TrustApplicationStatusStatistic> | null): TrustApplicationStatusStatistic {
  return {
    Total: toNumber(statistic?.Total),
    Draft: toNumber(statistic?.Draft),
    PendingPaymentApproval: toNumber(statistic?.PendingPaymentApproval),
    PaymentApproved: toNumber(statistic?.PaymentApproved),
    PendingAdminApproval: toNumber(statistic?.PendingAdminApproval),
    SentOut: toNumber(statistic?.SentOut),
    Stamping: toNumber(statistic?.Stamping),
    Completed: toNumber(statistic?.Completed),
    EarlyWithdrawn: toNumber(statistic?.EarlyWithdrawn),
    Matured: toNumber(statistic?.Matured),
    Rejected: toNumber(statistic?.Rejected)
  };
}

function toNumber(value: unknown) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function getTrustApplicationDocumentPdfPath(trustId: number, documentCode: string) {
  return `/trust-application-document/${encodeURIComponent(String(trustId))}/document/${encodeURIComponent(documentCode)}/view`;
}

function buildApiUrl(path: string) {
  const baseUrl = apiClient.defaults.baseURL ?? "";
  if (!baseUrl) return path;

  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function getResponseHeader(headers: unknown, headerName: string) {
  if (!headers || typeof headers !== "object") return "";

  const headersWithGet = headers as { get?: (name: string) => unknown };
  const directHeader = headersWithGet.get?.(headerName);
  if (typeof directHeader === "string") return directHeader;

  const headerEntry = Object.entries(headers).find(([key]) => key.toLowerCase() === headerName.toLowerCase());
  return typeof headerEntry?.[1] === "string" ? headerEntry[1] : "";
}

function getFileNameFromContentDisposition(contentDisposition: string) {
  if (!contentDisposition) return "";

  const utf8FileName = contentDisposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)?.[1];
  if (utf8FileName) return sanitizeDownloadFileName(decodeHeaderFileName(utf8FileName));

  const asciiFileName = contentDisposition.match(/filename\s*=\s*("[^"]+"|[^;]+)/i)?.[1];
  return asciiFileName ? sanitizeDownloadFileName(decodeHeaderFileName(asciiFileName)) : "";
}

function decodeHeaderFileName(value: string) {
  const trimmedValue = value.trim().replace(/^"(.*)"$/, "$1");

  try {
    return decodeURIComponent(trimmedValue);
  } catch {
    return trimmedValue;
  }
}

function sanitizeDownloadFileName(fileName: string) {
  return fileName.replace(/[\\/:*?"<>|]/g, "_").trim();
}
