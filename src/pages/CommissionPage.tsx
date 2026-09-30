import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Ban, Calendar, CalendarDays, CheckCircle2, Coins, Eye, FileText, Flag, Landmark, ListFilter, RotateCcw, Search, User, UsersRound, X } from "lucide-react";
import {
  trustCommissionApi,
  type TrustCommissionBatch,
  type TrustCommissionBatchSortBy,
  type TrustCommissionDetail,
  type TrustCommissionListItem,
  type TrustCommissionSortBy,
  type TrustCommissionSortDirection,
  type TrustCommissionStatistic,
  type TrustCommissionStatus
} from "../api/trustCommissionApi";
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
const processRoles: RoleId[] = ["AC", "SA", "AD"];
const batchRoles: RoleId[] = ["SA", "AD", "AC"];

const emptyStatistics: TrustCommissionStatistic = {
  TotalRecords: 0,
  CalculatedRecords: 0,
  PaidRecords: 0,
  CancelledRecords: 0,
  TotalAmount: 0,
  CalculatedAmount: 0,
  PaidAmount: 0,
  CancelledAmount: 0
};

const statisticItems: Array<{ label: string; countKey: keyof TrustCommissionStatistic; amountKey: keyof TrustCommissionStatistic; tone?: "warning" | "success" | "danger" }> = [
  { label: "Total", countKey: "TotalRecords", amountKey: "TotalAmount" },
  { label: "Calculated", countKey: "CalculatedRecords", amountKey: "CalculatedAmount", tone: "warning" },
  { label: "Paid", countKey: "PaidRecords", amountKey: "PaidAmount", tone: "success" },
  { label: "Cancelled", countKey: "CancelledRecords", amountKey: "CancelledAmount", tone: "danger" }
];

const statusOptions: Array<{ value: typeof allFilter | TrustCommissionStatus; label: string }> = [
  { value: allFilter, label: "All statuses" },
  { value: "CALCULATED", label: "Calculated" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" }
];

const sortOptions: Array<{ value: TrustCommissionSortBy; label: string }> = [
  { value: "PAYOUT_DATE", label: "Payout Date" },
  { value: "TRUST_ID", label: "Trust ID" },
  { value: "COMMISSION_NO", label: "Commission No." },
  { value: "COMMISSION_AMOUNT", label: "Commission Amount" },
  { value: "STATUS", label: "Status" },
  { value: "CREATED_AT", label: "Created At" }
];

const batchSortOptions: Array<{ value: TrustCommissionBatchSortBy; label: string }> = [
  { value: "CREATED_AT", label: "Created At" },
  { value: "BATCH_NO", label: "Batch No." },
  { value: "CUTOFF_DATE", label: "Cutoff Date" },
  { value: "STARTED_AT", label: "Started At" },
  { value: "COMPLETED_AT", label: "Completed At" }
];

interface CommissionFilters {
  batchNo: string;
  trustSearch: string;
  sellingAgentSearch: string;
  recipientAgentSearch: string;
  settlorSearch: string;
  payoutDateFrom: string;
  payoutDateTo: string;
  commissionStatus: typeof allFilter | TrustCommissionStatus;
  sortBy: TrustCommissionSortBy;
  sortDirection: TrustCommissionSortDirection;
}

interface BatchFilters {
  search: string;
  batchStatus: string;
  cutoffDateFrom: string;
  cutoffDateTo: string;
  sortBy: TrustCommissionBatchSortBy;
  sortDirection: TrustCommissionSortDirection;
}

interface PaginationState {
  Page: number;
  PageSize: number;
  TotalRecords: number;
  TotalPages: number;
}

export function CommissionPage() {
  const { session } = useAuth();
  const [records, setRecords] = useState<TrustCommissionListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({ Page: 1, PageSize: 10, TotalRecords: 0, TotalPages: 1 });
  const [totalStatistics, setTotalStatistics] = useState<TrustCommissionStatistic>(emptyStatistics);
  const [searchStatistics, setSearchStatistics] = useState<TrustCommissionStatistic>(emptyStatistics);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState<CommissionFilters>(createEmptyFilters());
  const [filters, setFilters] = useState<CommissionFilters>(createEmptyFilters());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hasSearched, setHasSearched] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewTarget, setViewTarget] = useState<TrustCommissionListItem | null>(null);
  const [processTarget, setProcessTarget] = useState<TrustCommissionListItem | null>(null);
  const [batchPickerOpen, setBatchPickerOpen] = useState(false);
  const canProcessCommission = Boolean(session?.role && processRoles.includes(session.role));
  const canUseBatchFilter = Boolean(session?.role && batchRoles.includes(session.role));

  useEffect(() => {
    let cancelled = false;

    async function loadCommissions() {
      setRecordsLoading(true);
      try {
        const result = await trustCommissionApi.getCommissionList({
          page,
          pageSize,
          batchNo: canUseBatchFilter ? filters.batchNo.trim() || undefined : undefined,
          trustSearch: filters.trustSearch.trim() || undefined,
          sellingAgentSearch: filters.sellingAgentSearch.trim() || undefined,
          recipientAgentSearch: filters.recipientAgentSearch.trim() || undefined,
          settlorSearch: filters.settlorSearch.trim() || undefined,
          payoutDateFrom: filters.payoutDateFrom || undefined,
          payoutDateTo: filters.payoutDateTo || undefined,
          commissionStatus: filters.commissionStatus === allFilter ? undefined : filters.commissionStatus,
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
        notifyError(error instanceof Error ? error.message : "Unable to load commission list.", "commission-list-load");
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    }

    loadCommissions();

    return () => {
      cancelled = true;
    };
  }, [filters, page, pageSize, refreshKey, canUseBatchFilter]);

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({
      ...draftFilters,
      batchNo: canUseBatchFilter ? draftFilters.batchNo.trim() : "",
      trustSearch: draftFilters.trustSearch.trim(),
      sellingAgentSearch: draftFilters.sellingAgentSearch.trim(),
      recipientAgentSearch: draftFilters.recipientAgentSearch.trim(),
      settlorSearch: draftFilters.settlorSearch.trim()
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
      <PageHeader title="Commission & Overriding Bonus Report" description="Review commission payouts, recipient agents, selling agents, settlor details, and finance status." />

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line p-4">
          <TotalStatistics statistics={totalStatistics} loading={recordsLoading} />
          <form onSubmit={submitFilters} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
              {canUseBatchFilter ? <BatchNoField value={draftFilters.batchNo} onChange={(value) => setDraftFilters((current) => ({ ...current, batchNo: value }))} onOpenPicker={() => setBatchPickerOpen(true)} /> : null}
              <SearchField label="Trust ID" value={draftFilters.trustSearch} placeholder="Search trust ID" className="xl:col-span-4" onChange={(value) => setDraftFilters((current) => ({ ...current, trustSearch: value }))} />
              <SearchField label="Selling Agent" value={draftFilters.sellingAgentSearch} placeholder="Username, fullname, identity ID" className="xl:col-span-4" onChange={(value) => setDraftFilters((current) => ({ ...current, sellingAgentSearch: value }))} />
              <SearchField label="Recipient Agent" value={draftFilters.recipientAgentSearch} placeholder="Username, fullname, identity ID" className="xl:col-span-4" onChange={(value) => setDraftFilters((current) => ({ ...current, recipientAgentSearch: value }))} />
              <SearchField label="Settlor" value={draftFilters.settlorSearch} placeholder="Name, email, identity ID, contact" className="xl:col-span-4" onChange={(value) => setDraftFilters((current) => ({ ...current, settlorSearch: value }))} />
              <FilterSelect label="Status" value={draftFilters.commissionStatus} options={statusOptions} className="xl:col-span-2" onChange={(value) => setDraftFilters((current) => ({ ...current, commissionStatus: value as CommissionFilters["commissionStatus"] }))} />
              <FilterSelect label="Sort By" value={draftFilters.sortBy} options={sortOptions} className="xl:col-span-2" onChange={(value) => setDraftFilters((current) => ({ ...current, sortBy: value as TrustCommissionSortBy }))} />
              <FilterSelect label="Direction" value={draftFilters.sortDirection} options={[{ value: "ASC", label: "Ascending" }, { value: "DESC", label: "Descending" }]} className="xl:col-span-2" onChange={(value) => setDraftFilters((current) => ({ ...current, sortDirection: value as TrustCommissionSortDirection }))} />
              <DateRangeField label="Payout Date" dateFrom={draftFilters.payoutDateFrom} dateTo={draftFilters.payoutDateTo} className="md:col-span-2 xl:col-span-3" onDateFromChange={(value) => setDraftFilters((current) => ({ ...current, payoutDateFrom: value }))} onDateToChange={(value) => setDraftFilters((current) => ({ ...current, payoutDateTo: value }))} />
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
          <div className="text-sm font-semibold text-textSecondary">{pagination.TotalRecords} commission records</div>
          <label className="flex items-center gap-2 text-sm text-textSecondary">
            Rows
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-9 rounded-lg border border-line bg-white px-2 text-textPrimary">
              {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>

        {recordsLoading ? (
          <div className="p-4"><LoadingSkeleton /></div>
        ) : records.length === 0 ? (
          <div className="p-4"><EmptyState title="No commission records found" description="Adjust the filters and search again." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full text-left text-sm">
              <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
                <tr>
                  <TableHead>No.</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Trust / Settlor</TableHead>
                  <TableHead>Selling Agent</TableHead>
                  <TableHead>Recipient Agent</TableHead>
                  <TableHead>Calculation</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <CommissionRecordRow key={record.CommissionID} record={record} rowNumber={(page - 1) * pageSize + index + 1} canProcessCommission={canProcessCommission} onView={() => setViewTarget(record)} onProcess={() => setProcessTarget(record)} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination currentPage={page} pageCount={Math.max(1, pagination.TotalPages)} totalRecords={pagination.TotalRecords} pageSize={pageSize} itemLabel="commission records" onPageChange={setPage} />
      </section>

      <CommissionDetailDrawer record={viewTarget} onClose={() => setViewTarget(null)} />
      <CommissionStatusModal record={processTarget} onClose={() => setProcessTarget(null)} onProcessed={handleProcessed} />
      <BatchPickerModal open={batchPickerOpen} onClose={() => setBatchPickerOpen(false)} onSelect={(batchNo) => { setDraftFilters((current) => ({ ...current, batchNo })); setBatchPickerOpen(false); }} />
    </>
  );
}

function CommissionRecordRow({ record, rowNumber, canProcessCommission, onView, onProcess }: { record: TrustCommissionListItem; rowNumber: number; canProcessCommission: boolean; onView: () => void; onProcess: () => void }) {
  const status = normalizeStatus(record.CommissionStatus);
  const canProcess = canProcessCommission && status === "CALCULATED";

  return (
    <tr className="align-top transition hover:bg-gray-50">
      <TableCell className="w-16 font-semibold text-textSecondary">{rowNumber}</TableCell>
      <TableCell><CommissionCell record={record} /></TableCell>
      <TableCell><TwoLine primary={record.TrustNo || formatTrustNo(record.TrustID)} secondary={record.Settlor?.FullName || "-"} tertiary={record.Settlor?.IdentityNo || record.ProductCode || "-"} /></TableCell>
      <TableCell><AgentCell agent={record.SellingAgent} /></TableCell>
      <TableCell><AgentCell agent={record.RecipientAgent} badge={record.RecipientRankCode || undefined} /></TableCell>
      <TableCell>
        <div className="min-w-0 whitespace-nowrap">
          <div className="text-sm font-semibold leading-5 text-textPrimary">{formatCurrency(record.CommissionAmount)}</div>
          <div className="mt-0.5 text-sm font-normal leading-5 text-textSecondary">{formatRate(record.CommissionRate)} of {formatCurrency(record.PlacementAmount)}</div>
          <div className="mt-1 flex flex-nowrap gap-1.5">
            <TableBadge tone={record.IsCompressed ? "compressed" : "direct"}>{record.IsCompressed ? `Compressed L${record.CompressedLevels || 0}` : "Direct"}</TableBadge>
            {record.CommissionType ? <TableBadge tone="method">{formatDatabaseDisplayValue(record.CommissionType)}</TableBadge> : null}
          </div>
        </div>
      </TableCell>
      <TableCell><TwoLine primary={formatDate(record.PayoutDate)} secondary={record.BatchNo || "-"} tertiary={formatDateTime(record.StatusUpdatedAt)} /></TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="icon" onClick={onView} aria-label={`View commission ${record.CommissionNo || record.CommissionID}`} title="View commission"><Eye className="h-4 w-4" /></Button>
          {canProcessCommission ? <Button type="button" size="icon" disabled={!canProcess} onClick={onProcess} aria-label={`Update commission ${record.CommissionNo || record.CommissionID}`} title={canProcess ? "Update status" : "Only calculated commissions can be updated"}><CheckCircle2 className="h-4 w-4" /></Button> : null}
        </div>
      </TableCell>
    </tr>
  );
}

function CommissionCell({ record }: { record: TrustCommissionListItem }) {
  return (
    <div className="min-w-0">
      <div className="flex max-w-72 items-center gap-2">
        <span className="truncate text-sm font-semibold leading-5 text-textPrimary">{record.CommissionNo || `#${record.CommissionID}`}</span>
      </div>
      <div className="mt-1 flex max-w-72 flex-wrap gap-1.5">
        <StatusBadge status={formatStatus(record.CommissionStatus)} />
      </div>
    </div>
  );
}

function AgentCell({ agent, badge }: { agent?: TrustCommissionListItem["SellingAgent"]; badge?: string }) {
  return (
    <div className="min-w-0">
      <div className="flex max-w-64 items-center gap-2">
        <span className="truncate text-sm font-semibold leading-5 text-textPrimary">{agent?.FullName || agent?.Username || "-"}</span>
        {badge ? <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-textSecondary">{badge}</span> : null}
      </div>
      <div className="mt-0.5 max-w-64 truncate text-sm font-normal leading-5 text-textSecondary">{agent?.Username || "-"}</div>
      <div className="mt-0.5 max-w-64 truncate text-xs font-medium text-textSecondary">{agent?.ContactNo || agent?.Email || "-"}</div>
    </div>
  );
}

function TableBadge({ children, tone }: { children: ReactNode; tone: "method" | "direct" | "compressed" }) {
  const toneClass =
    tone === "compressed"
      ? "bg-amber-100 text-amber-700"
      : tone === "direct"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-[#FFF8E1] text-[#8A650F]";

  return <span className={`inline-flex whitespace-nowrap rounded-lg px-2 py-0.5 text-[11px] font-bold ${toneClass}`}>{children}</span>;
}

function CommissionDetailDrawer({ record, onClose }: { record: TrustCommissionListItem | null; onClose: () => void }) {
  const [detail, setDetail] = useState<TrustCommissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  useBodyScrollLock(Boolean(record));

  useEffect(() => {
    if (!record) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    trustCommissionApi
      .getCommissionDetail(record.CommissionID)
      .then((result) => { if (!cancelled) setDetail(result); })
      .catch((error) => { if (!cancelled) notifyError(error instanceof Error ? error.message : "Unable to load commission detail.", "commission-detail-load"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [record]);

  if (!record) return null;

  const current = detail ?? record;
  const batch = detail?.Batch;
  const application = detail?.Application;
  const bank = detail?.RecipientBank;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45" role="dialog" aria-modal="true">
      <div className="flex h-full w-full max-w-[920px] flex-col overflow-hidden border-l border-brandGold/30 bg-white shadow-[0_28px_80px_rgba(17,17,17,0.28)]">
        <div className="border-b border-line bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-textSecondary">Trust Commission</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h2 className="truncate text-2xl font-bold leading-7 text-ink">{current.CommissionNo || `#${current.CommissionID}`}</h2>
                <StatusBadge status={formatStatus(current.CommissionStatus)} />
                <span className="inline-flex rounded-lg bg-[#FFF8E1] px-3 py-1 text-xs font-semibold text-ink">{formatCommissionType(current.CommissionType)}</span>
              </div>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-textSecondary transition hover:bg-soft hover:text-textPrimary" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white p-5">
          {loading ? <LoadingSkeleton /> : null}
          {!loading ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <HeroMetric icon={CalendarDays} label="Payout Date" value={formatDate(current.PayoutDate)} subValue={`Batch: ${current.BatchNo || batch?.BatchNo || "-"}`} />
                <HeroMetric icon={Coins} label="Commission Amount" value={formatCurrency(current.CommissionAmount)} subValue={`${formatRate(current.CommissionRate)} of ${formatCurrency(current.PlacementAmount)}`} valueClassName="text-[#9A6A00]" />
              </div>

              <DrawerSection title="Trust & Settlor" icon={FileText}>
                <KeyValueGrid items={[["Trust ID", application?.TrustNo || current.TrustNo || formatTrustNo(current.TrustID)], ["Application Status", application?.ApplicationStatus], ["Completed At", formatDateTime(application?.CompletedAt)], ["Settlor Name", current.Settlor?.FullName], ["Settlor Identity", formatJoined([current.Settlor?.IdentityType, current.Settlor?.IdentityNo])], ["Settlor Email", current.Settlor?.Email], ["Settlor Contact", current.Settlor?.ContactNo]]} />
              </DrawerSection>

              <DrawerSection title="Agents" icon={UsersRound}>
                <div className="grid gap-4 md:grid-cols-2">
                  <AgentInfoCard title="Selling Agent" agent={current.SellingAgent} />
                  <AgentInfoCard title="Recipient Agent" agent={current.RecipientAgent} />
                </div>
              </DrawerSection>

              <DrawerSection title="Calculation" icon={Coins}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
                  <KeyValueGrid columns="md:grid-cols-1" items={[["Method", formatDatabaseDisplayValue(current.CommissionMethod)], ["Type", formatCommissionType(current.CommissionType)], ["Required Rank", current.RequiredRankCode], ["Recipient Rank", current.RecipientRankCode], ["Network Level", current.NetworkLevel], ["Compressed", current.IsCompressed ? `Yes (${current.CompressedLevels})` : "No"], ["Period", formatDatabaseDisplayValue(current.CommissionPeriod)], ["Basis", formatDatabaseDisplayValue(current.CalculationBasis)]]} />
                  <CalculationCard items={[["Placement Amount", formatCurrency(current.PlacementAmount)], ["Commission Rate", formatRate(current.CommissionRate)]]} totalLabel="Commission Amount" totalValue={formatCurrency(current.CommissionAmount)} />
                </div>
              </DrawerSection>

              <DrawerSection title="Recipient Bank" icon={Landmark}>
                <KeyValueGrid items={[["Bank Name", bank?.BankNameDetail], ["Account Name", bank?.AccountName], ["Account Number", bank?.AccountNumber], ["Bank Branch", bank?.BankBranch], ["SWIFT Code", bank?.SwiftCode], ["IBAN", bank?.IBAN], ["Bank Country", bank?.BankCountry]]} />
              </DrawerSection>

              <DrawerSection title="Status" icon={Flag}>
                <KeyValueGrid items={[["Current Status", formatStatus(current.CommissionStatus)], ["Remark", current.StatusRemark], ["Updated At", formatDateTime(current.StatusUpdatedAt)], ["Updated By", formatJoined([current.StatusUpdatedByUsername, current.StatusUpdatedByFullName])], ["Created At", formatDateTime(current.CreatedAt)]]} />
              </DrawerSection>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CommissionStatusModal({ record, onClose, onProcessed }: { record: TrustCommissionListItem | null; onClose: () => void; onProcessed: () => void }) {
  const [status, setStatus] = useState<"PAID" | "CANCELLED">("PAID");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useBodyScrollLock(Boolean(record));

  useEffect(() => {
    if (!record) return;
    setStatus("PAID");
    setRemark("");
  }, [record]);

  const submitProcess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!record) return;

    setSubmitting(true);
    try {
      await trustCommissionApi.updateCommissionStatus(record.CommissionID, { Status: status, Remark: remark.trim() || undefined });
      notifySuccess("Commission status updated successfully.", "commission-status-update");
      onProcessed();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to update commission status.", "commission-status-update-error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-brandGold/40 bg-white shadow-[0_28px_80px_rgba(17,17,17,0.28)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brandGold">
        <form onSubmit={submitProcess} className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-xl font-bold leading-7 text-textPrimary">Update Commission Status</h2>
              <p className="mt-1 text-sm leading-5 text-textSecondary">Review the commission details before marking it paid or cancelled.</p>
            </div>
            <button type="button" onClick={onClose} disabled={submitting} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-textSecondary shadow-sm transition hover:bg-soft hover:text-textPrimary" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/40 p-3 md:grid-cols-3">
              <ProcessSummaryItem icon={FileText} iconClassName="bg-blue-100 text-blue-700" label="Commission" value={record.CommissionNo || `#${record.CommissionID}`} secondary={formatStatus(record.CommissionStatus)} />
              <ProcessSummaryItem icon={User} iconClassName="bg-purple-100 text-purple-700" label="Recipient" value={record.RecipientAgent?.FullName || record.RecipientAgent?.Username || "-"} secondary={record.RecipientAgent?.IdentityNo || "-"} />
              <ProcessSummaryItem icon={Coins} iconClassName="bg-[#FFF1C9] text-[#9A6A00]" label="Amount" value={formatCurrency(record.CommissionAmount)} secondary={formatDate(record.PayoutDate)} />
            </div>

            <section className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="flex items-center gap-2 border-b border-line bg-soft px-4 py-3">
                <ListFilter className="h-4 w-4 text-[#42526E]" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-textSecondary">Important Information</h3>
              </div>
              <KeyValueGrid className="p-4" items={[["Trust ID", record.TrustNo || formatTrustNo(record.TrustID)], ["Settlor", record.Settlor?.FullName], ["Selling Agent", record.SellingAgent?.FullName || record.SellingAgent?.Username], ["Recipient Agent", record.RecipientAgent?.FullName || record.RecipientAgent?.Username], ["Batch No.", record.BatchNo], ["Calculation", `${formatCurrency(record.PlacementAmount)} x ${formatRate(record.CommissionRate)}`]]} />
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
                    <option value="PAID">Paid</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </label>
                <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-sm leading-5 text-blue-800">{status === "PAID" ? "Set to Paid only after the commission payout has been completed." : "Set to Cancelled only when this calculated commission should not be paid."}</div>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="flex items-center gap-2 border-b border-line bg-soft px-4 py-3">
                <FileText className="h-4 w-4 text-[#42526E]" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-textSecondary">Remark</h3>
              </div>
              <label className="block p-4 text-sm font-semibold text-textSecondary">
                Remark (Optional)
                <textarea value={remark} maxLength={1000} onChange={(event) => setRemark(event.target.value)} rows={4} className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-textPrimary focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" placeholder="Enter payment reference, cancellation reason, or internal note." />
                <span className="mt-1 block text-right text-xs font-semibold text-textSecondary">{remark.length} / 1000</span>
              </label>
            </section>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="min-w-24">Cancel</Button>
            <Button type="submit" disabled={submitting || normalizeStatus(record.CommissionStatus) !== "CALCULATED"} className="min-w-36">
              {status === "PAID" ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              {submitting ? "Processing..." : status === "PAID" ? "Mark Paid" : "Cancel Commission"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BatchPickerModal({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (batchNo: string) => void }) {
  const [records, setRecords] = useState<TrustCommissionBatch[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({ Page: 1, PageSize: 10, TotalRecords: 0, TotalPages: 1 });
  const [draftFilters, setDraftFilters] = useState<BatchFilters>(createEmptyBatchFilters());
  const [filters, setFilters] = useState<BatchFilters>(createEmptyBatchFilters());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    trustCommissionApi
      .getBatchList({ page, pageSize: 10, search: filters.search.trim() || undefined, batchStatus: filters.batchStatus === allFilter ? undefined : filters.batchStatus, cutoffDateFrom: filters.cutoffDateFrom || undefined, cutoffDateTo: filters.cutoffDateTo || undefined, sortBy: filters.sortBy, sortDirection: filters.sortDirection })
      .then((result) => {
        if (cancelled) return;
        setRecords(result.records);
        setPagination({ Page: result.pagination.Page, PageSize: result.pagination.PageSize, TotalRecords: result.pagination.TotalRecords, TotalPages: Math.max(1, result.pagination.TotalPages) });
      })
      .catch((error) => { if (!cancelled) notifyError(error instanceof Error ? error.message : "Unable to load commission batch list.", "commission-batch-list-load"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [open, filters, page]);

  if (!open) return null;

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({ ...draftFilters, search: draftFilters.search.trim() });
    setPage(1);
  };

  const resetFilters = () => {
    const empty = createEmptyBatchFilters();
    setDraftFilters(empty);
    setFilters(empty);
    setPage(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-brandGold/40 bg-white shadow-[0_28px_80px_rgba(17,17,17,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-xl font-bold leading-7 text-textPrimary">Select Commission Batch</h2>
            <p className="mt-1 text-sm leading-5 text-textSecondary">Search batch records and select a batch number for the commission listing.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-textSecondary shadow-sm transition hover:bg-soft hover:text-textPrimary" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <form onSubmit={submitFilters} className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <SearchField label="Batch No." value={draftFilters.search} placeholder="Search batch no" className="xl:col-span-3" onChange={(value) => setDraftFilters((current) => ({ ...current, search: value }))} />
            <FilterSelect label="Batch Status" value={draftFilters.batchStatus} options={[{ value: allFilter, label: "All statuses" }, { value: "PROCESSING", label: "Processing" }, { value: "COMPLETED", label: "Completed" }, { value: "FAILED", label: "Failed" }]} onChange={(value) => setDraftFilters((current) => ({ ...current, batchStatus: value }))} />
            <FilterSelect label="Sort By" value={draftFilters.sortBy} options={batchSortOptions} onChange={(value) => setDraftFilters((current) => ({ ...current, sortBy: value as TrustCommissionBatchSortBy }))} />
            <FilterSelect label="Direction" value={draftFilters.sortDirection} options={[{ value: "ASC", label: "Ascending" }, { value: "DESC", label: "Descending" }]} onChange={(value) => setDraftFilters((current) => ({ ...current, sortDirection: value as TrustCommissionSortDirection }))} />
            <DateRangeField label="Cutoff Date" dateFrom={draftFilters.cutoffDateFrom} dateTo={draftFilters.cutoffDateTo} className="md:col-span-2 xl:col-span-2" onDateFromChange={(value) => setDraftFilters((current) => ({ ...current, cutoffDateFrom: value }))} onDateToChange={(value) => setDraftFilters((current) => ({ ...current, cutoffDateTo: value }))} />
            <div className="flex flex-col-reverse gap-3 md:col-span-2 md:flex-row md:justify-end xl:col-span-4 xl:self-end">
              <Button type="button" variant="outline" onClick={resetFilters}><RotateCcw className="h-4 w-4" />Reset</Button>
              <Button type="submit"><Search className="h-4 w-4" />Get Batch Record</Button>
            </div>
          </form>

          {loading ? <LoadingSkeleton /> : records.length === 0 ? <EmptyState title="No batch records found" description="Adjust the filters and search again." /> : (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="min-w-[920px] w-full text-left text-sm">
                <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
                  <tr>
                    <TableHead>Batch</TableHead>
                    <TableHead>Cutoff</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Total Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {records.map((batch) => (
                    <tr key={batch.BatchID} className="align-top transition hover:bg-gray-50">
                      <TableCell><TwoLine primary={batch.BatchNo || "-"} secondary={`Created ${formatDateTime(batch.CreatedAt)}`} /></TableCell>
                      <TableCell><TwoLine primary={formatDate(batch.CutoffDate)} secondary={formatDateRange(batch.StartedAt, batch.CompletedAt)} /></TableCell>
                      <TableCell><TwoLine primary={`${batch.ProcessedSource || 0} / ${batch.TotalSource || 0}`} secondary={`Failed: ${batch.FailedSource || 0}`} /></TableCell>
                      <TableCell><TwoLine primary={formatCurrency(batch.TotalCommissionAmount)} secondary={`${formatCount(batch.TotalCommissionRecords || 0)} records`} /></TableCell>
                      <TableCell><StatusBadge status={formatStatus(batch.BatchStatus)} /></TableCell>
                      <TableCell className="text-right"><Button type="button" size="sm" onClick={() => onSelect(batch.BatchNo || "")} disabled={!batch.BatchNo}>Select</Button></TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-line p-4">
          <Pagination currentPage={page} pageCount={Math.max(1, pagination.TotalPages)} totalRecords={pagination.TotalRecords} pageSize={10} itemLabel="batch records" onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}

function TotalStatistics({ statistics, loading }: { statistics: TrustCommissionStatistic; loading: boolean }) {
  return (
    <section className="mb-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-textSecondary">All Commission Statistics</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2">
        {statisticItems.map((item) => (
          <div key={item.countKey} className="min-w-0 rounded-md border border-line bg-soft px-3 py-2">
            <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-textSecondary">{item.label}</div>
            <div className="mt-1 text-xl font-bold text-textPrimary">{loading ? "-" : formatCount(Number(statistics[item.countKey]))}</div>
            <div className="mt-1 truncate text-xs font-semibold text-textSecondary">{loading ? "-" : formatCurrency(Number(statistics[item.amountKey]))}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchStatistics({ statistics, loading }: { statistics: TrustCommissionStatistic; loading: boolean }) {
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

function BatchNoField({ value, onChange, onOpenPicker }: { value: string; onChange: (value: string) => void; onOpenPicker: () => void }) {
  return (
    <label className="text-sm font-semibold text-textPrimary md:col-span-2 xl:col-span-4">
      Batch No.
      <span className="mt-1 flex gap-2">
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Select or enter batch no" className={inputClass} />
        <Button type="button" variant="outline" onClick={onOpenPicker} className="shrink-0"><ListFilter className="h-4 w-4" />Get Batch Record</Button>
      </span>
    </label>
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

function FilterSelect({ label, value, options, className = "", onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; className?: string; onChange: (value: string) => void }) {
  return (
    <label className={`text-sm font-semibold text-textPrimary ${className}`}>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-textPrimary focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function DateRangeField({ label, dateFrom, dateTo, className = "", onDateFromChange, onDateToChange }: { label: string; dateFrom: string; dateTo: string; className?: string; onDateFromChange: (value: string) => void; onDateToChange: (value: string) => void }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm font-semibold text-textPrimary ${className}`}>
      {label}
      <span className="flex h-11 max-w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-textPrimary transition focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
        <Calendar className="h-4 w-4 shrink-0 text-textSecondary" />
        <DatePickerInput value={dateFrom} onChange={onDateFromChange} placeholder="From" className="min-w-0 flex-1" buttonClassName="h-auto min-w-0 gap-2 border-0 bg-transparent p-0 shadow-none hover:border-0 focus:border-0 focus:ring-0" dialogTitle={`${label} From`} showIcon={false} />
        <span className="shrink-0 text-textSecondary">-</span>
        <DatePickerInput value={dateTo} onChange={onDateToChange} placeholder="To" className="min-w-0 flex-1" buttonClassName="h-auto min-w-0 gap-2 border-0 bg-transparent p-0 shadow-none hover:border-0 focus:border-0 focus:ring-0" dialogTitle={`${label} To`} showIcon={false} />
      </span>
    </label>
  );
}

function HeroMetric({ icon: Icon, label, value, subValue, valueClassName = "text-textPrimary" }: { icon: typeof CalendarDays; label: string; value: ReactNode; subValue: ReactNode; valueClassName?: string }) {
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-4 rounded-lg border border-line bg-white p-4 shadow-[0_8px_22px_rgba(17,17,17,0.04)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF4D8] text-[#9A6A00]"><Icon className="h-6 w-6" /></span>
      <div className="min-w-0">
        <div className="text-sm font-medium leading-5 text-textSecondary">{label}</div>
        <div className={`truncate text-xl font-bold leading-7 ${valueClassName}`}>{value}</div>
        <div className="truncate text-sm leading-5 text-textSecondary">{subValue}</div>
      </div>
    </div>
  );
}

function DrawerSection({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-[0_8px_22px_rgba(17,17,17,0.04)]">
      <h3 className="mb-3 flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-textSecondary"><Icon className="h-5 w-5 text-[#42526E]" />{title}</h3>
      {children}
    </section>
  );
}

function KeyValueGrid({ items, columns = "md:grid-cols-2", className = "" }: { items: Array<[string, ReactNode]>; columns?: string; className?: string }) {
  return (
    <div className={`grid gap-x-8 gap-y-2 ${columns} ${className}`}>
      {items.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 text-sm leading-6">
          <div className="text-textSecondary">{label}</div>
          <div className="min-w-0 break-words font-semibold text-textPrimary">{value || "-"}</div>
        </div>
      ))}
    </div>
  );
}

function AgentInfoCard({ title, agent }: { title: string; agent?: TrustCommissionListItem["SellingAgent"] }) {
  return (
    <div className="rounded-lg bg-soft p-4">
      <h4 className="mb-3 text-sm font-bold text-textPrimary">{title}</h4>
      <KeyValueGrid columns="md:grid-cols-1" items={[["Full Name", agent?.FullName], ["Username", agent?.Username], ["Identity No.", agent?.IdentityNo], ["Email", agent?.Email], ["Contact No.", agent?.ContactNo]]} />
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

function ProcessSummaryItem({ icon: Icon, iconClassName, label, value, secondary }: { icon: typeof FileText; iconClassName: string; label: string; value: ReactNode; secondary: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[38px_minmax(0,1fr)] gap-3 md:border-r md:border-blue-100 md:pr-3 last:md:border-r-0">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClassName}`}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wide text-textSecondary">{label}</div>
        <div className="mt-0.5 truncate text-sm font-bold text-textPrimary">{value}</div>
        <div className="mt-0.5 truncate text-xs font-semibold text-textSecondary">{secondary}</div>
      </div>
    </div>
  );
}

function TableHead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap border-b border-line px-4 py-3 font-semibold ${className}`}>{children}</th>;
}

function TableCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`border-b border-line px-4 py-5 text-textSecondary ${className}`}>{children}</td>;
}

function TwoLine({ primary, secondary, tertiary }: { primary: ReactNode; secondary: ReactNode; tertiary?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="max-w-72 truncate text-sm font-semibold leading-5 text-textPrimary">{primary || "-"}</div>
      <div className="mt-0.5 max-w-72 truncate text-sm font-normal leading-5 text-textSecondary">{secondary || "-"}</div>
      {tertiary ? <div className="mt-0.5 max-w-72 truncate text-xs font-medium leading-4 text-textSecondary">{tertiary}</div> : null}
    </div>
  );
}

function createEmptyFilters(): CommissionFilters {
  return { batchNo: "", trustSearch: "", sellingAgentSearch: "", recipientAgentSearch: "", settlorSearch: "", payoutDateFrom: "", payoutDateTo: "", commissionStatus: allFilter, sortBy: "PAYOUT_DATE", sortDirection: "DESC" };
}

function createEmptyBatchFilters(): BatchFilters {
  return { search: "", batchStatus: allFilter, cutoffDateFrom: "", cutoffDateTo: "", sortBy: "CREATED_AT", sortDirection: "DESC" };
}

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

function normalizeStatus(value?: string | null) {
  return value?.trim().toUpperCase() || "";
}

function formatStatus(value?: string | null) {
  const normalized = normalizeStatus(value);
  if (!normalized) return "-";
  return normalized.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatCommissionType(value?: string | null) {
  return formatDatabaseDisplayValue(value);
}

function formatDatabaseDisplayValue(value?: string | null) {
  if (!value) return "-";

  const normalized = value.trim().toUpperCase();
  const displayValueByDatabaseValue: Record<string, string> = {
    ONE_OFF_COMMISSION: "One Off Commission",
    ONE_OFF: "One Off",
    GROSS_PLACEMENT_AMOUNT: "Gross Placement Amount",
    PERSONAL: "Personal",
    OVERRIDING: "Overriding"
  };

  return displayValueByDatabaseValue[normalized] ?? normalized.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
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

function formatDateRange(from?: string | null, to?: string | null) {
  if (!from && !to) return "-";
  return `${formatDate(from)} to ${formatDate(to)}`;
}

function formatJoined(values: Array<string | number | null | undefined>) {
  const text = values.map((value) => String(value ?? "").trim()).filter(Boolean);
  return text.length > 0 ? text.join(" - ") : "-";
}

const inputClass = "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-textPrimary focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink";
