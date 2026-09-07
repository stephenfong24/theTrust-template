import { format, parseISO } from "date-fns";
import { FileText, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";
import { DataTable, type Column } from "../components/tables/DataTable";
import { roles } from "../config/roles";
import auditLogs from "../data/audit-logs.json";
import { useAuth } from "../hooks/useAuth";
import { listRecords } from "../services/dataService";
import type { AuditLog } from "../types";

type AuditLogVariant = "request" | "file-upload";

export function AuditLogPage({ variant }: { variant: AuditLogVariant }) {
  const { session } = useAuth();
  const [records, setRecords] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const canViewAll = session?.role === "SA" || session?.role === "AD";
  const title = variant === "file-upload" ? "File Upload Log" : "Request Log";

  useEffect(() => {
    setLoading(true);
    listRecords<AuditLog>("trust-fund-audit-logs", auditLogs as AuditLog[])
      .then((items) => setRecords(items))
      .finally(() => setLoading(false));
  }, []);

  const visibleRecords = useMemo(() => {
    const scopedRecords = canViewAll ? records : records.filter((record) => record.user.toLowerCase() === session?.name.toLowerCase());
    const variantRecords = variant === "file-upload" ? scopedRecords.filter((record) => isFileUploadRecord(record)) : scopedRecords;
    return [...variantRecords].sort((first, second) => Date.parse(second.dateTime) - Date.parse(first.dateTime));
  }, [canViewAll, records, session?.name, variant]);

  const columns: Column<AuditLog>[] = [
    { key: "dateTime", header: "Date Time", sortable: true, render: (record) => formatAuditDate(record.dateTime) },
    { key: "user", header: "User", sortable: true },
    { key: "role", header: "Role", sortable: true, render: (record) => roles[record.role] },
    { key: "action", header: "Action", sortable: true },
    { key: "module", header: "Module", sortable: true },
    { key: "recordReference", header: "Reference", sortable: true },
    { key: "result", header: "Result", sortable: true, render: (record) => <StatusBadge status={record.result} /> },
    { key: "description", header: "Description" }
  ];

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
            {visibleRecords.length} records
          </span>
        }
      />
      <DataTable records={visibleRecords} columns={columns} searchFields={["user", "action", "module", "recordReference", "description"]} loading={loading} />
    </>
  );
}

function isFileUploadRecord(record: AuditLog) {
  const text = `${record.action} ${record.module}`.toLowerCase();
  return text.includes("upload") || text.includes("document");
}

function formatAuditDate(value: string) {
  try {
    return format(parseISO(value), "dd MMM yyyy · hh:mm a");
  } catch {
    return value;
  }
}
