import { Calendar, Info, RotateCcw, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { reportApi, type OtpHistoryRecord, type ReportPagination } from "../api/reportApi";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { PageHeader } from "../components/common/PageHeader";
import { Pagination } from "../components/common/Pagination";
import { StatusBadge } from "../components/common/StatusBadge";
import { DatePickerInput } from "../components/forms/DatePickerInput";
import { Button } from "../components/ui/button";
import { notifyError } from "../services/notificationService";

const emptyFilters = { search: "", status: "", dateFrom: "", dateTo: "" };
const inputClass = "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal text-textPrimary focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink";

export function OtpHistoryPage() {
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [records, setRecords] = useState<OtpHistoryRecord[]>([]);
  const [pagination, setPagination] = useState<ReportPagination>({ Page: 1, PageSize: 20, TotalRecords: 0, TotalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    async function loadHistory() {
      try {
        const result = await reportApi.getOtpHistory({
          page, pageSize,
          search: filters.search,
          status: filters.status === "" ? undefined : Number(filters.status),
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo
        });
        if (cancelled) return;
        const lastPage = Math.max(1, result.Pagination.TotalPages);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setRecords(result.Records);
        setPagination(result.Pagination);
      } catch (error) {
        if (cancelled) return;
        setRecords([]);
        setPagination({ Page: page, PageSize: pageSize, TotalRecords: 0, TotalPages: 0 });
        setFailed(true);
        notifyError(error instanceof Error ? error.message : "Unable to load OTP history.", "otp-history-load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadHistory();
    return () => { cancelled = true; };
  }, [filters, page, pageSize]);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.dateFrom && draft.dateTo && draft.dateFrom > draft.dateTo) {
      setValidationError("Date From cannot exceed Date To.");
      return;
    }
    setValidationError("");
    setFilters({ ...draft, search: draft.search.trim() });
    setPage(1);
  }

  return (
    <>
      <PageHeader title="OTP History" description="Review OTP requests and filter by receiver, status, and created date." />
      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <form onSubmit={submitFilters} className="space-y-4 border-b border-line p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.25fr)]">
            <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-textPrimary md:col-span-2 xl:col-span-1">
              Search
              <input className={inputClass} placeholder="Receiver email" value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-textPrimary">
              Status
              <select className={inputClass} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
                <option value="">All</option>
                <option value="0">Active</option>
                <option value="4">Invalidated</option>
              </select>
            </label>
            <div role="group" aria-labelledby="otp-created-date-label" className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-textPrimary">
              <span id="otp-created-date-label">Created Date</span>
              <div className="flex h-11 max-w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-normal text-textPrimary transition focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
                <Calendar className="h-4 w-4 shrink-0 text-textSecondary" />
                <DatePickerInput
                  value={draft.dateFrom}
                  onChange={(value) => setDraft({ ...draft, dateFrom: value })}
                  dialogTitle="Created Date From"
                  placeholder="From"
                  className="min-w-0 flex-1"
                  buttonClassName="h-auto min-w-0 gap-2 border-0 bg-transparent p-0 shadow-none hover:border-0 focus:border-0 focus:ring-0"
                  showIcon={false}
                />
                <span className="shrink-0 text-textSecondary">-</span>
                <DatePickerInput
                  value={draft.dateTo}
                  onChange={(value) => setDraft({ ...draft, dateTo: value })}
                  dialogTitle="Created Date To"
                  placeholder="To"
                  className="min-w-0 flex-1"
                  buttonClassName="h-auto min-w-0 gap-2 border-0 bg-transparent p-0 shadow-none hover:border-0 focus:border-0 focus:ring-0"
                  showIcon={false}
                />
              </div>
            </div>
          </div>
          {validationError && <p role="alert" className="text-sm text-red-600">{validationError}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-gray-50" onClick={() => {
              setDraft(emptyFilters);
              setFilters({ ...emptyFilters });
              setValidationError("");
              setPage(1);
            }}><RotateCcw className="h-4 w-4" />Reset</button>
            <Button type="submit"><Search className="h-4 w-4" />Search</Button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="text-sm font-semibold text-textSecondary">{pagination.TotalRecords} records</div>
          <label className="flex items-center gap-2 text-sm text-textSecondary">
            Rows
            <select
              className="h-9 rounded-lg border border-line bg-white px-3 text-sm text-textPrimary disabled:opacity-60"
              value={pageSize}
              disabled={loading}
              onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>

        {loading ? <div className="p-4"><LoadingSkeleton /></div> : failed ? (
          <div className="p-6"><EmptyState title="Unable to load OTP history" description="Please try searching again." /></div>
        ) : records.length === 0 ? (
          <div className="p-6"><EmptyState title="No OTP history found" description="Adjust the search options or reset the filters." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse text-left text-[13px]">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>{["#", "Created At", "Receiver Address / Type", "Member", "OTP", "Expires At / Updated At", "Status"].map((label) => <th key={label} className="border-b border-line px-4 py-3 font-semibold">{label}</th>)}</tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={record.RowID} className="border-b border-line align-top hover:bg-slate-50 [&>td]:px-4 [&>td]:py-4">
                    <td>{(pagination.Page - 1) * pagination.PageSize + index + 1}</td>
                    <td className="whitespace-nowrap">{formatDateTime(record.CreatedAt)}</td>
                    <td>
                      <div className="break-all font-semibold">{record.ReceiverAddress || "-"}</div>
                      <div className="mt-1 text-textSecondary">{record.Type?.trim().toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "-"}</div>
                    </td>
                    <td>
                      {record.MemberID === 0 ? (
                        <div className="flex max-w-xs items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-blue-800">
                          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                          <div>
                            <div className="font-semibold">Public request</div>
                            <div className="mt-0.5 text-xs leading-5">No linked member account.</div>
                          </div>
                        </div>
                      ) : record.MemberID != null && record.MemberID > 0 ? (
                        <div className="flex max-w-xs items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-800">
                          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                          <div className="min-w-0">
                            <div className="break-words font-semibold">{record.FullName || "-"}</div>
                            <div className="mt-0.5 break-all text-xs leading-5">{record.Email || "-"}</div>
                          </div>
                        </div>
                      ) : (
                        <><div className="font-semibold">{record.FullName || "-"}</div><div className="text-textSecondary">{record.Email || "-"}</div></>
                      )}
                    </td>
                    <td className="font-mono font-semibold">{record.OTPcode ?? record.OTPCode ?? "-"}</td>
                    <td className="whitespace-nowrap">
                      <div><span className="text-textSecondary">Expires: </span>{formatDateTime(record.ExpiredAt)}</div>
                      <div className="mt-1"><span className="text-textSecondary">Updated: </span>{formatDateTime(record.UpdatedAt)}</div>
                    </td>
                    <td>
                      <StatusBadge
                        status={record.Status === 0 ? "Active" : record.Status === 4 ? "Invalidated" : String(record.Status ?? "-")}
                        className={record.Status === 0 ? "bg-green-50 text-green-700" : undefined}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <fieldset disabled={loading} className="min-w-0 disabled:opacity-60">
          <Pagination currentPage={pagination.Page} pageCount={Math.max(1, pagination.TotalPages)} totalRecords={pagination.TotalRecords} pageSize={pagination.PageSize} onPageChange={setPage} />
        </fieldset>
      </section>
    </>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}
