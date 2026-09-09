import clsx from "clsx";

const variants: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Pending: "bg-amber-50 text-amber-700",
  "Pending Review": "bg-blue-50 text-blue-700",
  "Pending Approval": "bg-amber-50 text-amber-700",
  Approved: "bg-green-50 text-green-700",
  Active: "bg-green-50 text-green-700",
  Inactive: "bg-gray-100 text-gray-600",
  Rejected: "bg-red-50 text-red-700",
  Completed: "bg-green-50 text-green-700",
  Overdue: "bg-red-50 text-red-700",
  Paid: "bg-green-50 text-green-700",
  Unpaid: "bg-red-50 text-red-700",
  "Partially Paid": "bg-amber-50 text-amber-700",
  Expired: "bg-red-50 text-red-700",
  Expiring: "bg-amber-50 text-amber-700",
  Processing: "bg-blue-50 text-blue-700",
  Failed: "bg-red-50 text-red-700"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("inline-flex shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium leading-5", variants[status] ?? "bg-gray-100 text-gray-700")}>
      {status}
    </span>
  );
}
