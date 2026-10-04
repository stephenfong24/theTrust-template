import { Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList, FileText, RotateCcw, Search, UserRound, XCircle } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { auditApi, type AuditPagination, type OpenAiRequestLogItem } from "../api/auditApi";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { PageHeader } from "../components/common/PageHeader";
import { DatePickerInput } from "../components/forms/DatePickerInput";
import { Button } from "../components/ui/button";
import { notifyError } from "../services/notificationService";

const allFilter = "all";
const pageSizeOptions = [10, 20, 50, 100];

interface OpenAiRequestFilters {
  search: string;
  requestType: string;
  source: string;
  model: string;
  isSuccess: string;
  costCalculated: string;
  dateFrom: string;
  dateTo: string;
}

export function OpenAiRequestLogPage() {
  const [records, setRecords] = useState<OpenAiRequestLogItem[]>([]);
  const [pagination, setPagination] = useState<AuditPagination>({ Page: 1, PageSize: 10, TotalRecords: 0, TotalPages: 1 });
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsFailed, setRecordsFailed] = useState(false);
  const [draftFilters, setDraftFilters] = useState<OpenAiRequestFilters>(createEmptyFilters());
  const [filters, setFilters] = useState<OpenAiRequestFilters>(createEmptyFilters());
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let cancelled = false;

    async function loadOpenAiRequests() {
      setRecordsLoading(true);
      setRecordsFailed(false);

      try {
        const result = await auditApi.getOpenAiRequestList({
          page,
          pageSize,
          search: filters.search || undefined,
          requestType: filters.requestType || undefined,
          source: filters.source || undefined,
          model: filters.model || undefined,
          isSuccess: toOptionalBoolean(filters.isSuccess),
          costCalculated: toOptionalBoolean(filters.costCalculated),
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
        notifyError(error instanceof Error ? error.message : "Unable to load OpenAI request log.", "openai-request-log-load");
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    }

    loadOpenAiRequests();

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

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({
      ...draftFilters,
      search: draftFilters.search.trim(),
      requestType: draftFilters.requestType.trim(),
      source: draftFilters.source.trim(),
      model: draftFilters.model.trim()
    });
    setPage(1);
  };

  const resetFilters = () => {
    const empty = createEmptyFilters();
    setDraftFilters(empty);
    setFilters(empty);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="OpenAI Request Log"
        description="Review OpenAI request usage, token costs, response status, and source details."
        actions={
          <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-textPrimary">
            <CircleDollarSign className="h-4 w-4 text-brandGold" />
            {pagination.TotalRecords} records
          </span>
        }
      />

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line p-4">
          <form onSubmit={submitFilters} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <SearchField
                label="Search"
                value={draftFilters.search}
                placeholder="Response ID, member, source or model"
                className="md:col-span-2"
                onChange={(value) => setDraftFilters((current) => ({ ...current, search: value }))}
              />
              <SearchField
                label="Request Type"
                value={draftFilters.requestType}
                placeholder="Request type"
                onChange={(value) => setDraftFilters((current) => ({ ...current, requestType: value }))}
              />
              <SearchField
                label="Source"
                value={draftFilters.source}
                placeholder="Source"
                onChange={(value) => setDraftFilters((current) => ({ ...current, source: value }))}
              />
              <SearchField
                label="Model"
                value={draftFilters.model}
                placeholder="Model"
                onChange={(value) => setDraftFilters((current) => ({ ...current, model: value }))}
              />
              <DateRangeField
                label="Created Date"
                dateFrom={draftFilters.dateFrom}
                dateTo={draftFilters.dateTo}
                onDateFromChange={(value) => setDraftFilters((current) => ({ ...current, dateFrom: value }))}
                onDateToChange={(value) => setDraftFilters((current) => ({ ...current, dateTo: value }))}
              />
              <FilterSelect
                label="Success"
                value={draftFilters.isSuccess}
                options={[
                  { value: allFilter, label: "All" },
                  { value: "true", label: "Success" },
                  { value: "false", label: "Failed" }
                ]}
                onChange={(value) => setDraftFilters((current) => ({ ...current, isSuccess: value }))}
              />
              <FilterSelect
                label="Cost"
                value={draftFilters.costCalculated}
                options={[
                  { value: allFilter, label: "All" },
                  { value: "true", label: "Calculated" },
                  { value: "false", label: "Not Calculated" }
                ]}
                onChange={(value) => setDraftFilters((current) => ({ ...current, costCalculated: value }))}
              />
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={resetFilters} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-textPrimary transition hover:bg-gray-50 sm:min-w-28">
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <Button type="submit" className="sm:min-w-28">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </form>
        </div>

        {recordsFailed ? (
          <div className="p-6">
            <EmptyState title="Unable to load OpenAI request logs" description="Please try again or adjust the active filters." />
          </div>
        ) : recordsLoading ? (
          <div className="p-4">
            <LoadingSkeleton />
          </div>
        ) : records.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No OpenAI request logs found" description="Review the search options or clear active filters." />
          </div>
        ) : (
          <div className="overflow-x-auto p-0">
            <table className="min-w-[1220px] w-full border-separate border-spacing-0 text-left text-[13px]">
              <thead className="bg-gradient-to-b from-white to-[#F8FAFC] text-xs uppercase text-slate-600">
                <tr>
                  <TableHead className="w-[70px]">#</TableHead>
                  <TableHead className="w-[210px]">Date & Time</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead className="w-[190px]">Cost (USD)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[110px] text-right">Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => {
                  const expanded = expandedRowId === record.RowID;

                  return (
                    <OpenAiRequestRows
                      key={record.RowID}
                      record={record}
                      recordNumber={firstRecordNumber + index}
                      expanded={expanded}
                      onToggle={() => setExpandedRowId((current) => (current === record.RowID ? null : record.RowID))}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <OpenAiTableFooter
          currentPage={currentPage}
          pageCount={pageCount}
          totalRecords={pagination.TotalRecords}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      </section>
    </>
  );
}

function OpenAiRequestRows({
  record,
  recordNumber,
  expanded,
  onToggle
}: {
  record: OpenAiRequestLogItem;
  recordNumber: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="bg-white transition hover:bg-slate-50">
        <TableCell className="font-semibold text-textPrimary">{recordNumber}</TableCell>
        <TableCell>
          <TwoLine primary={formatDateTime(record.CreatedAt)} secondary={record.DurationDisplay || formatDuration(record.DurationMs)} />
        </TableCell>
        <TableCell>
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <FileText className="h-5 w-5" />
            </span>
            <TwoLine primary={formatCodeLabel(record.RequestType)} secondary={record.Source || "-"} />
          </div>
        </TableCell>
        <TableCell>
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
              {getMemberInitial(record)}
            </span>
            <TwoLine primary={record.MemberName || "-"} secondary={record.MemberEmail || record.MemberUsername || "-"} />
          </div>
        </TableCell>
        <TableCell>
          <TwoLine primary={`${formatNumber(record.TotalTokens)} tokens`} secondary={`Input ${formatNumber(record.InputTokens)} · Output ${formatNumber(record.OutputTokens)}`} />
        </TableCell>
        <TableCell>
          <TwoLine primary={formatUsdPlain(record.TotalCostUSD)} secondary={`Model ${record.Model || "-"}`} />
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap items-center gap-2">
            <SuccessBadge success={record.IsSuccess} />
          </div>
        </TableCell>
        <TableCell className="text-right">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-900 transition hover:bg-blue-50"
            aria-label={expanded ? "Collapse OpenAI request details" : "Expand OpenAI request details"}
          >
            {expanded ? <ChevronDown className="h-5 w-5 rotate-180" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </TableCell>
      </tr>
      {expanded ? (
        <tr className="bg-white">
          <td colSpan={8} className="border-b border-line px-4 py-4">
            <OpenAiRequestDetails record={record} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function OpenAiRequestDetails({ record }: { record: OpenAiRequestLogItem }) {
  return (
    <section className="grid gap-2.5 rounded-lg bg-white p-2.5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]">
      <div className="grid gap-2.5 xl:grid-cols-[max-content_minmax(0,1fr)]">
        <DetailCard title="Token Usage" icon={<ClipboardList className="h-4 w-4" />} iconClassName="bg-blue-100 text-blue-700" className="xl:w-fit xl:max-w-full">
          <div className="flex flex-wrap items-start gap-x-16 gap-y-2">
            <Metric label="Input" value={formatNumber(record.InputTokens)} />
            <Metric label="Cached" value={formatNumber(record.CachedInputTokens)} />
            <Metric label="Output" value={formatNumber(record.OutputTokens)} />
            <Metric label="Reasoning" value={formatNumber(record.ReasoningTokens)} />
            <Metric label="Total" value={formatNumber(record.TotalTokens)} />
          </div>
        </DetailCard>

        <DetailCard title="Cost (USD)" icon={<CircleDollarSign className="h-4 w-4" />} iconClassName="bg-emerald-100 text-emerald-700">
          <div className="grid grid-cols-4 gap-2">
            <Metric label="Input" value={formatUsdPlain(record.InputCostUSD)} />
            <Metric label="Cached" value={formatUsdPlain(record.CachedInputCostUSD)} />
            <Metric label="Output" value={formatUsdPlain(record.OutputCostUSD)} />
            <Metric label="Total" value={formatUsdPlain(record.TotalCostUSD)} />
          </div>
        </DetailCard>
      </div>

      <div className="grid items-stretch gap-2.5 xl:grid-cols-[max-content_minmax(190px,0.52fr)_minmax(0,1fr)]">
        <DetailCard title="Request Details" icon={<ClipboardList className="h-4 w-4" />} iconClassName="bg-orange-100 text-orange-600" className="xl:w-[520px] xl:max-w-full">
          <InfoGrid
            columns="grid-cols-3"
            items={[
              ["Source", record.Source || "-"],
              ["HTTP Status", record.HttpStatusCode ?? "-"],
              ["Duration", record.DurationDisplay || formatDuration(record.DurationMs)]
            ]}
          />
        </DetailCard>

        <DetailCard title="Additional Information" icon={<FileText className="h-4 w-4" />} iconClassName="bg-violet-100 text-violet-600">
          <InfoGrid
            columns="grid-cols-1"
            items={[
              ["Image Size", `${record.ImageSizeDisplay || formatFileSize(record.ImageSizeBytes)}${record.ImageSizeBytes ? ` (${formatNumber(record.ImageSizeBytes)} bytes)` : ""}`]
            ]}
          />
        </DetailCard>

        <DetailCard title="Member Information" icon={<UserRound className="h-4 w-4" />} iconClassName="bg-blue-100 text-blue-700">
          <InfoGrid
            columns="grid-cols-2"
            items={[
              ["Name", record.MemberName || "-"],
              ["Email", record.MemberEmail || record.MemberUsername || "-"]
            ]}
          />
        </DetailCard>
      </div>

      {record.ErrorMessage ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{record.ErrorMessage}</div>
      ) : null}
    </section>
  );
}

function SearchField({
  label,
  value,
  placeholder,
  className = "",
  onChange
}: {
  label: string;
  value: string;
  placeholder: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`block text-sm font-semibold text-textPrimary ${className}`}>
      {label}
      <span className="relative mt-1 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
        />
      </span>
    </label>
  );
}

function DateRangeField({
  label,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange
}: {
  label: string;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-textPrimary">
      {label}
      <span className="flex h-11 max-w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-textPrimary transition focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
        <Calendar className="h-4 w-4 shrink-0 text-textSecondary" />
        <DatePickerInput
          value={dateFrom}
          onChange={onDateFromChange}
          placeholder="From"
          className="min-w-0 flex-1"
          buttonClassName="h-auto min-w-0 gap-2 border-0 bg-transparent p-0 shadow-none hover:border-0 focus:border-0 focus:ring-0"
          dialogTitle={`${label} From`}
          showIcon={false}
        />
        <span className="shrink-0 text-textSecondary">-</span>
        <DatePickerInput
          value={dateTo}
          onChange={onDateToChange}
          placeholder="To"
          className="min-w-0 flex-1"
          buttonClassName="h-auto min-w-0 gap-2 border-0 bg-transparent p-0 shadow-none hover:border-0 focus:border-0 focus:ring-0"
          dialogTitle={`${label} To`}
          showIcon={false}
        />
      </span>
    </label>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-textPrimary">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function TableHead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap border-b border-line px-3 py-3 font-bold ${className}`}>{children}</th>;
}

function TableCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap border-b border-line px-3 py-3.5 text-textSecondary ${className}`}>{children}</td>;
}

function TwoLine({ primary, secondary }: { primary: ReactNode; secondary: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-semibold text-textPrimary">{primary}</div>
      <div className="mt-1 truncate text-xs text-textSecondary">{secondary}</div>
    </div>
  );
}

function DetailCard({
  title,
  icon,
  iconClassName,
  children,
  className = ""
}: {
  title: string;
  icon: ReactNode;
  iconClassName: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-md bg-slate-50/70 p-3 ${className}`}>
      <div className="mb-2.5 flex items-center gap-2 text-sm font-bold text-textPrimary">
        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md [&_svg]:h-3.5 [&_svg]:w-3.5 ${iconClassName}`}>{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function InfoGrid({ columns, items }: { columns: string; items: Array<[string, ReactNode]> }) {
  return (
    <div className={`grid ${columns} gap-2`}>
      {items.map(([label, value], index) => (
        <div key={label} className={`min-w-0 ${index > 0 ? "border-l border-slate-200 pl-3" : ""}`}>
          <div className="truncate text-xs font-medium text-textSecondary">{label}</div>
          <div className="mt-0.5 truncate text-sm font-semibold leading-5 text-textPrimary" title={typeof value === "string" ? value : undefined}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-xs font-medium text-textSecondary">{label}</div>
      <div className="mt-0.5 truncate text-sm font-bold leading-5 text-textPrimary">{value}</div>
    </div>
  );
}

function OpenAiTableFooter({
  currentPage,
  pageCount,
  totalRecords,
  pageSize,
  onPageChange,
  onPageSizeChange
}: {
  currentPage: number;
  pageCount: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const firstRecordNumber = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRecordNumber = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="flex flex-col gap-4 border-t border-line p-4 text-sm text-textSecondary lg:flex-row lg:items-center lg:justify-between">
      <div>Showing {firstRecordNumber} to {lastRecordNumber} of {totalRecords} records</div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          Rows per page
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="h-10 rounded-lg border border-line bg-white px-3 text-textPrimary">
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <button type="button" disabled={currentPage === 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-blue-900 transition hover:bg-blue-50 disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-blue-600 px-4 font-bold text-white shadow-sm">{currentPage}</span>
        <button type="button" disabled={currentPage === pageCount} onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-blue-900 transition hover:bg-blue-50 disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SuccessBadge({ success }: { success: boolean }) {
  return success ? (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Success
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
      <XCircle className="h-3.5 w-3.5" />
      Failed
    </span>
  );
}

function createEmptyFilters(): OpenAiRequestFilters {
  return {
    search: "",
    requestType: "",
    source: "",
    model: "",
    isSuccess: allFilter,
    costCalculated: allFilter,
    dateFrom: "",
    dateTo: ""
  };
}

function toOptionalBoolean(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.getDate()} ${monthShort(date)} ${date.getFullYear()}, ${formatClock(date)}`;
}

function formatDateTimeWithSeconds(value?: string | null) {
  if (!value) return "-";

  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.getDate()} ${monthShort(date)} ${date.getFullYear()}, ${formatClock(date, true)}`;
}

function formatDuration(value?: number | null) {
  if (value === null || value === undefined) return "-";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(2)} sec`;
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("en-MY").format(Number(value ?? 0));
}

function formatUsdPlain(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(8)}`;
}

function formatFileSize(value?: number | null) {
  if (value === null || value === undefined) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatCodeLabel(value?: string | null) {
  if (!value) return "-";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getMemberInitial(record: OpenAiRequestLogItem) {
  const value = record.MemberName || record.MemberUsername || record.MemberEmail || "T";
  return value.trim().charAt(0).toUpperCase() || "T";
}

function parseApiDate(value: string) {
  return new Date(value.includes("T") ? value : value.replace(" ", "T"));
}

function monthShort(date: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
  return months[date.getMonth()];
}

function formatClock(date: Date, includeSeconds = false) {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const hour12 = hours % 12 || 12;
  const meridiem = hours >= 12 ? "pm" : "am";
  return `${String(hour12).padStart(2, "0")}:${minutes}${includeSeconds ? `:${seconds}` : ""} ${meridiem}`;
}

