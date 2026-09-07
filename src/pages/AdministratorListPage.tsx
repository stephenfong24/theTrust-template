import { BriefcaseBusiness, Eye, EyeOff, FileText, MoreHorizontal, Plus, RotateCcw, Search, ShieldCheck, UserCog } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { Pagination } from "../components/common/Pagination";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { roles } from "../config/roles";
import auditLogs from "../data/audit-logs.json";
import users from "../data/users.json";
import { notifyError, notifySuccess } from "../services/notificationService";
import type { AuditLog, RoleId, User, UserStatus } from "../types";

type AdministratorRole = Exclude<RoleId, "AG">;

interface AdministratorRecord {
  id: string;
  email: string;
  name: string;
  role: AdministratorRole;
  status: UserStatus;
  lastLogin: string;
}

const administratorRoles: AdministratorRole[] = ["SA", "AD", "OP", "AC"];
const statusOptions: UserStatus[] = ["ACTIVE", "INACTIVE"];
const allFilter = "all";

interface AdministratorFilters {
  query: string;
  role: AdministratorRole | typeof allFilter;
  status: UserStatus | typeof allFilter;
}

export function AdministratorListPage() {
  const [records, setRecords] = useState<AdministratorRecord[]>(() => getInitialAdministrators());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingRecord, setEditingRecord] = useState<AdministratorRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const [passwordRecord, setPasswordRecord] = useState<AdministratorRecord | null>(null);
  const [draftFilters, setDraftFilters] = useState<AdministratorFilters>(createEmptyFilters());
  const [filters, setFilters] = useState<AdministratorFilters>(createEmptyFilters());
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const filteredRecords = useMemo(() => applyAdministratorFilters(records, filters), [filters, records]);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pageRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const openAdd = () => {
    setAdding(true);
  };

  const saveAdministrator = (record: AdministratorRecord) => {
    if (adding) {
      setRecords((current) => [{ ...record, id: `USR-${Date.now()}`, lastLogin: "-" }, ...current]);
      setAdding(false);
      notifySuccess("Administrator added successfully.", "administrator-add");
      return;
    }

    setRecords((current) => current.map((item) => (item.id === record.id ? { ...item, ...record } : item)));
    setEditingRecord(null);
    notifySuccess("Administrator updated successfully.", "administrator-update");
  };

  const searchAdministrators = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({
      query: draftFilters.query.trim(),
      role: draftFilters.role,
      status: draftFilters.status
    });
    setPage(1);
  };

  const resetSearch = () => {
    const emptyFilters = createEmptyFilters();
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    setPage(1);
  };

  const openEditModal = (record: AdministratorRecord) => {
    setOpenActionId(null);
    setEditingRecord(record);
  };

  const openPasswordModal = (record: AdministratorRecord) => {
    setOpenActionId(null);
    setPasswordRecord(record);
  };

  return (
    <>
      <PageHeader
        title="Administrator List"
        description="Manage internal administrator, operation and finance accounts."
        actions={
          <button type="button" onClick={openAdd} className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white transition hover:bg-black">
            <Plus className="h-4 w-4" />
            Add Administrator
          </button>
        }
      />

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line p-4">
          <form onSubmit={searchAdministrators} className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_190px_170px_auto_auto]">
            <label className="block text-sm font-semibold text-textPrimary">
              Search user
              <span className="relative mt-1 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
                <input
                  value={draftFilters.query}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
                  placeholder="Search by name or email..."
                  className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </span>
            </label>
            <label className="block text-sm font-medium text-textPrimary">
              Role
              <select
                value={draftFilters.role}
                onChange={(event) => setDraftFilters((current) => ({ ...current, role: event.target.value as AdministratorFilters["role"] }))}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                <option value={allFilter}>All Roles</option>
                {administratorRoles.map((role) => (
                  <option key={role} value={role}>
                    {roles[role]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-textPrimary">
              Status
              <select
                value={draftFilters.status}
                onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value as AdministratorFilters["status"] }))}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                <option value={allFilter}>All Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === "ACTIVE" ? "Active" : "Inactive"}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={resetSearch} className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-lg border border-line bg-white px-4 text-sm font-semibold text-textPrimary transition hover:bg-gray-50">
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-lg bg-ink px-5 text-sm font-semibold text-white shadow-soft transition hover:bg-black">
              <Search className="h-4 w-4" />
              Search
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-textSecondary">{filteredRecords.length} internal users</div>
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
              {[5, 10, 20].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                <th className="w-20 border-b border-line px-4 py-3 font-semibold">No.</th>
                <th className="min-w-72 border-b border-line px-4 py-3 font-semibold">User</th>
                <th className="border-b border-line px-4 py-3 font-semibold">Role</th>
                <th className="border-b border-line px-4 py-3 font-semibold">Last Login</th>
                <th className="border-b border-line px-4 py-3 font-semibold">Status</th>
                <th className="border-b border-line px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record, index) => (
                <tr key={record.id} className="transition hover:bg-gray-50">
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{(page - 1) * pageSize + index + 1}</td>
                  <td className="border-b border-line px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatarCell record={record} />
                      <div className="min-w-0">
                        <div className="font-semibold text-textPrimary">{record.name}</div>
                        <div className="mt-0.5 text-xs text-textSecondary">{record.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-line px-4 py-3">
                    <RoleBadge role={record.role} />
                  </td>
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{record.lastLogin}</td>
                  <td className="border-b border-line px-4 py-3">
                    <StatusPill status={record.status} />
                  </td>
                  <td className="border-b border-line px-4 py-3">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenActionId((current) => (current === record.id ? null : record.id))}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-textSecondary hover:bg-gray-100"
                        aria-label={`Actions for ${record.name}`}
                        aria-expanded={openActionId === record.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openActionId === record.id ? (
                        <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-line bg-white p-2 shadow-soft">
                          <button type="button" onClick={() => openEditModal(record)} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50">
                            Edit
                          </button>
                          <button type="button" onClick={() => openPasswordModal(record)} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50">
                            Change Password
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} pageCount={pageCount} totalRecords={filteredRecords.length} pageSize={pageSize} itemLabel="users" onPageChange={setPage} />
      </section>

      <AdministratorModal
        title={adding ? "Add Administrator" : "Edit Administrator"}
        open={adding || Boolean(editingRecord)}
        record={editingRecord ?? createEmptyAdministrator()}
        onClose={() => {
          setAdding(false);
          setEditingRecord(null);
        }}
        onSubmit={saveAdministrator}
      />

      <ChangePasswordModal record={passwordRecord} onClose={() => setPasswordRecord(null)} />
    </>
  );
}

function AdministratorModal({
  title,
  open,
  record,
  onClose,
  onSubmit
}: {
  title: string;
  open: boolean;
  record: AdministratorRecord;
  onClose: () => void;
  onSubmit: (record: AdministratorRecord) => void;
}) {
  const [draft, setDraft] = useState(record);

  useEffect(() => {
    setDraft(record);
  }, [record]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ ...draft, email: draft.email.trim(), name: draft.name.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Update administrator access details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="grid gap-4 rounded-lg border border-line bg-white p-4">
            <TextField label="Email" type="email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} required />
            <TextField label="Full Name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} required />
            <label className="block text-sm font-medium text-textPrimary">
              Role <span className="text-red-600">*</span>
              <select
                value={draft.role}
                onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as AdministratorRole }))}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                {administratorRoles.map((role) => (
                  <option key={role} value={role}>
                    {roles[role]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-textPrimary">
              Status <span className="text-red-600">*</span>
              <select
                value={draft.status}
                onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as UserStatus }))}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === "ACTIVE" ? "Active" : "Inactive"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordModal({ record, onClose }: { record: AdministratorRecord | null; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      notifyError("New password and confirm new password do not match.", "administrator-password-mismatch");
      return;
    }
    notifySuccess("Password changed successfully.", "administrator-password-change");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  return (
    <Dialog open={Boolean(record)} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>{record ? `Set a new password for ${record.name}.` : "Set a new administrator password."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="grid gap-4 rounded-lg border border-line bg-white p-4">
            <PasswordField label="New Password" value={newPassword} onChange={setNewPassword} />
            <PasswordField label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} />
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserAvatarCell({ record }: { record: AdministratorRecord }) {
  const initials = getUserInitials(record);
  const className =
    record.role === "SA"
      ? "bg-ink text-white"
      : record.role === "AD"
        ? "bg-slate-200 text-slate-700"
        : record.role === "OP"
          ? "bg-green-100 text-green-800"
          : "bg-violet-100 text-violet-700";

  return <span className={`${className} flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold`}>{initials}</span>;
}

function RoleBadge({ role }: { role: AdministratorRole }) {
  const Icon = role === "SA" ? ShieldCheck : role === "AD" ? UserCog : role === "OP" ? BriefcaseBusiness : FileText;
  const className =
    role === "SA"
      ? "bg-[#FFF8E1] text-[#8A650F]"
      : role === "AD"
        ? "bg-blue-50 text-blue-700"
        : role === "OP"
          ? "bg-green-50 text-green-700"
          : "bg-violet-50 text-violet-700";

  return (
    <span className={`${className} inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold`}>
      <Icon className="h-3.5 w-3.5" />
      {roles[role]}
    </span>
  );
}

function StatusPill({ status }: { status: UserStatus }) {
  const active = status === "ACTIVE";
  return (
    <span className={active ? "inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700" : "inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"}>
      <span className={active ? "h-2 w-2 rounded-full bg-green-600" : "h-2 w-2 rounded-full bg-red-600"} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function TextField({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-textPrimary">
      {label} {required ? <span className="text-red-600">*</span> : null}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
      />
    </label>
  );
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm font-medium text-textPrimary">
      {label} <span className="text-red-600">*</span>
      <span className="relative mt-1 block">
        <input
          type={visible ? "text" : "password"}
          value={value}
          required
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-lg border border-line bg-white px-3 pr-11 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-textSecondary hover:bg-gray-100 hover:text-textPrimary"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

function getInitialAdministrators() {
  const loginByUser = new Map(
    (auditLogs as AuditLog[])
      .filter((log) => log.action.toLowerCase().includes("logged in"))
      .sort((first, second) => Date.parse(second.dateTime) - Date.parse(first.dateTime))
      .map((log) => [log.user, formatDateTime(log.dateTime)])
  );

  return (users as User[])
    .filter((user): user is User & { role: AdministratorRole } => administratorRoles.includes(user.role as AdministratorRole))
    .map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      lastLogin: loginByUser.get(user.name) ?? "Never"
    }));
}

function createEmptyAdministrator(): AdministratorRecord {
  return {
    id: "",
    email: "",
    name: "",
    role: "AD",
    status: "ACTIVE",
    lastLogin: "Never"
  };
}

function createEmptyFilters(): AdministratorFilters {
  return {
    query: "",
    role: allFilter,
    status: allFilter
  };
}

function applyAdministratorFilters(records: AdministratorRecord[], filters: AdministratorFilters) {
  const query = filters.query.toLowerCase();

  return records.filter((record) => {
    const matchesQuery = !query || `${record.name} ${record.email}`.toLowerCase().includes(query);
    const matchesRole = filters.role === allFilter || record.role === filters.role;
    const matchesStatus = filters.status === allFilter || record.status === filters.status;
    return matchesQuery && matchesRole && matchesStatus;
  });
}

function getUserInitials(record: AdministratorRecord) {
  if (record.role === "AC") return "AC";
  const parts = record.name.trim().split(/\s+/);
  const fallback = record.email.slice(0, 2).toUpperCase();
  if (parts.length === 0) return fallback;
  if (parts[0].toLowerCase() === "system") return "SS";
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase() || fallback;
}

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })
      .format(new Date(value))
      .replace(",", " ·");
  } catch {
    return value;
  }
}
