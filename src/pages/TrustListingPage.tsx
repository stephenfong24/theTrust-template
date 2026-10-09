import { AlertTriangle, ArrowRight, Calendar, Check, CircleHelp, CircleMinus, ClipboardList, Clock, CreditCard, Download, FileOutput, FileSpreadsheet, FileText, FileType, Forward, Gift, HandCoins, Info, Landmark, Mail, Percent, Phone, Plus, RotateCcw, Search, Split, Trash2, Upload, UserRound, Users, Wallet, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { documentDownloadApi, type DocumentDownloadItem } from "../api/documentDownloadApi";
import {
  submitTrustApplicationPayment,
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
import { getSubmissionNetworkSnapshotDisplay } from "../utils/trustApplicationNetwork";
import { afterLifetimePurposeOptions, formatAfterLifetimePurposes, formatMasterDisplayText } from "../utils/masterData";
import premiumGoldGiftBoxIcon from "../assets/premium-gold-gift-box-icon.png";

const allFilter = "all";
const paymentSlipAllowedExtensions = new Set(["jpg", "jpeg", "png", "pdf"]);
const paymentSlipAllowedExtensionLabel = "JPG, JPEG, PNG or PDF";
const paymentSlipMaxFileSizeMb = 5;
const paymentSlipMaxFileSizeBytes = paymentSlipMaxFileSizeMb * 1024 * 1024;
const returnDocumentMaxFileSizeMb = 5;
const returnDocumentMaxFileSizeBytes = returnDocumentMaxFileSizeMb * 1024 * 1024;
const returnDocumentAllowedExtensions = new Set(["doc", "docx", "xls", "xlsx", "pdf", "jpg", "jpeg", "png", "gif"]);
const returnDocumentAllowedExtensionLabel = "DOC, DOCX, XLS, XLSX, PDF, JPG, JPEG, PNG or GIF";
const returnDocumentAccept = ".doc,.docx,.xls,.xlsx,.pdf,.jpg,.jpeg,.png,.gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,image/jpeg,image/png,image/gif";
const pageSizeOptions = [10, 20, 50, 100];
const statusOptions = ["DRAFT", "PENDING_PAYMENT_APPROVAL", "PAYMENT_APPROVED", "PENDING_ADMIN_APPROVAL", "SENT_OUT", "STAMPING", "COMPLETED", "EARLY_WITHDRAWN", "MATURED", "REJECTED"];
const trustWithdrawalModuleCode = "TRUST_WITHDRAWAL";
const trustReturnDocumentModuleCode = "TRUST_RETURN_DOCUMENT";
const earlyWithdrawalRemarkMaxLength = 500;
const adminEditableStatuses = new Set(["PENDING_PAYMENT_APPROVAL", "PAYMENT_APPROVED", "PENDING_ADMIN_APPROVAL", "SENT_OUT", "STAMPING"]);
const returnDocumentRoles = new Set(["SA", "AD", "AC", "OP"]);
const decisionStatusOptions: TrustApplicationWorkflowStatus[] = ["PENDING_ADMIN_APPROVAL", "SENT_OUT", "STAMPING", "COMPLETED", "EARLY_WITHDRAWN", "REJECTED"];
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

const statisticItems: Array<{ label: string; key: keyof TrustApplicationStatusStatistic; status: string; tone?: "default" | "warning" | "success" | "danger" }> = [
  { label: "All", key: "Total", status: allFilter },
  { label: "Draft", key: "Draft", status: "DRAFT" },
  { label: "Payment Pending", key: "PendingPaymentApproval", status: "PENDING_PAYMENT_APPROVAL", tone: "warning" },
  { label: "Payment Approved", key: "PaymentApproved", status: "PAYMENT_APPROVED", tone: "success" },
  { label: "Admin Approval", key: "PendingAdminApproval", status: "PENDING_ADMIN_APPROVAL", tone: "warning" },
  { label: "Sent Out", key: "SentOut", status: "SENT_OUT" },
  { label: "Stamping", key: "Stamping", status: "STAMPING" },
  { label: "Completed", key: "Completed", status: "COMPLETED", tone: "success" },
  { label: "Early Withdrawn", key: "EarlyWithdrawn", status: "EARLY_WITHDRAWN", tone: "warning" },
  { label: "Matured", key: "Matured", status: "MATURED", tone: "success" },
  { label: "Rejected", key: "Rejected", status: "REJECTED", tone: "danger" }
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
  const { trustNo } = useParams<{ trustNo?: string }>();
  const { session } = useAuth();
  const routeTrustNoSearch = getRouteTrustNoSearch(trustNo);
  const initialFilters = createFiltersForSearch(routeTrustNoSearch);
  const [records, setRecords] = useState<TrustApplicationListItem[]>([]);
  const [pagination, setPagination] = useState<TrustApplicationPagination>({ Page: 1, PageSize: 10, TotalRecords: 0, TotalPages: 1 });
  const [totalStatistics, setTotalStatistics] = useState<TrustApplicationStatusStatistic>(emptyStatistics);
  const [searchStatistics, setSearchStatistics] = useState<TrustApplicationStatusStatistic>(emptyStatistics);
  const [productOptions, setProductOptions] = useState<TrustProductListItem[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState<ListingFilters>(initialFilters);
  const [filters, setFilters] = useState<ListingFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrustApplicationListItem | null>(null);
  const [earlyWithdrawalTarget, setEarlyWithdrawalTarget] = useState<TrustApplicationListItem | null>(null);
  const [viewTarget, setViewTarget] = useState<TrustApplicationListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasSearched, setHasSearched] = useState(Boolean(routeTrustNoSearch));
  const canCreateApplication = session?.role === "AG";
  const canSearchAgent = session?.role !== "AG";
  const showAgentColumn = session?.role !== "AG";

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
    if (!routeTrustNoSearch) return;

    const routeFilters = createFiltersForSearch(routeTrustNoSearch);
    setDraftFilters((current) => (areFiltersEqual(current, routeFilters) ? current : routeFilters));
    setFilters((current) => (areFiltersEqual(current, routeFilters) ? current : routeFilters));
    setHasSearched(true);
    setPage(1);
  }, [routeTrustNoSearch]);

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
        notifyError(error instanceof Error ? error.message : "Unable to load trust submission list.", "trust-application-list-load");
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
    if (routeTrustNoSearch) navigate("/trust/listing", { replace: true });
  };

  const applyStatisticStatusFilter = (applicationStatus: string) => {
    const nextFilters: ListingFilters = {
      ...draftFilters,
      search: draftFilters.search.trim(),
      productCode: draftFilters.productCode,
      applicationStatus,
      agentSearch: draftFilters.agentSearch.trim()
    };

    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setHasSearched(applicationStatus !== allFilter || !areFiltersEqual(nextFilters, createEmptyFilters()));
    setPage(1);
    if (routeTrustNoSearch) navigate("/trust/listing", { replace: true });
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
      notifyError(error instanceof Error ? error.message : "Unable to delete trust submission.", "trust-application-delete-error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Trust Listing"
        description="Review submitted and draft trust submissions, track progress, and continue in-progress client onboarding."
        actions={
          canCreateApplication ? (
            <Button type="button" onClick={() => navigate("/trust/applications/new/personal-details")}>
              <Plus className="h-4 w-4" />
              New Trust Submission
            </Button>
          ) : null
        }
      />

      <TotalStatistics statistics={totalStatistics} loading={recordsLoading} activeStatus={filters.applicationStatus} onStatusSelect={applyStatisticStatusFilter} />

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line p-4">
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
            <EmptyState title="No trust submissions found" description="Adjust the filters and search again." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
                <tr>
                  <TableHead>No.</TableHead>
                  <TableHead>Application</TableHead>
                  {showAgentColumn ? <TableHead>Agent</TableHead> : null}
                  <TableHead>Applicant</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Action</TableHead>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => {
                  const actionId = String(record.TrustApplicationID || record.TrustID);
                  const isDraft = isDraftStatus(record.ApplicationStatus);
                  const canEditAsAgent = session?.role === "AG" && isDraft;
                  const canEditAsAdmin = canEditTrustApplicationAsAdmin(session?.role, record.ApplicationStatus);
                  const canShowEdit = session?.role === "AG" || canEditAsAdmin;
                  const canEdit = canEditAsAgent || canEditAsAdmin;
                  const canDelete = isDraft && canDeleteDraftApplication(session?.role);
                  const canRequestEarlyWithdrawal = session?.role === "AG" && normalizeApplicationStatus(record.ApplicationStatus) === "COMPLETED";

                  return (
                    <tr key={actionId} className="transition hover:bg-gray-50">
                      <TableCell className="font-semibold text-textPrimary">{(page - 1) * pageSize + index + 1}</TableCell>
                      <TableCell className="min-w-36">
                        <TwoLine primary={record.TrustNo || formatTrustNo(record.TrustID)} secondary={record.ProductName || "-"} />
                      </TableCell>
                      {showAgentColumn ? (
                        <TableCell className="min-w-48">
                          <TwoLine primary={record.TrustRepresentativeFullName || "-"} secondary={record.TrustRepresentativeUsername || "-"} />
                        </TableCell>
                      ) : null}
                      <TableCell className="min-w-52">
                        <TwoLine primary={record.FullName || "-"} secondary={[record.IdentityType, record.IdentityNo].filter(Boolean).join(" - ") || "-"} />
                      </TableCell>
                      <TableCell className="min-w-32">
                        <TwoLine
                          primary={
                            <span className="inline-flex items-center gap-2 font-semibold text-textPrimary">
                              <PlacementGiftIcon benefit={record.ComplimentaryBenefit} />
                              {formatCurrency(record.TrustAssetAmount)}
                            </span>
                          }
                          secondary={`Pending: ${formatCurrency(record.PendingPaymentAmount)}`}
                        />
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
                          {canShowEdit ? (
                            <ActionItem
                              label="Edit"
                              disabled={!canEdit}
                              onClick={() => {
                                setOpenActionId(null);
                                navigate(`/trust/applications/${record.TrustID}/personal-details`);
                              }}
                            />
                          ) : null}
                          <ActionItem
                            label="Delete"
                            disabled={!canDelete}
                            onClick={() => {
                              setOpenActionId(null);
                              setDeleteTarget(record);
                            }}
                          />
                          {canRequestEarlyWithdrawal ? (
                            <ActionItem
                              label="Request Early Withdrawal"
                              onClick={() => {
                                setOpenActionId(null);
                                setEarlyWithdrawalTarget(record);
                              }}
                            />
                          ) : null}
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
        title="Delete trust submission"
        message={deleteTarget ? `Are you sure you want to delete ${deleteTarget.TrustNo || formatTrustNo(deleteTarget.TrustID)}?` : "Are you sure you want to delete this trust submission?"}
        confirmText={deleting ? "Deleting..." : "Delete"}
        destructive
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleting) void deleteTrustApplication();
        }}
      />

      <EarlyWithdrawalDocumentModal
        record={earlyWithdrawalTarget}
        onClose={() => setEarlyWithdrawalTarget(null)}
      />

      <TrustApplicationViewDrawer record={viewTarget} onClose={() => setViewTarget(null)} onDecisionSubmitted={() => setRefreshKey((current) => current + 1)} />
    </>
  );
}

function EarlyWithdrawalDocumentModal({ record, onClose }: { record: TrustApplicationListItem | null; onClose: () => void }) {
  const [documents, setDocuments] = useState<DocumentDownloadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [downloadingGuid, setDownloadingGuid] = useState("");

  useEffect(() => {
    if (!record) return;

    let cancelled = false;

    async function loadDocuments() {
      setLoading(true);
      setLoadError("");
      try {
        const result = await documentDownloadApi.getDocumentList(trustWithdrawalModuleCode);
        if (!cancelled) setDocuments(result);
      } catch (error) {
        if (!cancelled) {
          setDocuments([]);
          setLoadError(error instanceof Error ? error.message : "Unable to load withdrawal documents.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [record]);

  const downloadDocument = async (document: DocumentDownloadItem) => {
    if (!document.DocumentGuid) return;

    setDownloadingGuid(document.DocumentGuid);
    try {
      const result = await documentDownloadApi.downloadDocument(trustWithdrawalModuleCode, document.DocumentGuid);
      saveDownloadedBlob(result.blob, result.fileName || document.FileName || getDocumentDownloadName(document));
      notifySuccess("Document downloaded successfully.", "trust-withdrawal-document-download");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to download document.", "trust-withdrawal-document-download-error");
    } finally {
      setDownloadingGuid("");
    }
  };

  return (
    <Modal open={Boolean(record)} title="Request Early Withdrawal" maxWidthClass="max-w-2xl" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-md border border-line bg-white p-4">
          <TwoLine primary={record?.TrustNo || formatTrustNo(record?.TrustID)} secondary={record?.FullName || "-"} />
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : loadError ? (
          <EmptyState title="Unable to load documents" description={loadError} />
        ) : documents.length === 0 ? (
          <EmptyState title="No documents found" description="There are no withdrawal documents available for download." />
        ) : (
          <div className="overflow-hidden rounded-md border border-line bg-white">
            <div className="divide-y divide-line">
              {documents.map((document) => {
                const documentGuid = document.DocumentGuid;
                const isDownloading = downloadingGuid === documentGuid;
                const DocumentIcon = getDocumentIcon(document.FileExtension || document.DocumentType);

                return (
                  <div key={documentGuid} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-soft text-ink">
                        <DocumentIcon className="h-5 w-5" />
                      </span>
                      <TwoLine primary={document.DocumentName || document.FileName || "Document"} secondary={[formatDocumentType(document.FileExtension || document.DocumentType), document.FileName].filter(Boolean).join(" - ") || "-"} />
                    </div>
                    <Button type="button" variant="outline" size="sm" disabled={isDownloading} onClick={() => void downloadDocument(document)} className="w-full sm:w-auto">
                      <Download className="h-4 w-4" />
                      {isDownloading ? "Downloading..." : "Download"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
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
  const [earlyWithdrawalPreviewOpen, setEarlyWithdrawalPreviewOpen] = useState(false);
  const [earlyWithdrawalConfirmOpen, setEarlyWithdrawalConfirmOpen] = useState(false);
  const canViewAuditTab = false;
  const canViewDecisionButton = session?.role === "SA" || session?.role === "AD";
  const visibleActiveTab = getVisibleApplicationTab(activeTab, canViewAuditTab);
  const currentDecisionStatus = normalizeApplicationStatus(detail?.status || record?.ApplicationStatus);
  const enabledDecisionStatuses = getEnabledDecisionStatuses(currentDecisionStatus);
  const isDecisionButtonDisabled = isDecisionButtonDisabledForStatus(currentDecisionStatus);
  const canManagePaymentAllocations = session?.role === "AG" && currentDecisionStatus === "PENDING_PAYMENT_APPROVAL";
  useBodyScrollLock(Boolean(record));

  const openDecisionModal = () => {
    setDecisionStatus("");
    setDecisionRemark("");
    setDecisionConfirmOpen(false);
    setEarlyWithdrawalPreviewOpen(false);
    setEarlyWithdrawalConfirmOpen(false);
    setDecisionModalOpen(true);
  };

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
        setEarlyWithdrawalPreviewOpen(false);
        setEarlyWithdrawalConfirmOpen(false);
        setDecisionStatus("");
        setDecisionRemark("");
        setDecisionSubmitting(false);
        return;
      }

      setActiveTab("overview");
      setDecisionModalOpen(false);
      setDecisionConfirmOpen(false);
      setEarlyWithdrawalPreviewOpen(false);
      setEarlyWithdrawalConfirmOpen(false);
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
          if (canViewTrustApplicationFromListingRecord(session?.role)) {
            setDetail(mapTrustApplicationListRecordViewDetail(record));
            setLoadError("");
          } else {
            setDetail(null);
            setLoadError(error instanceof Error ? error.message : "Unable to load trust submission.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadApplicationDetail();

    return () => {
      cancelled = true;
    };
  }, [record, session?.role]);

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

    if (decisionStatus === "EARLY_WITHDRAWN") {
      setDecisionModalOpen(false);
      setEarlyWithdrawalPreviewOpen(true);
      return;
    }

    setDecisionConfirmOpen(true);
  };

  const submitEarlyWithdrawalPreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!decisionRemark.trim()) {
      notifyError("Withdrawal Status remark is required.", "trust-application-early-withdrawal-remark");
      return;
    }

    if (decisionStatus !== "EARLY_WITHDRAWN" || !enabledDecisionStatuses.includes("EARLY_WITHDRAWN")) {
      notifyError("Early Withdrawn status is not allowed for the current application status.", "trust-application-early-withdrawal-status-not-allowed");
      return;
    }

    setEarlyWithdrawalConfirmOpen(true);
  };

  const confirmEarlyWithdrawalPreview = async () => {
    if (!record) return;

    setDecisionSubmitting(true);
    try {
      const result = await trustApplicationApi.submitEarlyWithdrawal(record.TrustID, {
        Remark: decisionRemark.trim()
      });

      await refreshViewDetail();
      notifySuccess(`Trust application status changed to ${formatStatusLabel(result.ApplicationStatus)}.`, "trust-application-early-withdrawal");
      setDecisionStatus("");
      setDecisionRemark("");
      setDecisionModalOpen(false);
      setEarlyWithdrawalPreviewOpen(false);
      setEarlyWithdrawalConfirmOpen(false);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to submit early withdrawal.", "trust-application-early-withdrawal-error");
    } finally {
      setEarlyWithdrawalConfirmOpen(false);
      setDecisionSubmitting(false);
    }
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
      setEarlyWithdrawalPreviewOpen(false);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to submit trust submission decision.", "trust-application-decision-error");
    } finally {
      setDecisionSubmitting(false);
    }

    setDecisionConfirmOpen(false);
  };

  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="View trust submission">
      <button type="button" className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]" aria-label="Close view panel" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[1180px] flex-col overflow-hidden border-l border-line bg-soft shadow-[0_24px_80px_rgba(17,17,17,0.28)] duration-200 animate-in slide-in-from-right sm:w-[94vw] xl:w-[1180px]">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="border-b border-line bg-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-textSecondary">
                  <span>Trust Submission</span>
                  <span className="text-brandGold">/</span>
                  <span className="text-textPrimary">View Application</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-normal text-ink sm:text-3xl">Trust Submission {detail?.trustId || record.TrustNo || formatTrustNo(record.TrustID)}</h2>
                  <StatusBadge status={formatStatusLabel(detail?.status || record.ApplicationStatus)} />
                </div>
                <p className="mt-1 text-sm font-medium text-textSecondary">View and manage trust submission details</p>
              </div>
              <div className="flex items-center gap-2">
                {canViewDecisionButton ? (
                  <button type="button" disabled={isDecisionButtonDisabled} onClick={openDecisionModal} className="inline-flex h-10 items-center justify-center rounded-lg border border-brandGold bg-brandGold px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-[#B89222] disabled:cursor-not-allowed disabled:border-line disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none">
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
                    {detail.earlyWithdrawalPanel ? (
                      <div className="mt-3">
                        <EarlyWithdrawalStatusPanel panel={detail.earlyWithdrawalPanel} />
                      </div>
                    ) : null}
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
            <DialogDescription>Update the trust submission status.</DialogDescription>
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
                onChange={(event) => {
                  const nextStatus = event.target.value;
                  setDecisionStatus(nextStatus);
                  if (nextStatus === "EARLY_WITHDRAWN") {
                    setDecisionModalOpen(false);
                    setEarlyWithdrawalPreviewOpen(true);
                  }
                }}
                className="decision-status-select mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                <option value="">Please select</option>
                {decisionStatusOptions.map((status) => {
                  const isEnabled = enabledDecisionStatuses.includes(status);

                  return (
                    <option key={status} value={status} disabled={!isEnabled} className={isEnabled ? "text-textPrimary" : "bg-slate-50 text-slate-300"}>
                      {formatStatusLabel(status)}
                    </option>
                  );
                })}
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

      <Dialog
        open={earlyWithdrawalPreviewOpen}
        onOpenChange={(open) => {
          if (!decisionSubmitting) setEarlyWithdrawalPreviewOpen(open);
        }}
      >
        <DialogContent className="max-w-3xl gap-3 bg-white p-5">
          <DialogHeader className="border-b border-line pb-3">
            <DialogTitle className="text-xl font-bold tracking-normal text-ink">Early Withdrawal Preview</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-textSecondary">Review the early withdrawal information before submitting the decision.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitEarlyWithdrawalPreview} className="space-y-3">
            <EarlyWithdrawalPreviewContent
              detail={detail}
              items={detail?.withdrawalInfo ?? []}
              remark={decisionRemark}
              onRemarkChange={(value) => setDecisionRemark(value)}
            />

            <DialogFooter>
              <Button type="submit" disabled={decisionSubmitting}>{decisionSubmitting ? "Submitting..." : "Submit"}</Button>
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

      <ConfirmDialog
        open={earlyWithdrawalConfirmOpen}
        title="Submit early withdrawal"
        message="Confirm submitting this early withdrawal request?"
        confirmText={decisionSubmitting ? "Submitting..." : "Confirm"}
        onClose={() => {
          if (!decisionSubmitting) setEarlyWithdrawalConfirmOpen(false);
        }}
        onConfirm={() => {
          if (!decisionSubmitting) void confirmEarlyWithdrawalPreview();
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

type ViewEarlyWithdrawalPanel = {
  earlyWithdrawalDate: string;
  deductionRate: string;
  deductionAmount: string;
  netWithdrawalAmount: string;
};

type ViewComplimentaryBenefit = {
  benefitName: string;
  benefitValue: string;
  qualifiedPlacementAmount: string;
  placementRange: string;
  fulfilmentMethod: string;
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
  beneficiaries: ViewAllocationBeneficiary[];
};

type ViewAllocationBeneficiary = {
  label: string;
  name: string;
  percentage: string;
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

type ReturnDocumentRow = {
  returnDocumentId: number;
  generatedDocumentRowId: number;
  documentGuid: string;
  documentName: string;
  returnedDate: string;
  remark: string;
  originalFileName: string;
  fileExtension: string;
  fileSize: string;
  createdAt: string;
  uploadedBy: string;
};

type GeneratedDocumentRow = {
  generatedDocumentRowId: number;
  name: string;
  description: string;
  type: string;
  issuedDate: string;
  viewUrl: string;
  returnDocuments: ReturnDocumentRow[];
};

type ViewDetail = {
  trustNumericId: number;
  trustId: string;
  trustPlanName: string;
  fundManagementPeriod: number | null;
  fundManagementPeriodUnit: string;
  status: string;
  summary: ViewSummaryItem[];
  timeline: ViewTimelineItem[];
  terminalStatusCard: ViewTerminalStatusCard | null;
  earlyWithdrawalPanel: ViewEarlyWithdrawalPanel | null;
  trustPlanInfo: ViewInfoItem[];
  withdrawalInfo: ViewInfoItem[];
  complimentaryBenefit: ViewComplimentaryBenefit | null;
  applicantInfo: ViewInfoItem[];
  representativeInfo: ViewInfoItem[];
  overview: ViewInfoItem[];
  personalDetails: ViewInfoSection[];
  trustAsset: ViewInfoItem[];
  trustAssetSections: ViewInfoSection[];
  beneficiaries: BeneficiaryViewCard[];
  caretaker: ViewInfoItem[];
  afterLifetime: ViewInfoItem[];
  allocations: ViewAllocationDetail;
  trustDeed: ViewInfoItem[];
  coBrokers: ViewInfoItem[];
  documents: GeneratedDocumentRow[];
  returnDocuments: ReturnDocumentRow[];
  supportingDocuments: Array<{ name: string; type: string; size: string; uploadedBy: string; uploadedDate: string; downloadUrl: string }>;
  payment: TrustApplicationPaymentList | null;
  payments: PaymentOverviewRow[];
  history: Array<{ title: string; description: string; actor: string; date: string; time: string }>;
};

function EarlyWithdrawalPreviewContent({ detail, items, remark, onRemarkChange }: { detail: ViewDetail | null; items: ViewInfoItem[]; remark: string; onRemarkChange: (value: string) => void }) {
  const trustNo = detail?.trustId || "-";
  const settlorName = getInfoValue(detail?.applicantInfo ?? [], "Full Name") || "-";
  const trustPlacement = getInfoValue(items, "Trust Placement") || "-";
  const withdrawalPercentage = getInfoValue(items, "Withdrawal Percentage") || "-";
  const withdrawalAmount = getInfoValue(items, "Withdrawal Amount") || "-";
  const remainingBalance = getInfoValue(items, "Balance") || "-";

  return (
    <div className="space-y-3">
      <section className="grid gap-3 md:grid-cols-2">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2.5 shadow-sm before:-ml-3 before:block before:h-12 before:w-1 before:shrink-0 before:bg-brandGold">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-brandGold">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-500">Trust No.</div>
            <div className="mt-0.5 break-words text-base font-bold tracking-normal text-ink">{trustNo}</div>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2.5 shadow-sm before:-ml-3 before:block before:h-12 before:w-1 before:shrink-0 before:bg-brandGold">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-brandGold">
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-500">Settlor Name</div>
            <div className="mt-0.5 break-words text-base font-bold tracking-normal text-ink">{settlorName}</div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <EarlyWithdrawalBreakdownRow
          title="Trust Placement"
          description="Original trust placement amount"
          value={trustPlacement}
        />
        <EarlyWithdrawalBreakdownRow
          title="Early Withdrawal Fee"
          description={`${withdrawalPercentage} of current trust balance`}
          centerValue={withdrawalPercentage}
          value={`- ${withdrawalAmount}`}
          tone="danger"
        />
        <EarlyWithdrawalBreakdownRow
          title="Net Withdrawal Amount"
          description="Amount to be withdrawn to the client"
          value={withdrawalAmount}
        />
        <EarlyWithdrawalBreakdownRow
          title="Remaining Balance"
          description="Amount that remains in the trust after early withdrawal"
          value={remainingBalance}
        />
      </section>

      <section className="border-t border-line pt-3">
        <label className="block text-sm font-semibold text-ink" htmlFor="early-withdrawal-status-remark">
          Withdrawal Status Remark <span className="text-red-600">*</span>
        </label>
        <textarea
          id="early-withdrawal-status-remark"
          value={remark}
          maxLength={earlyWithdrawalRemarkMaxLength}
          onChange={(event) => onRemarkChange(event.target.value.slice(0, earlyWithdrawalRemarkMaxLength))}
          rows={3}
          placeholder="Please provide the reason for early withdrawal."
          className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-ink shadow-sm transition placeholder:text-slate-400 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
        />
        <div className="mt-1 text-right text-sm font-medium text-slate-500">
          {remark.length} / {earlyWithdrawalRemarkMaxLength}
        </div>
      </section>
    </div>
  );
}

function EarlyWithdrawalBreakdownRow({ title, description, value, centerValue, tone = "default" }: { title: string; description: string; value: string; centerValue?: string; tone?: "default" | "danger" }) {
  const danger = tone === "danger";

  return (
    <div className={`grid items-center gap-2 border-b border-line px-4 py-2.5 last:border-b-0 sm:grid-cols-[1fr_6rem_11rem] ${danger ? "bg-red-50 text-red-600" : "bg-white text-ink"}`}>
      <div className="min-w-0">
        <div className={`text-sm font-semibold ${danger ? "text-ink" : "text-ink"}`}>{title}</div>
        <div className="mt-0.5 text-xs leading-5 text-slate-500">{description}</div>
      </div>
      <div className={`text-sm font-semibold sm:text-center ${danger ? "text-slate-500" : "text-transparent"}`} aria-hidden={!centerValue}>
        {centerValue || "-"}
      </div>
      <div className={`break-words text-right text-sm font-bold ${danger ? "text-red-600" : "text-ink"}`}>{value}</div>
    </div>
  );
}

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
  const toneClass = isRejected ? "border-red-200 bg-red-50 text-red-800" : isMatured ? "border-emerald-300 bg-white text-emerald-800 shadow-[0_10px_24px_rgba(16,185,129,0.14)]" : "border-orange-300 bg-orange-50 text-orange-800";
  const iconClass = isRejected ? "bg-red-100 text-red-700" : isMatured ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700";
  const helpClass = isRejected ? "text-red-700 hover:text-red-900" : isMatured ? "text-emerald-700 hover:text-emerald-900" : "text-orange-700 hover:text-orange-900";
  const StatusIcon = isMatured ? Check : AlertTriangle;
  const tooltipMessage = getTerminalStatusTooltipMessage(card);
  const gridColumn = Math.min(Math.max(anchorIndex + 1, 1), Math.max(stepCount, 1));

  return (
    <div className="grid min-w-[980px] px-8 pb-6" style={{ gridTemplateColumns: `repeat(${stepCount}, minmax(132px, 1fr))` }}>
      <div className="h-6 w-px justify-self-center bg-[#D8C9A5]" style={{ gridColumn }} aria-hidden="true" />
      <div className={`inline-flex w-max max-w-[260px] items-center gap-2 justify-self-center rounded-lg border px-3 py-2.5 shadow-sm ${toneClass}`} style={{ gridColumn }}>
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
            <TooltipContent className="left-auto right-0 max-w-64 translate-x-0">
              <span className="block w-64 max-w-[calc(100vw-2rem)] whitespace-normal text-left leading-relaxed">
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
  return `This trust submission was rejected on ${card.changedAt}.`;
}

function EarlyWithdrawalStatusPanel({ panel }: { panel: ViewEarlyWithdrawalPanel }) {
  return (
    <section className="rounded-lg border border-red-200 bg-red-50/70 px-5 py-4 shadow-soft">
      <div className="flex min-w-0 items-start gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-sm">
          <FileOutput className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-ink">Early Withdrawal</h3>
          <p className="mt-1 text-sm font-medium text-slate-600">This trust was withdrawn before its original maturity date.</p>

          <div className="mt-3 grid gap-0 border-t border-red-200 pt-3 md:grid-cols-[1fr_1fr_1fr_1.25fr]">
            <EarlyWithdrawalStatusMetric icon={Calendar} label="Early Withdrawal Date" value={panel.earlyWithdrawalDate} />
            <EarlyWithdrawalStatusMetric icon={Percent} label="Deduction Rate" value={panel.deductionRate} />
            <EarlyWithdrawalStatusMetric icon={CircleMinus} label="Deduction Amount" value={panel.deductionAmount} valueClassName="text-red-600" />
            <EarlyWithdrawalStatusMetric icon={Wallet} label="Net Withdrawal Amount" value={panel.netWithdrawalAmount} valueClassName="text-emerald-700" highlight />
          </div>
        </div>
      </div>
    </section>
  );
}

function EarlyWithdrawalStatusMetric({
  icon: Icon,
  label,
  value,
  valueClassName = "text-ink",
  highlight = false
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  valueClassName?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-3 border-red-200 px-4 py-2 first:pl-0 md:border-r md:last:border-r-0 ${highlight ? "rounded-lg bg-emerald-50" : ""}`}>
      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${highlight ? "bg-emerald-100 text-emerald-700" : "bg-white text-red-600"}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className={`text-xs font-semibold ${highlight ? "text-emerald-700" : "text-slate-500"}`}>{label}</div>
        <div className={`mt-1 break-words text-base font-bold tracking-normal ${valueClassName}`}>{value || "-"}</div>
      </div>
    </div>
  );
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
  const tabs = allTabs.filter((tab) => tab.id !== "co-broker" && (canViewAuditTab || tab.id !== "audit"));

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

function getVisibleApplicationTab(activeTab: ViewTabId, canViewAuditTab: boolean): ViewTabId {
  if (activeTab === "co-broker") return "overview";
  if (!canViewAuditTab && activeTab === "audit") return "overview";
  return activeTab;
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
  const canManageReturnDocuments = canViewReturnDocumentsSection(userRole);

  if (activeTab === "overview") {
    return (
      <div className="grid gap-4 px-4 py-5 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <TrustPlanInfoCard detail={detail} />
          <ApplicantInfoCard detail={detail} />
        </div>
        {detail.complimentaryBenefit ? <ComplimentaryBenefitCard benefit={detail.complimentaryBenefit} /> : null}
        <TrustRepresentativeCard detail={detail} />
        <PaymentsTable
          detail={detail}
          userRole={userRole}
          canManagePaymentAllocations={canManagePaymentAllocations}
          onPaymentChanged={onPaymentChanged}
          onRefreshDetail={onRefreshDetail}
        />
        <DocumentsListingTable
          trustId={detail.trustNumericId}
          documents={detail.documents}
          canManageReturnDocuments={canManageReturnDocuments}
          onRefreshDetail={onRefreshDetail}
        />
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
            <AllocationBeneficiaryRows beneficiaries={detail.allocations.beneficiaries} />
          </section>
        </div>
      </ViewCard>
    </div>
  );
}

function AllocationBeneficiaryRows({ beneficiaries }: { beneficiaries: ViewAllocationBeneficiary[] }) {
  if (!beneficiaries.length) {
    return <div className="rounded-lg border border-dashed border-line bg-soft px-4 py-6 text-center text-sm font-semibold text-textSecondary">No information available.</div>;
  }

  return (
    <div className="space-y-4">
      {beneficiaries.map((beneficiary, index) => (
        <div key={`${beneficiary.label}-${beneficiary.name}-${index}`} className="grid max-w-2xl gap-x-8 gap-y-3 sm:grid-cols-[minmax(0,24rem)_8rem]">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-textSecondary">{beneficiary.label}</div>
            <div className="mt-1 break-words text-sm font-semibold leading-5 text-ink">{beneficiary.name || "-"}</div>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-textSecondary">Allocation (%)</div>
            <div className="mt-1 break-words text-sm font-semibold leading-5 text-ink">{beneficiary.percentage || "-"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BeneficiariesTabContent({ detail }: { detail: ViewDetail }) {
  return (
    <div className="grid gap-4 px-4 py-5 sm:px-6">
      {detail.caretaker.length ? <SampleInfoCard title="Caretaker" icon={UserRound} items={detail.caretaker} /> : null}
      {detail.afterLifetime.length ? <SampleInfoCard title="After My Lifetime" icon={ClipboardList} items={detail.afterLifetime} /> : null}
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

function DocumentsListingTable({
  trustId,
  documents,
  canManageReturnDocuments,
  onRefreshDetail
}: {
  trustId: number;
  documents: ViewDetail["documents"];
  canManageReturnDocuments: boolean;
  onRefreshDetail: () => Promise<void>;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<GeneratedDocumentRow | null>(null);
  const [returnedDate, setReturnedDate] = useState("");
  const [remark, setRemark] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingGuid, setDownloadingGuid] = useState("");

  const resetUploadForm = () => {
    setUploadTarget(null);
    setReturnedDate("");
    setRemark("");
    setFile(null);
  };

  const closeUploadModal = () => {
    if (submitting) return;
    setUploadOpen(false);
    resetUploadForm();
  };

  const submitUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!uploadTarget?.generatedDocumentRowId) {
      notifyError("Generated document is required.", "trust-return-document-generated-document-required");
      return;
    }

    if (!returnedDate) {
      notifyError("Returned date is required.", "trust-return-document-date-required");
      return;
    }

    if (!file) {
      notifyError("Please select a file to upload.", "trust-return-document-file-required");
      return;
    }

    const fileError = getReturnDocumentFileValidationError(file);
    if (fileError) {
      notifyError(fileError, "trust-return-document-file-validation");
      return;
    }

    setSubmitting(true);
    try {
      await trustApplicationApi.uploadReturnDocument(trustId, {
        generatedDocumentRowID: uploadTarget.generatedDocumentRowId,
        documentName: "-",
        returnDate: returnedDate,
        remark,
        file
      });
      await onRefreshDetail();
      notifySuccess("Return document uploaded successfully.", "trust-return-document-upload-success");
      setUploadOpen(false);
      resetUploadForm();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to upload return document.", "trust-return-document-upload-error");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReturnDocument = async (document: ReturnDocumentRow) => {
    if (!document.documentGuid) return;

    setDownloadingGuid(document.documentGuid);
    try {
      const result = await documentDownloadApi.downloadDocument(trustReturnDocumentModuleCode, document.documentGuid);
      saveDownloadedBlob(result.blob, result.fileName || getReturnDocumentDownloadName(document));
      notifySuccess("Return document downloaded successfully.", "trust-return-document-download-success");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to download return document.", "trust-return-document-download-error");
    } finally {
      setDownloadingGuid("");
    }
  };

  return (
    <>
      <ViewCard title="Documents Listing" icon={FileText}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                <TableHead>Document</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issued Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </tr>
            </thead>
            <tbody>
              {documents.length ? (
                documents.flatMap((document) => {
                  const documentRow = (
                    <tr key={`document-${document.generatedDocumentRowId || document.name}`} className="transition hover:bg-gray-50">
                      <TableCell className="font-semibold text-textPrimary">{document.name}</TableCell>
                      <TableCell nowrap={false} className="min-w-64 leading-6">{document.description || "-"}</TableCell>
                      <TableCell>{document.type}</TableCell>
                      <TableCell>{document.issuedDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-3">
                          <DocumentIconLink href={document.viewUrl} label={`Download ${document.name}`} icon={Download} tone="dark" />
                          {canManageReturnDocuments && document.generatedDocumentRowId ? (
                            <button
                              type="button"
                              aria-label={`Upload returned document for ${document.name}`}
                              onClick={() => {
                                setUploadTarget(document);
                                setUploadOpen(true);
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-blue-600 transition hover:border-blue-300 hover:bg-blue-50"
                            >
                              <Upload className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </TableCell>
                    </tr>
                  );

                  const returnedRows = document.returnDocuments.map((returnDocument, index) => {
                    const isDownloading = downloadingGuid === returnDocument.documentGuid;
                    const returnedFileName = returnDocument.originalFileName || returnDocument.documentName || "-";
                    const returnRemark = returnDocument.remark.trim() && returnDocument.remark.trim() !== "-" ? returnDocument.remark.trim() : "";
                    return (
                      <tr key={`return-${returnDocument.documentGuid || `${document.generatedDocumentRowId}-${index}`}`}>
                        <td colSpan={5} className="border-b border-line px-0 py-1.5">
                          <div className="grid w-full min-w-[900px] grid-cols-[2.9rem_minmax(0,1fr)_1.1fr_6rem] items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/60 py-3 pl-5 pr-3 text-sm text-[#53658A] shadow-[inset_0_0_0_1px_rgba(219,234,254,0.35)]">
                            <div className="flex items-center">
                              <Forward className="h-5 w-5 shrink-0 text-blue-600" />
                            </div>
                            <div className="flex min-w-0 items-center gap-4">
                              <span className="min-w-0 whitespace-nowrap font-medium text-ink" title={returnedFileName}>
                                {middleEllipsis(returnedFileName, 52, 14)}
                              </span>
                              {returnDocument.fileSize ? (
                                <span className="shrink-0 whitespace-nowrap text-xs font-medium text-slate-400">
                                  {returnDocument.fileSize}
                                </span>
                              ) : null}
                              <span className="min-w-0 truncate text-[#53658A]" title={returnRemark}>
                                {returnRemark}
                              </span>
                            </div>
                            <div className="whitespace-nowrap">{returnDocument.createdAt || returnDocument.returnedDate || "-"}</div>
                            <div className="justify-self-end text-right">
                              <button
                                type="button"
                                aria-label={`Download ${returnDocument.originalFileName || returnDocument.documentName || "returned document"}`}
                                disabled={isDownloading || !returnDocument.documentGuid}
                                onClick={() => void downloadReturnDocument(returnDocument)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink transition hover:border-brandGold disabled:pointer-events-none disabled:bg-soft disabled:text-textSecondary"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  });

                  return [documentRow, ...returnedRows];
                })
              ) : (
                <EmptyTableRow colSpan={5} message="No documents available." />
              )}
            </tbody>
          </table>
        </div>
      </ViewCard>

      <Dialog open={uploadOpen} onOpenChange={(open) => (open ? setUploadOpen(true) : closeUploadModal())}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Upload Return Documents</DialogTitle>
            <DialogDescription>Upload one returned document for {uploadTarget?.name || "this generated document"}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitUpload} className="space-y-4">
            <DatePickerInput label="Returned Date" value={returnedDate} onChange={setReturnedDate} required dialogTitle="Returned Date" />

            <label className="block text-sm font-semibold text-textPrimary">
              File Upload<span className="ml-1 text-red-600">*</span>
              <input
                type="file"
                accept={returnDocumentAccept}
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  const validationError = nextFile ? getReturnDocumentFileValidationError(nextFile) : "";
                  if (validationError) {
                    notifyError(validationError, "trust-return-document-file-validation");
                    event.target.value = "";
                    setFile(null);
                    return;
                  }
                  setFile(nextFile);
                }}
                className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-textPrimary file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-black"
              />
              {file ? <span className="mt-1 block truncate text-xs font-medium text-textSecondary">{file.name}</span> : null}
            </label>

            <DialogFooter>
              <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
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
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
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
  const isFinalApprovalDecision = Boolean(decisionTarget && decisionAction === "approve" && isFinalPaymentApproval(detail, decisionTarget));
  const trustPlacementAmount = getTrustPlacementAmount(detail);
  const activePaymentRows = detail.payments.filter(isActivePaymentOverviewRow);
  const activePaymentAmount = toPaymentMoney(activePaymentRows.reduce((total, payment) => total + payment.amountValue, 0));
  const hasActivePayments = activePaymentRows.length > 0;
  const isFullyAllocated = hasActivePayments && trustPlacementAmount > 0 && paymentMoneyEqual(activePaymentAmount, trustPlacementAmount);

  const openPayments = () => {
    if (isFullyAllocated) return;
    if (hasActivePayments) {
      setAllocationModalOpen(true);
      return;
    }
    setPaymentModalOpen(true);
  };

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
              onClick={openPayments}
              disabled={isFullyAllocated}
              title={isFullyAllocated ? "Payments already match the trust placement amount" : "Manage payments"}
              className="h-11 border border-brandGold bg-brandGold px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-[#B89222]"
            >
              <CreditCard className="h-4 w-4" />
              Payments
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
                              size="icon"
                              disabled={!canReviewPaymentOverview(payment) || actionSubmitting}
                              onClick={() => openPaymentDecision(payment, "reject")}
                              aria-label={`Reject ${payment.allocation}`}
                              title={canReviewPaymentOverview(payment) ? "Reject payment" : "Only pending approval payments can be rejected"}
                              className="bg-red-600 text-white shadow-soft hover:bg-red-700 disabled:bg-gray-100 disabled:text-gray-400"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              disabled={!canReviewPaymentOverview(payment) || actionSubmitting}
                              onClick={() => openPaymentDecision(payment, "approve")}
                              aria-label={`Approve ${payment.allocation}`}
                              title={canReviewPaymentOverview(payment) ? "Approve payment" : "Only pending approval payments can be approved"}
                            >
                              <Check className="h-4 w-4" />
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
        <>
          <PaymentModal
            open={paymentModalOpen}
            detail={detail}
            onClose={() => setPaymentModalOpen(false)}
            onUsePaymentAllocations={() => {
              setPaymentModalOpen(false);
              setAllocationModalOpen(true);
            }}
            onRefreshDetail={onRefreshDetail}
          />
          <PaymentAllocationsModal
            open={allocationModalOpen}
            detail={detail}
            onClose={() => setAllocationModalOpen(false)}
            onPaymentChanged={onPaymentChanged}
            onRefreshDetail={onRefreshDetail}
          />
        </>
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

      <PaymentApprovalModal
        open={isFinalApprovalDecision}
        detail={detail}
        commencementDate={commencementDate}
        remark={decisionRemark}
        submitting={actionSubmitting}
        onCommencementDateChange={setCommencementDate}
        onRemarkChange={setDecisionRemark}
        onClose={() => {
          if (!actionSubmitting) {
            setDecisionTarget(null);
            setDecisionAction(null);
            setConfirmOpen(false);
          }
        }}
        onSubmit={submitPaymentDecision}
      />

      <Modal
        open={Boolean(decisionTarget && decisionAction && !isFinalApprovalDecision)}
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

function PaymentApprovalModal({
  open,
  detail,
  commencementDate,
  remark,
  submitting,
  onCommencementDateChange,
  onRemarkChange,
  onClose,
  onSubmit
}: {
  open: boolean;
  detail: ViewDetail;
  commencementDate: string;
  remark: string;
  submitting: boolean;
  onCommencementDateChange: (value: string) => void;
  onRemarkChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;

  const currentStatus = formatStatusLabel(detail.status);
  const maturityDate = calculateMaturityDate(commencementDate, detail.fundManagementPeriod, detail.fundManagementPeriodUnit);
  const periodDescription = formatPeriodDescription(detail.fundManagementPeriod, detail.fundManagementPeriodUnit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="approve-payment-title">
      <form onSubmit={onSubmit} className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-line bg-white shadow-[0_28px_80px_rgba(17,17,17,0.28)] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-brandGold">
        <div className="flex items-start justify-between gap-4 px-8 pb-5 pt-8">
          <div className="min-w-0">
            <h2 id="approve-payment-title" className="text-2xl font-bold leading-tight text-ink">Approve Payment</h2>
            <p className="mt-1 text-base font-medium leading-6 text-[#5E6D96]">Review the application details and set the commencement date to approve the payment.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} disabled={submitting} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink shadow-sm transition hover:bg-soft disabled:cursor-not-allowed disabled:opacity-60">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-8 pb-5">
          <section className="grid gap-4 rounded-lg border border-blue-100 bg-blue-50/30 px-5 py-4 md:grid-cols-[1fr_auto_1fr_auto_1.2fr] md:items-center">
            <ApprovalStatusBlock label="Current Application Status" value={currentStatus} tone="warning" />
            <ArrowRight className="hidden h-6 w-6 text-ink md:block" />
            <ApprovalStatusBlock label="New Application Status" value="Payment Approved" tone="success" />
            <div className="hidden h-20 w-px bg-blue-100 md:block" />
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <FileText className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#53628B]">Trust Submission</div>
                <div className="mt-1 truncate text-xl font-bold leading-tight text-ink">{detail.trustId || "-"}</div>
                <div className="truncate text-base font-medium leading-tight text-[#53628B]">{detail.trustPlanName || "-"}</div>
              </div>
            </div>
          </section>

          <ApprovalPanel icon={Calendar} title="Key Dates">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <DatePickerInput
                  label="Commencement Date"
                  value={commencementDate}
                  onChange={onCommencementDateChange}
                  required
                  dialogTitle="Commencement Date"
                  className="text-sm font-semibold text-[#2E3B60]"
                  buttonClassName="h-11 rounded-lg text-sm font-semibold"
                />
                <p className="mt-2 text-sm font-medium leading-5 text-[#5E6D96]">Used to calculate the matured date and dividend schedule.</p>
              </div>
              <div>
                <div className="block text-sm font-semibold text-[#5E6D96]">Matured Date (Auto)</div>
                <div className="mt-1 flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-line bg-soft px-3 text-sm font-semibold text-[#667397] shadow-inner">
                  <span>{maturityDate || "-"}</span>
                  <Calendar className="h-4 w-4 shrink-0 text-[#667397]" />
                </div>
                <p className="mt-2 text-sm font-medium leading-5 text-[#5E6D96]">Calculated based on the fund management period{periodDescription ? ` (${periodDescription})` : ""}.</p>
              </div>
            </div>
          </ApprovalPanel>

          <ApprovalPanel icon={Info} title="Important Information">
            <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium leading-5 text-blue-800">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <Info className="h-5 w-5" />
              </span>
              <ul className="list-disc pl-4">
                <li>This action will change the application status from <span className="font-bold">{currentStatus}</span> to <span className="font-bold">Payment Approved</span>.</li>
                <li>Please ensure all payment allocations have been fully approved and the commencement date is correct.</li>
              </ul>
            </div>
          </ApprovalPanel>

          <ApprovalPanel icon={FileText} title="Remark">
            <label className="sr-only" htmlFor="payment-approval-remark">Remark</label>
            <textarea
              id="payment-approval-remark"
              value={remark}
              onChange={(event) => onRemarkChange(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Enter remark (optional)"
              className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-textPrimary transition placeholder:text-[#8794B5] focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
            <div className="mt-1 text-right text-xs font-medium text-[#5E6D96]">{remark.length} / 500</div>
          </ApprovalPanel>
        </div>

        <div className="flex justify-end gap-3 border-t border-line bg-white px-8 py-4">
          <button type="button" onClick={onClose} disabled={submitting} className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-white px-5 text-sm font-semibold text-textPrimary transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
            Cancel
          </button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ApprovalStatusBlock({ label, value, tone }: { label: string; value: string; tone: "warning" | "success" }) {
  const badgeClass = tone === "warning" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700";
  return (
    <div>
      <div className="text-sm font-semibold text-[#53628B]">{label}</div>
      <div className={`mt-2 inline-flex rounded-lg px-3 py-2 text-sm font-bold ${badgeClass}`}>{value}</div>
    </div>
  );
}

function ApprovalPanel({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex items-center gap-3 bg-gradient-to-r from-white to-soft px-5 py-3">
        <Icon className="h-5 w-5 text-ink" />
        <h3 className="text-base font-bold uppercase leading-tight text-[#2E3B60]">{title}</h3>
      </div>
      <div className="px-5 pb-4">{children}</div>
    </section>
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

function PaymentModal({
  open,
  detail,
  onClose,
  onUsePaymentAllocations,
  onRefreshDetail
}: {
  open: boolean;
  detail: ViewDetail;
  onClose: () => void;
  onUsePaymentAllocations: () => void;
  onRefreshDetail: () => Promise<void>;
}) {
  const [paymentDate, setPaymentDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const placementAmount = getTrustPlacementAmount(detail);

  useEffect(() => {
    if (!open) return;
    setPaymentDate("");
    setReferenceNo("");
    setPaymentSlip(null);
  }, [open]);

  const closeModal = () => {
    if (submitting) return;
    onClose();
  };

  const submitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (placementAmount <= 0) {
      notifyError("Trust placement amount is required.", "payment-submit-amount");
      return;
    }

    if (!paymentDate) {
      notifyError("Payment date is required.", "payment-submit-date");
      return;
    }

    if (!paymentSlip) {
      notifyError("Payment slip file is required.", "payment-submit-file");
      return;
    }

    const fileError = getPaymentSlipFileValidationError(paymentSlip);
    if (fileError) {
      notifyError(fileError, "payment-submit-file-validation");
      return;
    }

    setSubmitting(true);
    try {
      await submitTrustApplicationPayment(detail.trustNumericId, {
        amount: placementAmount,
        paymentDate,
        referenceNo,
        file: paymentSlip
      });
      await onRefreshDetail();
      notifySuccess("Payment submitted successfully.", "payment-submit-success");
      onClose();
    } catch (error) {
      notifyError(getPaymentErrorMessage(error, "Unable to submit payment."), "payment-submit-error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} title="Payments" maxWidthClass="max-w-lg" onClose={closeModal}>
      <form onSubmit={submitPayment} className="space-y-4">
        <div className="rounded-lg border border-line bg-white px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-wide text-textSecondary">Trust Placement Amount</div>
          <div className="mt-1 text-lg font-bold text-ink">{formatCurrency(placementAmount)}</div>
        </div>

        <DatePickerInput
          label="Payment Date"
          value={paymentDate}
          onChange={setPaymentDate}
          required
          dialogTitle="Payment Date"
        />

        <label className="block text-sm font-semibold text-textPrimary">
          Reference No.
          <input
            value={referenceNo}
            onChange={(event) => setReferenceNo(event.target.value)}
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
                notifyError(validationError, "payment-submit-file-validation");
                event.target.value = "";
                setPaymentSlip(null);
                return;
              }
              setPaymentSlip(nextFile);
            }}
            className="mt-1 block w-full cursor-pointer rounded-lg border border-line bg-white px-3 py-2 text-sm text-textPrimary file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
          />
        </label>

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onUsePaymentAllocations} disabled={submitting}>
            <Split className="h-4 w-4" />
            Use Payment Allocations
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

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
        paymentNo: getNextPaymentAllocationNo(currentRows),
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
            <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Trust Submission</p>
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
                    visibleRows.map((row) => {
                      const removable = row.isNew || canRemovePaymentAllocation(row);
                      return (
                        <tr key={row.localId} className="transition hover:bg-gray-50">
                          <TableCell className="font-semibold text-textPrimary">{formatPaymentNo(row.paymentNo)}</TableCell>
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

function DocumentIconLink({ href, label, icon: Icon, tone }: { href: string; label: string; icon: typeof Download; tone: "dark" | "blue" }) {
  const enabled = Boolean(href);
  const toneClass = tone === "blue"
    ? "text-blue-600 hover:border-blue-300 hover:bg-blue-50"
    : "text-ink hover:border-brandGold";

  return (
    <a
      href={href || "#"}
      target="_blank"
      rel="noreferrer"
      aria-disabled={!enabled}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${enabled ? `border-line bg-white ${toneClass}` : "pointer-events-none border-line bg-soft text-textSecondary"}`}
    >
      <Icon className="h-4 w-4" />
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

function ComplimentaryBenefitCard({ benefit }: { benefit: ViewComplimentaryBenefit }) {
  return (
    <section className="overflow-hidden rounded-lg border border-brandGold/30 bg-[#FFFCF4] shadow-[0_10px_28px_rgba(188,141,49,0.10)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brandGold/20 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brandGold/30 bg-[#FFFBEB] text-brandGold">
            <Gift className="h-4 w-4" />
          </span>
          <h3 className="truncate text-base font-bold text-ink">Complimentary Benefit</h3>
        </div>
        <span className="inline-flex h-8 items-center gap-2 rounded-full bg-emerald-100 px-4 text-sm font-bold text-emerald-700">
          <Gift className="h-4 w-4" />
          Eligible
        </span>
      </div>

      <div className="grid gap-5 px-4 pb-4 pt-3 md:grid-cols-[9rem_minmax(0,1fr)]">
        <div className="flex h-28 items-center justify-center rounded-lg bg-[#FFF7DE] p-2 shadow-inner">
          <img src={premiumGoldGiftBoxIcon} alt="" className="h-full w-full object-contain" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <div className="grid gap-y-4 border-b border-brandGold/20 pb-4 lg:grid-cols-4">
            <ComplimentaryBenefitMetric label="Benefit Name" value={benefit.benefitName} />
            <ComplimentaryBenefitMetric label="Benefit Value" value={benefit.benefitValue} />
            <ComplimentaryBenefitMetric label="Qualified Placement Amount" value={benefit.qualifiedPlacementAmount} />
            <ComplimentaryBenefitMetric label="Placement Range" value={benefit.placementRange} />
          </div>

          <div className="mt-3 min-w-0">
            <div className="text-xs font-bold text-textSecondary">Fulfilment Method</div>
            <div className="mt-1 break-words text-sm font-bold leading-5 text-ink">{benefit.fulfilmentMethod || "-"}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComplimentaryBenefitMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-brandGold/20 lg:border-r lg:px-4 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
      <div className="text-xs font-bold text-textSecondary">{label}</div>
      <div className="mt-1 break-words text-base font-bold leading-5 text-ink">{value || "-"}</div>
    </div>
  );
}

function TrustRepresentativeCard({ detail }: { detail: ViewDetail }) {
  const fullName = getInfoValue(detail.representativeInfo, "Full Name");
  const email = getInfoValue(detail.representativeInfo, "Email");
  const rank = getInfoValue(detail.representativeInfo, "Rank");
  const contactNumber = getInfoValue(detail.representativeInfo, "Contact Number");
  const createdOn = getInfoValue(detail.representativeInfo, "Created On");
  const createdOnLine = formatRepresentativeCreatedOnLine(createdOn);
  const initials = getInitials(fullName);

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFFBEB] text-brandGold">
          <Users className="h-4 w-4" />
        </span>
        <h3 className="text-base font-bold text-ink">Created By</h3>
      </div>

      <div className="grid items-center gap-0 bg-white px-4 py-4 lg:grid-cols-4">
        <div className="flex min-w-0 items-center gap-4 border-b border-line pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-base font-bold text-white shadow-sm">
            {initials || <Users className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <div className="break-words text-lg font-bold leading-tight text-ink">{fullName || "-"}</div>
            <div className="mt-1 break-words text-sm font-semibold leading-5 text-textSecondary">{rank || "Rank unavailable"}</div>
          </div>
        </div>

        <RepresentativeInfoTile icon={Mail} label="Email" value={email} valueClassName="[overflow-wrap:anywhere]" />
        <RepresentativeInfoTile icon={Phone} label="Contact Number" value={contactNumber} valueClassName="whitespace-nowrap" />
        <RepresentativeInfoTile icon={Calendar} label="Joined Date" value={createdOnLine} valueClassName="whitespace-nowrap" />
      </div>
    </section>
  );
}

function RepresentativeInfoTile({
  icon: Icon,
  label,
  value,
  secondaryValue,
  valueClassName = ""
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  secondaryValue?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 border-b border-line py-3 last:border-b-0 lg:border-b-0 lg:border-r lg:px-4 lg:py-0 lg:last:border-r-0">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFFBEB] text-brandGold">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-bold text-textSecondary">{label}</div>
          <div className={`mt-1 text-sm font-bold leading-5 text-ink ${valueClassName || "break-words"}`}>{value || "-"}</div>
          {secondaryValue ? <div className="mt-0.5 text-sm font-bold leading-5 text-ink">{secondaryValue}</div> : null}
        </div>
      </div>
    </div>
  );
}

function getInfoValue(items: ViewInfoItem[], label: string) {
  return items.find((item) => item.label === label)?.value ?? "";
}

function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatRepresentativeCreatedOnLine(value: string) {
  const [datePart, ...timeParts] = value.split(",");
  const time = timeParts.join(",").trim().replace(/\b(am|pm)\b/i, (match) => match.toUpperCase());

  return [datePart.trim(), time].filter(Boolean).join(" ");
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
  const representative = asRecord(detail.TrustRepresentative);
  const network = asRecord(detail.Network);
  const submissionNetwork = getSubmissionNetworkSnapshotDisplay({
    ReferenceID: network?.ReferenceID as number | string | null | undefined,
    NetworkType: getString(network, "NetworkType"),
    NetworkName: getString(network, "NetworkName"),
    ReferralCode: getString(network, "ReferralCode")
  });
  const applicantName = getString(step1, "FullName") || record.FullName || "";
  const trustAssetAmount = getNumber(payment, "TrustAssetAmount") ?? getNumber(step2, "TrustAssetAmount") ?? record.TrustAssetAmount ?? null;
  const trustName = getString(step2, "TrustName") || getString(detail, "TrustName") || record.TrustName || "";
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

  const personalSubmissionNetwork = [
    { label: "Network Tree", value: submissionNetwork.networkTree },
    { label: "Referral Code", value: submissionNetwork.referralCode }
  ];

  const personalDetails = cleanInfoSections([
    { title: "Identity Information", items: personalIdentityInformation },
    { title: "Contact & Address", items: personalContactAddress },
    { title: "Tax Return", items: personalTaxReturn },
    { title: "Client Due Diligence", items: personalClientDueDiligence },
    { title: "Source of Funds", items: personalSourceOfFunds },
    { title: "Submission Network", items: personalSubmissionNetwork }
  ]);

  const trustPlanInfo = cleanInfoItems([
    { label: "Product Name", value: productName },
    { label: "Plan Category", value: getString(trustPlan, "ProductCategory") },
    { label: "Description", value: getString(trustPlan, "ProductDescription") },
    { label: "Fund Management Period", value: formatPeriod(getNumber(trustPlan, "FundManagementPeriod"), getString(trustPlan, "FundManagementPeriodUnit")) },
    { label: "Minimum Placement", value: formatNullableCurrency(getNumber(trustPlan, "MinimumPlacement")) },
    { label: "Maximum Placement", value: formatNullableCurrency(getNumber(trustPlan, "MaximumPlacement")) }
  ]);
  const withdrawalInfo = mapWithdrawalInfo(asRecord(detail), payment, trustPlan, trustAssetAmount);

  const trustAsset = cleanInfoItems([
    { label: "Trust Name", value: trustName },
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
  const thirdPartyRelationship = getRelationshipDisplayName(
    getString(paymentSourceDetail, "ThirdPartyRelationshipName") || getString(step2, "ThirdPartyRelationshipName"),
    getString(paymentSourceDetail, "ThirdPartyRelationship") || getString(step2, "ThirdPartyRelationship"),
    getString(paymentSourceDetail, "ThirdPartyOtherRelationship") || getString(step2, "ThirdPartyOtherRelationship")
  );
  const paymentSource = cleanInfoItems([
    { label: "Payment Source", value: formatPaymentSourceOption(paymentSourceCode) },
    { label: "Joint Account Holder Name", value: getString(paymentSourceDetail, "JointAccountHolderName") || getString(step2, "JointAccountHolderName") },
    { label: "Third Party Name", value: getString(paymentSourceDetail, "ThirdPartyName") || getString(step2, "ThirdPartyName") },
    { label: "NRIC No. / Passport No. / ID No.", value: getString(paymentSourceDetail, "ThirdPartyIdentityNo") || getString(step2, "ThirdPartyIdentityNo") },
    { label: "Relationship", value: thirdPartyRelationship },
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
  const afterLifetime = mapAfterLifetime(step3);
  const allocations = mapAllocations(step4, asArray(step3?.Beneficiaries));
  const trustDeed = cleanInfoItems([
    { label: "Signing Method", value: formatCodeLabel(getString(step5, "SigningMethod")) },
    { label: "Special Circumstance", value: formatCodeLabel(getString(step5, "SpecialCircumstance")) },
    { label: "Read-over By", value: getString(step5, "ReadOverBy") },
    { label: "Read-over Identity No.", value: getString(step5, "ReadOverIdentityNo") },
    { label: "Language / Dialect", value: getString(step5, "LanguageOrDialect") },
    { label: "Relationship With Settlor", value: getRelationshipDisplayName(getString(step5, "RelationshipWithSettlorName"), getString(step5, "RelationshipWithSettlor"), getString(step5, "OtherRelationshipWithSettlor")) }
  ]);
  const coBrokers = mapCoBrokers(asArray(step7?.CoBrokers));
  const documents = mapGeneratedDocuments(detail.TrustID || record.TrustID, asArray(detail.Documents));
  const returnDocuments = mapReturnDocuments(asArray(detail.ReturnDocuments));
  const supportingDocuments = mapSupportingDocuments(asArray(step6?.SupportingDocuments));
  const payments = mapPayments(asArray(payment?.Payments));
  const history = mapHistory(asArray(detail.History));
  const currentStatus = detail.ApplicationStatus || record.ApplicationStatus || "";
  const statusFlowHistory = asArray(detail.StatusFlowHistory);
  const terminalStatusCard = mapTerminalStatusCard(currentStatus, statusFlowHistory);
  const earlyWithdrawalPanel = mapEarlyWithdrawalPanel(currentStatus, detail, withdrawalInfo);
  const complimentaryBenefit = mapComplimentaryBenefit(asRecord(detail.ComplimentaryBenefit));

  return {
    trustNumericId: detail.TrustID || record.TrustID,
    trustId: detail.TrustNo || record.TrustNo || formatTrustNo(detail.TrustID || record.TrustID),
    trustPlanName: productName,
    fundManagementPeriod: getNumber(trustPlan, "FundManagementPeriod"),
    fundManagementPeriodUnit: getString(trustPlan, "FundManagementPeriodUnit"),
    status: currentStatus,
    summary: cleanSummaryItems([
      { label: "Applicant Name", value: applicantName, icon: UserRound },
      { label: "Trust Amount", value: formatNullableCurrency(trustAssetAmount), icon: Wallet },
      { label: "Commencement Date", value: formatDate(getString(detail, "CommencementDate")), icon: Calendar },
      { label: "Maturity Date", value: formatDate(getString(detail, "MaturityDate")), icon: Calendar }
    ]),
    timeline: mapStatusFlow(asArray(detail.StatusFlow), currentStatus, terminalStatusCard?.previousStatus),
    terminalStatusCard,
    earlyWithdrawalPanel,
    trustPlanInfo,
    withdrawalInfo,
    complimentaryBenefit,
    applicantInfo: cleanInfoItems([
      { label: "Full Name", value: applicantName },
      { label: "Type of Identity", value: getString(step1, "IdentityType") || record.IdentityType || "" },
      { label: "NRIC No. / Passport No. / ID No.", value: getString(step1, "IdentityNo") || record.IdentityNo || "" },
      { label: "Email", value: getString(step1, "Email") || record.Email || "" },
      { label: "Contact Number", value: getString(step1, "ContactNo") || record.ContactNo || "" },
      { label: "Country", value: getString(step1, "Country") }
    ]),
    representativeInfo: cleanInfoItems([
      { label: "Full Name", value: getString(representative, "Name") || record.TrustRepresentativeFullName || "" },
      { label: "Email", value: getString(representative, "Email") || record.TrustRepresentativeUsername || "" },
      { label: "Rank", value: getString(representative, "RankName") },
      { label: "Contact Number", value: getString(representative, "ContactNo") },
      { label: "Created On", value: formatDateTime(getString(representative, "JoinDate")) }
    ]),
    overview: cleanInfoItems([
      { label: "Trust No.", value: detail.TrustNo || record.TrustNo || "" },
      { label: "Product", value: productName },
      { label: "Status", value: formatStatusLabel(detail.ApplicationStatus || record.ApplicationStatus) },
      { label: "Agent", value: record.TrustRepresentativeFullName || record.TrustRepresentativeUsername || "" },
      { label: "Created Date", value: formatDate(getString(detail, "CreatedAt") || record.CreatedAt) },
      { label: "Updated Date", value: formatDate(getString(detail, "UpdatedAt") || record.UpdatedAt) },
      { label: "Submitted Date", value: formatDate(getString(detail, "SubmittedAt") || record.SubmittedAt) },
      { label: "Current Step", value: formatProgressStep(detail.CurrentStep || record.CurrentStep) },
      { label: "Completed Steps", value: formatProgressCompleted(detail.LastCompletedStep || record.LastCompletedStep) }
    ]),
    personalDetails,
    trustAsset,
    trustAssetSections,
    beneficiaries,
    caretaker,
    afterLifetime,
    allocations,
    trustDeed,
    coBrokers,
    documents,
    returnDocuments,
    supportingDocuments,
    payment: payment as TrustApplicationPaymentList | null,
    payments,
    history
  };
}

function mapTrustApplicationListRecordViewDetail(record: TrustApplicationListItem): ViewDetail {
  const trustId = record.TrustNo || formatTrustNo(record.TrustID);
  const status = record.ApplicationStatus || "";
  const applicantName = record.FullName || "";
  const productName = record.ProductName || record.ProductCode || "";
  const trustAssetAmount = record.TrustAssetAmount ?? null;
  const trustName = record.TrustName || "";
  const applicantInfo = cleanInfoItems([
    { label: "Full Name", value: applicantName },
    { label: "Type of Identity", value: record.IdentityType || "" },
    { label: "NRIC No. / Passport No. / ID No.", value: record.IdentityNo || "" },
    { label: "Email", value: record.Email || "" },
    { label: "Contact Number", value: record.ContactNo || "" }
  ]);

  return {
    trustNumericId: record.TrustID,
    trustId,
    trustPlanName: productName,
    fundManagementPeriod: null,
    fundManagementPeriodUnit: "",
    status,
    summary: cleanSummaryItems([
      { label: "Applicant Name", value: applicantName, icon: UserRound },
      { label: "Trust Amount", value: formatNullableCurrency(trustAssetAmount), icon: Wallet },
      { label: "Created Date", value: formatDate(record.CreatedAt), icon: Calendar },
      { label: "Updated Date", value: formatDate(record.UpdatedAt), icon: Calendar }
    ]),
    timeline: [],
    terminalStatusCard: null,
    earlyWithdrawalPanel: null,
    trustPlanInfo: cleanInfoItems([
      { label: "Product", value: productName },
      { label: "Product Code", value: record.ProductCode || "" }
    ]),
    withdrawalInfo: [],
    complimentaryBenefit: null,
    applicantInfo,
    representativeInfo: cleanInfoItems([
      { label: "Full Name", value: record.TrustRepresentativeFullName || "" },
      { label: "Email", value: record.TrustRepresentativeUsername || "" }
    ]),
    overview: cleanInfoItems([
      { label: "Trust No.", value: record.TrustNo || "" },
      { label: "Product", value: productName },
      { label: "Status", value: formatStatusLabel(status) },
      { label: "Agent", value: record.TrustRepresentativeFullName || record.TrustRepresentativeUsername || "" },
      { label: "Created Date", value: formatDate(record.CreatedAt) },
      { label: "Updated Date", value: formatDate(record.UpdatedAt) },
      { label: "Submitted Date", value: formatDate(record.SubmittedAt) },
      { label: "Current Step", value: formatProgressStep(record.CurrentStep) },
      { label: "Completed Steps", value: formatProgressCompleted(record.LastCompletedStep) }
    ]),
    personalDetails: cleanInfoSections([
      { title: "Applicant Information", items: applicantInfo }
    ]),
    trustAsset: cleanInfoItems([
      { label: "Trust Name", value: trustName },
      { label: "Trust Asset Amount (MYR)", value: formatNullableCurrency(trustAssetAmount) },
      { label: "Based on selected plan", value: productName }
    ]),
    trustAssetSections: cleanInfoSections([
      {
        title: "Trust Asset",
        items: cleanInfoItems([
          { label: "Trust Name", value: trustName },
          { label: "Trust Asset Amount (MYR)", value: formatNullableCurrency(trustAssetAmount) },
          { label: "Based on selected plan", value: productName }
        ])
      }
    ]),
    beneficiaries: [],
    caretaker: [],
    afterLifetime: [],
    allocations: { allocationType: [], beneficiaries: [] },
    trustDeed: [],
    coBrokers: [],
    documents: [],
    returnDocuments: [],
    supportingDocuments: [],
    payment: null,
    payments: [],
    history: []
  };
}

function mapWithdrawalInfo(detail: Record<string, unknown> | null, payment: Record<string, unknown> | null, trustPlan: Record<string, unknown> | null, trustAssetAmount?: number | null): ViewInfoItem[] {
  const withdrawal = getWithdrawalInfoRecord(detail, payment);
  const placement = getFirstNumber(withdrawal, ["TrustPlacement", "TrustPlacementAmount", "PlacementAmount", "TrustAssetAmount"]) ?? trustAssetAmount ?? getNumber(payment, "TrustAssetAmount");
  const percentage = getFirstNumber(withdrawal, ["WithdrawalPercentage", "WithdrawalPercent", "EarlyWithdrawalPercentage", "EarlyWithdrawalPercent", "Percentage"]) ?? getEarlyWithdrawalPercentage(trustPlan);
  const configuredAmount = getFirstNumber(withdrawal, ["WithdrawalAmount", "EarlyWithdrawalAmount", "Amount"]);
  const calculatedAmount = configuredAmount ?? calculateWithdrawalAmount(placement, percentage, trustPlan);
  const balance = getFirstNumber(withdrawal, ["Balance", "WithdrawalBalance", "RemainingBalance", "TrustBalance"]) ?? calculateWithdrawalBalance(placement, calculatedAmount);
  const remark = getFirstString(withdrawal, ["WithdrawalStatusRemark", "StatusRemark", "Remark", "Remarks"]);

  return cleanInfoItems([
    { label: "Trust Placement", value: formatNullableCurrency(placement) },
    { label: "Withdrawal Percentage", value: formatPercentage(percentage) },
    { label: "Withdrawal Amount", value: formatNullableCurrency(calculatedAmount) },
    { label: "Balance", value: formatNullableCurrency(balance) },
    { label: "Withdrawal Status Remark", value: remark }
  ]);
}

function mapEarlyWithdrawalPanel(currentStatus: string, detail: TrustApplicationDetail, withdrawalInfo: ViewInfoItem[]): ViewEarlyWithdrawalPanel | null {
  if (normalizeApplicationStatus(currentStatus) !== "EARLY_WITHDRAWN") return null;

  const withdrawalAmount = getInfoValue(withdrawalInfo, "Withdrawal Amount");
  const balance = getInfoValue(withdrawalInfo, "Balance");

  return {
    earlyWithdrawalDate: formatDate(getString(detail, "EarlyWithdrawnAt")),
    deductionRate: getInfoValue(withdrawalInfo, "Withdrawal Percentage"),
    deductionAmount: withdrawalAmount ? `- ${withdrawalAmount}` : "",
    netWithdrawalAmount: balance
  };
}

function mapComplimentaryBenefit(benefit: Record<string, unknown> | null): ViewComplimentaryBenefit | null {
  if (!benefit || !Object.keys(benefit).length) return null;

  const benefitName = getString(benefit, "BenefitName");
  const benefitValue = getNumber(benefit, "BenefitValue");
  const qualifiedPlacementAmount = getNumber(benefit, "QualifiedPlacementAmount");
  const minimumPlacement = getNumber(benefit, "MinimumPlacement");
  const maximumPlacement = getNumber(benefit, "MaximumPlacement");
  const fulfilmentMethod = getString(benefit, "FulfilmentMethod");

  if (!benefitName && benefitValue === null && qualifiedPlacementAmount === null && minimumPlacement === null && maximumPlacement === null && !fulfilmentMethod) {
    return null;
  }

  return {
    benefitName,
    benefitValue: formatNullableCurrency(benefitValue),
    qualifiedPlacementAmount: formatNullableCurrency(qualifiedPlacementAmount),
    placementRange: formatPlacementRange(minimumPlacement, maximumPlacement),
    fulfilmentMethod: formatFulfilmentMethod(fulfilmentMethod)
  };
}

function formatPlacementRange(minimumPlacement: number | null, maximumPlacement: number | null) {
  if (minimumPlacement === null && maximumPlacement === null) return "";
  if (minimumPlacement !== null && maximumPlacement !== null) return `${formatCurrency(minimumPlacement)} - ${formatCurrency(maximumPlacement)}`;
  if (minimumPlacement !== null) return `${formatCurrency(minimumPlacement)} and above`;
  return `Up to ${formatCurrency(maximumPlacement)}`;
}

function formatFulfilmentMethod(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return "";
  if (normalized === "MANUAL") return "Manual Fulfilment";
  return `${formatCodeLabel(normalized)} Fulfilment`;
}

function getWithdrawalInfoRecord(detail: Record<string, unknown> | null, payment: Record<string, unknown> | null) {
  const sources = [
    detail?.WithdrawalInfo,
    detail?.Withdrawal,
    detail?.TrustPlanWithdrawalInfo,
    detail?.EarlyWithdrawalInfo,
    payment?.WithdrawalInfo,
    payment?.Withdrawal,
    payment?.EarlyWithdrawalInfo
  ];

  return sources.map(asRecord).find(Boolean) ?? null;
}

function getEarlyWithdrawalPercentage(trustPlan: Record<string, unknown> | null) {
  const feeType = getString(trustPlan, "EarlyWithdrawalFeeType").toUpperCase();
  if (feeType && feeType !== "PERCENTAGE") return null;
  return getNumber(trustPlan, "EarlyWithdrawalFeeValue");
}

function calculateWithdrawalAmount(placement?: number | null, percentage?: number | null, trustPlan?: Record<string, unknown> | null) {
  if (placement !== null && placement !== undefined && percentage !== null && percentage !== undefined) return (placement * percentage) / 100;

  const feeType = getString(trustPlan, "EarlyWithdrawalFeeType").toUpperCase();
  if (feeType === "FIXED_AMOUNT") return getNumber(trustPlan, "EarlyWithdrawalFeeValue");
  return null;
}

function calculateWithdrawalBalance(placement?: number | null, withdrawalAmount?: number | null) {
  if (placement === null || placement === undefined || withdrawalAmount === null || withdrawalAmount === undefined) return null;
  return placement - withdrawalAmount;
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

function getRelationshipDisplayName(name: string, code: string, otherRelationship: string) {
  return name || (code.trim().toUpperCase() === "OTHER" ? otherRelationship : "") || formatCodeLabel(code || otherRelationship);
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
            { label: "Relationship", value: getRelationshipDisplayName(getString(beneficiary, "RelationshipName"), getString(beneficiary, "RelationshipCode"), getString(beneficiary, "OtherRelationship")) },
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
    { label: "Main Caretaker IC No. / Passport No.", value: getString(main, "IdentityNo") },
    { label: "Main Caretaker Contact No.", value: getString(main, "ContactNo") },
    { label: "Substitute Caretaker", value: getString(substitute, "Name") },
    { label: "Substitute Caretaker IC No. / Passport No.", value: getString(substitute, "IdentityNo") },
    { label: "Substitute Caretaker Contact No.", value: getString(substitute, "ContactNo") },
    { label: "Distribute To Guardian", value: formatBoolean(getBoolean(minorDistribution, "DistributeToGuardian")) },
    { label: "Hold By Trustee Company", value: formatBoolean(getBoolean(minorDistribution, "HoldByTrusteeCompany")) },
    { label: "Release Age", value: formatNumber(getNumber(minorDistribution, "ReleaseAge")) }
  ]);
}

function mapAfterLifetime(step3: Record<string, unknown> | null) {
  const afterLifetime = asRecord(step3?.AfterLifetime);
  if (!afterLifetime) return [];

  const selectedPurposes = afterLifetimePurposeOptions
    .filter((option) => {
      switch (option.value) {
        case "LIVING_MAINTENANCE":
          return getBoolean(afterLifetime, "LivingMaintenance");
        case "EDUCATION_EXPENSES":
          return getBoolean(afterLifetime, "EducationExpenses");
        case "MEDICAL_HEALTHCARE_EXPENSES":
          return getBoolean(afterLifetime, "MedicalHealthcareExpenses");
        default:
          return false;
      }
    })
    .map((option) => option.value);

  return cleanInfoItems([
    { label: "Purpose", value: formatAfterLifetimePurposes(selectedPurposes) }
  ]);
}

function mapAllocations(step4: Record<string, unknown> | null, beneficiaries: Record<string, unknown>[]): ViewAllocationDetail {
  const beneficiaryNames = new Map<string, string>(
    beneficiaries
      .map((beneficiary): [string, string] => [String(getNumber(beneficiary, "BeneficiaryID") ?? getString(beneficiary, "BeneficiaryClientID")), getString(beneficiary, "FullName")])
      .filter(([key]) => Boolean(key))
  );
  const allocationType = getNumber(step4, "AllocationType");
  const mainBeneficiaries = asArray(step4?.MainBeneficiaries);
  const substituteBeneficiaries = asArray(step4?.SubstituteBeneficiaries);
  const beneficiaryItems = [
    ...mapAllocationGroup("Main Beneficiary", mainBeneficiaries, beneficiaryNames, allocationType === 5 ? createEqualPercentageValues(mainBeneficiaries.length) : []),
    ...mapAllocationGroup("Substitute Beneficiary", substituteBeneficiaries, beneficiaryNames)
  ];

  return {
    allocationType: cleanInfoItems([{ label: "Allocation Type", value: formatAllocationType(allocationType) }]),
    beneficiaries: beneficiaryItems
  };
}

function mapAllocationGroup(labelPrefix: string, allocations: Record<string, unknown>[], beneficiaryNames: Map<string, string>, displayPercentages: number[] = []) {
  return allocations
    .map((allocation, index): ViewAllocationBeneficiary => {
      const beneficiaryId = String(getNumber(allocation, "BeneficiaryID") ?? "");
      const name = beneficiaryNames.get(beneficiaryId) || beneficiaryId;
      const percentage = displayPercentages[index] ?? getNumber(allocation, "AllocationPercentage");
      return {
        label: `${labelPrefix} ${index + 1}`,
        name,
        percentage: formatPercentage(percentage)
      };
    })
    .filter((allocation) => allocation.name || allocation.percentage);
}

function createEqualPercentageValues(count: number) {
  if (count <= 0) return [];
  const totalCents = 10000;
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - baseCents * count;
  return Array.from({ length: count }, (_, index) => (baseCents + (index === count - 1 ? remainderCents : 0)) / 100);
}

function formatAllocationType(value?: number | null) {
  const options = [
    "Type 1 - 100% to one Main Beneficiary with optional Substitute Beneficiary",
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
    const generatedDocumentRowId = getNumber(document, "RowID") ?? getNumber(document, "GeneratedDocumentID") ?? 0;
    return {
      generatedDocumentRowId,
      name: getString(document, "DocumentName") || getString(document, "OriginalFileName") || formatCodeLabel(documentCode),
      description: getString(document, "Description"),
      type: formatDocumentType(getString(document, "FileExtension") || getString(document, "DocumentType") || "PDF"),
      issuedDate: formatDate(getString(document, "GeneratedAt") || getString(document, "CreatedAt")),
      viewUrl: documentCode ? trustApplicationApi.getTrustApplicationDocumentViewerPath(trustId, documentCode) : "",
      returnDocuments: mapReturnDocuments(asArray(document.ReturnDocuments))
    };
  }).filter((document) => document.name || document.viewUrl);
}

function mapReturnDocuments(documents: Record<string, unknown>[]): ReturnDocumentRow[] {
  return documents.map((document) => ({
    returnDocumentId: getNumber(document, "ReturnDocumentID") ?? 0,
    generatedDocumentRowId: getNumber(document, "GeneratedDocumentRowID") ?? 0,
    documentGuid: getString(document, "DocumentGuid"),
    documentName: getString(document, "DocumentName") || getString(document, "OriginalFileName"),
    returnedDate: formatDate(getString(document, "ReturnDate")),
    remark: getString(document, "Remark"),
    originalFileName: getString(document, "OriginalFileName"),
    fileExtension: getString(document, "FileExtension"),
    fileSize: formatFileSize(getNumber(document, "FileSize")),
    createdAt: formatDateTime(getString(document, "CreatedAt")),
    uploadedBy: getString(document, "CreatedByName") || getString(document, "UploadedByName")
  })).filter((document) => document.documentGuid || document.documentName);
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

function getNextPaymentAllocationNo(rows: PaymentAllocationModalRow[]) {
  const latestPaymentNo = rows.reduce((latestNo, row) => Math.max(latestNo, row.paymentNo ?? 0), 0);
  return latestPaymentNo + 1;
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

function getReturnDocumentFileValidationError(file: File) {
  const extension = file.name.split(".").pop()?.trim().toLowerCase() ?? "";

  if (!returnDocumentAllowedExtensions.has(extension)) {
    return `Only ${returnDocumentAllowedExtensionLabel} files are allowed.`;
  }

  if (file.size > returnDocumentMaxFileSizeBytes) {
    return `Return document file size must not exceed ${returnDocumentMaxFileSizeMb}MB.`;
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

function isActivePaymentOverviewRow(payment: PaymentOverviewRow) {
  const status = payment.rawStatus.trim().toUpperCase();
  return status === "WAITING_PAYMENT" || status === "PENDING_APPROVAL" || status === "PAYMENT_APPROVED";
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

function getTrustPlacementAmount(detail: ViewDetail) {
  return toPaymentMoney(detail.payment?.TrustAssetAmount ?? getPaymentNumberFromText(detail.summary.find((item) => item.label === "Trust Amount")?.value));
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

function getFirstNumber(record: Record<string, unknown> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = getNumber(record, key);
    if (value !== null) return value;
  }
  return null;
}

function getFirstString(record: Record<string, unknown> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = getString(record, key);
    if (value) return value;
  }
  return "";
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

function formatPeriodDescription(value?: number | null, unit?: string) {
  if (value === null || value === undefined) return "";
  const normalizedUnit = normalizePeriodUnit(unit);
  const unitLabel = normalizedUnit === "MONTHS" ? "month" : normalizedUnit === "YEARS" ? "year" : formatCodeLabel(unit).toLowerCase();
  return [formatNumber(value), value === 1 ? unitLabel : `${unitLabel}s`].filter(Boolean).join(" ");
}

function calculateMaturityDate(commencementDate: string, fundManagementPeriod?: number | null, fundManagementPeriodUnit?: string | null) {
  if (!commencementDate || !fundManagementPeriod) return "";
  const date = parseDateInputValue(commencementDate);
  if (!date) return "";

  const unit = normalizePeriodUnit(fundManagementPeriodUnit);
  if (unit === "YEARS") return formatDateInputValue(addYearsClamped(date, fundManagementPeriod));
  if (unit === "MONTHS") return formatDateInputValue(addMonthsClamped(date, fundManagementPeriod));
  return "";
}

function normalizePeriodUnit(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "YEAR" || normalized === "YEARS" || normalized === "Y") return "YEARS";
  if (normalized === "MONTH" || normalized === "MONTHS" || normalized === "M") return "MONTHS";
  return "";
}

function parseDateInputValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function addYearsClamped(date: Date, years: number) {
  return createClampedDate(date.getFullYear() + years, date.getMonth(), date.getDate());
}

function addMonthsClamped(date: Date, months: number) {
  return createClampedDate(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function createClampedDate(year: number, monthIndex: number, day: number) {
  const firstOfTargetMonth = new Date(year, monthIndex, 1);
  const lastDay = new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth() + 1, 0).getDate();
  return new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth(), Math.min(day, lastDay));
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatBoolean(value?: boolean | null) {
  if (value === null || value === undefined) return "";
  return value ? "Yes" : "No";
}

function formatCodeLabel(value?: string | null) {
  return formatMasterDisplayText(value);
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

function getDocumentIcon(value?: string | null) {
  const type = value?.trim().replace(/^\./, "").toLowerCase();
  if (type === "xlsx" || type === "xls") return FileSpreadsheet;
  if (type === "docx" || type === "doc") return FileType;
  return FileText;
}

function getDocumentDownloadName(document: DocumentDownloadItem) {
  const baseName = document.DocumentName || document.FileName || "document";
  const extension = document.FileExtension?.trim();
  if (!extension) return baseName;

  const normalizedExtension = extension.startsWith(".") ? extension : `.${extension}`;
  return baseName.toLowerCase().endsWith(normalizedExtension.toLowerCase()) ? baseName : `${baseName}${normalizedExtension}`;
}

function getReturnDocumentDownloadName(document: ReturnDocumentRow) {
  const baseName = document.originalFileName || document.documentName || "return-document";
  const extension = document.fileExtension?.trim();
  if (!extension) return baseName;

  const normalizedExtension = extension.startsWith(".") ? extension : `.${extension}`;
  return baseName.toLowerCase().endsWith(normalizedExtension.toLowerCase()) ? baseName : `${baseName}${normalizedExtension}`;
}

function saveDownloadedBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "document";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

function formatDateTime(value?: string | null) {
  if (!value) return "";

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

function TotalStatistics({ statistics, loading, activeStatus, onStatusSelect }: { statistics: TrustApplicationStatusStatistic; loading: boolean; activeStatus: string; onStatusSelect: (status: string) => void }) {
  return (
    <section className="mb-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-textSecondary">All Application Statistics</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-3">
        {statisticItems.map((item) => {
          const selected = activeStatus === item.status;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onStatusSelect(item.status)}
              aria-pressed={selected}
              className={getStatisticCardClass(selected)}
            >
              <span className={getStatisticCardAccentClass(selected)} />
              <div className={getStatisticLabelClass(selected)}>{item.label}</div>
              <div className={getStatisticValueClass(selected)}>{loading ? "-" : formatCount(statistics[item.key])}</div>
            </button>
          );
        })}
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

function PlacementGiftIcon({ benefit }: { benefit: unknown }) {
  const hasBenefit = hasComplimentaryBenefit(benefit);
  if (!hasBenefit) return <Gift className="h-4 w-4 shrink-0 stroke-[2.75] text-gray-400" aria-hidden="true" />;

  const detail = mapComplimentaryBenefit(asRecord(benefit));
  const tooltipText = [detail?.benefitName, detail?.benefitValue ? `(${detail.benefitValue})` : ""].filter(Boolean).join(" ") || "Complimentary benefit is available.";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Gift className="h-4 w-4 shrink-0 stroke-[2.75] text-[#16A34A]" aria-label="Complimentary benefit details" />
        </TooltipTrigger>
        <TooltipContent className="bottom-auto top-full mb-0 mt-2 max-w-[calc(100vw-2rem)] whitespace-nowrap">
          <span className="block text-left leading-5">
            {tooltipText}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function hasComplimentaryBenefit(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
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

function createFiltersForSearch(search: string): ListingFilters {
  return {
    ...createEmptyFilters(),
    search
  };
}

function areFiltersEqual(left: ListingFilters, right: ListingFilters) {
  return (
    left.search === right.search &&
    left.productCode === right.productCode &&
    left.applicationStatus === right.applicationStatus &&
    left.agentSearch === right.agentSearch &&
    left.createdFrom === right.createdFrom &&
    left.createdTo === right.createdTo &&
    left.submittedFrom === right.submittedFrom &&
    left.submittedTo === right.submittedTo
  );
}

function getRouteTrustNoSearch(trustNo?: string) {
  if (!trustNo) return "";

  try {
    return decodeURIComponent(trustNo).trim();
  } catch {
    return trustNo.trim();
  }
}

function getStatisticCardClass(selected: boolean) {
  const baseClass = "relative min-h-[78px] min-w-0 overflow-hidden rounded-md border px-5 py-4 text-left shadow-[0_10px_22px_rgba(120,83,17,0.05)] transition hover:-translate-y-0.5 hover:border-[#FDBB1D] hover:shadow-[0_14px_28px_rgba(120,83,17,0.1)] focus:outline-none";
  return selected ? `${baseClass} border-[#FDBB1D] bg-[#FDBB1D]` : `${baseClass} border-[#F0DDA6] bg-[#FFFDF8]`;
}

function getStatisticCardAccentClass(selected: boolean) {
  return `absolute inset-y-0 left-0 w-1 ${selected ? "bg-[#6F4A0D]" : "bg-[#FDBB1D]"}`;
}

function getStatisticLabelClass(selected: boolean) {
  return `truncate text-[12px] font-semibold uppercase tracking-wide ${selected ? "text-white" : "text-[#8A651C]"}`;
}

function getStatisticValueClass(selected: boolean) {
  return `mt-2 text-2xl font-bold leading-none ${selected ? "text-white" : "text-[#6F4A0D]"}`;
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

function formatProgressStep(value?: number | null) {
  const step = toVisibleProgressStep(value);
  return step ? `Step ${step}` : "";
}

function formatProgressCompleted(value?: number | null) {
  const step = toVisibleProgressStep(value);
  return step ? `${step} completed` : "0 completed";
}

function toVisibleProgressStep(value?: number | null) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;
  return Math.min(numericValue, 7);
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
  if (normalizedStatus === "COMPLETED") enabledStatuses.push("EARLY_WITHDRAWN");

  if (canRejectApplicationStatus(normalizedStatus)) enabledStatuses.push("REJECTED");

  return enabledStatuses;
}

function canRejectApplicationStatus(status: string) {
  const normalizedStatus = normalizeApplicationStatus(status);
  return Boolean(normalizedStatus) && !["DRAFT", "COMPLETED", "REJECTED", "EARLY_WITHDRAWN", "MATURED"].includes(normalizedStatus);
}

function isDecisionButtonDisabledForStatus(status: string) {
  const normalizedStatus = normalizeApplicationStatus(status);
  return ["EARLY_WITHDRAWN", "REJECTED", "MATURED"].includes(normalizedStatus) || getEnabledDecisionStatuses(normalizedStatus).length === 0;
}

function canDeleteDraftApplication(role?: string | null) {
  return role === "AG" || role === "SA" || role === "AD";
}

function canEditTrustApplicationAsAdmin(role?: string | null, status?: string | null) {
  return (role === "SA" || role === "AD") && adminEditableStatuses.has(normalizeApplicationStatus(status));
}

function canViewTrustApplicationFromListingRecord(role?: string | null) {
  return role === "OP" || role === "AC";
}

function canViewReturnDocumentsSection(role?: string | null) {
  return returnDocumentRoles.has((role ?? "").trim().toUpperCase());
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
