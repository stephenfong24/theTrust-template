import { useMemo, useState } from "react";
import { CheckCircle2, ImageIcon, Search, WalletCards, XCircle } from "lucide-react";
import applications from "../data/applications.json";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { Pagination } from "../components/common/Pagination";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";
import { Button } from "../components/ui/button";
import type { ApplicationRecord } from "../types";

type PaymentAllocationStatus = "Paid" | "Pending" | "Rejected";
type TrustPaymentReviewStatus = "Pending Review" | "Approved" | "Rejected";
type PaymentAction = "approve" | "reject";

interface PaymentAllocation {
  id: string;
  reference: string;
  paymentDate: string;
  amount: number;
  status: PaymentAllocationStatus;
  receiptImage?: string;
}

interface TrustPaymentRecord {
  id: string;
  trustId: string;
  trustName: string;
  clientName: string;
  productName: string;
  agentName: string;
  placementAmount: number;
  applicationStatus: string;
  paymentReviewStatus: TrustPaymentReviewStatus;
  allocations: PaymentAllocation[];
}

interface ConfirmationState {
  trustId: string;
  action: PaymentAction;
}

const seededTrustPayments = createTrustPayments(applications as ApplicationRecord[]);

export function TrustPaymentPage() {
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<TrustPaymentRecord[]>(seededTrustPayments);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentAllocation | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredRecords = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return records;

    return records.filter((record) => {
      const searchable = `${record.trustId} ${record.trustName} ${record.clientName} ${record.productName}`.toLowerCase();
      return searchable.includes(term);
    });
  }, [query, records]);

  const totals = useMemo(() => getTotals(records), [records]);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pageRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);
  const selectedRecord = confirmation ? records.find((record) => record.id === confirmation.trustId) : undefined;

  const confirmAction = () => {
    if (!confirmation) return;

    setRecords((currentRecords) =>
      currentRecords.map((record) =>
        record.id === confirmation.trustId
          ? {
              ...record,
              paymentReviewStatus: confirmation.action === "approve" ? "Approved" : "Rejected"
            }
          : record
      )
    );
    setConfirmation(null);
  };

  return (
    <>
      <PageHeader
        title="Trust Payment"
        description="Review Trust placement payment allocations and approve or reject pending allocation records."
      />

      <section className="mb-5 grid gap-3 md:grid-cols-3">
        <SummaryCard label="Total Placement" value={formatCurrency(totals.placement)} tone="gold" />
        <SummaryCard label="Paid Allocation" value={formatCurrency(totals.paid)} tone="green" />
        <SummaryCard label="Pending Allocation" value={formatCurrency(totals.pending)} tone="amber" />
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-textPrimary">Trust Payment Allocation Listing</h2>
              <p className="mt-1 text-sm leading-6 text-textSecondary">
                Each Trust may contain one or more payment allocation records.
              </p>
            </div>
            <label className="relative block w-full lg:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search trust name or client name"
                className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-[13px]">
            <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                {["Trust", "Placement Summary", "Payment Allocations", "Action"].map((header) => (
                  <th key={header} className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record) => {
                const paidAmount = sumAllocations(record.allocations, "Paid");
                const pendingAmount = sumAllocations(record.allocations, "Pending");
                const allAllocationsPaid = record.allocations.every((allocation) => allocation.status === "Paid");
                const canReviewTrust = record.paymentReviewStatus === "Pending Review";
                return (
                  <tr key={record.id} className="align-top transition hover:bg-gray-50">
                    <td className="w-[22%] border-b border-line px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-textPrimary">{record.trustId}</span>
                        <StatusBadge status={record.paymentReviewStatus} />
                      </div>
                      <div className="mt-1 text-xs font-medium text-textSecondary">{record.trustName}</div>
                      <div className="mt-3 space-y-1.5">
                        <div className="text-sm font-semibold text-textPrimary">{record.clientName}</div>
                        <div className="text-xs text-textSecondary">{record.productName}</div>
                        <div className="text-xs text-textSecondary">Agent: {record.agentName}</div>
                      </div>
                    </td>
                    <td className="w-[24%] border-b border-line px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Placement</div>
                      <div className="mt-1 whitespace-nowrap text-base font-semibold text-textPrimary">{formatCurrency(record.placementAmount)}</div>
                      <div className="mt-3 grid gap-2">
                        <AmountLine label="Paid" value={paidAmount} className="text-green-700" />
                        <AmountLine label="Pending" value={pendingAmount} className="text-amber-700" />
                      </div>
                    </td>
                    <td className="w-[42%] border-b border-line px-4 py-4">
                      <div className="grid gap-3 xl:grid-cols-2">
                        {record.allocations.map((allocation) => (
                          <PaymentAllocationCard
                            key={allocation.id}
                            allocation={allocation}
                            onViewReceipt={setSelectedReceipt}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="w-36 border-b border-line px-4 py-4">
                      <TrustActions
                        canApprove={canReviewTrust && allAllocationsPaid}
                        canReject={canReviewTrust}
                        allAllocationsPaid={allAllocationsPaid}
                        onAction={(action) => setConfirmation({ trustId: record.id, action })}
                      />
                    </td>
                  </tr>
                );
              })}
              {pageRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="border-b border-line px-4 py-10 text-center text-sm text-textSecondary">
                    No trust payment allocations found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-line p-4 sm:flex-row sm:items-center sm:justify-between">
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
              {[5, 10, 20].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <Pagination currentPage={page} pageCount={pageCount} totalRecords={filteredRecords.length} pageSize={pageSize} itemLabel="trust records" onPageChange={setPage} />
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.action === "approve" ? "Approve payment allocation?" : "Reject payment allocation?"}
        message={
          selectedRecord
            ? `${confirmation?.action === "approve" ? "Approve" : "Reject"} payment review for ${selectedRecord.trustName}.`
            : "Confirm this Trust payment action."
        }
        confirmText={confirmation?.action === "approve" ? "Approve" : "Reject"}
        destructive={confirmation?.action === "reject"}
        onConfirm={confirmAction}
        onClose={() => setConfirmation(null)}
      />

      <ReceiptImageModal allocation={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
    </>
  );
}

function PaymentAllocationCard({ allocation, onViewReceipt }: { allocation: PaymentAllocation; onViewReceipt: (allocation: PaymentAllocation) => void }) {
  return (
    <div className={`relative rounded-lg border p-3 pr-12 shadow-[0_4px_14px_rgba(17,17,17,0.04)] ${getAllocationCardClass(allocation.status)}`}>
      {allocation.status === "Paid" && allocation.receiptImage ? (
        <button
          type="button"
          onClick={() => onViewReceipt(allocation)}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-[#8A650F] transition hover:border-brandGold hover:bg-[#FFFBEB]"
          aria-label={`View uploaded receipt ${allocation.receiptImage}`}
          title="View uploaded receipt"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-textPrimary">{allocation.reference}</span>
        <StatusBadge status={allocation.status} />
      </div>
      <div className="mt-2 grid gap-1 text-xs text-textSecondary">
        <span className="font-semibold text-textPrimary">{formatCurrency(allocation.amount)}</span>
        {allocation.status === "Paid" ? <span>Paid date: {allocation.paymentDate}</span> : null}
      </div>
    </div>
  );
}

function ReceiptImageModal({ allocation, onClose }: { allocation: PaymentAllocation | null; onClose: () => void }) {
  if (!allocation?.receiptImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-brandGold/30 bg-white shadow-[0_28px_80px_rgba(17,17,17,0.28)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brandGold">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <h2 className="text-lg font-semibold text-textPrimary">Uploaded Payment Image</h2>
            <p className="mt-1 text-sm text-textSecondary">{allocation.receiptImage}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-textSecondary transition hover:bg-gray-50 hover:text-textPrimary">
            Close
          </button>
        </div>
        <div className="bg-soft p-5">
          <img
            src={createReceiptPreviewImage(allocation)}
            alt={`Uploaded receipt ${allocation.receiptImage}`}
            className="mx-auto max-h-[70vh] w-full rounded-lg border border-line bg-white object-contain shadow-soft"
          />
        </div>
      </div>
    </div>
  );
}

function getAllocationCardClass(status: PaymentAllocationStatus) {
  switch (status) {
    case "Paid":
      return "border-green-100 bg-green-50/60";
    case "Pending":
      return "border-amber-100 bg-amber-50/70";
    case "Rejected":
      return "border-red-100 bg-red-50/60";
    default:
      return "border-line bg-white";
  }
}

function TrustActions({
  canApprove,
  canReject,
  allAllocationsPaid,
  onAction
}: {
  canApprove: boolean;
  canReject: boolean;
  allAllocationsPaid: boolean;
  onAction: (action: PaymentAction) => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 text-left">
      <div className="mb-3 text-xs leading-5 text-textSecondary">
        {allAllocationsPaid ? "All allocations paid." : "Approve after all allocations are paid."}
      </div>
      <div className="flex flex-col gap-2">
        <Button type="button" size="sm" onClick={() => onAction("approve")} disabled={!canApprove} className="justify-start">
          <CheckCircle2 className="h-4 w-4" />
          Approve
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onAction("reject")} disabled={!canReject} className="justify-start text-red-700 hover:bg-red-50">
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
      </div>
    </div>
  );
}

function AmountLine({ label, value, className }: { label: string; value: number; className: string }) {
  const backgroundClass = label === "Paid" ? "border border-green-100 bg-green-50" : "border border-amber-100 bg-amber-50";

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs ${backgroundClass}`}>
      <span className="font-semibold uppercase tracking-wide text-textSecondary">{label}</span>
      <span className={`font-semibold ${className}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: "gold" | "green" | "amber" }) {
  const toneClass = tone === "green" ? "bg-green-50 text-green-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-[#FFF8E1] text-[#8A650F]";
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-textPrimary">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
          <WalletCards className="h-5 w-5" />
        </span>
      </div>
    </section>
  );
}

function createTrustPayments(records: ApplicationRecord[]): TrustPaymentRecord[] {
  return records
    .filter((record) => record.status !== "Draft")
    .slice(0, 10)
    .map((record, index) => {
      const allocationCount = 2 + (index % 3);
      const isAlreadyReviewed = index % 6 === 5;
      const isFullyPaid = index % 3 === 1 || isAlreadyReviewed;
      return {
        id: record.id,
        trustId: record.applicationNumber.replace("TF-APP-2026-", ""),
        trustName: record.applicationNumber,
        clientName: record.clientName,
        productName: record.trustProduct,
        agentName: record.agent,
        placementAmount: record.investmentAmount,
        applicationStatus: record.status,
        paymentReviewStatus: isAlreadyReviewed ? "Approved" : "Pending Review",
        allocations: createAllocations(record, index, allocationCount, isFullyPaid)
      };
    });
}

function createAllocations(record: ApplicationRecord, recordIndex: number, allocationCount: number, isFullyPaid: boolean): PaymentAllocation[] {
  const weights = allocationCount === 2 ? [0.4, 0.6] : allocationCount === 3 ? [0.35, 0.35, 0.3] : [0.25, 0.25, 0.25, 0.25];
  let allocatedAmount = 0;

  return weights.map((weight, index) => {
    const isLast = index === weights.length - 1;
    const amount = isLast ? record.investmentAmount - allocatedAmount : Math.round(record.investmentAmount * weight);
    allocatedAmount += amount;
    const status: PaymentAllocationStatus = isFullyPaid || index === 0 ? "Paid" : "Pending";
    const allocationNo = String(index + 1).padStart(2, "0");

    return {
      id: `${record.id}-ALLOC-${index + 1}`,
      reference: `PAL-${record.applicationNumber.slice(-4)}-${allocationNo}`,
      paymentDate: index === 0 ? record.applicationDate : record.lastUpdated,
      amount,
      status,
      receiptImage: status === "Paid" ? `receipt-${record.applicationNumber.slice(-4)}-${allocationNo}.jpg` : undefined
    };
  });
}

function getTotals(records: TrustPaymentRecord[]) {
  return records.reduce(
    (totals, record) => ({
      placement: totals.placement + record.placementAmount,
      paid: totals.paid + sumAllocations(record.allocations, "Paid"),
      pending: totals.pending + sumAllocations(record.allocations, "Pending")
    }),
    { placement: 0, paid: 0, pending: 0 }
  );
}

function sumAllocations(allocations: PaymentAllocation[], status: PaymentAllocationStatus) {
  return allocations.filter((allocation) => allocation.status === status).reduce((total, allocation) => total + allocation.amount, 0);
}

function formatCurrency(value: number) {
  return `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function createReceiptPreviewImage(allocation: PaymentAllocation) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620">
      <rect width="900" height="620" fill="#F8F9FA"/>
      <rect x="70" y="54" width="760" height="512" rx="18" fill="#FFFFFF" stroke="#E5E7EB"/>
      <rect x="70" y="54" width="760" height="84" rx="18" fill="#111111"/>
      <text x="108" y="107" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#FFFFFF">The Trust Payment Receipt</text>
      <circle cx="780" cy="96" r="26" fill="#D4AF37"/>
      <path d="M769 96l8 8 16-18" fill="none" stroke="#111111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="108" y="188" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#6B7280">RECEIPT FILE</text>
      <text x="108" y="222" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#1F2937">${escapeSvg(allocation.receiptImage ?? "receipt.jpg")}</text>
      <text x="108" y="286" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#6B7280">ALLOCATION REF</text>
      <text x="108" y="320" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#1F2937">${escapeSvg(allocation.reference)}</text>
      <text x="108" y="384" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#6B7280">PAYMENT STATUS</text>
      <text x="108" y="418" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#1F2937">${escapeSvg(allocation.status)}</text>
      <text x="510" y="286" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#6B7280">PAYMENT DATE</text>
      <text x="510" y="320" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#1F2937">${escapeSvg(allocation.paymentDate)}</text>
      <text x="510" y="384" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#6B7280">AMOUNT PAID</text>
      <text x="510" y="424" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#15803D">${escapeSvg(formatCurrency(allocation.amount))}</text>
      <rect x="108" y="472" width="684" height="1" fill="#E5E7EB"/>
      <text x="108" y="518" font-family="Arial, sans-serif" font-size="17" fill="#6B7280">Uploaded payment proof preview generated from the selected allocation record.</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeSvg(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
