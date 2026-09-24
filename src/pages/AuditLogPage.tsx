import { addDays, format, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { Calendar, ChevronDown, ChevronsUpDown, Copy, Download, Eye, FileText, RotateCcw, Search, Settings, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { PageHeader } from "../components/common/PageHeader";
import { Pagination } from "../components/common/Pagination";
import { DatePickerInput } from "../components/forms/DatePickerInput";
import { auditApi, type AuditPagination, type AuditRequestLogItem } from "../api/auditApi";
import { roles } from "../config/roles";
import { useAuth } from "../hooks/useAuth";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { notifyError, notifySuccess } from "../services/notificationService";

type AuditLogVariant = "request" | "file-upload";
type SortKey = "dateTime" | "requestId" | "user" | "activityTitle" | "method" | "url" | "status" | "durationMs";
type SortDirection = "asc" | "desc";
type FileUploadSortKey = "uploadedAt" | "memberName" | "moduleCode" | "uploadType" | "fileName" | "fileType" | "fileSizeBytes" | "scanStatus";
type FileUploadScanStatus = 0 | 1 | 2 | 3;

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

interface FileUploadAuditRow {
  id: string;
  uploadedAt: string;
  memberName: string;
  memberEmail: string;
  moduleCode: string;
  uploadType: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  fileSizeLabel: string;
  scanStatus: FileUploadScanStatus;
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
  const fileUploadRows = useMemo(() => createFileUploadAuditRows(), []);

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
            {variant === "file-upload" ? fileUploadRows.length : requestPagination.TotalRecords} records
          </span>
        }
      />

      {variant === "file-upload" ? <FileUploadAuditList rows={fileUploadRows} /> : (

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
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-textPrimary">Date Range</span>
      <span className="flex h-11 w-fit max-w-full items-center gap-2 rounded-md border border-line bg-white px-3 text-sm text-textPrimary shadow-sm">
        <Calendar className="h-4 w-4 text-textSecondary" />
        <DatePickerInput value={dateFrom} onChange={onDateFromChange} placeholder="From" buttonClassName="h-auto min-w-0 flex-1 border-0 p-0 shadow-none focus:ring-0" dialogTitle="Date From" showIcon={false} />
        <span className="text-textSecondary">-</span>
        <DatePickerInput value={dateTo} onChange={onDateToChange} placeholder="To" buttonClassName="h-auto min-w-0 flex-1 border-0 p-0 shadow-none focus:ring-0" dialogTitle="Date To" showIcon={false} />
      </span>
    </label>
  );
}

function FileUploadAuditList({ rows }: { rows: FileUploadAuditRow[] }) {
  const [dateFrom, setDateFrom] = useState("2026-09-01");
  const [dateTo, setDateTo] = useState("2026-09-07");
  const [moduleCode, setModuleCode] = useState("All Modules");
  const [uploadType, setUploadType] = useState("All Upload Types");
  const [scanStatus, setScanStatus] = useState("All Scan Status");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<FileUploadSortKey>("uploadedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const moduleOptions = useMemo(() => ["All Modules", ...Array.from(new Set(rows.map((row) => row.moduleCode)))], [rows]);
  const uploadTypeOptions = useMemo(() => ["All Upload Types", ...Array.from(new Set(rows.map((row) => row.uploadType)))], [rows]);
  const scanStatusOptions = ["All Scan Status", "Clean", "Scanning", "Blocked", "Scan Failed"];

  const filteredRows = useMemo(() => {
    const term = search.toLowerCase().trim();
    const from = startOfDay(parseISO(dateFrom));
    const to = addDays(startOfDay(parseISO(dateTo)), 1);

    return rows
      .filter((row) => {
        const uploadedAt = parseISO(row.uploadedAt);
        return isWithinInterval(uploadedAt, { start: from, end: to });
      })
      .filter((row) => moduleCode === "All Modules" || row.moduleCode === moduleCode)
      .filter((row) => uploadType === "All Upload Types" || row.uploadType === uploadType)
      .filter((row) => scanStatus === "All Scan Status" || getScanStatusLabel(row.scanStatus) === scanStatus)
      .filter((row) => {
        if (!term) return true;
        return [row.memberName, row.memberEmail, row.moduleCode, row.uploadType, row.fileName, row.fileType, getScanStatusLabel(row.scanStatus)]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((first, second) => compareFileUploadRows(first, second, sortKey, sortDirection));
  }, [dateFrom, dateTo, moduleCode, rows, scanStatus, search, sortDirection, sortKey, uploadType]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstRecordNumber = filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const applySearch = () => {
    setSearch(searchDraft);
    setPage(1);
  };

  const resetFilters = () => {
    setDateFrom("2026-09-01");
    setDateTo("2026-09-07");
    setModuleCode("All Modules");
    setUploadType("All Upload Types");
    setScanStatus("All Scan Status");
    setSearchDraft("");
    setSearch("");
    setPage(1);
  };

  const sortBy = (key: FileUploadSortKey) => {
    setSortKey(key);
    setSortDirection(sortKey === key && sortDirection === "asc" ? "desc" : "asc");
  };

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="grid gap-4 border-b border-line p-4 xl:grid-cols-[1.2fr_1fr_1.1fr_1fr_1.6fr_auto_auto]">
        <DateRangeField dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
        <SelectField label="Module Code" value={moduleCode} options={moduleOptions} onChange={(value) => { setModuleCode(value); setPage(1); }} />
        <SelectField label="Upload Type" value={uploadType} options={uploadTypeOptions} onChange={(value) => { setUploadType(value); setPage(1); }} />
        <SelectField label="Scan Status" value={scanStatus} options={scanStatusOptions} onChange={(value) => { setScanStatus(value); setPage(1); }} />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-textPrimary">Search</span>
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && applySearch()}
              placeholder="Search member, email, file name..."
              className="h-11 w-full rounded-md border border-line bg-white pl-10 pr-3 text-sm text-textPrimary shadow-sm"
            />
          </span>
        </label>
        <button onClick={applySearch} className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-black">
          <Search className="h-4 w-4" />
          Search
        </button>
        <button onClick={resetFilters} className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-white px-5 text-sm font-semibold text-textSecondary transition hover:border-brandGold hover:text-textPrimary">
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold text-textSecondary">Total Records: {filteredRows.length}</div>
        <div className="flex items-center gap-3">
          <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary transition hover:border-brandGold hover:bg-gray-50">
            <Download className="h-4 w-4 text-brandGold" />
            Export
            <ChevronDown className="h-4 w-4 text-textSecondary" />
          </button>
          <label className="flex items-center gap-2 text-sm text-textSecondary">
            Rows
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-9 rounded-lg border border-line bg-white px-2 text-textPrimary">
              {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>
      </div>

      {pageRows.length === 0 ? (
        <div className="p-6">
          <EmptyState title="No matching file uploads" description="Review the search term or clear active filters." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full text-left text-[13px]">
            <thead className="bg-soft text-xs text-textSecondary">
              <tr>
                <FileUploadHeader label="#" />
                <FileUploadHeader label="Date & Time" sortKey="uploadedAt" activeSortKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <FileUploadHeader label="Member" sortKey="memberName" activeSortKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <FileUploadHeader label="Module Code" sortKey="moduleCode" activeSortKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <FileUploadHeader label="Upload Type" sortKey="uploadType" activeSortKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <FileUploadHeader label="File Name" sortKey="fileName" activeSortKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <FileUploadHeader label="File Type" sortKey="fileType" activeSortKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <FileUploadHeader label="File Size" sortKey="fileSizeBytes" activeSortKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <FileUploadHeader label="Scan Status" sortKey="scanStatus" activeSortKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <FileUploadHeader label="Action" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{firstRecordNumber + index}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textPrimary">{formatFileUploadDate(row.uploadedAt)}</td>
                  <td className="border-b border-line px-4 py-3">
                    <div className="font-semibold text-textPrimary">{row.memberName}</div>
                    <div className="mt-1 text-xs leading-5 text-textSecondary">{row.memberEmail}</div>
                  </td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 font-medium text-textPrimary">{row.moduleCode}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 font-medium text-textPrimary">{row.uploadType}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textPrimary">{row.fileName}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textPrimary">{row.fileType}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textPrimary">{row.fileSizeLabel}</td>
                  <td className="border-b border-line px-4 py-3"><ScanStatusBadge status={row.scanStatus} /></td>
                  <td className="border-b border-line px-4 py-3">
                    <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary transition hover:border-brandGold hover:bg-gray-50">
                      <Eye className="h-4 w-4 text-brandGold" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={currentPage} pageCount={pageCount} totalRecords={filteredRows.length} pageSize={pageSize} onPageChange={setPage} />
    </section>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-textPrimary">{label}</span>
      <span className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full appearance-none rounded-md border border-line bg-white px-3 pr-9 text-sm text-textPrimary shadow-sm">
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
      </span>
    </label>
  );
}

function FileUploadHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort
}: {
  label: string;
  sortKey?: FileUploadSortKey;
  activeSortKey?: FileUploadSortKey;
  direction?: SortDirection;
  onSort?: (key: FileUploadSortKey) => void;
}) {
  const active = sortKey && activeSortKey === sortKey;
  return (
    <th className="border-b border-line px-4 py-3 font-semibold">
      {sortKey && onSort ? (
        <button onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 whitespace-nowrap">
          {label}
          <ChevronsUpDown className={`h-3.5 w-3.5 ${active ? "text-textPrimary" : ""}`} />
        </button>
      ) : (
        label
      )}
    </th>
  );
}

function ScanStatusBadge({ status }: { status: FileUploadScanStatus }) {
  const statusConfig = {
    0: "bg-emerald-50 text-emerald-700 border-emerald-100",
    1: "bg-blue-50 text-blue-700 border-blue-100",
    2: "bg-red-50 text-red-700 border-red-100",
    3: "bg-red-50 text-red-700 border-red-100"
  };

  return (
    <span className={`inline-flex min-w-24 justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold ${statusConfig[status]}`}>
      {getScanStatusLabel(status)}
    </span>
  );
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
function compareFileUploadRows(first: FileUploadAuditRow, second: FileUploadAuditRow, sortKey: FileUploadSortKey, direction: SortDirection) {
  const a = sortKey === "fileSizeBytes" || sortKey === "scanStatus" ? first[sortKey] : String(first[sortKey]);
  const b = sortKey === "fileSizeBytes" || sortKey === "scanStatus" ? second[sortKey] : String(second[sortKey]);
  const result = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
  return direction === "asc" ? result : -result;
}

function getScanStatusLabel(status: FileUploadScanStatus) {
  return status === 0 ? "Clean" : status === 1 ? "Scanning" : status === 2 ? "Blocked" : "Scan Failed";
}

function formatFileUploadDate(value: string) {
  try {
    return format(parseISO(value), "dd/MM/yyyy HH:mm:ss");
  } catch {
    return value;
  }
}

function createFileUploadAuditRows(): FileUploadAuditRow[] {
  const baseRows: FileUploadAuditRow[] = [
    createFileUploadRow("FUA-001", "2026-09-07T17:10:20.000Z", "Alex Tan", "alex@email.com", "PROFILE", "IDENTITY_DOCUMENT", "passport.pdf", ".pdf", "1.20 MB", 0),
    createFileUploadRow("FUA-002", "2026-09-07T16:45:11.000Z", "Jane Lim", "jane@email.com", "ACCOUNT", "PROFILE_PICTURE", "avatar.jpg", ".jpg", "532 KB", 0),
    createFileUploadRow("FUA-003", "2026-09-07T15:22:03.000Z", "Ryan Wong", "ryan@email.com", "TRUST", "TRUST_DEED", "trust_deed.pdf", ".pdf", "2.15 MB", 1),
    createFileUploadRow("FUA-004", "2026-09-07T14:18:37.000Z", "Siti Rahman", "siti@email.com", "KYC", "PROOF_OF_ADDRESS", "utility_bill.pdf", ".pdf", "1.03 MB", 0),
    createFileUploadRow("FUA-005", "2026-09-07T12:05:14.000Z", "David Lee", "david@email.com", "ACCOUNT", "PROFILE_PICTURE", "profile.png", ".png", "432 KB", 2),
    createFileUploadRow("FUA-006", "2026-09-07T10:11:59.000Z", "Emily Chen", "emily@email.com", "WITHDRAWAL", "SUPPORTING_DOCUMENT", "bank_statement.pdf", ".pdf", "3.46 MB", 0),
    createFileUploadRow("FUA-007", "2026-09-06T18:32:27.000Z", "Marcus Teo", "marcus@email.com", "PROFILE", "IDENTITY_DOCUMENT", "ic_front.jpg", ".jpg", "912 KB", 3),
    createFileUploadRow("FUA-008", "2026-09-06T16:21:10.000Z", "Rachel Ng", "rachel@email.com", "KYC", "SELFIE", "selfie.jpg", ".jpg", "680 KB", 0),
    createFileUploadRow("FUA-009", "2026-09-06T11:05:43.000Z", "Daniel Koh", "daniel@email.com", "TRUST", "TRUST_FORM", "form.pdf", ".pdf", "1.88 MB", 0),
    createFileUploadRow("FUA-010", "2026-09-05T09:44:31.000Z", "Olivia Lau", "olivia@email.com", "ACCOUNT", "ADDITIONAL_DOCUMENT", "support_doc.pdf", ".pdf", "2.01 MB", 1)
  ];

  const members = [
    ["Aaron Goh", "aaron@email.com"],
    ["Priya Nair", "priya@email.com"],
    ["Nur Aisyah", "aisyah@email.com"],
    ["Kevin Chua", "kevin@email.com"],
    ["Mei Ling", "meiling@email.com"],
    ["Farid Omar", "farid@email.com"],
    ["Grace Tan", "grace@email.com"],
    ["Hafiz Noor", "hafiz@email.com"],
    ["Irene Lim", "irene@email.com"],
    ["Jason Low", "jason@email.com"]
  ];
  const modules = ["PROFILE", "ACCOUNT", "TRUST", "KYC", "WITHDRAWAL"];
  const uploadTypes = ["IDENTITY_DOCUMENT", "PROFILE_PICTURE", "TRUST_DEED", "PROOF_OF_ADDRESS", "SUPPORTING_DOCUMENT", "SELFIE", "TRUST_FORM", "ADDITIONAL_DOCUMENT"];
  const files = ["identity_card.pdf", "address_proof.pdf", "signature.png", "trust_schedule.pdf", "payment_slip.jpg", "declaration.pdf", "income_proof.pdf", "nominee_ic.jpg"];
  const statuses: FileUploadScanStatus[] = [0, 0, 0, 1, 0, 2, 0, 3];

  for (let index = baseRows.length; index < 45; index += 1) {
    const member = members[index % members.length];
    const file = files[index % files.length];
    const fileType = `.${file.split(".").pop() ?? "pdf"}`;
    const sizeValue = index % 3 === 0 ? `${(1.1 + (index % 9) * 0.27).toFixed(2)} MB` : `${420 + index * 23} KB`;
    const day = 5 - (index % 5);
    const hour = 18 - (index % 10);
    const minute = (index * 7) % 60;
    const second = (index * 11) % 60;

    baseRows.push(
      createFileUploadRow(
        `FUA-${String(index + 1).padStart(3, "0")}`,
        `2026-09-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}.000Z`,
        member[0],
        member[1],
        modules[index % modules.length],
        uploadTypes[index % uploadTypes.length],
        file,
        fileType,
        sizeValue,
        statuses[index % statuses.length]
      )
    );
  }

  return baseRows;
}

function createFileUploadRow(
  id: string,
  uploadedAt: string,
  memberName: string,
  memberEmail: string,
  moduleCode: string,
  uploadType: string,
  fileName: string,
  fileType: string,
  fileSizeLabel: string,
  scanStatus: FileUploadScanStatus
): FileUploadAuditRow {
  return {
    id,
    uploadedAt,
    memberName,
    memberEmail,
    moduleCode,
    uploadType,
    fileName,
    fileType,
    fileSizeBytes: parseFileSize(fileSizeLabel),
    fileSizeLabel,
    scanStatus
  };
}

function parseFileSize(value: string) {
  const [amount, unit] = value.split(" ");
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return 0;
  return unit === "MB" ? parsed * 1024 * 1024 : parsed * 1024;
}

function toTitleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
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

