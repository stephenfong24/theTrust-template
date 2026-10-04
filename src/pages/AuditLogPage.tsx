import { format, parseISO } from "date-fns";
import { Calendar, ChevronDown, ChevronUp, ChevronsUpDown, Copy, ExternalLink, Eye, File, FileText, Folder, Link, RotateCcw, Search, Settings, ShieldCheck, X } from "lucide-react";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { PageHeader } from "../components/common/PageHeader";
import { Pagination } from "../components/common/Pagination";
import { DatePickerInput } from "../components/forms/DatePickerInput";
import { auditApi, type AuditPagination, type AuditRequestLogItem, type FileUploadAuditItem } from "../api/auditApi";
import { roles } from "../config/roles";
import { useAuth } from "../hooks/useAuth";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { notifyError, notifySuccess } from "../services/notificationService";

type AuditLogVariant = "request" | "file-upload";
type SortKey = "dateTime" | "requestId" | "user" | "activityTitle" | "method" | "url" | "status" | "durationMs";
type SortDirection = "asc" | "desc";
const allFilter = "all";
const codeDisplayAcronyms = new Set(["API", "ID", "KYC", "NRIC", "PDF", "SHA", "SHA256", "URL"]);

interface SelectOption {
  value: string;
  label: string;
}

interface FileUploadFilters {
  search: string;
  moduleCode: string;
  uploadType: string;
  scanCode: string;
  dateFrom: string;
  dateTo: string;
}

interface AuditRequestRow {
  id: string;
  requestId: string;
  rowId: number;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  userType: string;
  merchantId: string;
  activityTitle: string;
  actionName: string;
  description: string;
  status: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  controllerName: string;
  dateTime: string;
  responseTime: string;
  durationMs: number;
  ipAddress: string;
  userAgent: string;
  requestHeaders: string;
  requestBody: unknown;
  responseStatusCode: number | null;
  responseBody: unknown;
  exceptionMessage: string;
}

export function AuditLogPage({ variant }: { variant: AuditLogVariant }) {
  const { session } = useAuth();
  const [requestRows, setRequestRows] = useState<AuditRequestRow[]>([]);
  const [requestPagination, setRequestPagination] = useState<AuditPagination>({ Page: 1, PageSize: 10, TotalRecords: 0, TotalPages: 0 });
  const [requestLoading, setRequestLoading] = useState(variant === "request");
  const [requestFailed, setRequestFailed] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activityQueryDraft, setActivityQueryDraft] = useState("");
  const [activityQuery, setActivityQuery] = useState("");
  const [userQueryDraft, setUserQueryDraft] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRecord, setSelectedRecord] = useState<AuditRequestRow | null>(null);
  const canViewAll = session?.role === "SA" || session?.role === "AD";
  const isAgent = session?.role === "AG";
  const title = variant === "file-upload" ? "File Upload Log" : "Request Log";

  useEffect(() => {
    if (variant !== "request") return;

    let active = true;
    setRequestLoading(true);
    setRequestFailed(false);

    auditApi
      .getRequestList({
        page,
        pageSize,
        activitykeyword: activityQuery.trim(),
        userkeyword: isAgent ? undefined : userQuery.trim(),
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      })
      .then(({ records, pagination }) => {
        if (!active) return;
        setRequestRows(records.map(toAuditRequestRow));
        setRequestPagination(pagination);
      })
      .catch(() => {
        if (!active) return;
        setRequestRows([]);
        setRequestPagination({ Page: page, PageSize: pageSize, TotalRecords: 0, TotalPages: 0 });
        setRequestFailed(true);
      })
      .finally(() => {
        if (active) setRequestLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activityQuery, dateFrom, dateTo, isAgent, page, pageSize, userQuery, variant]);

  const pageCount = Math.max(1, requestPagination.TotalPages || 1);
  const currentPage = Math.min(requestPagination.Page || page, pageCount);
  const pageRecords = requestRows;
  const firstRecordNumber = requestPagination.TotalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const applySearch = () => {
    setActivityQuery(activityQueryDraft);
    setUserQuery(userQueryDraft);
    setPage(1);
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setActivityQueryDraft("");
    setActivityQuery("");
    setUserQueryDraft("");
    setUserQuery("");
    setPage(1);
  };

  if (variant === "request" && requestLoading && requestRows.length === 0) return <LoadingSkeleton />;

  return (
    <>
      <PageHeader
        title={title}
        description={
          canViewAll
            ? `${roles[session?.role ?? "SA"]} can view all audit log records.`
            : "You can view audit log records for actions performed by your account only."
        }
        actions={
          <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-textPrimary">
            {variant === "file-upload" ? <FileText className="h-4 w-4 text-brandGold" /> : <ShieldCheck className="h-4 w-4 text-brandGold" />}
            {variant === "file-upload" ? "File upload records" : `${requestPagination.TotalRecords} records`}
          </span>
        }
      />

      {variant === "file-upload" ? <FileUploadAuditList /> : (

      <section className="rounded-lg border border-line bg-white shadow-soft">
        <div className={isAgent ? "grid gap-4 border-b border-line p-4 lg:grid-cols-[max-content_minmax(0,1fr)_auto_auto]" : "grid gap-4 border-b border-line p-4 lg:grid-cols-[max-content_minmax(0,1.35fr)_minmax(0,0.9fr)_auto_auto]"}>
          <DateRangeField
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={(value) => {
              setDateFrom(value);
              setPage(1);
            }}
            onDateToChange={(value) => {
              setDateTo(value);
              setPage(1);
            }}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-textPrimary">Search Activity</span>
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
              <input
                value={activityQueryDraft}
                onChange={(event) => setActivityQueryDraft(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && applySearch()}
                placeholder="Search by activity title or description..."
                className="h-11 w-full rounded-md border border-line bg-white pl-10 pr-3 text-sm text-textPrimary shadow-sm"
              />
            </span>
          </label>
          {!isAgent ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-textPrimary">Search User</span>
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
                <input
                  value={userQueryDraft}
                  onChange={(event) => setUserQueryDraft(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && applySearch()}
                  placeholder="Search by name or email..."
                  className="h-11 w-full rounded-md border border-line bg-white pl-10 pr-3 text-sm text-textPrimary shadow-sm"
                />
              </span>
            </label>
          ) : null}
          <button onClick={applySearch} className="mt-auto h-11 rounded-md bg-ink px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-black">
            Search
          </button>
          <button onClick={resetFilters} className="mt-auto h-11 rounded-md border border-line bg-white px-6 text-sm font-semibold text-textSecondary transition hover:border-brandGold hover:text-textPrimary">
            Reset
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-textSecondary">{requestPagination.TotalRecords} records</div>
          <label className="flex items-center gap-2 text-sm text-textSecondary">
            Rows
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-9 rounded-lg border border-line bg-white px-2 text-textPrimary">
              {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>

        {requestFailed ? (
          <div className="p-6">
            <EmptyState title="Unable to load request logs" description="Please try again or adjust the active filters." />
          </div>
        ) : requestLoading ? (
          <LoadingSkeleton />
        ) : pageRecords.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No matching records" description="Review the search term or clear active filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`${isAgent ? "min-w-[900px]" : "min-w-[1180px]"} w-full text-left text-[13px]`}>
              <thead className="bg-soft text-xs text-textSecondary">
                <tr>
                  <AuditHeader label="#" />
                  <AuditHeader label="Request Time" />
                  <AuditHeader label="User" />
                  <AuditHeader label="Activity" />
                  {!isAgent ? <AuditHeader label="Method / URL" /> : null}
                  <AuditHeader label="Status" />
                  <AuditHeader label="Duration" />
                  {!isAgent ? <AuditHeader label="Actions" /> : null}
                </tr>
              </thead>
              <tbody>
                {pageRecords.map((record, index) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="border-b border-line px-4 py-3 text-textSecondary">{firstRecordNumber + index}</td>
                    <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textPrimary">{formatAuditDate(record.dateTime)}</td>
                    <td className="border-b border-line px-4 py-3">
                      <div className="font-semibold text-textPrimary">{record.userDisplayName}</div>
                      <div className="mt-1 text-xs leading-5 text-textSecondary">{record.userEmail}</div>
                    </td>
                    <td className="max-w-[320px] border-b border-line px-4 py-3">
                      <div className="font-semibold text-textPrimary">{record.activityTitle}</div>
                      <div className="mt-1 text-xs leading-5 text-textSecondary">{record.description}</div>
                    </td>
                    {!isAgent ? (
                      <td className="whitespace-nowrap border-b border-line px-4 py-3">
                        <MethodBadge method={record.method} />
                        <div title={record.url} className="mt-1 text-xs font-medium text-textPrimary">{truncateMiddle(record.url, 44)}</div>
                      </td>
                    ) : null}
                    <td className="border-b border-line px-4 py-3"><StatusPill status={record.status} /></td>
                    <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textPrimary">{record.durationMs.toLocaleString()} ms</td>
                    {!isAgent ? (
                      <td className="border-b border-line px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary transition hover:border-brandGold hover:bg-gray-50"
                          aria-label={`View ${record.requestId}`}
                        >
                          <Eye className="h-4 w-4 text-brandGold" />
                          View
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination currentPage={currentPage} pageCount={pageCount} totalRecords={requestPagination.TotalRecords} pageSize={pageSize} onPageChange={setPage} />
      </section>
      )}

      <AuditDetailDrawer record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </>
  );
}

function DateRangeField({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-semibold text-textPrimary">Created Date</span>
      <span className="flex h-11 w-full min-w-[260px] max-w-full items-center gap-2 rounded-md border border-line bg-white px-3 text-sm text-textPrimary shadow-sm">
        <Calendar className="h-4 w-4 shrink-0 text-textSecondary" />
        <DatePickerInput value={dateFrom} onChange={onDateFromChange} placeholder="From" buttonClassName="h-auto min-w-0 flex-1 border-0 p-0 shadow-none focus:ring-0" dialogTitle="Created Date From" showIcon={false} />
        <span className="shrink-0 text-textSecondary">-</span>
        <DatePickerInput value={dateTo} onChange={onDateToChange} placeholder="To" buttonClassName="h-auto min-w-0 flex-1 border-0 p-0 shadow-none focus:ring-0" dialogTitle="Created Date To" showIcon={false} />
      </span>
    </label>
  );
}

function FileUploadAuditList() {
  const [records, setRecords] = useState<FileUploadAuditItem[]>([]);
  const [pagination, setPagination] = useState<AuditPagination>({ Page: 1, PageSize: 10, TotalRecords: 0, TotalPages: 1 });
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsFailed, setRecordsFailed] = useState(false);
  const [moduleOptions, setModuleOptions] = useState<SelectOption[]>([]);
  const [uploadTypeOptions, setUploadTypeOptions] = useState<SelectOption[]>([]);
  const [scanCodeOptions, setScanCodeOptions] = useState<SelectOption[]>([]);
  const [draftFilters, setDraftFilters] = useState<FileUploadFilters>(createEmptyFileUploadFilters());
  const [filters, setFilters] = useState<FileUploadFilters>(createEmptyFileUploadFilters());
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let cancelled = false;

    loadFileUploadFilterOptions()
      .then(({ moduleCodes, uploadTypes, scanCodes }) => {
        if (cancelled) return;
        setModuleOptions(moduleCodes);
        setUploadTypeOptions(uploadTypes);
        setScanCodeOptions(scanCodes);
      })
      .catch(() => {
        if (cancelled) return;
        setModuleOptions([]);
        setUploadTypeOptions([]);
        setScanCodeOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFileUploads() {
      setRecordsLoading(true);
      setRecordsFailed(false);

      try {
        const result = await auditApi.getFileUploadList({
          page,
          pageSize,
          search: filters.search || undefined,
          moduleCode: filters.moduleCode === allFilter ? undefined : filters.moduleCode,
          uploadType: filters.uploadType === allFilter ? undefined : filters.uploadType,
          scanCode: filters.scanCode === allFilter ? undefined : filters.scanCode,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined
        });

        if (cancelled) return;
        setRecords(Array.isArray(result.records) ? result.records : []);
        setPagination({
          Page: result.pagination.Page,
          PageSize: result.pagination.PageSize,
          TotalRecords: result.pagination.TotalRecords,
          TotalPages: Math.max(1, result.pagination.TotalPages)
        });
      } catch (error) {
        if (cancelled) return;
        setRecords([]);
        setPagination({ Page: page, PageSize: pageSize, TotalRecords: 0, TotalPages: 1 });
        setRecordsFailed(true);
        notifyError(error instanceof Error ? error.message : "Unable to load file upload log.", "file-upload-audit-list-load");
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    }

    loadFileUploads();

    return () => {
      cancelled = true;
    };
  }, [filters, page, pageSize]);

  useEffect(() => {
    setExpandedRowId(records[0]?.RowID ?? null);
  }, [records]);

  const pageCount = Math.max(1, pagination.TotalPages || 1);
  const currentPage = Math.min(pagination.Page || page, pageCount);
  const firstRecordNumber = pagination.TotalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const applySearch = () => {
    setFilters({
      ...draftFilters,
      search: draftFilters.search.trim()
    });
    setPage(1);
  };

  const resetFilters = () => {
    const empty = createEmptyFileUploadFilters();
    setDraftFilters(empty);
    setFilters(empty);
    setPage(1);
  };

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="flex w-full flex-wrap items-end gap-4 border-b border-line p-4">
        <div className="min-w-0 flex-[1.25_1_280px]">
          <DateRangeField
            dateFrom={draftFilters.dateFrom}
            dateTo={draftFilters.dateTo}
            onDateFromChange={(value) => setDraftFilters((current) => ({ ...current, dateFrom: value }))}
            onDateToChange={(value) => setDraftFilters((current) => ({ ...current, dateTo: value }))}
          />
        </div>
        <SelectField
          label="Module Code"
          value={draftFilters.moduleCode}
          options={[{ value: allFilter, label: "All Modules" }, ...moduleOptions]}
          onChange={(value) => setDraftFilters((current) => ({ ...current, moduleCode: value }))}
          className="flex-[1_1_220px]"
        />
        <SelectField
          label="Upload Type"
          value={draftFilters.uploadType}
          options={[{ value: allFilter, label: "All Upload Types" }, ...uploadTypeOptions]}
          onChange={(value) => setDraftFilters((current) => ({ ...current, uploadType: value }))}
          className="flex-[1.05_1_240px]"
        />
        <SelectField
          label="Scan Status"
          value={draftFilters.scanCode}
          options={[{ value: allFilter, label: "All Scan Status" }, ...scanCodeOptions]}
          onChange={(value) => setDraftFilters((current) => ({ ...current, scanCode: value }))}
          className="flex-[1_1_230px]"
        />
        <label className="flex min-w-0 flex-[2_1_320px] flex-col gap-1.5">
          <span className="text-xs font-semibold text-textPrimary">Search</span>
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
            <input
              value={draftFilters.search}
              onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
              onKeyDown={(event) => event.key === "Enter" && applySearch()}
              placeholder="Search member, email, file name..."
              className="h-11 w-full rounded-md border border-line bg-white pl-10 pr-3 text-sm text-textPrimary shadow-sm"
            />
          </span>
        </label>
        <button onClick={applySearch} className="inline-flex h-11 min-w-[120px] flex-[0_0_120px] items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-black">
          <Search className="h-4 w-4" />
          Search
        </button>
        <button onClick={resetFilters} className="inline-flex h-11 min-w-[120px] flex-[0_0_120px] items-center justify-center gap-2 rounded-md border border-line bg-white px-5 text-sm font-semibold text-textSecondary transition hover:border-brandGold hover:text-textPrimary">
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold text-textSecondary">Total Records: {pagination.TotalRecords}</div>
        <label className="flex items-center gap-2 text-sm text-textSecondary">
          Rows
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-9 rounded-lg border border-line bg-white px-2 text-textPrimary">
            {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>

      {recordsFailed ? (
        <div className="p-6">
          <EmptyState title="Unable to load file upload logs" description="Please try again or adjust the active filters." />
        </div>
      ) : recordsLoading ? (
        <LoadingSkeleton />
      ) : records.length === 0 ? (
        <div className="p-6">
          <EmptyState title="No matching file uploads" description="Review the search term or clear active filters." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1320px] w-full text-left text-[13px]">
            <thead className="bg-soft text-xs uppercase text-textSecondary">
              <tr>
                <FileUploadHeader label="#" />
                <FileUploadHeader label="Date & Time" className="w-[180px]" />
                <FileUploadHeader label="Member" className="w-[280px]" />
                <FileUploadHeader label="Module / Type" className="w-[260px]" />
                <FileUploadHeader label="File" />
                <FileUploadHeader label="Status" className="w-[190px]" />
                <FileUploadHeader label="" className="w-[68px]" />
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => {
                const expanded = expandedRowId === record.RowID;

                return (
                  <Fragment key={record.RowID}>
                    <tr className="hover:bg-gray-50">
                      <td className="border-b border-line px-4 py-4 text-textPrimary">{firstRecordNumber + index}</td>
                      <td className="whitespace-nowrap border-b border-line px-4 py-4 font-medium text-textPrimary">{formatFileUploadDate(record.CreatedAt)}</td>
                      <td className="border-b border-line px-4 py-4">
                        <div className="font-semibold text-textPrimary">{record.MemberName || "-"}</div>
                        <div className="mt-1 text-sm leading-5 text-textSecondary">{record.MemberUsername || "-"}</div>
                      </td>
                      <td className="border-b border-line px-4 py-4">
                        <div className="font-semibold text-textPrimary" title={record.ModuleCode || undefined}>{formatDatabaseValueDisplayText(record.ModuleCode)}</div>
                        <div className="mt-1 text-sm leading-5 text-textSecondary" title={record.UploadType || undefined}>{formatDatabaseValueDisplayText(record.UploadType)}</div>
                      </td>
                      <td className="border-b border-line px-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <FileText className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-textPrimary" title={record.OriginalFileName || undefined}>{record.OriginalFileName || "-"}</div>
                            <div className="mt-1 text-sm uppercase leading-5 text-textSecondary">{formatFileExtension(record.FileExtension)} · {record.FileSizeDisplay || formatFileSize(record.FileSize)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-line px-4 py-4"><ScanStatusBadge record={record} /></td>
                      <td className="border-b border-line px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandedRowId((current) => (current === record.RowID ? null : record.RowID))}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-textPrimary transition hover:bg-soft"
                          aria-label={expanded ? "Collapse file upload details" : "Expand file upload details"}
                        >
                          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="bg-white">
                        <td colSpan={7} className="border-b border-line px-5 py-3">
                          <FileUploadDetailPanel record={record} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={currentPage} pageCount={pageCount} totalRecords={pagination.TotalRecords} pageSize={pageSize} onPageChange={setPage} />
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  className = ""
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-semibold text-textPrimary">{label}</span>
      <span className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full appearance-none rounded-md border border-line bg-white px-3 pr-9 text-sm text-textPrimary shadow-sm">
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
      </span>
    </label>
  );
}

function FileUploadHeader({ label, className = "" }: { label: string; className?: string }) {
  return (
    <th className={`border-b border-line px-4 py-3 font-semibold ${className}`}>
      {label}
    </th>
  );
}

function ScanStatusBadge({ record }: { record: FileUploadAuditItem }) {
  const statusConfig = getScanStatusTone(record.ScanStatus);

  return (
    <span className={`inline-flex min-w-24 justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold ${statusConfig}`}>
      {getScanStatusDisplay(record)}
    </span>
  );
}

function FileUploadDetailPanel({ record }: { record: FileUploadAuditItem }) {
  return (
    <section className="overflow-hidden rounded-lg border border-blue-100 bg-blue-50/35 shadow-sm">
      <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50/55 px-5 py-4">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
          <FileText className="h-5 w-5" />
        </span>
        <h3 className="text-base font-bold text-textPrimary">File & Scan Details</h3>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <DetailCard title="File Information" icon={<FileText className="h-4 w-4" />}>
          <div className="grid min-w-0 gap-2 rounded-lg bg-white/75 p-3">
            <div className="grid min-w-0 items-center gap-3 sm:grid-cols-[130px_minmax(0,1fr)_auto]">
              <div className="text-sm font-bold text-textPrimary">Original File Name</div>
              <div className="min-w-0 truncate rounded-md bg-blue-50 px-4 py-2.5 text-sm font-semibold text-textSecondary" title={record.OriginalFileName || undefined}>{record.OriginalFileName || "-"}</div>
              <div>{record.OriginalFileName ? <CopyButton value={record.OriginalFileName} label="Original File Name" /> : null}</div>
            </div>
            <div className="grid min-w-0 items-start gap-3 sm:grid-cols-[130px_minmax(0,1fr)_auto]">
              <div className="text-sm font-bold text-textPrimary">Stored Filename</div>
              <div className="min-w-0">
                <div className="truncate rounded-md bg-blue-50 px-4 py-2.5 text-sm font-semibold text-textSecondary" title={record.StoredFileName || undefined}>{record.StoredFileName || "-"}</div>
                <div className="mt-1 truncate text-sm text-textSecondary">{record.ContentType || "-"} · {record.FileSizeDisplay || formatFileSize(record.FileSize)}</div>
              </div>
              <div>{record.StoredFileName ? <CopyButton value={record.StoredFileName} label="Stored Filename" /> : null}</div>
            </div>
          </div>
        </DetailCard>

        <DetailCard title="File Hash" icon={<ShieldCheck className="h-4 w-4" />}>
          <div className="flex min-w-0 items-center gap-3 rounded-lg bg-white/75 p-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <ShieldCheck className="h-7 w-7" />
            </span>
            <div className="shrink-0 text-xs font-bold text-textPrimary">SHA256</div>
            <div className="min-w-0 flex-1 truncate rounded-md bg-blue-50 px-4 py-3 text-sm font-semibold text-textSecondary" title={record.SHA256 || undefined}>
              {record.SHA256 || "-"}
            </div>
            {record.SHA256 ? <CopyButton value={record.SHA256} label="SHA256" /> : null}
          </div>
        </DetailCard>

        <DetailCard title="Scan Information" icon={<ShieldCheck className="h-4 w-4" />} iconClassName="text-emerald-700 bg-emerald-50">
          <div className="grid gap-4 rounded-lg bg-white/75 p-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="text-sm font-bold text-textPrimary">Scan Result</div>
              <div className="mt-2">
                <ScanStatusBadge record={record} />
              </div>
            </div>
            <div className="min-w-0 border-line sm:border-l sm:pl-6">
              <div className="text-sm font-bold text-textPrimary">Exit Code</div>
              <div className="mt-3 text-sm text-textSecondary">{record.AntivirusExitCode?.toString() || "-"}</div>
            </div>
          </div>
        </DetailCard>

        <DetailCard title="File Location" icon={<Link className="h-4 w-4" />} iconClassName="text-blue-600 bg-blue-50">
          <div className="space-y-3">
            <FileLocationRow
              icon={<Link className="h-5 w-5" />}
              label="File URL"
              value={record.FileUrl}
              actionLabel="Open"
              onAction={() => openFileUploadUrl(record.FileUrl)}
            />
            <FileLocationRow
              icon={<Folder className="h-5 w-5" />}
              label="Storage Path"
              value={record.UploadedFile}
            />
          </div>
        </DetailCard>
      </div>
    </section>
  );
}

function DetailCard({
  title,
  icon,
  iconClassName = "text-blue-700 bg-blue-50",
  children
}: {
  title: string;
  icon: ReactNode;
  iconClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-blue-100 bg-gradient-to-b from-white to-blue-50/50 px-4 py-3">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${iconClassName}`}>{icon}</span>
        <h4 className="text-sm font-bold text-textPrimary">{title}</h4>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function FileLocationRow({
  icon,
  label,
  value,
  actionLabel,
  onAction
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid min-w-0 items-center gap-3 sm:grid-cols-[92px_minmax(0,1fr)_auto]">
      <div className="text-sm font-bold text-textPrimary">{label}</div>
      <div className="flex h-10 min-w-0 items-center gap-3 rounded-lg bg-blue-50 px-3 text-sm text-blue-700">
        <span className="shrink-0 text-blue-600">{icon}</span>
        <span className="truncate" title={value || undefined}>{value || "-"}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {actionLabel && onAction && value ? (
          <button type="button" onClick={onAction} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50">
            <ExternalLink className="h-4 w-4" />
            {actionLabel}
          </button>
        ) : null}
        {value ? <CopyButton value={value} label={label} textLabel /> : null}
      </div>
    </div>
  );
}

function CopyButton({ value, label, textLabel = false }: { value: string; label: string; textLabel?: boolean }) {
  const copy = async () => {
    try {
      await copyTextToClipboard(value);
      notifySuccess(`${label} copied successfully.`, `file-upload-${label.toLowerCase().replace(/\s+/g, "-")}-copy`);
    } catch {
      notifyError(`Unable to copy ${label.toLowerCase()}.`, `file-upload-${label.toLowerCase().replace(/\s+/g, "-")}-copy-error`);
    }
  };

  return (
    <button type="button" onClick={copy} className={`${textLabel ? "w-auto gap-2 px-4" : "w-10"} inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-sm font-semibold text-textSecondary shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600`} aria-label={`Copy ${label}`}>
      <Copy className="h-4 w-4" />
      {textLabel ? "Copy" : null}
    </button>
  );
}

function openFileUploadUrl(value?: string | null) {
  if (!value) return;
  window.open(value, "_blank", "noopener,noreferrer");
}

function AuditHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort
}: {
  label: string;
  sortKey?: SortKey;
  activeSortKey?: SortKey;
  direction?: SortDirection;
  onSort?: (key: SortKey) => void;
}) {
  const active = sortKey && activeSortKey === sortKey;
  return (
    <th className="border-b border-line px-4 py-3 font-semibold">
      {sortKey && onSort ? (
        <button onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 whitespace-nowrap">
          {label}
          <ChevronsUpDown className={`h-3.5 w-3.5 ${active && direction === "desc" ? "text-textPrimary" : ""}`} />
        </button>
      ) : (
        label
      )}
    </th>
  );
}

function MethodBadge({ method }: { method: AuditRequestRow["method"] }) {
  const classes = {
    DELETE: "bg-red-100 text-red-700",
    GET: "bg-slate-100 text-slate-700",
    PATCH: "bg-purple-100 text-purple-700",
    POST: "bg-blue-100 text-blue-700",
    PUT: "bg-amber-100 text-amber-700"
  };

  return <span className={`inline-flex min-w-14 justify-center rounded-md px-2.5 py-1 text-xs font-bold ${classes[method]}`}>{method}</span>;
}

function StatusPill({ status }: { status: string }) {
  const success = status.toLowerCase() === "success";
  return (
    <span className={`inline-flex min-w-20 justify-center rounded-md px-3 py-1 text-xs font-bold ${success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
      {status}
    </span>
  );
}

function AuditDetailDrawer({ record, onClose }: { record: AuditRequestRow | null; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  useBodyScrollLock(Boolean(record));

  useEffect(() => {
    if (record) setClosing(false);
  }, [record]);

  if (!record) return null;

  const requestBody = createRequestBody(record);
  const responseBody = createResponseBody(record);
  const closeWithAnimation = () => {
    setClosing(true);
    window.setTimeout(onClose, 220);
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black/30 transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`} role="dialog" aria-modal="true" aria-label="Request details">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close request details" onClick={closeWithAnimation} />
      <aside className={`absolute right-0 top-0 flex h-full w-full max-w-[min(1500px,calc(100vw-32px))] bg-soft shadow-2xl transition-transform duration-200 ease-out ${closing ? "translate-x-full" : "translate-x-0"}`}>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between border-b border-line bg-white px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-brandGold">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-textPrimary">Request Details</h2>
                <p className="mt-1 text-xs text-textSecondary">Detailed information for the selected audit log entry.</p>
              </div>
            </div>
            <button type="button" onClick={closeWithAnimation} className="rounded-lg p-2 text-textSecondary transition hover:bg-gray-100 hover:text-textPrimary" aria-label="Close request details">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <InfoPanel icon={<FileText className="h-4 w-4" />} title="General Information">
                <DetailList
                  rows={[
                    ["Request ID", record.requestId],
                    ["Request Time", formatAuditDate(record.dateTime)],
                    ["Response Time", formatResponseDate(record.dateTime, record.durationMs, record.responseTime)],
                    ["Duration", `${record.durationMs.toLocaleString()} ms`],
                    ["User", `${record.userDisplayName} (${record.userEmail})`],
                    ["Merchant ID", getMerchantId(record)],
                    ["IP Address", record.ipAddress],
                    ["User Agent", getUserAgent(record)]
                  ]}
                />
              </InfoPanel>

              <InfoPanel icon={<Settings className="h-4 w-4" />} title="API Information">
                <DetailList
                  rows={[
                    ["Controller", getController(record)],
                    ["Action", getApiAction(record)],
                    ["HTTP Method", <MethodBadge key="method" method={record.method} />],
                    ["Request URL", record.url],
                    ["Response Status Code", record.responseStatusCode?.toString() ?? "-"],
                    ["Activity Title", record.activityTitle],
                    ["Description", record.description],
                    ["Is Success", <span key="success" className="inline-flex rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">{record.status.toLowerCase() === "success" ? "Yes" : "No"}</span>],
                    ["Exception Message", record.exceptionMessage]
                  ]}
                />
              </InfoPanel>
            </div>

            <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <CodePanel title="Request Body" value={requestBody} />
              <CodePanel title="Response Body" value={responseBody} />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function InfoPanel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line bg-soft px-4 py-3 text-sm font-bold text-textPrimary">
        <span className="text-brandGold">{icon}</span>
        {title}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function DetailList({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid min-w-0 gap-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid min-w-0 gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
          <dt className="font-medium text-textSecondary">{label}</dt>
          <dd className="min-w-0 whitespace-normal break-all font-semibold text-textPrimary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CodePanel({ title, value }: { title: string; value: unknown }) {
  const formatted = JSON.stringify(value, null, 2);

  const copy = async () => {
    try {
      await copyTextToClipboard(formatted);
      notifySuccess(`${title} copied successfully.`, `audit-${title.toLowerCase().replace(/\s+/g, "-")}-copy`);
    } catch {
      notifyError(`Unable to copy ${title.toLowerCase()}.`, `audit-${title.toLowerCase().replace(/\s+/g, "-")}-copy-error`);
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line bg-soft px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-bold text-textPrimary">
          <FileText className="h-4 w-4 text-brandGold" />
          {title}
        </div>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-textSecondary transition hover:bg-white hover:text-textPrimary" aria-label={`Copy ${title}`} title={`Copy ${title}`}>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </button>
      </div>
      <pre className="max-h-[360px] overflow-auto bg-white p-4 text-xs leading-6 text-textPrimary">
        <code>{formatted}</code>
      </pre>
    </section>
  );
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Copy command failed.");
    }
  } finally {
    document.body.removeChild(textArea);
  }
}

function toAuditRequestRow(record: AuditRequestLogItem): AuditRequestRow {
  const method = normalizeHttpMethod(record.HttpMethod);

  return {
    id: String(record.RowID ?? record.RequestID),
    requestId: String(record.RequestID ?? "-"),
    rowId: record.RowID ?? 0,
    userId: record.UserID || "-",
    userDisplayName: record.UserName || "-",
    userEmail: record.UserEmail || "-",
    userType: record.UserType || "-",
    merchantId: record.MerchantID || "-",
    activityTitle: record.ActivityTitle || "-",
    actionName: record.ActionName || "-",
    description: record.Description || "-",
    status: record.IsSuccess === false ? "Failed" : "Success",
    method,
    url: record.RequestUrl || "-",
    controllerName: record.ControllerName || "-",
    dateTime: record.RequestTime || record.CreatedAt || "",
    responseTime: record.ResponseTime || "",
    durationMs: record.DurationMs ?? 0,
    ipAddress: record.IpAddress || "-",
    userAgent: record.UserAgent || "-",
    requestHeaders: record.RequestHeaders || "-",
    requestBody: parseJsonPayload(record.RequestBody),
    responseStatusCode: record.ResponseStatusCode ?? null,
    responseBody: parseJsonPayload(record.ResponseBody),
    exceptionMessage: record.ExceptionMessage || "-"
  };
}

function normalizeHttpMethod(method: string | null | undefined): AuditRequestRow["method"] {
  const normalized = method?.toUpperCase();
  if (normalized === "POST" || normalized === "PUT" || normalized === "DELETE" || normalized === "PATCH") return normalized;
  return "GET";
}

function parseJsonPayload(value: string | null | undefined): unknown {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getMerchantId(record: AuditRequestRow) {
  return record.merchantId;
}

function getUserAgent(record: AuditRequestRow) {
  return record.userAgent;
}

function getController(record: AuditRequestRow) {
  return record.controllerName;
}

function getApiAction(record: AuditRequestRow) {
  return record.actionName;
}

function formatResponseDate(value: string, durationMs: number, responseTime?: string) {
  if (responseTime) return formatAuditDate(responseTime);
  try {
    return format(new Date(parseISO(value).getTime() + durationMs), "dd/MM/yyyy hh:mm:ss a");
  } catch {
    return value;
  }
}

function createRequestBody(record: AuditRequestRow) {
  return record.requestBody;
}

function createResponseBody(record: AuditRequestRow) {
  return record.responseBody;
}

function formatFileUploadDate(value: string) {
  try {
    return format(parseISO(value), "dd/MM/yyyy HH:mm:ss");
  } catch {
    return value;
  }
}

function createEmptyFileUploadFilters(): FileUploadFilters {
  return {
    search: "",
    moduleCode: allFilter,
    uploadType: allFilter,
    scanCode: allFilter,
    dateFrom: "",
    dateTo: ""
  };
}

async function loadFileUploadFilterOptions() {
  const allRecords: FileUploadAuditItem[] = [];
  let optionPage = 1;
  let totalPages = 1;

  do {
    const result = await auditApi.getFileUploadList({
      page: optionPage,
      pageSize: 1000
    });

    allRecords.push(...result.records);
    totalPages = Math.max(1, result.pagination.TotalPages || 1);
    optionPage += 1;
  } while (optionPage <= totalPages);

  return {
    moduleCodes: createDistinctOptions(allRecords.map((record) => record.ModuleCode)),
    uploadTypes: createDistinctOptions(allRecords.map((record) => record.UploadType)),
    scanCodes: createScanCodeOptions(allRecords)
  };
}

function createDistinctOptions(values: Array<string | null | undefined>): SelectOption[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))))
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ value, label: formatDatabaseValueDisplayText(value) }));
}

function createScanCodeOptions(records: FileUploadAuditItem[]): SelectOption[] {
  const options = new Map<string, SelectOption>();

  records.forEach((record) => {
    const value = record.ScanCode?.trim();
    if (!value) return;

    if (!options.has(value)) {
      options.set(value, {
        value,
        label: formatDatabaseValueDisplayText(value)
      });
    }
  });

  return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label));
}

function getScanStatusDisplay(record: FileUploadAuditItem) {
  return record.ScanCode ? formatDatabaseValueDisplayText(record.ScanCode) : record.ScanStatusName || String(record.ScanStatus);
}

function getScanStatusTone(status: number) {
  if (status === 9 || status === 3) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === 0 || status === 1) return "bg-blue-50 text-blue-700 border-blue-100";
  return "bg-red-50 text-red-700 border-red-100";
}

function formatDatabaseValueDisplayText(value: string | null | undefined) {
  if (!value) return "-";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => {
      const upper = part.toUpperCase();
      if (codeDisplayAcronyms.has(upper)) return upper;
      return upper.charAt(0) + upper.slice(1).toLowerCase();
    })
    .join(" ");
}

function formatFileSize(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  if (value < 1024) return `${value.toFixed(0)} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatFileExtension(value: string | null | undefined) {
  if (!value) return "-";
  return value.replace(/^\./, "").toUpperCase();
}

function formatAuditDate(value: string) {
  try {
    return format(parseISO(value), "dd/MM/yyyy hh:mm:ss a");
  } catch {
    return value;
  }
}

function truncateMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  const ellipsis = "...";
  const available = maxLength - ellipsis.length;
  const startLength = Math.ceil(available * 0.58);
  const endLength = available - startLength;

  return `${value.slice(0, startLength)}${ellipsis}${value.slice(-endLength)}`;
}

