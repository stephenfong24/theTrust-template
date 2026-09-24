import { AlertTriangle, Calendar, Check, CircleHelp, ClipboardList, Clock, CreditCard, Download, FileText, Landmark, Plus, RotateCcw, Search, Trash2, Upload, UserRound, Users, Wallet, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  trustApplicationApi,
  type TrustApplicationDetail,
  type TrustApplicationListItem,
  type TrustApplicationPaymentAllocation,
  type TrustApplicationPaymentList,
  type TrustApplicationPagination,
  type TrustApplicationStatusStatistic,
  type TrustApplicationWorkflowStatus
} from "../api/trustApplicationApi";
import { lookupApi, type BankLookupItem } from "../api/lookupApi";
import { trustPlanApi, type TrustProductListItem } from "../api/trustPlanApi";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { Modal } from "../components/common/Modal";
import { PageHeader } from "../components/common/PageHeader";
import { Pagination } from "../components/common/Pagination";
import { StatusBadge } from "../components/common/StatusBadge";
import { TableActionMenu } from "../components/common/TableActionMenu";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { DatePickerInput } from "../components/forms/DatePickerInput";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { useAuth } from "../hooks/useAuth";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { notifyError, notifySuccess } from "../services/notificationService";

const allFilter = "all";
const paymentSlipAllowedExtensions = new Set(["jpg", "jpeg", "png", "pdf"]);
const paymentSlipAllowedExtensionLabel = "JPG, JPEG, PNG or PDF";
const paymentSlipMaxFileSizeMb = 5;
const paymentSlipMaxFileSizeBytes = paymentSlipMaxFileSizeMb * 1024 * 1024;
const pageSizeOptions = [10, 20, 50, 100];
const statusOptions = ["DRAFT", "PENDING_PAYMENT_APPROVAL", "PAYMENT_APPROVED", "PENDING_ADMIN_APPROVAL", "SENT_OUT", "STAMPING", "COMPLETED", "EARLY_WITHDRAWN", "MATURED", "REJECTED"];
const decisionStatusOptions: TrustApplicationWorkflowStatus[] = ["PENDING_ADMIN_APPROVAL", "SENT_OUT", "STAMPING", "COMPLETED", "REJECTED"];
const emptyStatistics: TrustApplicationStatusStatistic = {
  Total: 0,
  Draft: 0,
  PendingPaymentApproval: 0,
  PaymentApproved: 0,
  PendingAdminApproval: 0,
  SentOut: 0,
  Stamping: 0,
  Completed: 0,
  EarlyWithdrawn: 0,
  Matured: 0,
  Rejected: 0
};

const statisticItems: Array<{ label: string; key: keyof TrustApplicationStatusStatistic; tone?: "default" | "warning" | "success" | "danger" }> = [
  { label: "All", key: "Total" },
  { label: "Draft", key: "Draft" },
  { label: "Payment Pending", key: "PendingPaymentApproval", tone: "warning" },
  { label: "Payment Approved", key: "PaymentApproved", tone: "success" },
  { label: "Admin Approval", key: "PendingAdminApproval", tone: "warning" },
  { label: "Sent Out", key: "SentOut" },
  { label: "Stamping", key: "Stamping" },
  { label: "Completed", key: "Completed", tone: "success" },
  { label: "Early Withdrawn", key: "EarlyWithdrawn", tone: "warning" },
  { label: "Matured", key: "Matured", tone: "success" },
  { label: "Rejected", key: "Rejected", tone: "danger" }
];

interface ListingFilters {
  search: string;
  productCode: string;
  applicationStatus: string;
  agentSearch: string;
  createdFrom: string;
  createdTo: string;
  submittedFrom: string;
  submittedTo: string;
}

export function TrustListingPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [records, setRecords] = useState<TrustApplicationListItem[]>([]);
  const [pagination, setPagination] = useState<TrustApplicationPagination>({ Page: 1, PageSize: 10, TotalRecords: 0, TotalPages: 1 });
  const [totalStatistics, setTotalStatistics] = useState<TrustApplicationStatusStatistic>(emptyStatistics);
  const [searchStatistics, setSearchStatistics] = useState<TrustApplicationStatusStatistic>(emptyStatistics);
  const [productOptions, setProductOptions] = useState<TrustProductListItem[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState<ListingFilters>(createEmptyFilters());
  const [filters, setFilters] = useState<ListingFilters>(createEmptyFilters());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrustApplicationListItem | null>(null);
  const [viewTarget, setViewTarget] = useState<TrustApplicationListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const canCreateApplication = session?.role === "AG";
  const canSearchAgent = session?.role !== "AG";

  useEffect(() => {
    let cancelled = false;

    trustPlanApi
      .getTrustProductList({
        Page: 1,
        PageSize: 100,
        Status: "ACTIVE"
      })
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

    async function loadTrustApplications() {
      setRecordsLoading(true);
      try {
        const result = await trustApplicationApi.getTrustApplicationList({
          page,
          pageSize,
          search: filters.search || undefined,
          productCode: filters.productCode === allFilter ? undefined : filters.productCode,
          applicationStatus: filters.applicationStatus === allFilter ? undefined : filters.applicationStatus,
          agentSearch: canSearchAgent ? filters.agentSearch || undefined : undefined,
          createdFrom: filters.createdFrom || undefined,
          createdTo: filters.createdTo || undefined,
          submittedFrom: filters.submittedFrom || undefined,
          submittedTo: filters.submittedTo || undefined,
          sortBy: "CREATED_AT",
          sortDirection: "DESC"
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
        notifyError(error instanceof Error ? error.message : "Unable to load trust application list.", "trust-application-list-load");
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    }

    loadTrustApplications();

    return () => {
      cancelled = true;
    };
  }, [canSearchAgent, filters, page, pageSize, refreshKey]);

  const pageCount = Math.max(1, pagination.TotalPages);

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({
      ...draftFilters,
      search: draftFilters.search.trim(),
      productCode: draftFilters.productCode,
      agentSearch: draftFilters.agentSearch.trim()
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

  const deleteTrustApplication = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await trustApplicationApi.deleteTrustApplication(deleteTarget.TrustID);
      notifySuccess("Trust application deleted successfully.", "trust-application-delete");
      setDeleteTarget(null);

      if (records.length === 1 && page > 1) {
        setPage((currentPage) => Math.max(1, currentPage - 1));
      } else {
        setRefreshKey((current) => current + 1);
      }
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to delete trust application.", "trust-application-delete-error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Trust Listing"
        description="Review submitted and draft trust applications, track progress, and continue in-progress client onboarding."
        actions={
          canCreateApplication ? (
            <Button type="button" onClick={() => navigate("/trust/applications/new/personal-details")}>
              <Plus className="h-4 w-4" />
              New Trust Application
            </Button>
          ) : null
        }
      />

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line p-4">
          <TotalStatistics statistics={totalStatistics} loading={recordsLoading} />
          <form onSubmit={submitFilters} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <SearchField
                label="Search"
                value={draftFilters.search}
                placeholder="Trust ID, name, identity no or email"
                className="md:col-span-2"
                onChange={(value) => setDraftFilters((current) => ({ ...current, search: value }))}
              />
              {canSearchAgent ? (
                <SearchField
                  label="Agent"
                  value={draftFilters.agentSearch}
                  placeholder="Agent name or email"
                  onChange={(value) => setDraftFilters((current) => ({ ...current, agentSearch: value }))}
                />
              ) : null}
              <ProductSelect
                value={draftFilters.productCode}
                options={productOptions}
                onChange={(value) => setDraftFilters((current) => ({ ...current, productCode: value }))}
              />
              <FilterSelect
                label="Status"
                value={draftFilters.applicationStatus}
                options={statusOptions}
                onChange={(value) => setDraftFilters((current) => ({ ...current, applicationStatus: value }))}
              />
              <DateRangeField
                label="Created Date"
                dateFrom={draftFilters.createdFrom}
                dateTo={draftFilters.createdTo}
                onDateFromChange={(value) => setDraftFilters((current) => ({ ...current, createdFrom: value }))}
                onDateToChange={(value) => setDraftFilters((current) => ({ ...current, createdTo: value }))}
              />
              <DateRangeField
                label="Submitted Date"
                dateFrom={draftFilters.submittedFrom}
                dateTo={draftFilters.submittedTo}
                onDateFromChange={(value) => setDraftFilters((current) => ({ ...current, submittedFrom: value }))}
                onDateToChange={(value) => setDraftFilters((current) => ({ ...current, submittedTo: value }))}
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
          <div className="text-sm font-semibold text-textSecondary">{pagination.TotalRecords} applications</div>
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
            <EmptyState title="No trust applications found" description="Adjust the filters and search again." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
                <tr>
                  <TableHead>No.</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Action</TableHead>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => {
                  const actionId = String(record.TrustApplicationID || record.TrustID);
                  const isDraft = isDraftStatus(record.ApplicationStatus);
                  const canEdit = session?.role === "AG" && isDraft;
                  const canDelete = isDraft && canDeleteDraftApplication(session?.role);

                  return (
                    <tr key={actionId} className="transition hover:bg-gray-50">
                      <TableCell className="font-semibold text-textPrimary">{(page - 1) * pageSize + index + 1}</TableCell>
                      <TableCell className="min-w-36">
                        <TwoLine primary={record.TrustNo || formatTrustNo(record.TrustID)} secondary={record.ProductName || "-"} />
                      </TableCell>
                      <TableCell className="min-w-48">
                        <TwoLine primary={record.TrustRepresentativeFullName || "-"} secondary={record.TrustRepresentativeUsername || "-"} />
                      </TableCell>
                      <TableCell className="min-w-52">
                        <TwoLine primary={record.FullName || "-"} secondary={[record.IdentityType, record.IdentityNo].filter(Boolean).join(" - ") || "-"} />
                      </TableCell>
                      <TableCell className="min-w-52">
                        <TwoLine primary={record.Email || "-"} secondary={record.ContactNo || "-"} />
                      </TableCell>
                      <TableCell className="min-w-32">
                        <span className="font-semibold text-textPrimary">{formatCurrency(record.TrustAssetAmount)}</span>
                      </TableCell>
                      <TableCell className="min-w-32">
                        <TwoLine primary={`Step ${record.CurrentStep || 0}`} secondary={`${record.LastCompletedStep || 0} completed`} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={formatStatusLabel(record.ApplicationStatus)} />
                      </TableCell>
                      <TableCell className="min-w-40">
                        <TwoLine primary={`Created ${formatDate(record.CreatedAt)}`} secondary={`Updated ${formatDate(record.UpdatedAt)}`} />
                      </TableCell>
                      <TableCell>
                        <TableActionMenu open={openActionId === actionId} onOpenChange={(open) => setOpenActionId(open ? actionId : null)} ariaLabel={`Actions for Trust ID ${record.TrustID}`}>
                          <ActionItem
                            label="View"
                            onClick={() => {
                              setOpenActionId(null);
                              setViewTarget(record);
                            }}
                          />
                          <ActionItem
                            label="Edit"
                            disabled={!canEdit}
                            onClick={() => {
                              setOpenActionId(null);
                              navigate(`/trust/applications/${record.TrustID}/personal-details`);
                            }}
                          />
                          <ActionItem
                            label="Delete"
                            disabled={!canDelete}
                            onClick={() => {
                              setOpenActionId(null);
                              setDeleteTarget(record);
                            }}
                          />
                        </TableActionMenu>
                      </TableCell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination currentPage={page} pageCount={pageCount} totalRecords={pagination.TotalRecords} pageSize={pageSize} itemLabel="applications" onPageChange={setPage} />
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete trust application"
        message={deleteTarget ? `Are you sure you want to delete ${deleteTarget.TrustNo || formatTrustNo(deleteTarget.TrustID)}?` : "Are you sure you want to delete this trust application?"}
        confirmText={deleting ? "Deleting..." : "Delete"}
        destructive
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleting) void deleteTrustApplication();
        }}
      />

      <TrustApplicationViewDrawer record={viewTarget} onClose={() => setViewTarget(null)} onDecisionSubmitted={() => setRefreshKey((current) => current + 1)} />
    </>
  );
}

function TrustApplicationViewDrawer({ record, onClose, onDecisionSubmitted }: { record: TrustApplicationListItem | null; onClose: () => void; onDecisionSubmitted: () => void }) {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<ViewTabId>("overview");
  const [detail, setDetail] = useState<ViewDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionStatus, setDecisionStatus] = useState("");
  const [decisionRemark, setDecisionRemark] = useState("");
  const [decisionConfirmOpen, setDecisionConfirmOpen] = useState(false);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const canViewAuditTab = session?.role !== "AG";
  const canViewDecisionButton = session?.role === "SA" || session?.role === "AD";
  const visibleActiveTab = canViewAuditTab || activeTab !== "audit" ? activeTab : "overview";
  const currentDecisionStatus = normalizeApplicationStatus(detail?.status || record?.ApplicationStatus);
  const enabledDecisionStatuses = getEnabledDecisionStatuses(currentDecisionStatus);
  const isDecisionButtonDisabled = isDecisionButtonDisabledForStatus(currentDecisionStatus);
  const canManagePaymentAllocations = session?.role === "AG" && currentDecisionStatus === "PENDING_PAYMENT_APPROVAL";
  useBodyScrollLock(Boolean(record));

  const refreshViewDetail = useCallback(async () => {
    if (!record) return;

    const [updatedDetail, banks] = await Promise.all([
      trustApplicationApi.getTrustApplication(record.TrustID),
      lookupApi.getBankList().catch(() => [])
    ]);
    setDetail(mapTrustApplicationViewDetail(updatedDetail, record, createBankDescriptionMap(banks)));
    onDecisionSubmitted();
  }, [onDecisionSubmitted, record]);

  const updatePaymentDetail = useCallback((payment: TrustApplicationPaymentList) => {
    setDetail((currentDetail) =>
      currentDetail
        ? {
            ...currentDetail,
            payment,
            payments: mapPayments((payment.Payments ?? []) as unknown as Record<string, unknown>[])
          }
        : currentDetail
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadApplicationDetail() {
      if (!record) {
        setDetail(null);
        setLoadError("");
        setDecisionModalOpen(false);
        setDecisionConfirmOpen(false);
        setDecisionStatus("");
        setDecisionRemark("");
        setDecisionSubmitting(false);
        return;
      }

      setActiveTab("overview");
      setDecisionModalOpen(false);
      setDecisionConfirmOpen(false);
      setDecisionStatus("");
      setDecisionRemark("");
      setDecisionSubmitting(false);
      setLoading(true);
      setLoadError("");

      try {
        const [applicationResult, bankResult] = await Promise.allSettled([
          trustApplicationApi.getTrustApplication(record.TrustID),
          lookupApi.getBankList()
        ]);
        if (cancelled) return;

        if (bankResult.status === "fulfilled") {
          const descriptions = createBankDescriptionMap(bankResult.value);
          if (applicationResult.status === "fulfilled") setDetail(mapTrustApplicationViewDetail(applicationResult.value, record, descriptions));
        } else {
          if (applicationResult.status === "fulfilled") setDetail(mapTrustApplicationViewDetail(applicationResult.value, record, new Map()));
        }

        if (applicationResult.status === "rejected") {
          throw applicationResult.reason;
        }
      } catch (error) {
        if (!cancelled) {
          setDetail(null);
          setLoadError(error instanceof Error ? error.message : "Unable to load trust application.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadApplicationDetail();

    return () => {
      cancelled = true;
    };
  }, [record]);

  const submitDecisionPreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!decisionStatus) {
      notifyError("New application status is required.", "trust-application-decision-status");
      return;
    }

    if (!isTrustApplicationWorkflowStatus(decisionStatus) || !enabledDecisionStatuses.includes(decisionStatus)) {
      notifyError("Selected status is not allowed for the current application status.", "trust-application-decision-status-not-allowed");
      return;
    }

    setDecisionConfirmOpen(true);
  };

  const confirmDecisionPreview = async () => {
    if (!record || !isTrustApplicationWorkflowStatus(decisionStatus)) return;

    setDecisionSubmitting(true);
    try {
      const result = await trustApplicationApi.submitWorkflowDecision(record.TrustID, decisionStatus, {
        Remark: decisionRemark.trim() || undefined
      });

      await refreshViewDetail();
      notifySuccess(`Trust application status changed to ${formatStatusLabel(result.ApplicationStatus)}.`, "trust-application-decision");
      setDecisionStatus("");
      setDecisionRemark("");
      setDecisionModalOpen(false);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to submit trust application decision.", "trust-application-decision-error");
    } finally {
      setDecisionSubmitting(false);
    }

    setDecisionConfirmOpen(false);
  };

  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="View trust application">
      <button type="button" className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]" aria-label="Close view panel" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[1180px] flex-col overflow-hidden border-l border-line bg-soft shadow-[0_24px_80px_rgba(17,17,17,0.28)] duration-200 animate-in slide-in-from-right sm:w-[94vw] xl:w-[1180px]">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="border-b border-line bg-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-textSecondary">
                  <span>Trust Application</span>
                  <span className="text-brandGold">/</span>
                  <span className="text-textPrimary">View Application</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-normal text-ink sm:text-3xl">Trust Application {detail?.trustId || record.TrustNo || formatTrustNo(record.TrustID)}</h2>
                  <StatusBadge status={formatStatusLabel(detail?.status || record.ApplicationStatus)} />
                </div>
                <p className="mt-1 text-sm font-medium text-textSecondary">View and manage trust application details</p>
              </div>
              <div className="flex items-center gap-2">
                {canViewDecisionButton ? (
                  <button type="button" disabled={isDecisionButtonDisabled} onClick={() => setDecisionModalOpen(true)} className="inline-flex h-10 items-center justify-center rounded-lg border border-brandGold bg-brandGold px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-[#B89222] disabled:cursor-not-allowed disabled:border-line disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none">
                    Decision
                  </button>
                ) : null}
                <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-textSecondary transition hover:border-brandGold hover:text-ink" aria-label="Close panel">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="mt-5">
                <LoadingSkeleton />
              </div>
            ) : loadError ? (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{loadError}</div>
            ) : detail ? (
              <>
                <ApplicationSummaryPanel detail={detail} />
                {detail.timeline.length ? (
                  <div className="mt-4">
                    <ApplicationTimeline steps={detail.timeline} statusCard={detail.terminalStatusCard} />
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          {detail ? (
            <>
              <ApplicationTabs activeTab={visibleActiveTab} onTabChange={setActiveTab} canViewAuditTab={canViewAuditTab} />

              <ApplicationTabContent
                activeTab={visibleActiveTab}
                detail={detail}
                userRole={session?.role}
                canManagePaymentAllocations={canManagePaymentAllocations}
                onPaymentChanged={updatePaymentDetail}
                onRefreshDetail={refreshViewDetail}
              />
            </>
          ) : null}
        </div>
      </aside>

      <Dialog open={decisionModalOpen} onOpenChange={(open) => setDecisionModalOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Decision</DialogTitle>
            <DialogDescription>Update the trust application status.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitDecisionPreview} className="space-y-4">
            <div className="rounded-lg border border-line bg-soft px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-wide text-textSecondary">Current Status</div>
              <div className="mt-1 text-sm font-semibold text-textPrimary">{formatStatusLabel(detail?.status || record.ApplicationStatus)}</div>
            </div>

            <label className="block text-sm font-semibold text-textPrimary">
              New Application Status
              <select
                value={decisionStatus}
                onChange={(event) => setDecisionStatus(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                <option value="">Please select</option>
                {decisionStatusOptions.map((status) => (
                  <option key={status} value={status} disabled={!enabledDecisionStatuses.includes(status)}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-textPrimary">
              Remark
              <textarea
                value={decisionRemark}
                onChange={(event) => setDecisionRemark(event.target.value)}
                rows={4}
                placeholder="Optional"
                className="mt-1 w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </label>

            <DialogFooter>
              <Button type="submit" disabled={decisionSubmitting}>Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={decisionConfirmOpen}
        title="Submit decision"
        message={`Confirm changing this application status to ${formatStatusLabel(decisionStatus)}?`}
        confirmText={decisionSubmitting ? "Submitting..." : "Confirm"}
        destructive={decisionStatus === "REJECTED"}
        onClose={() => {
          if (!decisionSubmitting) setDecisionConfirmOpen(false);
        }}
        onConfirm={() => {
          if (!decisionSubmitting) void confirmDecisionPreview();
        }}
      />
    </div>
  );
}

type ViewTabId = "overview" | "personal-details" | "trust-asset" | "beneficiaries" | "allocations" | "trust-deed" | "supporting-document" | "co-broker" | "audit";

type ViewTabConfig = { id: ViewTabId; label: string; icon: typeof FileText };

type ViewSummaryItem = {
  label: string;
  value: string;
  icon: typeof FileText;
};

type ViewTimelineItem = {
  statusCode: string;
  label: string;
  date: string;
  done: boolean;
};

type ViewTerminalStatusCard = {
  status: string;
  previousStatus: string;
  changedAt: string;
  changedTime: string;
  changedBy: string;
};

type ViewInfoItem = {
  label: string;
  value: string;
};

type ViewInfoSection = {
  title: string;
  items: ViewInfoItem[];
};

type BeneficiaryViewCard = {
  title: string;
  sections: ViewInfoSection[];
};

type ViewAllocationDetail = {
  allocationType: ViewInfoItem[];
  beneficiaries: ViewInfoItem[];
};

type PaymentOverviewRow = {
  paymentId: number;
  paymentNo?: number;
  allocation: string;
  amount: string;
  amountValue: number;
  referenceNo: string;
  uploadedSlip: string;
  uploadedBy: string;
  uploadedDate: string;
  financeRemark: string;
  status: string;
  rawStatus: string;
  downloadUrl: string;
};

type PaymentOverviewFilter = "active" | "rejected" | "cancelled";

type ViewDetail = {
  trustNumericId: number;
  trustId: string;
  trustPlanName: string;
  status: string;
  summary: ViewSummaryItem[];
  timeline: ViewTimelineItem[];
  terminalStatusCard: ViewTerminalStatusCard | null;
  trustPlanInfo: ViewInfoItem[];
  applicantInfo: ViewInfoItem[];
  overview: ViewInfoItem[];
  personalDetails: ViewInfoSection[];
  trustAsset: ViewInfoItem[];
  trustAssetSections: ViewInfoSection[];
  beneficiaries: BeneficiaryViewCard[];
  caretaker: ViewInfoItem[];
  allocations: ViewAllocationDetail;
  trustDeed: ViewInfoItem[];
  coBrokers: ViewInfoItem[];
  documents: Array<{ name: string; description: string; type: string; issuedDate: string; viewUrl: string }>;
  supportingDocuments: Array<{ name: string; type: string; size: string; uploadedBy: string; uploadedDate: string; downloadUrl: string }>;
  payment: TrustApplicationPaymentList | null;
  payments: PaymentOverviewRow[];
  history: Array<{ title: string; description: string; actor: string; date: string; time: string }>;
};

function ApplicationSummaryPanel({ detail }: { detail: ViewDetail }) {
  return (
    <section className="mt-5 overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        {detail.summary.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="min-w-0 border-b border-line p-4 sm:border-r xl:border-b-0 xl:last:border-r-0">
              <div className="flex min-w-0 items-start gap-3.5">
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brandGold/30 bg-[#FFFBEB] text-brandGold">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wide text-textSecondary">{item.label}</div>
                  <div className="mt-1 break-words text-base font-bold leading-snug text-ink">{item.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ApplicationTimeline({ steps, statusCard }: { steps: ViewTimelineItem[]; statusCard?: ViewTerminalStatusCard | null }) {
  const completedCount = steps.filter((step) => step.done).length;
  const currentIndex = Math.max(0, completedCount - 1);
  const progressWidth = steps.length > 1 ? `${(currentIndex / (steps.length - 1)) * 100}%` : "0%";

  return (
    <section className="overflow-x-auto rounded-lg border border-[#E8D8AD] bg-[#FFFCF4] shadow-soft">
      <div className="h-1 bg-brandGold" />
      <ol className="relative grid min-w-[980px] items-start px-8 pt-7" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(132px, 1fr))` }}>
        <span className="absolute left-24 right-24 top-[52px] h-1 rounded-full bg-[#F0E8D8]" aria-hidden="true" />
        <span className="absolute left-24 right-24 top-[52px] h-1 overflow-hidden rounded-full" aria-hidden="true">
          <span className="block h-full rounded-full bg-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.08)] transition-all" style={{ width: progressWidth }} />
        </span>
        {steps.map((step, index) => {
          const isCurrent = step.done && index === currentIndex;
          const isCompleted = step.done && !isCurrent;
          const markerClass = isCurrent
            ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_14px_30px_rgba(16,185,129,0.24)] ring-4 ring-emerald-100"
            : isCompleted
              ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_10px_22px_rgba(16,185,129,0.22)]"
              : "border-line bg-white text-textSecondary shadow-sm";
          const labelClass = isCurrent ? "text-ink" : isCompleted ? "text-textPrimary" : "text-textSecondary";
          const dateClass = isCurrent ? "border-brandGold/30 bg-[#FFFBEB] text-brandGold" : isCompleted ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-line bg-soft text-textSecondary";

          return (
            <li key={step.label} className="relative z-10 flex flex-col items-center px-3 text-center">
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full border transition ${markerClass}`}>
                <Check className="h-5 w-5 stroke-[2.5]" />
              </span>
              <span className={`mt-4 flex min-h-10 max-w-40 items-start justify-center text-sm font-bold leading-5 ${labelClass}`}>{step.label}</span>
              <span className={`mt-2 inline-flex min-h-7 min-w-20 items-center justify-center rounded-full border px-3 text-xs font-bold ${dateClass}`}>{step.date || "-"}</span>
            </li>
          );
        })}
      </ol>
      {statusCard ? <TerminalStatusCard card={statusCard} anchorIndex={currentIndex} stepCount={steps.length} /> : <div className="pb-6" />}
    </section>
  );
}

function TerminalStatusCard({ card, anchorIndex, stepCount }: { card: ViewTerminalStatusCard; anchorIndex: number; stepCount: number }) {
  const isRejected = card.status === "REJECTED";
  const isMatured = card.status === "MATURED";
  const toneClass = isRejected ? "border-red-200 bg-red-50 text-red-800" : isMatured ? "border-emerald-300 bg-white text-emerald-800 shadow-[0_10px_24px_rgba(16,185,129,0.14)]" : "border-amber-200 bg-amber-50 text-amber-800";
  const iconClass = isRejected ? "bg-red-100 text-red-700" : isMatured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  const helpClass = isRejected ? "text-red-700 hover:text-red-900" : isMatured ? "text-emerald-700 hover:text-emerald-900" : "text-amber-700 hover:text-amber-900";
  const StatusIcon = isMatured ? Check : AlertTriangle;
  const tooltipMessage = getTerminalStatusTooltipMessage(card);
  const gridColumn = Math.min(Math.max(anchorIndex + 1, 1), Math.max(stepCount, 1));
  const cardStartColumn = Math.min(Math.max(gridColumn, 1), Math.max(stepCount - 2, 1));
  const cardSpan = Math.min(3, Math.max(stepCount - cardStartColumn + 1, 1));

  return (
    <div className="grid min-w-[980px] px-8 pb-6" style={{ gridTemplateColumns: `repeat(${stepCount}, minmax(132px, 1fr))` }}>
      <div className="h-6 w-px justify-self-center bg-[#D8C9A5]" style={{ gridColumn }} aria-hidden="true" />
      <div className={`inline-flex w-fit max-w-[260px] items-center gap-2 justify-self-start rounded-lg border px-3 py-2.5 shadow-sm ${toneClass}`} style={{ gridColumn: `${cardStartColumn} / span ${cardSpan}` }}>
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <StatusIcon className="h-4 w-4" />
        </span>
        <span className="whitespace-nowrap text-sm font-bold text-ink">{formatStatusLabel(card.status)}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition ${helpClass}`} aria-label={`${formatStatusLabel(card.status)} details`}>
                <CircleHelp className="h-4 w-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <span className="block w-72 max-w-[calc(100vw-2rem)] whitespace-normal text-left leading-relaxed">
                <span className="block">{tooltipMessage}</span>
                <span className="block">Updated by {card.changedBy || "-"}</span>
              </span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

function getTerminalStatusTooltipMessage(card: ViewTerminalStatusCard) {
  if (card.status === "EARLY_WITHDRAWN") return "This trust was withdrawn before its maturity.";
  if (card.status === "MATURED") return "This trust reached the end of its fund management period.";
  return `This trust application was rejected on ${card.changedAt}.`;
}

function ApplicationTabs({ activeTab, onTabChange, canViewAuditTab }: { activeTab: ViewTabId; onTabChange: (tab: ViewTabId) => void; canViewAuditTab: boolean }) {
  const allTabs: ViewTabConfig[] = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "personal-details", label: "Personal Details", icon: UserRound },
    { id: "trust-asset", label: "Trust Asset", icon: Wallet },
    { id: "beneficiaries", label: "Beneficiaries", icon: Users },
    { id: "allocations", label: "Allocations", icon: ClipboardList },
    { id: "trust-deed", label: "Trust Deed", icon: FileText },
    { id: "supporting-document", label: "Supporting Document", icon: ClipboardList },
    { id: "co-broker", label: "Co-broker", icon: Landmark },
    { id: "audit", label: "Audit", icon: Clock }
  ];
  const tabs = allTabs.filter((tab) => canViewAuditTab || tab.id !== "audit");

  return (
    <div className="border-b border-line bg-white px-4 sm:px-6">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-bold transition ${activeTab === tab.id ? "border-brandGold text-ink" : "border-transparent text-textSecondary hover:text-ink"}`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ApplicationTabContent({
  activeTab,
  detail,
  userRole,
  canManagePaymentAllocations,
  onPaymentChanged,
  onRefreshDetail
}: {
  activeTab: ViewTabId;
  detail: ViewDetail;
  userRole?: string | null;
  canManagePaymentAllocations: boolean;
  onPaymentChanged: (payment: TrustApplicationPaymentList) => void;
  onRefreshDetail: () => Promise<void>;
}) {
  if (activeTab === "overview") {
    return (
      <div className="grid gap-4 px-4 py-5 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <TrustPlanInfoCard detail={detail} />
          <ApplicantInfoCard detail={detail} />
        </div>
        <PaymentsTable
          detail={detail}
          userRole={userRole}
          canManagePaymentAllocations={canManagePaymentAllocations}
          onPaymentChanged={onPaymentChanged}
          onRefreshDetail={onRefreshDetail}
        />
        <DocumentsListingTable documents={detail.documents} />
      </div>
    );
  }

  if (activeTab === "audit") {
    return (
      <div className="px-4 py-5 sm:px-6">
        <div className="max-w-2xl">
          <ApplicationHistoryCard detail={detail} />
        </div>
      </div>
    );
  }

  if (activeTab === "supporting-document") {
    return (
      <div className="px-4 py-5 sm:px-6">
        <SupportingDocumentsTable documents={detail.supportingDocuments} />
      </div>
    );
  }

  if (activeTab === "beneficiaries") {
    return <BeneficiariesTabContent detail={detail} />;
  }

  if (activeTab === "allocations") {
    return <AllocationsTabContent detail={detail} />;
  }

  if (activeTab === "trust-asset") {
    return (
      <div className="px-4 py-5 sm:px-6">
        <SampleSectionedInfoCard title="Trust Asset" icon={Wallet} sections={detail.trustAssetSections} columns={3} />
      </div>
    );
  }

  if (activeTab === "personal-details") {
    return (
      <div className="px-4 py-5 sm:px-6">
        <SampleSectionedInfoCard title="Personal Details" icon={UserRound} sections={detail.personalDetails} columns={3} />
      </div>
    );
  }

  const tabContent = getDetailTabContent(activeTab, detail);
  return (
    <div className="grid gap-4 px-4 py-5 sm:px-6 lg:grid-cols-2">
      <SampleInfoCard title={tabContent.title} icon={tabContent.icon} items={tabContent.items} />
      {tabContent.secondary ? <SampleInfoCard title={tabContent.secondary.title} icon={tabContent.secondary.icon} items={tabContent.secondary.items} /> : null}
    </div>
  );
}

function AllocationsTabContent({ detail }: { detail: ViewDetail }) {
  return (
    <div className="px-4 py-5 sm:px-6">
      <ViewCard title="Allocations" icon={ClipboardList}>
        <div className="space-y-5">
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-line pb-2">
              <span className="h-5 w-1 rounded-full bg-brandGold" aria-hidden="true" />
              <h4 className="text-sm font-semibold text-textPrimary">Allocation Method</h4>
            </div>
            <InfoGrid items={detail.allocations.allocationType} columns={1} />
          </section>
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-line pb-2">
              <span className="h-5 w-1 rounded-full bg-brandGold" aria-hidden="true" />
              <h4 className="text-sm font-semibold text-textPrimary">Beneficiary Allocations</h4>
            </div>
            <InfoGrid items={detail.allocations.beneficiaries} columns={3} />
          </section>
        </div>
      </ViewCard>
    </div>
  );
}

function BeneficiariesTabContent({ detail }: { detail: ViewDetail }) {
  return (
    <div className="grid gap-4 px-4 py-5 sm:px-6">
      {detail.caretaker.length ? <SampleInfoCard title="Caretaker" icon={UserRound} items={detail.caretaker} /> : null}
      {detail.beneficiaries.length ? (
        detail.beneficiaries.map((beneficiary) => (
          <SampleSectionedInfoCard key={beneficiary.title} title={beneficiary.title} icon={Users} sections={beneficiary.sections} columns={3} />
        ))
      ) : (
        <SampleInfoCard title="Beneficiaries" icon={Users} items={[]} />
      )}
    </div>
  );
}

function SampleSectionedInfoCard({ title, icon, sections, columns = 2 }: { title: string; icon: typeof FileText; sections: ViewInfoSection[]; columns?: 2 | 3 }) {
  return (
    <ViewCard title={title} icon={icon}>
      <SectionedInfoGrid sections={sections} columns={columns} />
    </ViewCard>
  );
}

function SampleInfoCard({ title, icon, items }: { title: string; icon: typeof FileText; items: ViewInfoItem[] }) {
  return (
    <ViewCard title={title} icon={icon}>
      <InfoGrid items={items} />
    </ViewCard>
  );
}

function DocumentsListingTable({ documents }: { documents: ViewDetail["documents"] }) {
  return (
    <ViewCard title="Documents Listing" icon={FileText}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
            <tr>
              <TableHead>Document</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Issued Date</TableHead>
              <TableHead className="text-right">Download</TableHead>
            </tr>
          </thead>
          <tbody>
            {documents.length ? (
              documents.map((document) => (
                <tr key={`${document.type}-${document.name}`} className="transition hover:bg-gray-50">
                  <TableCell className="font-semibold text-textPrimary">{document.name}</TableCell>
                  <TableCell>{document.description || "-"}</TableCell>
                  <TableCell>{document.type}</TableCell>
                  <TableCell>{document.issuedDate}</TableCell>
                  <TableCell className="text-right">
                    <PdfViewLink href={document.viewUrl} label={`Download ${document.name}`} />
                  </TableCell>
                </tr>
              ))
            ) : (
              <EmptyTableRow colSpan={5} message="No documents available." />
            )}
          </tbody>
        </table>
      </div>
    </ViewCard>
  );
}

function PaymentsTable({
  detail,
  userRole,
  canManagePaymentAllocations,
  onPaymentChanged,
  onRefreshDetail
}: {
  detail: ViewDetail;
  userRole?: string | null;
  canManagePaymentAllocations: boolean;
  onPaymentChanged: (payment: TrustApplicationPaymentList) => void;
  onRefreshDetail: () => Promise<void>;
}) {
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PaymentOverviewRow | null>(null);
  const [uploadTarget, setUploadTarget] = useState<PaymentOverviewRow | null>(null);
  const [uploadPaymentDate, setUploadPaymentDate] = useState("");
  const [uploadReferenceNo, setUploadReferenceNo] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<PaymentOverviewRow | null>(null);
  const [decisionAction, setDecisionAction] = useState<"approve" | "reject" | null>(null);
  const [decisionRemark, setDecisionRemark] = useState("");
  const [commencementDate, setCommencementDate] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<PaymentOverviewFilter>("active");
  const [expandedRemarkIds, setExpandedRemarkIds] = useState<Set<number>>(() => new Set());
  const paymentFilterOptions: Array<{ key: PaymentOverviewFilter; label: string }> = [
    { key: "active", label: "Active" },
    { key: "rejected", label: "Rejected" },
    { key: "cancelled", label: "Cancelled" }
  ];
  const paymentFilterCounts = {
    active: detail.payments.filter((payment) => isPaymentOverviewFilterMatch(payment, "active")).length,
    rejected: detail.payments.filter((payment) => isPaymentOverviewFilterMatch(payment, "rejected")).length,
    cancelled: detail.payments.filter((payment) => isPaymentOverviewFilterMatch(payment, "cancelled")).length
  };
  const payments = sortPaymentOverviewRows(detail.payments.filter((payment) => isPaymentOverviewFilterMatch(payment, paymentFilter)), paymentFilter);
  const normalizedRole = userRole?.toUpperCase();
  const isAgent = normalizedRole === "AG";
  const canReviewPayment = normalizedRole === "SA" || normalizedRole === "AD" || normalizedRole === "AC";
  const showActionColumn = isAgent || canReviewPayment;

  const openPaymentDecision = (payment: PaymentOverviewRow, action: "approve" | "reject") => {
    setDecisionTarget(payment);
    setDecisionAction(action);
    setDecisionRemark("");
    setCommencementDate("");
    setConfirmOpen(false);
  };

  const openUploadPaymentSlip = (payment: PaymentOverviewRow) => {
    setUploadTarget(payment);
    setUploadPaymentDate("");
    setUploadReferenceNo("");
    setUploadFile(null);
  };

  const closeUploadPaymentSlip = () => {
    if (actionSubmitting) return;
    setUploadTarget(null);
    setUploadPaymentDate("");
    setUploadReferenceNo("");
    setUploadFile(null);
  };

  const submitPaymentSlipUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadTarget) return;

    if (!uploadPaymentDate) {
      notifyError("Payment date is required.", "payment-slip-date");
      return;
    }

    if (!uploadFile) {
      notifyError("Payment slip file is required.", "payment-slip-file");
      return;
    }

    const uploadFileError = getPaymentSlipFileValidationError(uploadFile);
    if (uploadFileError) {
      notifyError(uploadFileError, "payment-slip-file-validation");
      return;
    }

    setActionSubmitting(true);
    try {
      await trustApplicationApi.uploadPaymentSlip(detail.trustNumericId, uploadTarget.paymentId, {
        paymentDate: uploadPaymentDate,
        referenceNo: uploadReferenceNo,
        file: uploadFile
      });
      await onRefreshDetail();
      notifySuccess("Payment slip uploaded successfully.", "payment-slip-upload-success");
      setUploadTarget(null);
      setUploadPaymentDate("");
      setUploadReferenceNo("");
      setUploadFile(null);
    } catch (error) {
      notifyError(getPaymentErrorMessage(error, "Unable to upload payment slip."), "payment-slip-upload-error");
    } finally {
      setActionSubmitting(false);
    }
  };

  const submitPaymentDecision = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!decisionTarget || !decisionAction) return;

    if (decisionAction === "reject" && !decisionRemark.trim()) {
      notifyError("Remark is required when rejecting a payment.", "payment-reject-remark");
      return;
    }

    if (isFinalPaymentApproval(detail, decisionTarget) && !commencementDate) {
      notifyError("Commencement date is required when approving the final payment.", "payment-approve-commencement-date");
      return;
    }

    setConfirmOpen(true);
  };

  const confirmDeletePayment = async () => {
    if (!deleteTarget) return;

    setActionSubmitting(true);
    try {
      await trustApplicationApi.cancelPaymentAllocation(detail.trustNumericId, deleteTarget.paymentId);
      await onRefreshDetail();
      notifySuccess("Payment allocation deleted successfully.", "payment-delete-success");
      setDeleteTarget(null);
    } catch (error) {
      notifyError(getPaymentErrorMessage(error, "Unable to delete payment allocation."), "payment-delete-error");
    } finally {
      setActionSubmitting(false);
    }
  };

  const confirmPaymentDecision = async () => {
    if (!decisionTarget || !decisionAction) return;

    setActionSubmitting(true);
    try {
      const payload = {
        FinanceRemark: decisionRemark.trim() || undefined,
        CommencementDate: decisionAction === "approve" && commencementDate ? commencementDate : undefined
      };

      if (decisionAction === "approve") {
        await trustApplicationApi.approvePayment(detail.trustNumericId, decisionTarget.paymentId, payload);
      } else {
        await trustApplicationApi.rejectPayment(detail.trustNumericId, decisionTarget.paymentId, payload);
      }

      await onRefreshDetail();
      notifySuccess(`Payment ${decisionAction === "approve" ? "approved" : "rejected"} successfully.`, `payment-${decisionAction}-success`);
      setDecisionTarget(null);
      setDecisionAction(null);
      setDecisionRemark("");
      setCommencementDate("");
      setConfirmOpen(false);
    } catch (error) {
      notifyError(getPaymentErrorMessage(error, `Unable to ${decisionAction} payment.`), `payment-${decisionAction}-error`);
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <>
      <ViewCard
        title="Payments"
        icon={CreditCard}
        action={
          canManagePaymentAllocations ? (
            <Button
              type="button"
              onClick={() => setAllocationModalOpen(true)}
              className="h-11 border border-brandGold bg-brandGold px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-[#B89222]"
            >
              <CreditCard className="h-4 w-4" />
              Payment Allocations
            </Button>
          ) : null
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {paymentFilterOptions.map((option) => {
            const selected = paymentFilter === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setPaymentFilter(option.key)}
                className={
                  selected
                    ? "inline-flex h-9 items-center rounded-lg border border-ink bg-ink px-4 text-sm font-semibold text-white shadow-sm"
                    : "inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-textPrimary shadow-sm transition hover:border-brandGold hover:bg-[#FFFBEB]"
                }
              >
                {option.label} ({paymentFilterCounts[option.key]})
              </button>
            );
          })}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                <TableHead>Payment No.</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference No.</TableHead>
                <TableHead>Uploaded Slip</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead>Status</TableHead>
                {showActionColumn ? <TableHead className="text-right">Action</TableHead> : null}
              </tr>
            </thead>
            <tbody>
              {payments.length ? (
                payments.map((payment) => (
                  <tr key={`${payment.paymentId}-${payment.allocation}-${payment.uploadedSlip}`} className="transition hover:bg-gray-50">
                    <TableCell className="font-semibold text-textPrimary">{formatPaymentNo(payment.paymentNo)}</TableCell>
                    <TableCell className="font-semibold text-textPrimary">{payment.amount}</TableCell>
                    <TableCell>{payment.referenceNo || "-"}</TableCell>
                    <TableCell>
                      {payment.uploadedSlip && payment.downloadUrl ? (
                        <a href={payment.downloadUrl} target="_blank" rel="noreferrer" className="font-semibold text-ink underline-offset-4 hover:underline" title={payment.uploadedSlip}>
                          {middleEllipsis(payment.uploadedSlip, 24, 6)}
                        </a>
                      ) : (
                        payment.uploadedSlip ? <span title={payment.uploadedSlip}>{middleEllipsis(payment.uploadedSlip, 24, 6)}</span> : "-"
                      )}
                    </TableCell>
                    <TableCell nowrap={false} className="min-w-64 break-words leading-6">
                      <ExpandableRemark
                        value={payment.financeRemark}
                        expanded={expandedRemarkIds.has(payment.paymentId)}
                        onExpand={() =>
                          setExpandedRemarkIds((currentIds) => {
                            const nextIds = new Set(currentIds);
                            nextIds.add(payment.paymentId);
                            return nextIds;
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>
                    {showActionColumn ? (
                      <TableCell className="text-right">
                        {isAgent ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              disabled={!canUploadPaymentSlip(payment) || actionSubmitting}
                              onClick={() => openUploadPaymentSlip(payment)}
                              aria-label={`Upload payment slip for ${payment.allocation}`}
                              title={canUploadPaymentSlip(payment) ? "Upload payment slip" : "Only waiting payment can upload payment slip"}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              disabled={!canDeletePaymentOverview(payment) || actionSubmitting}
                              onClick={() => setDeleteTarget(payment)}
                              aria-label={`Delete ${payment.allocation}`}
                              title={canDeletePaymentOverview(payment) ? "Delete payment allocation" : "Only waiting payment or pending approval payments can be deleted"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                        {canReviewPayment ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={!canReviewPaymentOverview(payment) || actionSubmitting}
                              onClick={() => openPaymentDecision(payment, "reject")}
                              title={canReviewPaymentOverview(payment) ? "Reject payment" : "Only pending approval payments can be rejected"}
                            >
                              Reject
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={!canReviewPaymentOverview(payment) || actionSubmitting}
                              onClick={() => openPaymentDecision(payment, "approve")}
                              title={canReviewPaymentOverview(payment) ? "Approve payment" : "Only pending approval payments can be approved"}
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </tr>
                ))
              ) : (
                <EmptyTableRow colSpan={showActionColumn ? 7 : 6} message="No payments available." />
              )}
            </tbody>
          </table>
        </div>
      </ViewCard>

      {canManagePaymentAllocations ? (
        <PaymentAllocationsModal
          open={allocationModalOpen}
          detail={detail}
          onClose={() => setAllocationModalOpen(false)}
          onPaymentChanged={onPaymentChanged}
          onRefreshDetail={onRefreshDetail}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete payment allocation"
        message={deleteTarget ? `Are you sure you want to delete Payment no. ${formatPaymentNo(deleteTarget.paymentNo)}?` : "Are you sure you want to delete this payment allocation?"}
        confirmText={actionSubmitting ? "Deleting..." : "Delete"}
        destructive
        onClose={() => {
          if (!actionSubmitting) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!actionSubmitting) void confirmDeletePayment();
        }}
      />

      <Modal open={Boolean(uploadTarget)} title="Upload Payment Slip" maxWidthClass="max-w-lg" onClose={closeUploadPaymentSlip}>
        <form onSubmit={submitPaymentSlipUpload} className="space-y-4">
          <div className="rounded-lg border border-line bg-white px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-wide text-textSecondary">Payment Allocation</div>
            <div className="mt-1 text-sm font-semibold text-textPrimary">{uploadTarget?.allocation || "-"}</div>
            <div className="mt-1 text-sm font-semibold text-textSecondary">{uploadTarget?.amount || "-"}</div>
          </div>

          <DatePickerInput
            label="Payment Date"
            value={uploadPaymentDate}
            onChange={setUploadPaymentDate}
            required
            dialogTitle="Payment Date"
          />

          <label className="block text-sm font-semibold text-textPrimary">
            Reference No.
            <input
              value={uploadReferenceNo}
              onChange={(event) => setUploadReferenceNo(event.target.value)}
              placeholder="Optional"
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </label>

          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Payment slip upload requirements</div>
              <div className="mt-1 leading-5">Only {paymentSlipAllowedExtensionLabel} files are allowed. Maximum file size is {paymentSlipMaxFileSizeMb}MB.</div>
            </div>
          </div>

          <label className="block text-sm font-semibold text-textPrimary">
            Payment Slip<span className="ml-1 text-red-600">*</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                const validationError = nextFile ? getPaymentSlipFileValidationError(nextFile) : "";
                if (validationError) {
                  notifyError(validationError, "payment-slip-file-validation");
                  event.target.value = "";
                  setUploadFile(null);
                  return;
                }
                setUploadFile(nextFile);
              }}
              className="mt-1 block w-full cursor-pointer rounded-lg border border-line bg-white px-3 py-2 text-sm text-textPrimary file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
            />
          </label>

          <div className="flex justify-end border-t border-line pt-4">
            <Button type="submit" disabled={actionSubmitting}>
              {actionSubmitting ? "Uploading..." : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(decisionTarget && decisionAction)}
        title={decisionAction === "approve" ? "Approve Payment" : "Reject Payment"}
        maxWidthClass="max-w-xl"
        onClose={() => {
          if (!actionSubmitting) {
            setDecisionTarget(null);
            setDecisionAction(null);
            setConfirmOpen(false);
          }
        }}
      >
        <form onSubmit={submitPaymentDecision} className="space-y-4">
          {decisionTarget && decisionAction === "approve" && isFinalPaymentApproval(detail, decisionTarget) ? (
            <div className="grid gap-3 rounded-lg border border-line bg-white p-4">
              <InfoGrid
                items={[
                  { label: "Current Application Status", value: formatStatusLabel(detail.status) },
                  { label: "New Application Status", value: "Payment Approved" }
                ]}
                columns={1}
              />
              <DatePickerInput
                label="Commencement Date"
                value={commencementDate}
                onChange={setCommencementDate}
                required
                dialogTitle="Commencement Date"
              />
            </div>
          ) : null}
          <label className="block text-sm font-semibold text-textPrimary">
            Remark{decisionAction === "reject" ? <span className="ml-1 text-red-600">*</span> : null}
            <textarea
              value={decisionRemark}
              onChange={(event) => setDecisionRemark(event.target.value)}
              rows={4}
              placeholder="Enter remark"
              className="mt-1 w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </label>
          <div className="flex justify-end border-t border-line pt-4">
            <Button type="submit" disabled={actionSubmitting}>
              {actionSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title={decisionAction === "approve" ? "Approve payment" : "Reject payment"}
        message={decisionTarget ? `Confirm ${decisionAction} for ${decisionTarget.allocation}?` : "Confirm this payment action?"}
        confirmText={actionSubmitting ? "Submitting..." : "Confirm"}
        destructive={decisionAction === "reject"}
        onClose={() => {
          if (!actionSubmitting) setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (!actionSubmitting) void confirmPaymentDecision();
        }}
      />
    </>
  );
}

type PaymentAllocationModalRow = {
  localId: string;
  paymentId?: number;
  paymentNo?: number;
  amount: number;
  status: string;
  reference: string;
  paymentDate: string;
  approvedAt?: string | null;
  documentName?: string;
  isNew: boolean;
};

function PaymentAllocationsModal({
  open,
  detail,
  onClose,
  onPaymentChanged,
  onRefreshDetail
}: {
  open: boolean;
  detail: ViewDetail;
  onClose: () => void;
  onPaymentChanged: (payment: TrustApplicationPaymentList) => void;
  onRefreshDetail: () => Promise<void>;
}) {
  const [payment, setPayment] = useState<TrustApplicationPaymentList | null>(detail.payment);
  const [rows, setRows] = useState<PaymentAllocationModalRow[]>(mapPaymentAllocationRows(detail.payment?.Payments));
  const [amountInput, setAmountInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeConfirmTarget, setRemoveConfirmTarget] = useState<PaymentAllocationModalRow | null>(null);
  const [error, setError] = useState("");

  const placementAmount = toPaymentMoney(payment?.TrustAssetAmount ?? detail.payment?.TrustAssetAmount ?? getPaymentNumberFromText(detail.summary.find((item) => item.label === "Trust Amount")?.value));
  const visibleRows = rows.filter(shouldShowPaymentAllocationRow);
  const countableRows = rows.filter(shouldCountPaymentAllocationBalance);
  const allocatedAmount = toPaymentMoney(countableRows.reduce((total, row) => total + row.amount, 0));
  const balanceAmount = toPaymentMoney(placementAmount - allocatedAmount);
  const amountValue = parsePaymentAmount(amountInput);
  const canAddAmount = amountValue > 0 && amountValue <= balanceAmount;
  const isBalanced = placementAmount > 0 && countableRows.length > 0 && paymentMoneyEqual(allocatedAmount, placementAmount);
  const newRows = rows.filter((row) => row.isNew);

  useEffect(() => {
    if (!open) return;

    let ignored = false;

    async function loadPaymentAllocations() {
      setLoading(true);
      setError("");
      setAmountInput("");

      try {
        const applicationDetail = await trustApplicationApi.getTrustApplication(detail.trustNumericId);
        if (ignored) return;
        const nextPayment = applicationDetail.Payment ?? null;
        setPayment(nextPayment);
        setRows(mapPaymentAllocationRows(nextPayment?.Payments));
        if (nextPayment) onPaymentChanged(nextPayment);
      } catch (loadError) {
        if (!ignored) setError(getPaymentErrorMessage(loadError, "Unable to load payment allocations."));
      } finally {
        if (!ignored) setLoading(false);
      }
    }

    void loadPaymentAllocations();

    return () => {
      ignored = true;
    };
  }, [detail.trustNumericId, onPaymentChanged, open]);

  const refreshPaymentAllocations = async () => {
    const applicationDetail = await trustApplicationApi.getTrustApplication(detail.trustNumericId);
    const nextPayment = applicationDetail.Payment ?? null;
    setPayment(nextPayment);
    setRows(mapPaymentAllocationRows(nextPayment?.Payments));
    if (nextPayment) onPaymentChanged(nextPayment);
  };

  const addAllocationRow = () => {
    if (!canAddAmount) return;

    setRows((currentRows) => [
      ...currentRows,
      {
        localId: `new-${Date.now()}-${currentRows.length}`,
        amount: toPaymentMoney(amountValue),
        status: "WAITING_PAYMENT",
        reference: "New allocation",
        paymentDate: "-",
        isNew: true
      }
    ]);
    setAmountInput("");
    setError("");
  };

  const removeAllocationRow = (row: PaymentAllocationModalRow) => {
    if (row.isNew) {
      setRows((currentRows) => currentRows.filter((currentRow) => currentRow.localId !== row.localId));
      setError("");
      return;
    }

    if (!row.paymentId || !canRemovePaymentAllocation(row)) return;

    setRemoveConfirmTarget(row);
  };

  const confirmRemoveAllocationRow = async () => {
    if (!removeConfirmTarget?.paymentId) return;

    setRemovingId(removeConfirmTarget.localId);
    setError("");
    try {
      await trustApplicationApi.cancelPaymentAllocation(detail.trustNumericId, removeConfirmTarget.paymentId);
      await refreshPaymentAllocations();
      await onRefreshDetail();
      notifySuccess("Payment allocation removed successfully.", "payment-allocation-remove");
      setRemoveConfirmTarget(null);
    } catch (removeError) {
      setError(getPaymentErrorMessage(removeError, "Unable to remove payment allocation."));
    } finally {
      setRemovingId(null);
    }
  };

  const submitAllocations = async () => {
    if (!isBalanced) return;

    setSubmitting(true);
    setError("");
    try {
      if (newRows.length === 0) {
        await onRefreshDetail();
        onClose();
        return;
      }

      const amounts = newRows.map((row) => row.amount);
      const hasExistingAllocations = rows.some((row) => !row.isNew) || Boolean(payment?.Payments?.length);
      const nextPayment = hasExistingAllocations
        ? await trustApplicationApi.addPaymentAllocations(detail.trustNumericId, amounts)
        : await trustApplicationApi.initializePaymentAllocations(detail.trustNumericId, amounts);

      setPayment(nextPayment);
      setRows(mapPaymentAllocationRows(nextPayment.Payments));
      await onRefreshDetail();
      notifySuccess("Payment allocations submitted successfully.", "payment-allocation-submit");
      onClose();
    } catch (submitError) {
      setError(getPaymentErrorMessage(submitError, "Unable to submit payment allocations."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} title="Payment Allocations" maxWidthClass="max-w-4xl" onClose={onClose}>
      <div className="flex max-h-[78vh] min-h-0 flex-col gap-4 overflow-hidden pr-1">
        <div className="grid gap-3 md:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-lg border border-line bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Trust Application</p>
            <p className="mt-1 text-base font-bold text-ink">{detail.trustId}</p>
            <p className="mt-1 text-sm font-semibold text-textSecondary">{detail.trustPlanName}</p>
          </div>
          <div className="rounded-lg border border-line bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Trust Placement Amount</p>
            <p className="mt-1 text-lg font-bold text-ink">{formatCurrency(placementAmount)}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <PaymentAllocationSummary label="Total Allocation" value={formatCurrency(allocatedAmount)} />
          <PaymentAllocationSummary label="Balance Amount" value={formatCurrency(balanceAmount)} tone={paymentMoneyEqual(balanceAmount, 0) ? "green" : "amber"} />
          <PaymentAllocationSummary label="Allocation Status" value={isBalanced ? "Balanced" : "Incomplete"} tone={isBalanced ? "green" : "amber"} />
        </div>

        <div className="rounded-lg border border-line bg-white p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-semibold text-textPrimary">
              Allocation Amount
              <input
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-textPrimary focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </label>
            <Button type="button" variant="outline" onClick={addAllocationRow} disabled={loading || !canAddAmount}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          {amountInput && !canAddAmount ? (
            <p className="mt-2 text-xs font-semibold text-red-600">Enter an amount greater than RM 0.00 and not more than the balance amount.</p>
          ) : null}
        </div>

        {error ? <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}

        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div
            className="overscroll-contain"
            style={{
              maxHeight: "260px",
              overflowX: "auto",
              overflowY: visibleRows.length > 3 ? "scroll" : "auto",
              scrollbarGutter: "stable"
            }}
          >
            <div className="min-w-[680px] pb-6">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-soft text-xs uppercase tracking-wide text-textSecondary">
                  <tr>
                    <TableHead>Payment No.</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <EmptyTableRow colSpan={5} message="Loading payment allocations..." />
                  ) : visibleRows.length ? (
                    visibleRows.map((row, index) => {
                      const removable = row.isNew || canRemovePaymentAllocation(row);
                      return (
                        <tr key={row.localId} className="transition hover:bg-gray-50">
                          <TableCell className="font-semibold text-textPrimary">{formatPaymentNo(row.paymentNo ?? index + 1)}</TableCell>
                          <TableCell>
                            <div className="font-semibold text-textPrimary">{row.reference}</div>
                            <div className="mt-1 text-xs text-textSecondary">{row.paymentDate}</div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={formatStatusLabel(row.status)} />
                          </TableCell>
                          <TableCell className="font-semibold text-textPrimary">{formatCurrency(row.amount)}</TableCell>
                          <TableCell className="text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            onClick={() => removeAllocationRow(row)}
                            disabled={!removable || removingId === row.localId}
                            aria-label={`Remove ${row.reference}`}
                            title={getPaymentAllocationRemoveTitle(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          </TableCell>
                        </tr>
                      );
                    })
                  ) : (
                    <EmptyTableRow colSpan={5} message="No payment allocations added yet." />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-line pt-4">
          <Button type="button" onClick={() => void submitAllocations()} disabled={!isBalanced || loading || submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(removeConfirmTarget)}
        title="Delete payment allocation"
        message={removeConfirmTarget ? `Are you sure you want to delete Payment no. ${formatPaymentNo(removeConfirmTarget.paymentNo)}?` : "Are you sure you want to delete this payment allocation?"}
        confirmText={removingId ? "Deleting..." : "Delete"}
        destructive
        onClose={() => {
          if (!removingId) setRemoveConfirmTarget(null);
        }}
        onConfirm={() => {
          if (!removingId) void confirmRemoveAllocationRow();
        }}
      />
    </Modal>
  );
}

function PaymentAllocationSummary({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "green" | "amber" }) {
  const toneClass = tone === "green" ? "bg-green-50 text-green-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-white text-ink";
  return (
    <div className={`rounded-lg border border-line p-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function SupportingDocumentsTable({ documents }: { documents: ViewDetail["supportingDocuments"] }) {
  return (
    <ViewCard title="Supporting Document" icon={ClipboardList}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
            <tr>
              <TableHead>Document</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded Date</TableHead>
              <TableHead>Download</TableHead>
            </tr>
          </thead>
          <tbody>
            {documents.length ? (
              documents.map((document) => (
                <tr key={`${document.name}-${document.uploadedDate}`} className="transition hover:bg-gray-50">
                  <TableCell className="font-semibold text-textPrimary">{document.name}</TableCell>
                  <TableCell>{document.type || "-"}</TableCell>
                  <TableCell>{document.size || "-"}</TableCell>
                  <TableCell>{document.uploadedDate || "-"}</TableCell>
                  <TableCell>
                    <DownloadLink href={document.downloadUrl} label={`Download ${document.name}`} />
                  </TableCell>
                </tr>
              ))
            ) : (
              <EmptyTableRow colSpan={5} message="No supporting documents available." />
            )}
          </tbody>
        </table>
      </div>
    </ViewCard>
  );
}

function DownloadLink({ href, label }: { href: string; label: string }) {
  if (!href) return <span className="text-xs font-semibold text-textSecondary">-</span>;

  return (
    <a href={href} target="_blank" rel="noreferrer" download className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-bold text-textPrimary transition hover:border-brandGold hover:text-ink">
      <Download className="h-4 w-4" />
      Download
      <span className="sr-only">{label}</span>
    </a>
  );
}

function PdfViewLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href || "#"} target="_blank" rel="noreferrer" aria-disabled={!href} className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${href ? "border-line bg-white text-textPrimary hover:border-brandGold hover:text-ink" : "pointer-events-none border-line bg-soft text-textSecondary"}`}>
      <Download className="h-4 w-4" />
      Download
      <span className="sr-only">{label}</span>
    </a>
  );
}

function EmptyTableRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-sm font-semibold text-textSecondary">
        {message}
      </td>
    </tr>
  );
}

function getDetailTabContent(activeTab: ViewTabId, detail: ViewDetail): {
  title: string;
  icon: typeof FileText;
  items: ViewInfoItem[];
  secondary?: {
    title: string;
    icon: typeof FileText;
    items: ViewInfoItem[];
  };
} {
  switch (activeTab) {
    case "personal-details":
      return {
        title: "Personal Details",
        icon: UserRound,
        items: []
      };
    case "trust-asset":
      return {
        title: "Trust Asset",
        icon: Wallet,
        items: []
      };
    case "beneficiaries":
      return {
        title: "Beneficiaries",
        icon: Users,
        items: []
      };
    case "allocations":
      return {
        title: "Allocations",
        icon: ClipboardList,
        items: []
      };
    case "trust-deed":
      return {
        title: "Trust Deed",
        icon: FileText,
        items: detail.trustDeed
      };
    case "co-broker":
      return {
        title: "Co-broker",
        icon: Landmark,
        items: detail.coBrokers
      };
    default:
      return {
        title: "Overview",
        icon: FileText,
        items: detail.overview
      };
  }
}

function TrustPlanInfoCard({ detail }: { detail: ViewDetail }) {
  return (
    <ViewCard title="Trust Plan" icon={Landmark}>
      <InfoGrid items={detail.trustPlanInfo} />
    </ViewCard>
  );
}

function ApplicantInfoCard({ detail }: { detail: ViewDetail }) {
  return (
    <ViewCard title="Applicant Information" icon={UserRound}>
      <InfoGrid items={detail.applicantInfo} />
    </ViewCard>
  );
}

function ApplicationHistoryCard({ detail }: { detail: ViewDetail }) {
  return (
    <ViewCard title="Audit" icon={Clock}>
      <ol className="relative space-y-0">
        {detail.history.map((item, index) => (
          <li key={`${item.title}-${item.date}-${item.time}`} className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 pb-4 last:pb-0">
            {index < detail.history.length - 1 ? <span className="absolute left-[15px] top-8 h-full w-px bg-line" aria-hidden="true" /> : null}
            <span className="relative z-10 mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-brandGold/40 bg-[#FFFBEB] text-brandGold shadow-sm">
              <Clock className="h-4 w-4" />
            </span>
            <div className="min-w-0 rounded-lg border border-line bg-soft p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-ink">{item.title}</div>
                  <div className="mt-1 text-xs leading-5 text-textSecondary">{item.description}</div>
                  <div className="mt-1 text-xs font-semibold text-textSecondary">by {item.actor}</div>
                </div>
                <div className="shrink-0 text-left text-xs font-semibold leading-5 text-textSecondary sm:w-24 sm:text-right">
                  <div>{item.date}</div>
                  <div>{item.time}</div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </ViewCard>
  );
}

function ViewCard({ title, icon: Icon, action, children }: { title: string; icon: typeof FileText; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brandGold/30 bg-[#FFFBEB] text-brandGold">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="truncate text-base font-bold text-ink">{title}</h3>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function InfoGrid({ items, columns = 2 }: { items: ViewInfoItem[]; columns?: 1 | 2 | 3 }) {
  if (!items.length) {
    return <div className="rounded-lg border border-dashed border-line bg-soft px-4 py-6 text-center text-sm font-semibold text-textSecondary">No information available.</div>;
  }

  const gridClass = columns === 1 ? "grid gap-x-5 gap-y-3" : columns === 3 ? "grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-x-5 gap-y-3 sm:grid-cols-2";

  return (
    <div className={gridClass}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <div className="text-xs font-semibold text-textSecondary">{item.label}</div>
          <div className="mt-1 break-words text-sm font-semibold leading-5 text-ink">{item.value || "-"}</div>
        </div>
      ))}
    </div>
  );
}

function SectionedInfoGrid({ sections, columns = 2 }: { sections: ViewInfoSection[]; columns?: 2 | 3 }) {
  const visibleSections = sections.filter((section) => section.items.length);

  if (!visibleSections.length) {
    return <div className="rounded-lg border border-dashed border-line bg-soft px-4 py-6 text-center text-sm font-semibold text-textSecondary">No information available.</div>;
  }

  return (
    <div className="space-y-5">
      {visibleSections.map((section) => (
        <section key={section.title} className="space-y-3">
          <div className="flex items-center gap-2 border-b border-line pb-2">
            <span className="h-5 w-1 rounded-full bg-brandGold" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-textPrimary">{section.title}</h4>
          </div>
          <InfoGrid items={section.items} columns={columns} />
        </section>
      ))}
    </div>
  );
}

function mapTrustApplicationViewDetail(detail: TrustApplicationDetail, record: TrustApplicationListItem, bankDescriptions: Map<string, string>): ViewDetail {
  const step1 = asRecord(detail.Step1);
  const step2 = asRecord(detail.Step2);
  const step3 = asRecord(detail.Step3);
  const step4 = asRecord(detail.Step4);
  const step5 = asRecord(detail.Step5);
  const step6 = asRecord(detail.Step6);
  const step7 = asRecord(detail.Step7);
  const payment = asRecord(detail.Payment);
  const trustPlan = asRecord(detail.TrustPlan);
  const applicantName = getString(step1, "FullName") || record.FullName || "";
  const trustAssetAmount = getNumber(payment, "TrustAssetAmount") ?? getNumber(step2, "TrustAssetAmount") ?? record.TrustAssetAmount ?? null;
  const productName = getString(trustPlan, "ProductName") || record.ProductName || detail.ProductCode || record.ProductCode || "";

  const personalIdentityInformation = cleanInfoItems([
    { label: "Full Name", value: applicantName },
    { label: "Type of Identity", value: getString(step1, "IdentityType") || record.IdentityType || "" },
    { label: "NRIC No. / Passport No. / ID No.", value: getString(step1, "IdentityNo") || record.IdentityNo || "" },
    { label: "Nationality", value: getString(step1, "Nationality") },
    { label: "Gender", value: formatCodeLabel(getString(step1, "Gender")) },
    { label: "Date of Birth", value: formatDate(getString(step1, "DateOfBirth")) }
  ]);

  const personalContactAddress = cleanInfoItems([
    { label: "Email", value: getString(step1, "Email") || record.Email || "" },
    { label: "Contact Number", value: getString(step1, "ContactNo") || record.ContactNo || "" },
    { label: "Address Line 1", value: getString(step1, "AddressLine1") },
    { label: "Address Line 2", value: getString(step1, "AddressLine2") },
    { label: "Postcode", value: getString(step1, "Postcode") },
    { label: "City", value: getString(step1, "City") },
    { label: "State", value: getString(step1, "State") },
    { label: "Country", value: getString(step1, "Country") }
  ]);

  const personalTaxReturn = cleanInfoItems([
    { label: "Do you currently file a tax return in the United States of America?", value: formatBoolean(getBoolean(step1, "IsUSTaxPayer")) },
    { label: "Are you a tax resident in, or do you file tax returns in any country other than Malaysia?", value: formatBoolean(getBoolean(step1, "HasOtherTaxResidence")) },
    { label: "Country / Jurisdiction of Tax Residence", value: getString(step1, "TaxResidenceCountry") },
    { label: "Tax Identification Number (TIN) or equivalent number", value: getString(step1, "TaxIdentificationNo") },
    { label: "Please indicate reason [A], [B] or [C] if TIN is not available", value: formatCodeLabel(getString(step1, "TINUnavailableReason")) },
    { label: "Explanation for unavailable TIN", value: getString(step1, "TINUnavailableExplanation") }
  ]);

  const personalClientDueDiligence = cleanInfoItems([
    { label: "Employer / Name of Company", value: getString(step1, "EmployerName") },
    { label: "Nature of Business", value: getString(step1, "NatureOfBusiness") },
    { label: "Occupation", value: getString(step1, "Occupation") },
    { label: "Annual Salary / Income", value: formatCodeLabel(getString(step1, "AnnualIncomeCode")) },
    { label: "Total Net Worth", value: formatCodeLabel(getString(step1, "NetWorthCode")) }
  ]);

  const personalSourceOfFunds = cleanInfoItems([
    { label: "Please mark one or more options that apply to the funds placed or to be placed.", value: formatSourceOfFunds(asArray(step1?.SourceOfFunds)) }
  ]);

  const personalDetails = cleanInfoSections([
    { title: "Identity Information", items: personalIdentityInformation },
    { title: "Contact & Address", items: personalContactAddress },
    { title: "Tax Return", items: personalTaxReturn },
    { title: "Client Due Diligence", items: personalClientDueDiligence },
    { title: "Source of Funds", items: personalSourceOfFunds }
  ]);

  const trustPlanInfo = cleanInfoItems([
    { label: "Product Name", value: productName },
    { label: "Plan Category", value: getString(trustPlan, "ProductCategory") },
    { label: "Description", value: getString(trustPlan, "ProductDescription") },
    { label: "Fund Management Period", value: formatPeriod(getNumber(trustPlan, "FundManagementPeriod"), getString(trustPlan, "FundManagementPeriodUnit")) },
    { label: "Minimum Placement", value: formatNullableCurrency(getNumber(trustPlan, "MinimumPlacement")) },
    { label: "Maximum Placement", value: formatNullableCurrency(getNumber(trustPlan, "MaximumPlacement")) }
  ]);

  const trustAsset = cleanInfoItems([
    { label: "Trust Asset Amount (MYR)", value: formatNullableCurrency(trustAssetAmount) },
    { label: "Minimum Amount", value: formatNullableCurrency(getNumber(trustPlan, "MinimumPlacement")) },
    { label: "Maximum Amount", value: formatNullableCurrency(getNumber(trustPlan, "MaximumPlacement")) },
    { label: "Based on selected plan", value: productName }
  ]);

  const settlorBankAccountDetails = cleanInfoItems([
    { label: "Bank Name", value: resolveBankDescription(getString(step2, "SettlorBankName"), getString(step2, "SettlorOtherBankName"), bankDescriptions) },
    { label: "Other Bank Name", value: getString(step2, "SettlorOtherBankName") },
    { label: "Bank Account Holder", value: getString(step2, "SettlorBankAccountHolder") },
    { label: "Bank Account Number", value: getString(step2, "SettlorBankAccountNumber") },
    { label: "Swiftcode", value: getString(step2, "SettlorSwiftCode") },
    { label: "Bank Address", value: getString(step2, "SettlorBankAddress") }
  ]);

  const trustProceeds = cleanInfoItems([
    { label: "Trust Proceeds", value: formatTrustProceedsOption(getString(step2, "GuaranteedReturnOption")) }
  ]);

  const paymentSourceDetail = asRecord(payment?.PaymentSourceDetail);
  const paymentSourceCode = getString(payment, "PaymentSource") || getString(step2, "PaymentSource");
  const paymentBankName = getString(paymentSourceDetail, "BankName") || getString(step2, "ThirdPartyBankName");
  const paymentOtherBankName = getString(paymentSourceDetail, "OtherBankName") || getString(step2, "ThirdPartyOtherBankName");
  const paymentSource = cleanInfoItems([
    { label: "Payment Source", value: formatPaymentSourceOption(paymentSourceCode) },
    { label: "Joint Account Holder Name", value: getString(paymentSourceDetail, "JointAccountHolderName") || getString(step2, "JointAccountHolderName") },
    { label: "Third Party Name", value: getString(paymentSourceDetail, "ThirdPartyName") || getString(step2, "ThirdPartyName") },
    { label: "NRIC No. / Passport No. / ID No.", value: getString(paymentSourceDetail, "ThirdPartyIdentityNo") || getString(step2, "ThirdPartyIdentityNo") },
    { label: "Relationship", value: formatCodeLabel(getString(paymentSourceDetail, "ThirdPartyRelationship") || getString(step2, "ThirdPartyRelationship")) },
    { label: "Other Relationship", value: getString(paymentSourceDetail, "ThirdPartyOtherRelationship") || getString(step2, "ThirdPartyOtherRelationship") },
    { label: "Bank Name", value: resolveBankDescription(paymentBankName, paymentOtherBankName, bankDescriptions) },
    { label: "Other Bank Name", value: paymentOtherBankName },
    { label: "Bank Account Holder", value: getString(paymentSourceDetail, "AccountHolder") || getString(step2, "ThirdPartyBankAccountHolder") },
    { label: "Bank Account Number", value: getString(paymentSourceDetail, "AccountNumber") || getString(step2, "ThirdPartyBankAccountNumber") }
  ]);

  const trustAssetSections = cleanInfoSections([
    { title: "Trust Asset", items: trustAsset },
    { title: "Settlor Bank Account Details", items: settlorBankAccountDetails },
    { title: "Trust Proceeds", items: trustProceeds },
    { title: "Payments to Trustee", items: paymentSource }
  ]);

  const beneficiaries = mapBeneficiaries(asArray(step3?.Beneficiaries));
  const caretaker = mapCaretaker(step3);
  const allocations = mapAllocations(step4, asArray(step3?.Beneficiaries));
  const trustDeed = cleanInfoItems([
    { label: "Signing Method", value: formatCodeLabel(getString(step5, "SigningMethod")) },
    { label: "Special Circumstance", value: formatCodeLabel(getString(step5, "SpecialCircumstance")) },
    { label: "Read-over By", value: getString(step5, "ReadOverBy") },
    { label: "Read-over Identity No.", value: getString(step5, "ReadOverIdentityNo") },
    { label: "Language / Dialect", value: getString(step5, "LanguageOrDialect") },
    { label: "Relationship With Settlor", value: formatCodeLabel(getString(step5, "RelationshipWithSettlor") || getString(step5, "OtherRelationshipWithSettlor")) }
  ]);
  const coBrokers = mapCoBrokers(asArray(step7?.CoBrokers));
  const documents = mapGeneratedDocuments(detail.TrustID || record.TrustID, asArray(detail.Documents));
  const supportingDocuments = mapSupportingDocuments(asArray(step6?.SupportingDocuments));
  const payments = mapPayments(asArray(payment?.Payments));
  const history = mapHistory(asArray(detail.History));
  const currentStatus = detail.ApplicationStatus || record.ApplicationStatus || "";
  const statusFlowHistory = asArray(detail.StatusFlowHistory);
  const terminalStatusCard = mapTerminalStatusCard(currentStatus, statusFlowHistory);

  return {
    trustNumericId: detail.TrustID || record.TrustID,
    trustId: detail.TrustNo || record.TrustNo || formatTrustNo(detail.TrustID || record.TrustID),
    trustPlanName: productName,
    status: currentStatus,
    summary: cleanSummaryItems([
      { label: "Applicant Name", value: applicantName, icon: UserRound },
      { label: "Trust Amount", value: formatNullableCurrency(trustAssetAmount), icon: Wallet },
      { label: "Commencement Date", value: formatDate(getString(detail, "CommencementDate")), icon: Calendar },
      { label: "Maturity Date", value: formatDate(getString(detail, "MaturityDate")), icon: Calendar }
    ]),
    timeline: mapStatusFlow(asArray(detail.StatusFlow), currentStatus, terminalStatusCard?.previousStatus),
    terminalStatusCard,
    trustPlanInfo,
    applicantInfo: cleanInfoItems([
      { label: "Full Name", value: applicantName },
      { label: "Type of Identity", value: getString(step1, "IdentityType") || record.IdentityType || "" },
      { label: "NRIC No. / Passport No. / ID No.", value: getString(step1, "IdentityNo") || record.IdentityNo || "" },
      { label: "Email", value: getString(step1, "Email") || record.Email || "" },
      { label: "Contact Number", value: getString(step1, "ContactNo") || record.ContactNo || "" },
      { label: "Country", value: getString(step1, "Country") }
    ]),
    overview: cleanInfoItems([
      { label: "Trust No.", value: detail.TrustNo || record.TrustNo || "" },
      { label: "Product", value: productName },
      { label: "Status", value: formatStatusLabel(detail.ApplicationStatus || record.ApplicationStatus) },
      { label: "Agent", value: record.TrustRepresentativeFullName || record.TrustRepresentativeUsername || "" },
      { label: "Created Date", value: formatDate(getString(detail, "CreatedAt") || record.CreatedAt) },
      { label: "Updated Date", value: formatDate(getString(detail, "UpdatedAt") || record.UpdatedAt) },
      { label: "Submitted Date", value: formatDate(getString(detail, "SubmittedAt") || record.SubmittedAt) },
      { label: "Current Step", value: detail.CurrentStep ? `Step ${detail.CurrentStep}` : record.CurrentStep ? `Step ${record.CurrentStep}` : "" },
      { label: "Completed Steps", value: detail.LastCompletedStep ? `${detail.LastCompletedStep} completed` : record.LastCompletedStep ? `${record.LastCompletedStep} completed` : "" }
    ]),
    personalDetails,
    trustAsset,
    trustAssetSections,
    beneficiaries,
    caretaker,
    allocations,
    trustDeed,
    coBrokers,
    documents,
    supportingDocuments,
    payment: payment as TrustApplicationPaymentList | null,
    payments,
    history
  };
}

function mapStatusFlow(statusFlow: Record<string, unknown>[], currentStatus?: string | null, terminalPreviousStatus?: string | null): ViewTimelineItem[] {
  if (statusFlow.length) {
    const sortedFlow = statusFlow
      .slice()
      .sort((left, right) => (getNumber(left, "Sequence") ?? 0) - (getNumber(right, "Sequence") ?? 0));
    const terminalStopSequence = terminalPreviousStatus
      ? sortedFlow.find((item) => getString(item, "StatusCode").toUpperCase() === terminalPreviousStatus.trim().toUpperCase())
      : null;
    const terminalStopIndex = terminalStopSequence ? sortedFlow.indexOf(terminalStopSequence) : -1;

    return sortedFlow
      .map((item, index) => ({
        statusCode: getString(item, "StatusCode"),
        label: formatStatusDisplayLabel(getString(item, "StatusCode"), getString(item, "StatusName")),
        date: formatDate(getString(item, "ReachedAt")),
        done: terminalStopIndex >= 0 ? index <= terminalStopIndex : getBoolean(item, "IsReached") ?? getString(item, "State").toUpperCase() === "REACHED"
      }))
      .filter((item) => item.label);
  }

  const statuses = ["DRAFT", "PENDING_PAYMENT_APPROVAL", "PAYMENT_APPROVED", "PENDING_ADMIN_APPROVAL", "SENT_OUT", "STAMPING", "COMPLETED"];
  const effectiveStatus = terminalPreviousStatus || currentStatus;
  const currentIndex = Math.max(0, statuses.indexOf(String(effectiveStatus || "").toUpperCase()));
  return statuses.map((status, index) => ({
    statusCode: status,
    label: formatStatusLabel(status),
    date: "",
    done: currentIndex >= index
  }));
}

function mapTerminalStatusCard(currentStatus: string, statusFlowHistory: Record<string, unknown>[]): ViewTerminalStatusCard | null {
  const normalizedCurrentStatus = currentStatus.trim().toUpperCase();
  if (!isTerminalApplicationStatus(normalizedCurrentStatus)) return null;

  const terminalHistory = statusFlowHistory
    .filter((item) => isTerminalApplicationStatus(getString(item, "NewStatus")))
    .sort((left, right) => {
      const leftDate = new Date(getString(left, "ChangedAt")).getTime();
      const rightDate = new Date(getString(right, "ChangedAt")).getTime();
      if (leftDate !== rightDate) return rightDate - leftDate;
      return (getNumber(right, "RowID") ?? 0) - (getNumber(left, "RowID") ?? 0);
    });
  const matchingHistory = terminalHistory.find((item) => getString(item, "NewStatus").toUpperCase() === normalizedCurrentStatus) || terminalHistory[0];
  const previousStatus = getString(matchingHistory, "PreviousStatus") || "DRAFT";
  const changedAt = getString(matchingHistory, "ChangedAt");

  return {
    status: normalizedCurrentStatus,
    previousStatus,
    changedAt: formatDate(changedAt),
    changedTime: formatTerminalStatusTime(changedAt),
    changedBy: getString(matchingHistory, "ChangedByName") || getString(matchingHistory, "ChangedBy")
  };
}

function isTerminalApplicationStatus(status?: string | null) {
  const normalized = status?.trim().toUpperCase();
  return normalized === "REJECTED" || normalized === "MATURED" || normalized === "EARLY_WITHDRAWN";
}

function createBankDescriptionMap(banks: BankLookupItem[]) {
  const descriptions = new Map<string, string>();

  banks.forEach((bank) => {
    [bank.BankName, bank.BankNameDetail, bank.BankDescription].forEach((key) => {
      const normalizedKey = key?.trim().toUpperCase();
      if (normalizedKey) descriptions.set(normalizedKey, bank.BankDescription);
    });
  });

  return descriptions;
}

function resolveBankDescription(bankName: string, otherBankName: string, bankDescriptions: Map<string, string>) {
  if (isOtherOption(bankName)) return otherBankName;
  const normalizedBankName = bankName.trim().toUpperCase();
  return bankDescriptions.get(normalizedBankName) || bankName || otherBankName;
}

function formatTrustProceedsOption(value: string) {
  const normalized = value.trim().toUpperCase();
  const labels: Record<string, string> = {
    TRANSFER_TO_BANK: "I wish to have the trust proceeds to be withdrawn and transferred into my bank account.",
    PAYOUT: "I wish to have the trust proceeds to be withdrawn and transferred into my bank account.",
    REDEPOSIT_AS_TRUST_ASSET: "I wish to have the trust proceeds to be re-deposited as Trust Asset."
  };
  return labels[normalized] || value;
}

function formatPaymentSourceOption(value: string) {
  const normalized = value.trim().toUpperCase();
  const labels: Record<string, string> = {
    PERSONAL_ACCOUNT: "My Personal Account",
    OWN_ACCOUNT: "My Personal Account",
    JOINT_ACCOUNT: "Joint Account",
    THIRD_PARTY: "Third Party"
  };
  return labels[normalized] || formatCodeLabel(value);
}

function mapBeneficiaries(beneficiaries: Record<string, unknown>[]): BeneficiaryViewCard[] {
  return beneficiaries
    .map((beneficiary, index) => ({
      title: `Beneficiary ${index + 1}`,
      sections: cleanInfoSections([
        {
          title: "Identity Information",
          items: cleanInfoItems([
            { label: "Full Name", value: getString(beneficiary, "FullName") },
            { label: "Type of Identity", value: getString(beneficiary, "IdentityType") },
            { label: "NRIC No. / Passport No. / ID No.", value: getString(beneficiary, "IdentityNo") },
            { label: "Nationality", value: getString(beneficiary, "Nationality") },
            { label: "Gender", value: formatCodeLabel(getString(beneficiary, "Gender")) },
            { label: "Date of Birth", value: formatDate(getString(beneficiary, "DateOfBirth")) },
            { label: "Email", value: getString(beneficiary, "Email") },
            { label: "Contact Number", value: getString(beneficiary, "ContactNo") },
            { label: "Relationship", value: formatCodeLabel(getString(beneficiary, "RelationshipCode")) },
            { label: "Other Relationship", value: getString(beneficiary, "OtherRelationship") }
          ])
        },
        {
          title: "Address",
          items: cleanInfoItems([
            { label: "Address Line 1", value: getString(beneficiary, "AddressLine1") },
            { label: "Address Line 2", value: getString(beneficiary, "AddressLine2") },
            { label: "Postcode", value: getString(beneficiary, "Postcode") },
            { label: "City", value: getString(beneficiary, "City") },
            { label: "State", value: getString(beneficiary, "State") },
            { label: "Country", value: getString(beneficiary, "Country") }
          ])
        },
        {
          title: "Tax Return",
          items: cleanInfoItems([
            { label: "Do you currently file a tax return in the United States of America?", value: formatBoolean(getBoolean(beneficiary, "IsUSTaxPayer")) },
            { label: "Are you a tax resident in, or do you file tax returns in any country other than Malaysia?", value: formatBoolean(getBoolean(beneficiary, "HasOtherTaxResidence")) },
            { label: "Country / Jurisdiction of Tax Residence", value: getString(beneficiary, "TaxResidenceCountry") },
            { label: "Tax Identification Number (TIN) or equivalent number", value: getString(beneficiary, "TaxIdentificationNo") },
            { label: "Please indicate reason [A], [B] or [C] if TIN is not available", value: formatCodeLabel(getString(beneficiary, "TINUnavailableReason")) },
            { label: "Explanation for unavailable TIN", value: getString(beneficiary, "TINUnavailableExplanation") }
          ])
        }
      ])
    }))
    .filter((beneficiary) => beneficiary.sections.length);
}

function mapCaretaker(step3: Record<string, unknown> | null) {
  const caretakerDistribution = asRecord(step3?.CaretakerDistribution);
  const main = asRecord(caretakerDistribution?.Main);
  const substitute = asRecord(caretakerDistribution?.Substitute);
  const minorDistribution = asRecord(step3?.MinorDistribution);

  return cleanInfoItems([
    { label: "Caretaker Distribution", value: formatBoolean(getBoolean(caretakerDistribution, "Enabled")) },
    { label: "Main Caretaker", value: getString(main, "Name") },
    { label: "Main Caretaker Identity No.", value: getString(main, "IdentityNo") },
    { label: "Main Caretaker Contact No.", value: getString(main, "ContactNo") },
    { label: "Substitute Caretaker", value: getString(substitute, "Name") },
    { label: "Substitute Caretaker Identity No.", value: getString(substitute, "IdentityNo") },
    { label: "Substitute Caretaker Contact No.", value: getString(substitute, "ContactNo") },
    { label: "Distribute To Guardian", value: formatBoolean(getBoolean(minorDistribution, "DistributeToGuardian")) },
    { label: "Hold By Trustee Company", value: formatBoolean(getBoolean(minorDistribution, "HoldByTrusteeCompany")) },
    { label: "Release Age", value: formatNumber(getNumber(minorDistribution, "ReleaseAge")) }
  ]);
}

function mapAllocations(step4: Record<string, unknown> | null, beneficiaries: Record<string, unknown>[]): ViewAllocationDetail {
  const beneficiaryNames = new Map<string, string>(
    beneficiaries
      .map((beneficiary): [string, string] => [String(getNumber(beneficiary, "BeneficiaryID") ?? getString(beneficiary, "BeneficiaryClientID")), getString(beneficiary, "FullName")])
      .filter(([key]) => Boolean(key))
  );
  const allocationType = getNumber(step4, "AllocationType");
  const beneficiaryItems = [
    ...mapAllocationGroup("Main Beneficiary", asArray(step4?.MainBeneficiaries), beneficiaryNames),
    ...mapAllocationGroup("Substitute Beneficiary", asArray(step4?.SubstituteBeneficiaries), beneficiaryNames)
  ];

  return {
    allocationType: cleanInfoItems([{ label: "Allocation Type", value: formatAllocationType(allocationType) }]),
    beneficiaries: cleanInfoItems(beneficiaryItems)
  };
}

function mapAllocationGroup(labelPrefix: string, allocations: Record<string, unknown>[], beneficiaryNames: Map<string, string>) {
  return allocations.flatMap((allocation, index) => {
    const beneficiaryId = String(getNumber(allocation, "BeneficiaryID") ?? "");
    const name = beneficiaryNames.get(beneficiaryId) || beneficiaryId;
    const percentage = getNumber(allocation, "AllocationPercentage");
    return cleanInfoItems([
      { label: `${labelPrefix} ${index + 1}`, value: name },
      { label: "Allocation (%)", value: formatNumber(percentage) }
    ]);
  });
}

function formatAllocationType(value?: number | null) {
  const options = [
    "Type 1 - 100% to one Main Beneficiary with one Substitute Beneficiary",
    "Type 2 - 100% to one Main Beneficiary with equal shares to multiple Substitute Beneficiaries",
    "Type 3 - 100% to one Main Beneficiary with specific allocation to multiple Substitute Beneficiaries",
    "Type 4 - 100% to one Main Beneficiary with Trustee Company",
    "Type 5 - Equal shares to multiple Main Beneficiaries",
    "Type 6 - Specific allocation for each Beneficiaries",
    "Type 7 - 100% to Trustee Company"
  ];
  if (!value) return "";
  return options[value - 1] || formatNumber(value);
}

function mapCoBrokers(coBrokers: Record<string, unknown>[]) {
  return coBrokers.flatMap((coBroker, index) =>
    cleanInfoItems([
      { label: `Co-broker ${index + 1}`, value: getString(coBroker, "Email") },
      { label: `Co-broker ${index + 1} Allocation`, value: formatPercentage(getNumber(coBroker, "AllocationPercentage")) }
    ])
  );
}

function mapGeneratedDocuments(trustId: number, documents: Record<string, unknown>[]): ViewDetail["documents"] {
  return documents.map((document) => {
    const documentCode = getString(document, "DocumentCode");
    return {
      name: getString(document, "DocumentName") || getString(document, "OriginalFileName") || formatCodeLabel(documentCode),
      description: getString(document, "Description"),
      type: formatDocumentType(getString(document, "FileExtension") || getString(document, "DocumentType") || "PDF"),
      issuedDate: formatDate(getString(document, "GeneratedAt") || getString(document, "CreatedAt")),
      viewUrl: documentCode ? trustApplicationApi.getTrustApplicationDocumentViewerPath(trustId, documentCode) : ""
    };
  }).filter((document) => document.name || document.viewUrl);
}

function mapSupportingDocuments(documents: Record<string, unknown>[]): ViewDetail["supportingDocuments"] {
  return documents.map((document) => ({
    name: getString(document, "OriginalFileName") || getString(document, "UploadedFile"),
    type: formatDocumentType(getString(document, "FileExtension")),
    size: formatFileSize(getNumber(document, "FileSize")),
    uploadedBy: getString(document, "UploadedByName") || getString(document, "CreatedByName"),
    uploadedDate: formatDate(getString(document, "UploadedAt") || getString(document, "CreatedAt")),
    downloadUrl: getString(document, "FileUrl") || getString(document, "UploadedFile")
  })).filter((document) => document.name || document.downloadUrl);
}

function mapPayments(payments: Record<string, unknown>[]): ViewDetail["payments"] {
  return payments.map((payment) => {
    const document = asRecord(payment.Document);
    const paymentNo = getNumber(payment, "PaymentNo") ?? undefined;
    const rawStatus = getString(payment, "PaymentStatus");
    const amountValue = toPaymentMoney(getNumber(payment, "PaymentAmount"));
    const referenceNo = getString(payment, "ReferenceNo");
    return {
      paymentId: getNumber(payment, "PaymentID") ?? 0,
      paymentNo,
      allocation: paymentNo ? `Payment ${paymentNo}` : getString(payment, "ReferenceNo"),
      amount: formatNullableCurrency(amountValue),
      amountValue,
      referenceNo,
      uploadedSlip: getString(document, "OriginalFileName") || getString(document, "UploadedFile"),
      uploadedBy: getString(document, "CreatedBy"),
      uploadedDate: formatDate(getString(document, "CreatedAt") || getString(payment, "PaymentDate")),
      financeRemark: getString(payment, "FinanceRemark"),
      status: formatStatusLabel(rawStatus),
      rawStatus,
      downloadUrl: getString(document, "FileUrl") || getString(document, "UploadedFile")
    };
  }).filter((payment) => payment.paymentId || payment.allocation || payment.amount || payment.uploadedSlip);
}

function mapPaymentAllocationRows(payments?: TrustApplicationPaymentAllocation[] | null): PaymentAllocationModalRow[] {
  if (!Array.isArray(payments)) return [];

  return payments.map((payment) => ({
    localId: `payment-${payment.PaymentID}`,
    paymentId: payment.PaymentID,
    paymentNo: payment.PaymentNo,
    amount: toPaymentMoney(payment.PaymentAmount),
    status: payment.PaymentStatus || "WAITING_PAYMENT",
    reference: payment.ReferenceNo || `Payment ${payment.PaymentNo}`,
    paymentDate: payment.PaymentDate ? formatDate(payment.PaymentDate) : "-",
    approvedAt: payment.ApprovedAt,
    documentName: payment.Document?.OriginalFileName || payment.Document?.UploadedFile || "",
    isNew: false
  }));
}

function canRemovePaymentAllocation(row: PaymentAllocationModalRow) {
  const status = normalizePaymentAllocationStatus(row.status);
  return (status === "WAITING_PAYMENT" || status === "PENDING_APPROVAL") && !row.approvedAt;
}

function shouldShowPaymentAllocationRow(row: PaymentAllocationModalRow) {
  if (row.isNew) return true;
  const status = normalizePaymentAllocationStatus(row.status);
  return !["CANCELLED", "CANCELED", "REJECTED", "PAYMENT_APPROVED", "APPROVED"].includes(status);
}

function shouldCountPaymentAllocationBalance(row: PaymentAllocationModalRow) {
  const status = normalizePaymentAllocationStatus(row.status);
  return !["CANCELLED", "CANCELED", "REJECTED"].includes(status);
}

function normalizePaymentAllocationStatus(status?: string | null) {
  return status?.trim().toUpperCase() ?? "";
}

function getPaymentAllocationRemoveTitle(row: PaymentAllocationModalRow) {
  const status = normalizePaymentAllocationStatus(row.status);
  if (row.isNew) return "Remove allocation";
  if (status === "APPROVED" || status === "PAYMENT_APPROVED" || row.approvedAt) return "Approved allocations cannot be deleted";
  if (!["WAITING_PAYMENT", "PENDING_APPROVAL"].includes(status)) return "Only waiting payment or pending approval allocations can be deleted";
  return "Remove allocation";
}

function getPaymentSlipFileValidationError(file: File) {
  const extension = file.name.split(".").pop()?.trim().toLowerCase() ?? "";

  if (!paymentSlipAllowedExtensions.has(extension)) {
    return `Only ${paymentSlipAllowedExtensionLabel} files are allowed.`;
  }

  if (file.size > paymentSlipMaxFileSizeBytes) {
    return `Payment slip file size must not exceed ${paymentSlipMaxFileSizeMb}MB.`;
  }

  return "";
}

function formatPaymentNo(paymentNo?: number | null) {
  return paymentNo ? String(paymentNo) : "-";
}

function isPaymentOverviewFilterMatch(payment: PaymentOverviewRow, filter: PaymentOverviewFilter) {
  const status = payment.rawStatus.trim().toUpperCase();
  if (filter === "active") return ["WAITING_PAYMENT", "PENDING_APPROVAL", "PAYMENT_APPROVED", "APPROVED"].includes(status);
  if (filter === "rejected") return status === "REJECTED";
  return status === "CANCELLED" || status === "CANCELED";
}

function sortPaymentOverviewRows(payments: PaymentOverviewRow[], filter: PaymentOverviewFilter) {
  if (filter !== "active") return payments;

  const statusOrder: Record<string, number> = {
    WAITING_PAYMENT: 0,
    PENDING_APPROVAL: 1,
    PAYMENT_APPROVED: 2,
    APPROVED: 2
  };

  return [...payments].sort((left, right) => {
    const leftOrder = statusOrder[left.rawStatus.trim().toUpperCase()] ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = statusOrder[right.rawStatus.trim().toUpperCase()] ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
}

function canDeletePaymentOverview(payment: PaymentOverviewRow) {
  const status = payment.rawStatus.trim().toUpperCase();
  return Boolean(payment.paymentId) && (status === "WAITING_PAYMENT" || status === "PENDING_APPROVAL");
}

function canReviewPaymentOverview(payment: PaymentOverviewRow) {
  return Boolean(payment.paymentId) && payment.rawStatus.trim().toUpperCase() === "PENDING_APPROVAL";
}

function canUploadPaymentSlip(payment: PaymentOverviewRow) {
  const status = payment.rawStatus.trim().toUpperCase();
  return Boolean(payment.paymentId) && status === "WAITING_PAYMENT";
}

function isFinalPaymentApproval(detail: ViewDetail, payment: PaymentOverviewRow) {
  const approvedAmount = toPaymentMoney(detail.payment?.ApprovedAmount);
  const trustAssetAmount = toPaymentMoney(detail.payment?.TrustAssetAmount);
  return trustAssetAmount > 0 && paymentMoneyEqual(approvedAmount + payment.amountValue, trustAssetAmount);
}

function parsePaymentAmount(value: string) {
  const numericValue = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function toPaymentMoney(value: unknown) {
  return Math.round(toPaymentNumber(value) * 100) / 100;
}

function toPaymentNumber(value: unknown) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function paymentMoneyEqual(left: number, right: number) {
  return Math.abs(toPaymentMoney(left) - toPaymentMoney(right)) < 0.01;
}

function getPaymentNumberFromText(value?: string) {
  return parsePaymentAmount(value?.replace(/^RM\s*/i, "") ?? "");
}

function getPaymentErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function mapHistory(history: Record<string, unknown>[]): ViewDetail["history"] {
  return history.map((item) => {
    const createdAt = getString(item, "CreatedAt");
    return {
      title: getString(item, "EventTitle") || formatCodeLabel(getString(item, "EventCode")),
      description: getString(item, "EventDescription") || [formatStatusLabel(getString(item, "OldStatus")), formatStatusLabel(getString(item, "NewStatus"))].filter(Boolean).join(" to "),
      actor: getString(item, "CreatedByName") || getString(item, "CreatedBy"),
      date: formatDate(createdAt),
      time: formatTime(createdAt)
    };
  }).filter((item) => item.title || item.description);
}

function formatAddressParts(record: Record<string, unknown> | null) {
  return ["AddressLine1", "AddressLine2", "Postcode", "City", "State", "Country"].map((key) => getString(record, key)).filter(Boolean).join(", ");
}

function formatSourceOfFunds(sourceOfFunds: Record<string, unknown>[]) {
  return sourceOfFunds.map((source) => formatSourceOfFundLabel(getString(source, "SourceCode")) || getString(source, "OtherDescription")).filter(Boolean).join(", ");
}

function formatSourceOfFundLabel(value: string) {
  const normalized = value.trim().toUpperCase();
  const labels: Record<string, string> = {
    CURRENT_INCOME: "Current Income",
    INHERITANCE: "Inheritance",
    BORROWED_CAPITAL: "Borrowed Capital",
    SALES_OF_ASSETS: "Sales of asset(s)",
    OTHER: "Other"
  };
  return labels[normalized] || formatCodeLabel(value);
}

function isOtherOption(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized === "OTHER" || normalized === "OTHERS";
}

function cleanInfoItems(items: ViewInfoItem[]) {
  return items.filter((item) => item.value !== "");
}

function cleanInfoSections(sections: ViewInfoSection[]) {
  return sections.filter((section) => section.items.length);
}

function cleanSummaryItems(items: ViewSummaryItem[]) {
  return items.filter((item) => item.value !== "");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(asRecord(item))) : [];
}

function getString(record: Record<string, unknown> | TrustApplicationDetail | null | undefined, key: string) {
  if (!record) return "";
  const value = (record as Record<string, unknown>)[key];
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function getNumber(record: Record<string, unknown> | null | undefined, key: string) {
  if (!record) return null;
  const value = record[key];
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function getBoolean(record: Record<string, unknown> | null | undefined, key: string) {
  if (!record || record[key] === null || record[key] === undefined || record[key] === "") return null;
  if (typeof record[key] === "boolean") return record[key];
  const value = String(record[key]).trim().toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

function formatNullableCurrency(value?: number | null) {
  return value === null || value === undefined ? "" : formatCurrency(value);
}

function formatPercentage(value?: number | null) {
  return value === null || value === undefined ? "" : `${formatNumber(value)}%`;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("en-MY", { maximumFractionDigits: 2 }).format(value);
}

function formatPeriod(value?: number | null, unit?: string) {
  if (value === null || value === undefined) return "";
  return [formatNumber(value), formatCodeLabel(unit)].filter(Boolean).join(" ");
}

function formatBoolean(value?: boolean | null) {
  if (value === null || value === undefined) return "";
  return value ? "Yes" : "No";
}

function formatCodeLabel(value?: string | null) {
  const text = value?.trim();
  if (!text) return "";
  return text
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDocumentType(value?: string | null) {
  const type = value?.trim().replace(/^\./, "");
  return type ? type.toUpperCase() : "PDF";
}

function formatTime(value?: string | null) {
  if (!value) return "";

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatTerminalStatusTime(value?: string | null) {
  return formatTime(value).replace(/\s?(AM|PM)$/i, (match) => ` ${match.trim().toLowerCase()}`).trim();
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

function ProductSelect({ value, options, onChange }: { value: string; options: TrustProductListItem[]; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-textPrimary">
      Product
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        <option value={allFilter}>All Products</option>
        {options.map((option) => (
          <option key={option.ProductCode} value={option.ProductCode}>
            {option.ProductName || option.ProductCode}
          </option>
        ))}
      </select>
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

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-textPrimary">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        <option value={allFilter}>All</option>
        {options.map((option) => (
          <option key={option} value={option}>{formatStatusLabel(option)}</option>
        ))}
      </select>
    </label>
  );
}

function TotalStatistics({ statistics, loading }: { statistics: TrustApplicationStatusStatistic; loading: boolean }) {
  return (
    <section className="mb-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-textSecondary">All Application Statistics</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2">
        {statisticItems.map((item) => (
          <div key={item.key} className="min-w-0 rounded-md border border-line bg-soft px-3 py-2">
            <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-textSecondary">{item.label}</div>
            <div className="mt-1 text-xl font-bold text-textPrimary">{loading ? "-" : formatCount(statistics[item.key])}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchStatistics({ statistics, loading }: { statistics: TrustApplicationStatusStatistic; loading: boolean }) {
  return (
    <section className="mt-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-textSecondary">Search Result Statistics</h2>
      <div className="flex flex-wrap gap-2">
        {statisticItems.map((item, index) => (
          <div key={item.key} className={getSearchStatisticClass(index === 0, item.tone)}>
            <span>{item.label}</span>
            <span className={getSearchStatisticBadgeClass(index === 0, item.tone)}>{loading ? "-" : formatCount(statistics[item.key])}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TableHead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap border-b border-line px-3 py-3 font-semibold ${className}`}>{children}</th>;
}

function TableCell({ children, className = "", nowrap = true }: { children: ReactNode; className?: string; nowrap?: boolean }) {
  return <td className={`${nowrap ? "whitespace-nowrap" : "whitespace-normal"} border-b border-line px-3 py-3 text-textSecondary ${className}`}>{children}</td>;
}

function ExpandableRemark({ value, expanded, onExpand }: { value: string; expanded: boolean; onExpand: () => void }) {
  const remark = value.trim();
  if (!remark) return <>-</>;
  if (expanded || remark.length <= 28) return <>{remark}</>;

  return (
    <>
      {shortRemarkPreview(remark)}
      <button type="button" onClick={onExpand} className="ml-1 inline appearance-none border-0 bg-transparent p-0 font-semibold text-ink shadow-none underline-offset-4 hover:underline">
        Show more
      </button>
    </>
  );
}

function shortRemarkPreview(value: string) {
  const words = value.split(/\s+/);
  if (words.length >= 3) return `${words.slice(0, 3).join(" ")} ...`;
  return `${value.slice(0, 22).trim()} ...`;
}

function middleEllipsis(value: string, maxLength: number, maxEndLength?: number) {
  if (value.length <= maxLength) return value;

  const ellipsis = "...";
  const available = maxLength - ellipsis.length;
  const startLength = Math.ceil(available * 0.35);
  const endLength = maxEndLength ? Math.min(maxEndLength, available - startLength) : available - startLength;

  return `${value.slice(0, startLength)}${ellipsis}${value.slice(-endLength)}`;
}

function TwoLine({ primary, secondary }: { primary: ReactNode; secondary: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-semibold text-textPrimary">{primary}</div>
      <div className="mt-0.5 truncate text-xs text-textSecondary">{secondary}</div>
    </div>
  );
}

function ActionItem({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="block w-full rounded-md px-3 py-2 text-left text-sm text-textPrimary shadow-none hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
    >
      {label}
    </button>
  );
}

function createEmptyFilters(): ListingFilters {
  return {
    search: "",
    productCode: allFilter,
    applicationStatus: allFilter,
    agentSearch: "",
    createdFrom: "",
    createdTo: "",
    submittedFrom: "",
    submittedTo: ""
  };
}

function getSearchStatisticClass(active: boolean, tone?: "default" | "warning" | "success" | "danger") {
  const baseClass = "inline-flex h-10 min-w-28 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold shadow-sm";

  if (active) return `${baseClass} border-blue-700 bg-blue-700 text-white`;
  if (tone === "danger") return `${baseClass} border-red-100 bg-white text-textPrimary`;

  return `${baseClass} border-line bg-white text-textPrimary`;
}

function getSearchStatisticBadgeClass(active: boolean, tone?: "default" | "warning" | "success" | "danger") {
  const baseClass = "inline-flex min-w-7 items-center justify-center rounded-lg px-2 py-0.5 text-xs font-bold";

  if (active) return `${baseClass} bg-blue-100 text-blue-800`;
  if (tone === "danger") return `${baseClass} bg-red-100 text-red-700`;
  if (tone === "success") return `${baseClass} bg-green-100 text-green-700`;
  if (tone === "warning") return `${baseClass} bg-amber-100 text-amber-700`;

  return `${baseClass} bg-gray-100 text-textPrimary`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-MY").format(value);
}

function formatTrustNo(value?: number | null) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return "-";
  return numericValue.toString().padStart(4, "0");
}

function isDraftStatus(status?: string | null) {
  return status?.trim().toUpperCase() === "DRAFT";
}

function normalizeApplicationStatus(status?: string | null) {
  return status?.trim().toUpperCase() ?? "";
}

function isTrustApplicationWorkflowStatus(status: string): status is TrustApplicationWorkflowStatus {
  return decisionStatusOptions.includes(status as TrustApplicationWorkflowStatus);
}

function getEnabledDecisionStatuses(currentStatus: string): TrustApplicationWorkflowStatus[] {
  const normalizedStatus = normalizeApplicationStatus(currentStatus);
  const enabledStatuses: TrustApplicationWorkflowStatus[] = [];

  if (normalizedStatus === "PAYMENT_APPROVED") enabledStatuses.push("PENDING_ADMIN_APPROVAL");
  if (normalizedStatus === "PENDING_ADMIN_APPROVAL") enabledStatuses.push("SENT_OUT");
  if (normalizedStatus === "SENT_OUT") enabledStatuses.push("STAMPING");
  if (normalizedStatus === "STAMPING") enabledStatuses.push("COMPLETED");

  if (canRejectApplicationStatus(normalizedStatus)) enabledStatuses.push("REJECTED");

  return enabledStatuses;
}

function canRejectApplicationStatus(status: string) {
  const normalizedStatus = normalizeApplicationStatus(status);
  return Boolean(normalizedStatus) && !["DRAFT", "COMPLETED", "REJECTED", "EARLY_WITHDRAWN", "MATURED"].includes(normalizedStatus);
}

function isDecisionButtonDisabledForStatus(status: string) {
  const normalizedStatus = normalizeApplicationStatus(status);
  return ["COMPLETED", "EARLY_WITHDRAWN", "REJECTED", "MATURED"].includes(normalizedStatus) || getEnabledDecisionStatuses(normalizedStatus).length === 0;
}

function canDeleteDraftApplication(role?: string | null) {
  return role === "AG" || role === "SA" || role === "AD";
}

function formatStatusLabel(status?: string | null) {
  const value = status?.trim();
  if (!value) return "-";
  if (value.toUpperCase() === "PENDING_PAYMENT_APPROVAL") return "Pending Payment Approval";
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatusDisplayLabel(statusCode?: string | null, statusName?: string | null) {
  if (statusCode?.trim().toUpperCase() === "PENDING_PAYMENT_APPROVAL") return "Pending Payment Approval";
  return statusName?.trim() || formatStatusLabel(statusCode);
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2
  }).format(Number(value ?? 0));
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
