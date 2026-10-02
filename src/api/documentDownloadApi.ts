import apiClient from "./apiClient";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code: string;
  Data: TData;
}

export interface DocumentDownloadItem {
  ModuleCode: string;
  DocumentGuid: string;
  DocumentType?: string | null;
  DocumentName?: string | null;
  FileName?: string | null;
  FileExtension?: string | null;
}

export const documentDownloadApi = {
  async getDocumentList(moduleCode: string) {
    const response = await apiClient.get<ApiEnvelope<DocumentDownloadItem[]> | DocumentDownloadItem[]>(
      `/document-download/${encodeURIComponent(moduleCode)}`
    );

    const data = unwrapResponse(response.data, "Unable to load document list.");
    return Array.isArray(data) ? data : [];
  },

  async downloadDocument(moduleCode: string, documentGuid: string) {
    const response = await apiClient.get<Blob>(
      `/document-download/${encodeURIComponent(moduleCode)}/${encodeURIComponent(documentGuid)}`,
      {
        responseType: "blob",
        skipInFlightDedupe: true
      }
    );

    return {
      blob: response.data,
      fileName: getFileNameFromContentDisposition(getResponseHeader(response.headers, "content-disposition"))
    };
  }
};

function unwrapResponse<TData>(response: ApiEnvelope<TData> | TData, fallbackMessage: string): TData {
  if (isApiEnvelope(response)) {
    if (response.Status !== 0) {
      throw new Error(response.Message || fallbackMessage);
    }

    return response.Data;
  }

  return response;
}

function isApiEnvelope<TData>(response: ApiEnvelope<TData> | TData): response is ApiEnvelope<TData> {
  return Boolean(response && typeof response === "object" && "Status" in response && "Data" in response);
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
