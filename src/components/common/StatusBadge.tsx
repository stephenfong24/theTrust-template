import clsx from "clsx";

const variants: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  DRAFT: "bg-gray-100 text-gray-700",
  Pending: "bg-amber-50 text-amber-700",
  "Pending Review": "bg-blue-50 text-blue-700",
  "Pending Approval": "bg-amber-50 text-amber-700",
  "Pending Payment Approval": "bg-amber-100 text-amber-800",
  PENDING_PAYMENT_APPROVAL: "bg-amber-100 text-amber-800",
  "Pending Admin Approval": "bg-blue-100 text-blue-800",
  PENDING_ADMIN_APPROVAL: "bg-blue-100 text-blue-800",
  Approved: "bg-green-50 text-green-700",
  Active: "bg-green-50 text-green-700",
  Inactive: "bg-gray-100 text-gray-600",
  Rejected: "bg-red-50 text-red-700",
  REJECTED: "bg-red-50 text-red-700",
  "Sent Out": "bg-indigo-100 text-indigo-800",
  SENT_OUT: "bg-indigo-100 text-indigo-800",
  Stamping: "bg-purple-100 text-purple-800",
  STAMPING: "bg-purple-100 text-purple-800",
  Completed: "bg-green-50 text-green-700",
  COMPLETED: "bg-green-50 text-green-700",
  "Early Withdrawn": "bg-amber-50 text-amber-700",
  EARLY_WITHDRAWN: "bg-amber-50 text-amber-700",
  Matured: "bg-green-50 text-green-700",
  MATURED: "bg-green-50 text-green-700",
  Scheduled: "bg-blue-50 text-blue-700",
  SCHEDULED: "bg-blue-50 text-blue-700",
  Due: "bg-amber-50 text-amber-700",
  DUE: "bg-amber-50 text-amber-700",
  Cancelled: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-gray-100 text-gray-700",
  Overdue: "bg-red-50 text-red-700",
  Paid: "bg-green-50 text-green-700",
  "Payment Approved": "bg-green-600 text-white",
  PAYMENT_APPROVED: "bg-green-600 text-white",
  Unpaid: "bg-red-50 text-red-700",
  "Partially Paid": "bg-amber-50 text-amber-700",
  Expired: "bg-red-50 text-red-700",
  Expiring: "bg-amber-50 text-amber-700",
  Processing: "bg-blue-50 text-blue-700",
  Failed: "bg-red-50 text-red-700"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("inline-flex shrink-0 whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium leading-5", variants[status] ?? "bg-gray-100 text-gray-700")}>
      {status}
    </span>
  );
}
