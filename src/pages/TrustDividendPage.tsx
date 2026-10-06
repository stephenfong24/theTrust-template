import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Ban, Building2, Calendar, CalendarDays, Check, CheckCircle2, Clock3, Coins, Copy, Eye, FileText, Flag, Info, Landmark, RotateCcw, Search, User, X } from "lucide-react";
import { trustDividendApi, type TrustDividendDetail, type TrustDividendListItem, type TrustDividendReturnOption, type TrustDividendSortBy, type TrustDividendSortDirection, type TrustDividendStatistic, type TrustDividendStatus } from "../api/trustDividendApi";
import { trustPlanApi, type TrustProductListItem } from "../api/trustPlanApi";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { PageHeader } from "../components/common/PageHeader";
import { Pagination } from "../components/common/Pagination";
import { StatusBadge } from "../components/common/StatusBadge";
import { DatePickerInput } from "../components/forms/DatePickerInput";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { notifyError, notifySuccess } from "../services/notificationService";
import type { RoleId } from "../types";

const allFilter = "ALL";
const pageSizeOptions = [10, 20, 50, 100];
const processRoles: RoleId[] = ["AC", "AD", "SA"];

const emptyStatistics: TrustDividendStatistic = {
  Total: 0,
  Scheduled: 0,
  Due: 0,
  Paid: 0,
  Cancelled: 0,
  TotalAmount: 0,
  ScheduledAmount: 0,
  DueAmount: 0,
  PaidAmount: 0,
  CancelledAmount: 0
};

const statisticItems: Array<{ label: string; countKey: keyof TrustDividendStatistic; amountKey: keyof TrustDividendStatistic; tone?: "warning" | "success" | "danger" }> = [
  { label: "Total", countKey: "Total", amountKey: "TotalAmount" },
  { label: "Scheduled", countKey: "Scheduled", amountKey: "ScheduledAmount" },
  { label: "Due", countKey: "Due", amountKey: "DueAmount", tone: "warning" },
  { label: "Paid", countKey: "Paid", amountKey: "PaidAmount", tone: "success" },
  { label: "Cancelled", countKey: "Cancelled", amountKey: "CancelledAmount", tone: "danger" }
];

const statusOptions: Array<{ value: typeof allFilter | TrustDividendStatus; label: string }> = [
  { value: allFilter, label: "All statuses" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "DUE", label: "Due" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "VOIDED", label: "Voided" }
];

const returnOptionOptions: Array<{ value: typeof allFilter | TrustDividendReturnOption; label: string }> = [
  { value: allFilter, label: "All return options" },
  { value: "REDEPOSIT_AS_TRUST_ASSET", label: "Redeposit" },
  { value: "TRANSFER_TO_BANK", label: "Withdraw" }
];

const sortOptions: Array<{ value: TrustDividendSortBy; label: string }> = [
  { value: "FINANCE_PRIORITY", label: "Finance Priority" },
  { value: "PAYOUT_DATE", label: "Payout Date" },
  { value: "TRUST_ID", label: "Trust ID" },
  { value: "SETTLOR_NAME", label: "Settlor Name" },
  { value: "DIVIDEND_AMOUNT", label: "Dividend Amount" },
  { value: "STATUS", label: "Status" }
];

interface DividendFilters {
  search: string;
  status: typeof allFilter | TrustDividendStatus;
  productCode: string;
  returnOption: typeof allFilter | TrustDividendReturnOption;
  payoutDateFrom: string;
  payoutDateTo: string;
  sortBy: TrustDividendSortBy;
  sortDirection: TrustDividendSortDirection;
}

interface PaginationState {
  Page: number;
  PageSize: number;
  TotalRecords: number;
  TotalPages: number;
}

export function TrustDividendPage() {
  const { session } = useAuth();
  const [records, setRecords] = useState<TrustDividendListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({ Page: 1, PageSize: 10, TotalRecords: 0, TotalPages: 1 });
  const [totalStatistics, setTotalStatistics] = useState<TrustDividendStatistic>(emptyStatistics);
  const [searchStatistics, setSearchStatistics] = useState<TrustDividendStatistic>(emptyStatistics);
  const [productOptions, setProductOptions] = useState<TrustProductListItem[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState<DividendFilters>(createEmptyFilters());
  const [filters, setFilters] = useState<DividendFilters>(createEmptyFilters());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hasSearched, setHasSearched] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewTarget, setViewTarget] = useState<TrustDividendListItem | null>(null);
  const [processTarget, setProcessTarget] = useState<TrustDividendListItem | null>(null);
  const canProcessDividend = Boolean(session?.role && processRoles.includes(session.role));

  useEffect(() => {
    let cancelled = false;

    trustPlanApi
      .getTrustProductList({ Page: 1, PageSize: 100, Status: "ACTIVE" })
      .then((result) => {
        if (!cancelled) setProductOptions(Array.isArray(result.Records) ? result.Records : []);
      })
      .catch(() => {
        if (!cancelled) setProductOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDividends() {
      setRecordsLoading(true);
      try {
        const result = await trustDividendApi.getDividendList({
          page,
          pageSize,
          search: filters.search || undefined,
          status: filters.status === allFilter ? undefined : filters.status,
          productCode: filters.productCode === allFilter ? undefined : filters.productCode,
          returnOption: filters.returnOption === allFilter ? undefined : filters.returnOption,
          payoutDateFrom: filters.payoutDateFrom || undefined,
          payoutDateTo: filters.payoutDateTo || undefined,
          sortBy: filters.sortBy,
          sortDirection: filters.sortDirection
        });

        if (cancelled) return;
        setRecords(result.records);
        setPagination({
          Page: result.pagination.Page,
          PageSize: result.pagination.PageSize,
          TotalRecords: result.pagination.TotalRecords,
          TotalPages: Math.max(1, result.pagination.TotalPages)
        });
        setTotalStatistics(result.totalStatistics);
        setSearchStatistics(result.searchStatistics);
      } catch (error) {
        if (cancelled) return;
        setRecords([]);
        setPagination({ Page: page, PageSize: pageSize, TotalRecords: 0, TotalPages: 1 });
        setTotalStatistics(emptyStatistics);
        setSearchStatistics(emptyStatistics);
        notifyError(error instanceof Error ? error.message : "Unable to load trust dividend list.", "trust-dividend-list-load");
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    }

    loadDividends();

    return () => {
      cancelled = true;
    };
  }, [filters, page, pageSize, refreshKey]);

  const pageCount = Math.max(1, pagination.TotalPages);

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({
      ...draftFilters,
      search: draftFilters.search.trim()
    });
    setHasSearched(true);
    setPage(1);
  };

  const resetFilters = () => {
    const empty = createEmptyFilters();
    setDraftFilters(empty);
    setFilters(empty);
    setHasSearched(false);
    setPage(1);
  };

  const handleProcessed = () => {
    setProcessTarget(null);
    setRefreshKey((current) => current + 1);
  };

  return (
    <>
      <PageHeader
        title="Trust Dividend"
        description="Review dividend schedules, payout instructions, and finance processing status for trust applications."
      />

      <TotalStatistics statistics={totalStatistics} loading={recordsLoading} />

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line p-4">
          <form onSubmit={submitFilters} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
              <SearchField
                label="Search"
                value={draftFilters.search}
                placeholder="Trust no, settlor, IC, bank"
                className="md:col-span-2 xl:col-span-4"
                onChange={(value) => setDraftFilters((current) => ({ ...current, search: value }))}
              />
              <ProductSelect
                value={draftFilters.productCode}
                options={productOptions}
                onChange={(value) => setDraftFilters((current) => ({ ...current, productCode: value }))}
              />
              <FilterSelect
                label="Status"
                value={draftFilters.status}
                options={statusOptions}
                onChange={(value) => setDraftFilters((current) => ({ ...current, status: value as DividendFilters["status"] }))}
              />
              <FilterSelect
                label="Return Option"
                value={draftFilters.returnOption}
                options={returnOptionOptions}
                onChange={(value) => setDraftFilters((current) => ({ ...current, returnOption: value as DividendFilters["returnOption"] }))}
              />
              <FilterSelect
                label="Sort By"
                value={draftFilters.sortBy}
                options={sortOptions}
                onChange={(value) => setDraftFilters((current) => ({ ...current, sortBy: value as TrustDividendSortBy }))}
              />
              <FilterSelect
                label="Direction"
                value={draftFilters.sortDirection}
                options={[
                  { value: "ASC", label: "Ascending" },
                  { value: "DESC", label: "Descending" }
                ]}
                onChange={(value) => setDraftFilters((current) => ({ ...current, sortDirection: value as TrustDividendSortDirection }))}
              />
              <DateRangeField
                label="Payout Date"
                dateFrom={draftFilters.payoutDateFrom}
                dateTo={draftFilters.payoutDateTo}
                className="md:col-span-2 xl:col-span-2"
                onDateFromChange={(value) => setDraftFilters((current) => ({ ...current, payoutDateFrom: value }))}
                onDateToChange={(value) => setDraftFilters((current) => ({ ...current, payoutDateTo: value }))}
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
          {hasSearched ? <SearchStatistics statistics={searchStatistics} loading={recordsLoading} /> : null}
        </div>

        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-textSecondary">{pagination.TotalRecords} dividend records</div>
          <label className="flex items-center gap-2 text-sm text-textSecondary">
            Rows
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-9 rounded-lg border border-line bg-white px-2 text-textPrimary"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        </div>

        {recordsLoading ? (
          <div className="p-4">
            <LoadingSkeleton />
          </div>
        ) : records.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No trust dividends found" description="Adjust the filters and search again." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full text-left text-sm">
              <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
                <tr>
                  <TableHead>No.</TableHead>
                  <TableHead>Dividend</TableHead>
                  <TableHead>Settlor</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Return</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <DividendRecordRow
                    key={record.DividendScheduleID}
                    record={record}
                    rowNumber={(page - 1) * pageSize + index + 1}
                    canProcessDividend={canProcessDividend}
                    onView={() => setViewTarget(record)}
                    onProcess={() => setProcessTarget(record)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination currentPage={page} pageCount={pageCount} totalRecords={pagination.TotalRecords} pageSize={pageSize} itemLabel="dividend records" onPageChange={setPage} />
      </section>

      <DividendDetailDrawer record={viewTarget} onClose={() => setViewTarget(null)} />
      <DividendProcessModal record={processTarget} onClose={() => setProcessTarget(null)} onProcessed={handleProcessed} />
    </>
  );
}

function DividendRecordRow({
  record,
  rowNumber,
  canProcessDividend,
  onView,
  onProcess
}: {
  record: TrustDividendListItem;
  rowNumber: number;
  canProcessDividend: boolean;
  onView: () => void;
  onProcess: () => void;
}) {
  const canProcess = canProcessDividend && record.CanProcess;

  return (
    <tr className="align-top transition hover:bg-gray-50">
      <TableCell className="w-16 font-semibold text-textSecondary">{rowNumber}</TableCell>
      <TableCell>
        <DividendCell record={record} />
      </TableCell>
      <TableCell>
        <TwoLine primary={record.SettlorName || "-"} secondary={record.SettlorIdentityNo || "-"} />
      </TableCell>
      <TableCell>
        <ScheduleCell record={record} />
      </TableCell>
      <TableCell>
        <ReturnCell returnOption={record.ReturnOption} payoutFrequency={record.PayoutFrequency} />
      </TableCell>
      <TableCell>
        <AmountWithPlacement amount={record.DividendAmount} calculationBasisAmount={record.CalculationBasisAmount} />
      </TableCell>
      <TableCell>
        <TwoLine primary={record.SettlorBankNameDetail || record.SettlorBankName || "-"} secondary={record.SettlorBankAccountNumber || record.SettlorBankAccountHolder || "-"} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="icon" onClick={onView} aria-label={`View dividend ${record.TrustNo || formatTrustNo(record.TrustID)}`} title="View dividend">
            <Eye className="h-4 w-4" />
          </Button>
          {canProcessDividend ? (
            <Button type="button" size="icon" disabled={!canProcess} onClick={onProcess} aria-label={`Process dividend ${record.TrustNo || formatTrustNo(record.TrustID)}`} title={canProcess ? "Process dividend" : "This dividend cannot be processed"}>
              <Check className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </TableCell>
    </tr>
  );
}

function DividendCell({ record }: { record: TrustDividendListItem }) {
  return (
    <div className="min-w-0">
      <div className="flex max-w-64 items-center gap-2">
        <span className="truncate text-sm font-semibold leading-5 text-textPrimary">{record.TrustNo || formatTrustNo(record.TrustID)}</span>
        <StatusBadge status={formatStatus(record.Status)} />
      </div>
      <div className="mt-0.5 max-w-64 truncate text-sm font-normal leading-5 text-textSecondary">{record.ProductName || record.ProductCode || "-"}</div>
    </div>
  );
}

function ReturnCell({ returnOption, payoutFrequency }: { returnOption?: string | null; payoutFrequency?: string | null }) {
  return (
    <div className="min-w-0">
      <div className="max-w-64 truncate text-sm font-semibold leading-5 text-textPrimary">{formatReturnOption(returnOption)}</div>
      <div className="mt-1">
        <PayoutFrequencyBadge value={payoutFrequency} />
      </div>
    </div>
  );
}

function PayoutFrequencyBadge({ value }: { value?: string | null }) {
  return <span className="inline-flex items-center rounded-lg bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">{formatPayoutFrequency(value)}</span>;
}

function ScheduleCell({ record }: { record: TrustDividendListItem }) {
  return (
    <div className="min-w-max whitespace-nowrap">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold leading-5 text-textPrimary">{formatDate(record.PayoutDate)}</span>
        <RateBadge label="PA" value={record.AnnualRate} tone="annual" />
        <RateBadge label="Rate" value={record.PeriodRate} tone="period" />
      </div>
      <div className="mt-0.5 text-sm font-normal leading-5 text-textSecondary">{`Schedule ${record.ScheduleNo || "-"} / Year ${record.ReturnYear || "-"} / Period ${record.PeriodNo || "-"}`}</div>
    </div>
  );
}

function AmountWithPlacement({
  amount,
  calculationBasisAmount
}: {
  amount: number;
  calculationBasisAmount?: number | null;
}) {
  return (
    <div className="min-w-0">
      <div className="max-w-64 truncate text-sm font-semibold leading-5 text-textPrimary">{formatCurrency(amount)}</div>
      <div className="mt-1 max-w-64 truncate text-xs font-semibold leading-4 text-textSecondary">Placement: {formatCurrency(calculationBasisAmount)}</div>
    </div>
  );
}

function RateBadge({ label, value, tone }: { label: string; value?: number | null; tone: "annual" | "period" }) {
  const toneClass = tone === "annual" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700";
  return <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-bold ${toneClass}`}>{label}: {formatRate(value)}</span>;
}

function DividendDetailDrawer({ record, onClose }: { record: TrustDividendListItem | null; onClose: () => void }) {
  const [detail, setDetail] = useState<TrustDividendDetail | null>(null);
  const [loading, setLoading] = useState(false);
  useBodyScrollLock(Boolean(record));

  useEffect(() => {
    if (!record) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    trustDividendApi
      .getDividendDetail(record.DividendScheduleID)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((error) => {
        if (!cancelled) notifyError(error instanceof Error ? error.message : "Unable to load dividend detail.", "trust-dividend-detail-load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [record]);

  if (!record) return null;

  const current = detail ?? record;
  const isRedeposit = normalizeReturnOption(current.ReturnOption) === "REDEPOSIT_AS_TRUST_ASSET";
  const periodLabel = formatDateRange(readDetail(current, "PeriodStartDate"), readDetail(current, "PeriodEndDate"));
  const scheduleLabel = `Schedule ${current.ScheduleNo || "-"} / Year ${current.ReturnYear || "-"} / Period ${current.PeriodNo || "-"}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45" role="dialog" aria-modal="true">
      <div className="flex h-full w-full max-w-[920px] flex-col overflow-hidden border-l border-brandGold/30 bg-white shadow-[0_28px_80px_rgba(17,17,17,0.28)]">
        <div className="border-b border-line bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-textSecondary">Trust Dividend</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h2 className="truncate text-2xl font-bold leading-7 text-ink">{current.TrustNo || formatTrustNo(current.TrustID)}</h2>
                <StatusBadge status={formatStatus(current.Status)} />
                <span className="inline-flex rounded-lg bg-[#FFF8E1] px-3 py-1 text-xs font-semibold text-ink">{formatReturnOption(current.ReturnOption)}</span>
              </div>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-textSecondary transition hover:bg-soft hover:text-textPrimary" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white p-5">
          {loading ? <LoadingSkeleton /> : null}
          {!loading ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <HeroMetric
                  icon={CalendarDays}
                  label="Payout Date"
                  value={formatDate(current.PayoutDate)}
                  subValue={`Period: ${periodLabel}`}
                />
                <HeroMetric
                  icon={Coins}
                  label="Dividend Amount"
                  value={formatCurrency(current.DividendAmount || readNumber(current, "TotalReturnAmount"))}
                  subValue={scheduleLabel}
                  valueClassName="text-[#9A6A00]"
                />
              </div>

              <PaymentInstructionPanel record={current} isRedeposit={isRedeposit} />

              <DrawerSection title="Dividend Details" icon={FileText}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
                  <StackedValueGrid
                    items={[
                      ["Trust Plan", current.ProductName || current.ProductCode],
                      ["Period", periodLabel],
                      ["Payout Date", formatDate(current.PayoutDate)],
                      ["Payout Frequency", formatPayoutFrequency(current.PayoutFrequency)],
                      ["Trust Asset Amount", formatCurrency(readNumber(current, "TrustAssetAmount"))]
                    ]}
                  />
                  <CalculationCard
                    items={[
                      ["Calculation Basis", formatCurrency(current.CalculationBasisAmount)],
                      ["Annual Rate", formatRate(current.AnnualRate)],
                      ["Period Rate", formatRate(current.PeriodRate)],
                      ["Base Dividend", formatCurrency(readNumber(current, "BaseDividendAmount") || current.DividendAmount)],
                      ["Bonus Amount", formatCurrency(readNumber(current, "BonusAmount"))]
                    ]}
                    totalLabel="Total Dividend"
                    totalValue={formatCurrency(current.DividendAmount || readNumber(current, "TotalReturnAmount"))}
                  />
                </div>
              </DrawerSection>

              <DrawerSection title="Settlor Information" icon={User}>
                <KeyValueGrid
                  columns="md:grid-cols-2"
                  items={[
                    ["Name", current.SettlorName],
                    ["Contact No.", readDetail(current, "SettlorContactNo")],
                    ["NRIC No.", current.SettlorIdentityNo],
                    ["Email", readDetail(current, "SettlorEmail")]
                  ]}
                />
              </DrawerSection>

              <DrawerSection title="Settlor Bank Information" icon={Landmark}>
                <div className="rounded-lg bg-soft px-4 py-3">
                  <KeyValueGrid
                    columns="md:grid-cols-2"
                    items={[
                      ["Bank Name", current.SettlorBankNameDetail || current.SettlorBankName],
                      ["Account Holder", current.SettlorBankAccountHolder],
                      ["Account No.", current.SettlorBankAccountNumber],
                      ["SWIFT Code", readDetail(current, "SettlorSwiftCode")],
                      ["Bank Address", readDetail(current, "SettlorBankAddress")]
                    ]}
                  />
                </div>
              </DrawerSection>

              <DrawerSection title="Status & History" icon={Clock3}>
                <StatusHistoryTimeline record={current} isRedeposit={isRedeposit} />
              </DrawerSection>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DividendProcessModal({ record, onClose, onProcessed }: { record: TrustDividendListItem | null; onClose: () => void; onProcessed: () => void }) {
  const [status, setStatus] = useState<"PAID" | "CANCELLED">("PAID");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useBodyScrollLock(Boolean(record));

  useEffect(() => {
    if (!record) return;
    setStatus(record.CanMarkPaid ? "PAID" : "CANCELLED");
    setRemark("");
  }, [record]);

  const submitProcess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!record) return;

    setSubmitting(true);
    try {
      await trustDividendApi.updateDividendStatus(record.DividendScheduleID, { Status: status, Remark: remark.trim() || undefined });
      notifySuccess("Dividend status updated successfully.", "trust-dividend-process");
      onProcessed();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to process dividend.", "trust-dividend-process-error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!record) return null;

  const amount = record.PayoutAmount || record.RedepositAmount || record.DividendAmount;
  const bankName = record.SettlorBankNameDetail || record.SettlorBankName || "-";
  const bankDetail = record.SettlorBankNameDetail || "-";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-brandGold/40 bg-white shadow-[0_28px_80px_rgba(17,17,17,0.28)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brandGold">
        <form onSubmit={submitProcess} className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-xl font-bold leading-7 text-textPrimary">Process Dividend</h2>
              <p className="mt-1 text-sm leading-5 text-textSecondary">Review the dividend details and confirm the payment has been made.</p>
            </div>
            <button type="button" onClick={onClose} disabled={submitting} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-textSecondary shadow-sm transition hover:bg-soft hover:text-textPrimary" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/40 p-3 md:grid-cols-3">
              <ProcessSummaryItem icon={FileText} iconClassName="bg-blue-100 text-blue-700" label="Trust" value={record.TrustNo || formatTrustNo(record.TrustID)} secondary={record.ProductName || record.ProductCode || "-"} />
              <ProcessSummaryItem icon={User} iconClassName="bg-purple-100 text-purple-700" label="Settlor" value={record.SettlorName || "-"} secondary={record.SettlorIdentityNo || "-"} />
              <ProcessSummaryItem icon={CalendarDays} iconClassName="bg-[#FFF1C9] text-[#9A6A00]" label="Payout Date" value={formatDate(record.PayoutDate)} secondary={formatStatus(record.Status)} secondaryClassName="w-fit rounded-full bg-orange-100 px-2.5 py-0.5 font-semibold text-orange-700" />
            </div>

            <section className="overflow-hidden rounded-lg border border-blue-100 bg-white">
              <div className="flex items-center gap-2 border-b border-blue-50 bg-blue-50/40 px-4 py-3">
                <Landmark className="h-5 w-5 text-[#42526E]" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-textSecondary">Settlor Bank Information</h3>
              </div>
              <div className="grid gap-x-8 gap-y-4 px-4 py-4 sm:grid-cols-2">
                <ProcessBankField label="Bank Name" value={bankName} />
                <ProcessBankField label="Account Holder" value={record.SettlorBankAccountHolder || "-"} />
                <ProcessBankField label="Account No." value={record.SettlorBankAccountNumber || "-"} copyValue={record.SettlorBankAccountNumber || ""} />
                <ProcessBankField label="Bank Detail" value={bankDetail} copyValue={bankDetail !== "-" ? bankDetail : ""} />
              </div>
              <div className="mx-3 mb-3 grid gap-3 rounded-lg border border-[#F4D48B] bg-[#FFF8E7] p-3 md:grid-cols-[36px_minmax(0,1fr)_minmax(160px,auto)] md:items-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E0B33F] text-white">
                  <Info className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-bold text-[#9A6A00]">Payment Instruction</div>
                  <p className="mt-0.5 text-sm text-textSecondary">Transfer the dividend amount to the settlor's bank account as above.</p>
                </div>
                <div className="border-t border-[#F4D48B] pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                  <div className="text-sm font-semibold text-textSecondary">Amount to Transfer</div>
                  <div className="mt-0.5 whitespace-nowrap text-lg font-bold text-[#9A6A00]">{formatCurrency(amount)}</div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="flex items-center gap-2 border-b border-line bg-soft px-4 py-3">
                <Flag className="h-4 w-4 text-[#42526E]" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-textSecondary">Status</h3>
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-2">
                <label className="text-sm font-semibold text-textPrimary">
                  Status <span className="text-red-600">*</span>
                  <select value={status} onChange={(event) => setStatus(event.target.value as "PAID" | "CANCELLED")} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-textPrimary focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
                    <option value="PAID" disabled={!record.CanMarkPaid}>Paid</option>
                    <option value="CANCELLED" disabled={!record.CanCancel}>Cancelled</option>
                  </select>
                </label>
                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-sm leading-5 text-blue-800">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{status === "PAID" ? "Set to Paid only after the dividend amount has been successfully transferred to the settlor." : "Set to Cancelled only when this dividend should not be transferred to the settlor."}</p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="flex items-center gap-2 border-b border-line bg-soft px-4 py-3">
                <FileText className="h-4 w-4 text-[#42526E]" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-textSecondary">Remark</h3>
              </div>
              <label className="block p-4 text-sm font-semibold text-textSecondary">
                Remark (Optional)
                <textarea
                  value={remark}
                  maxLength={500}
                  onChange={(event) => setRemark(event.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-textPrimary focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  placeholder="Enter finance remark (e.g. payment reference, internal note, etc.)"
                />
                <span className="mt-1 block text-right text-xs font-semibold text-textSecondary">{remark.length} / 500</span>
              </label>
            </section>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="min-w-24">Cancel</Button>
            <Button type="submit" disabled={submitting || (!record.CanMarkPaid && !record.CanCancel)} className="min-w-36">
              {status === "PAID" ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              {submitting ? "Processing..." : status === "PAID" ? "Mark Paid" : "Cancel Dividend"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProcessSummaryItem({
  icon: Icon,
  iconClassName,
  label,
  value,
  secondary,
  secondaryClassName = "text-textSecondary"
}: {
  icon: typeof FileText;
  iconClassName: string;
  label: string;
  value: ReactNode;
  secondary: ReactNode;
  secondaryClassName?: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[38px_minmax(0,1fr)] gap-3 md:border-r md:border-blue-100 md:pr-3 last:md:border-r-0">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClassName}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wide text-textSecondary">{label}</div>
        <div className="mt-0.5 truncate text-sm font-bold text-textPrimary">{value}</div>
        <div className={`mt-0.5 truncate text-xs font-semibold ${secondaryClassName}`}>{secondary}</div>
      </div>
    </div>
  );
}

function ProcessBankField({ label, value, copyValue }: { label: string; value: ReactNode; copyValue?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-sm font-medium text-textSecondary">{label}</div>
      <div className="mt-0.5 flex items-center gap-2">
        <span className="min-w-0 break-words text-sm font-bold text-textPrimary">{value || "-"}</span>
        {copyValue ? (
          <button
            type="button"
            onClick={() => copyToClipboard(copyValue)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-textSecondary shadow-sm transition hover:bg-soft hover:text-textPrimary"
            aria-label={`Copy ${label}`}
            title={`Copy ${label}`}
          >
            <Copy className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function copyToClipboard(value: string) {
  navigator.clipboard
    ?.writeText(value)
    .then(() => notifySuccess("Copied to clipboard.", "trust-dividend-copy"))
    .catch(() => notifyError("Unable to copy value.", "trust-dividend-copy-error"));
}

function TotalStatistics({ statistics, loading }: { statistics: TrustDividendStatistic; loading: boolean }) {
  return (
    <section className="mb-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-textSecondary">All Dividend Statistics</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-3">
        {statisticItems.map((item) => (
          <div key={item.countKey} className={statisticCardClass}>
            <span className={statisticCardAccentClass} />
            <div className={statisticLabelClass}>{item.label}</div>
            <div className={statisticValueClass}>{loading ? "-" : formatCount(Number(statistics[item.countKey]))}</div>
            <div className={statisticAmountClass}>{loading ? "-" : formatCurrency(Number(statistics[item.amountKey]))}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchStatistics({ statistics, loading }: { statistics: TrustDividendStatistic; loading: boolean }) {
  return (
    <section className="mt-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-textSecondary">Search Result Statistics</h2>
      <div className="flex flex-wrap gap-2">
        {statisticItems.map((item, index) => (
          <div key={item.countKey} className={getSearchStatisticClass(index === 0, item.tone)}>
            <span>{item.label}</span>
            <span className={getSearchStatisticBadgeClass(index === 0, item.tone)}>{loading ? "-" : formatCount(Number(statistics[item.countKey]))}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchField({ label, value, placeholder, className = "", onChange }: { label: string; value: string; placeholder: string; className?: string; onChange: (value: string) => void }) {
  return (
    <label className={`text-sm font-semibold text-textPrimary ${className}`}>
      {label}
      <span className="relative mt-1 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm font-medium text-textPrimary focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
      </span>
    </label>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-semibold text-textPrimary">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-textPrimary focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function ProductSelect({ value, options, onChange }: { value: string; options: TrustProductListItem[]; onChange: (value: string) => void }) {
  const productOptions = useMemo(
    () => [
      { value: allFilter, label: "All products" },
      ...options.map((option) => ({
        value: option.ProductCode,
        label: option.ProductName || option.ProductCode
      }))
    ],
    [options]
  );

  return <FilterSelect label="Product" value={value} options={productOptions} onChange={onChange} />;
}

function DateRangeField({
  label,
  dateFrom,
  dateTo,
  className = "",
  onDateFromChange,
  onDateToChange
}: {
  label: string;
  dateFrom: string;
  dateTo: string;
  className?: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm font-semibold text-textPrimary ${className}`}>
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

function HeroMetric({
  icon: Icon,
  label,
  value,
  subValue,
  valueClassName = "text-textPrimary"
}: {
  icon: typeof CalendarDays;
  label: string;
  value: ReactNode;
  subValue: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-4 rounded-lg border border-line bg-white p-4 shadow-[0_8px_22px_rgba(17,17,17,0.04)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF4D8] text-[#9A6A00]">
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium leading-5 text-textSecondary">{label}</div>
        <div className={`truncate text-xl font-bold leading-7 ${valueClassName}`}>{value}</div>
        <div className="truncate text-sm leading-5 text-textSecondary">{subValue}</div>
      </div>
    </div>
  );
}

function PaymentInstructionPanel({ record, isRedeposit }: { record: TrustDividendListItem | TrustDividendDetail; isRedeposit: boolean }) {
  const amountLabel = isRedeposit ? "Redeposit Amount" : "Payout Amount";
  const amount = isRedeposit ? record.RedepositAmount || record.DividendAmount : record.PayoutAmount || record.DividendAmount;
  const Icon = isRedeposit ? Coins : Building2;

  return (
    <section className="grid gap-4 rounded-lg border border-[#F4D48B] bg-[#FFF8E7] p-4 md:grid-cols-[52px_minmax(0,1fr)_minmax(180px,auto)] md:items-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF0C7] text-[#9A6A00]">
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <h3 className="text-xs font-bold uppercase tracking-wide text-textSecondary">Payment Instruction</h3>
        <div className="mt-1 text-base font-bold text-textPrimary">{isRedeposit ? "Redeposit to Trust Asset" : "Transfer to Settlor Bank"}</div>
        <p className="mt-1 text-sm leading-5 text-textSecondary">
          {isRedeposit ? "This dividend will be redeposited into the trust asset automatically. No bank transfer to settlor is required." : "This dividend will be paid out by bank transfer to the settlor account."}
        </p>
      </div>
      <div className="border-t border-[#F4D48B] pt-3 md:border-l md:border-t-0 md:pl-6 md:pt-0">
        <div className="text-sm font-medium text-textSecondary">{amountLabel}</div>
        <div className="mt-1 whitespace-nowrap text-2xl font-bold text-[#9A6A00]">{formatCurrency(amount)}</div>
      </div>
    </section>
  );
}

function DrawerSection({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-[0_8px_22px_rgba(17,17,17,0.04)]">
      <h3 className="mb-3 flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-textSecondary">
        <Icon className="h-5 w-5 text-[#42526E]" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function KeyValueGrid({ items, columns = "md:grid-cols-2" }: { items: Array<[string, ReactNode]>; columns?: string }) {
  return (
    <div className={`grid gap-x-8 gap-y-2 ${columns}`}>
      {items.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 text-sm leading-6">
          <div className="text-textSecondary">{label}</div>
          <div className="min-w-0 break-words font-semibold text-textPrimary">{value || "-"}</div>
        </div>
      ))}
    </div>
  );
}

function StackedValueGrid({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <div className="grid self-start gap-x-8 gap-y-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <div className="text-sm leading-4 text-textSecondary">{label}</div>
          <div className="mt-0.5 break-words text-sm font-semibold leading-5 text-textPrimary">{value || "-"}</div>
        </div>
      ))}
    </div>
  );
}

function CalculationCard({ items, totalLabel, totalValue }: { items: Array<[string, ReactNode]>; totalLabel: string; totalValue: ReactNode }) {
  return (
    <div className="rounded-lg bg-soft p-4">
      <div className="space-y-2">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-textSecondary">{label}</span>
            <span className="whitespace-nowrap font-semibold text-textPrimary">{value || "-"}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 rounded-lg bg-[#FFF1C9] px-4 py-3">
        <span className="text-sm font-semibold text-[#9A6A00]">{totalLabel}</span>
        <span className="whitespace-nowrap text-xl font-bold text-[#9A6A00]">{totalValue}</span>
      </div>
    </div>
  );
}

function StatusHistoryTimeline({ record, isRedeposit }: { record: TrustDividendListItem | TrustDividendDetail; isRedeposit: boolean }) {
  const status = normalizeDividendStatus(record.Status);
  const scheduledDate = formatCompactDate(readDetail(record, "CreatedAt") || record.PayoutDate);
  const dueDate = formatCompactDate(record.PayoutDate);
  const voidedDate = formatCompactDateTime(readDetail(record, "UpdatedAt"));
  const paidDate = formatCompactDateTime(record.PaidAt);
  const cancelledDate = formatCompactDateTime(record.CancelledAt);
  const finalStatus: "PAID" | "CANCELLED" | "PENDING" = status === "PAID" ? "PAID" : status === "CANCELLED" ? "CANCELLED" : "PENDING";

  if (status === "VOIDED") {
    return (
      <div className="overflow-x-auto py-3">
        <div className="mx-auto flex min-w-[420px] max-w-lg items-start justify-center">
          <TimelineStep index={1} label="Scheduled" date={scheduledDate} active />
          <TimelineConnector />
          <TimelineStep index={2} label="Voided" date={voidedDate} active />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto py-3">
      <div className={isRedeposit ? "mx-auto flex min-w-[420px] max-w-lg items-start justify-center" : "mx-auto flex min-w-[640px] max-w-2xl items-start justify-center"}>
        <TimelineStep index={1} label="Scheduled" date={scheduledDate} active />
        <TimelineConnector />
        <TimelineStep index={2} label="Due" date={dueDate} active={status === "DUE" || status === "PAID" || status === "CANCELLED"} />
        {!isRedeposit ? (
          <>
            <TimelineConnector />
            <TimelineOutcome status={finalStatus} paidDate={paidDate} cancelledDate={cancelledDate} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function TimelineStep({ index, label, date, active }: { index: number; label: string; date: string; active: boolean }) {
  return (
    <div className="flex min-w-32 items-start gap-3">
      <span className={active ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-bold text-white" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-300 text-base font-bold text-white"}>
        {index}
      </span>
      <div className="min-w-0 pt-0.5">
        <div className={active ? "text-sm font-bold text-blue-600" : "text-sm font-semibold text-textSecondary"}>{label}</div>
        <div className="mt-0.5 whitespace-nowrap text-sm text-textSecondary">{date || "-"}</div>
      </div>
    </div>
  );
}

function TimelineOutcome({ status, paidDate, cancelledDate }: { status: "PAID" | "CANCELLED" | "PENDING"; paidDate: string; cancelledDate: string }) {
  if (status === "PAID") {
    return (
      <div className="flex min-w-44 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-200 text-base font-bold text-green-700">3</span>
        <div className="pt-0.5">
          <div className="text-sm font-bold text-green-700">Paid</div>
          <div className="mt-0.5 whitespace-nowrap text-sm text-textSecondary">{paidDate || "-"}</div>
        </div>
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className="flex min-w-44 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
          <X className="h-5 w-5" />
        </span>
        <div className="pt-0.5">
          <div className="text-sm font-bold text-red-600">Cancelled</div>
          <div className="mt-0.5 whitespace-nowrap text-sm text-textSecondary">{cancelledDate || "-"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-44 items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-300 text-base font-bold text-white">3</span>
      <div className="pt-0.5">
        <div className="text-sm font-semibold text-textSecondary">Paid / Cancelled</div>
        <div className="mt-0.5 whitespace-nowrap text-sm text-textSecondary">-</div>
      </div>
    </div>
  );
}

function TimelineConnector() {
  return <span className="mx-4 mt-5 h-px min-w-20 flex-1 bg-[#AAB4C4]" />;
}

function InfoBlock({ label, primary, secondary }: { label: string; primary: ReactNode; secondary?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-soft px-3 py-2">
      <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-textSecondary">{label}</div>
      <div className="mt-1 truncate text-sm font-bold text-textPrimary">{primary || "-"}</div>
      {secondary ? <div className="mt-0.5 truncate text-xs font-medium text-textSecondary">{secondary}</div> : null}
    </div>
  );
}

function TableHead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap border-b border-line px-4 py-3 font-semibold ${className}`}>{children}</th>;
}

function TableCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap border-b border-line px-4 py-5 text-textSecondary ${className}`}>{children}</td>;
}

function TwoLine({ primary, secondary }: { primary: ReactNode; secondary: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="max-w-64 truncate text-sm font-semibold leading-5 text-textPrimary">{primary}</div>
      <div className="mt-0.5 max-w-64 truncate text-sm font-normal leading-5 text-textSecondary">{secondary}</div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-textSecondary">{title}</h3>
      {children}
    </section>
  );
}

function DetailGrid({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <div className="text-xs font-semibold text-textSecondary">{label}</div>
          <div className="mt-1 break-words text-sm font-semibold text-textPrimary">{value || "-"}</div>
        </div>
      ))}
    </div>
  );
}

function createEmptyFilters(): DividendFilters {
  return {
    search: "",
    status: allFilter,
    productCode: allFilter,
    returnOption: allFilter,
    payoutDateFrom: "",
    payoutDateTo: "",
    sortBy: "FINANCE_PRIORITY",
    sortDirection: "ASC"
  };
}

const statisticCardClass = "relative min-h-[78px] min-w-0 overflow-hidden rounded-md border border-[#F0DDA6] bg-[#FFFDF8] px-5 py-4 shadow-[0_10px_22px_rgba(120,83,17,0.05)]";
const statisticCardAccentClass = "absolute inset-y-0 left-0 w-1 bg-[#FDBB1D]";
const statisticLabelClass = "truncate text-[12px] font-semibold uppercase tracking-wide text-[#8A651C]";
const statisticValueClass = "mt-2 text-2xl font-bold leading-none text-[#6F4A0D]";
const statisticAmountClass = "mt-1 truncate text-xs font-semibold text-[#9B7A3A]";

function getSearchStatisticClass(active: boolean, tone?: "warning" | "success" | "danger") {
  const baseClass = "inline-flex h-10 min-w-28 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold shadow-sm";
  if (active) return `${baseClass} border-blue-700 bg-blue-700 text-white`;
  if (tone === "danger") return `${baseClass} border-red-100 bg-white text-textPrimary`;
  return `${baseClass} border-line bg-white text-textPrimary`;
}

function getSearchStatisticBadgeClass(active: boolean, tone?: "warning" | "success" | "danger") {
  const baseClass = "inline-flex min-w-7 items-center justify-center rounded-lg px-2 py-0.5 text-xs font-bold";
  if (active) return `${baseClass} bg-blue-100 text-blue-800`;
  if (tone === "danger") return `${baseClass} bg-red-100 text-red-700`;
  if (tone === "success") return `${baseClass} bg-green-100 text-green-700`;
  if (tone === "warning") return `${baseClass} bg-amber-100 text-amber-700`;
  return `${baseClass} bg-gray-100 text-textPrimary`;
}

function formatReturnOption(value?: string | null) {
  const normalized = normalizeReturnOption(value);
  if (normalized === "REDEPOSIT_AS_TRUST_ASSET") return "Redeposit";
  if (normalized === "TRANSFER_TO_BANK") return "Withdraw";
  return value || "-";
}

function formatPayoutFrequency(value?: string | null) {
  if (!value) return "-";
  return value.trim().toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeReturnOption(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "TRANSFER_TO_BAN") return "TRANSFER_TO_BANK";
  return normalized || "";
}

function normalizeDividendStatus(value?: string | null) {
  return value?.trim().toUpperCase() || "";
}

function formatStatus(value?: string | null) {
  const normalized = normalizeDividendStatus(value);
  if (normalized === "SCHEDULED") return "Scheduled";
  if (normalized === "DUE") return "Due";
  if (normalized === "PAID") return "Paid";
  if (normalized === "CANCELLED") return "Cancelled";
  if (normalized === "VOIDED") return "Voided";
  return value || "-";
}

function formatTrustNo(value?: number | null) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return "-";
  return numericValue.toString().padStart(4, "0");
}

function formatCurrency(value?: number | null) {
  return `RM ${Number(value ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatRate(value?: number | null) {
  return `${Number(value ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}%`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-MY").format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatCompactDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function formatCompactDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDateRange(from?: string | null, to?: string | null) {
  if (!from && !to) return "-";
  return `${formatDate(from)} to ${formatDate(to)}`;
}

function formatJoined(values: Array<string | number | null | undefined>) {
  const text = values.map((value) => String(value ?? "").trim()).filter(Boolean);
  return text.length > 0 ? text.join(" - ") : "-";
}

function readDetail(record: TrustDividendListItem | TrustDividendDetail, key: keyof TrustDividendDetail) {
  const value = (record as TrustDividendDetail)[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function readNumber(record: TrustDividendListItem | TrustDividendDetail, key: keyof TrustDividendDetail) {
  const value = (record as TrustDividendDetail)[key];
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}
