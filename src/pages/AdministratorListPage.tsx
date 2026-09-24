import { BriefcaseBusiness, Eye, EyeOff, FileText, Plus, RotateCcw, Search, ShieldCheck, UserCog } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { administratorApi, type AdministratorListItem, type AdministratorPagination } from "../api/administratorApi";
import { lookupApi, type RoleLookupItem } from "../api/lookupApi";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { PageHeader } from "../components/common/PageHeader";
import { Pagination } from "../components/common/Pagination";
import { TableActionMenu } from "../components/common/TableActionMenu";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { roles } from "../config/roles";
import { useAuth } from "../hooks/useAuth";
import { notifyError, notifySuccess } from "../services/notificationService";
import type { RoleId, UserStatus } from "../types";
import { isValidPasswordCriteria, passwordCriteriaMessage } from "../utils/passwordValidation";

type AdministratorRole = Exclude<RoleId, "AG">;

interface AdministratorRecord {
  id: string;
  email: string;
  name: string;
  role: AdministratorRole;
  roleName: string;
  willAccess: boolean;
  status: UserStatus;
  lastLogin: string;
  loginPassword?: string;
  confirmLoginPassword?: string;
}

const administratorRoles: AdministratorRole[] = ["SA", "AD", "OP", "AC"];
const statusOptions: UserStatus[] = ["ACTIVE", "INACTIVE"];
const allFilter = "all";
const fallbackRoleOptions = administratorRoles.map((role) => ({ value: role, label: roles[role] }));

interface AdministratorFilters {
  query: string;
  role: AdministratorRole | typeof allFilter;
  status: UserStatus | typeof allFilter;
}

export function AdministratorListPage() {
  const { session } = useAuth();
  const [records, setRecords] = useState<AdministratorRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<AdministratorPagination>({ Page: 1, PageSize: 10, TotalRecords: 0, TotalPages: 1 });
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingRecord, setEditingRecord] = useState<AdministratorRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const [passwordRecord, setPasswordRecord] = useState<AdministratorRecord | null>(null);
  const [draftFilters, setDraftFilters] = useState<AdministratorFilters>(createEmptyFilters());
  const [filters, setFilters] = useState<AdministratorFilters>(createEmptyFilters());
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [roleOptions, setRoleOptions] = useState<Array<{ value: AdministratorRole; label: string }>>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    if (!openActionId) return undefined;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-action-menu-root]")) return;
      setOpenActionId(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [openActionId]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoleOptions() {
      setRolesLoading(true);
      try {
        const roleList = await lookupApi.getAdminRoleList();
        if (cancelled) return;
        setRoleOptions(mapAdminRoleOptions(roleList));
      } catch (error) {
        if (cancelled) return;
        setRoleOptions([]);
        notifyError(getRoleLookupError(error), "administrator-role-lookup");
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    }

    loadRoleOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const administratorRoleOptions = roleOptions.length > 0 ? roleOptions : fallbackRoleOptions;

  useEffect(() => {
    let cancelled = false;

    async function loadAdministrators() {
      setRecordsLoading(true);
      try {
        const result = await administratorApi.getAdministratorList({
          page,
          pageSize,
          search: filters.query || undefined,
          roleCode: filters.role === allFilter ? undefined : filters.role,
          status: filters.status === allFilter ? undefined : filters.status === "ACTIVE"
        });

        if (cancelled) return;
        setRecords(result.records.map(mapAdministratorRecord));
        setPagination({
          Page: result.pagination.Page,
          PageSize: result.pagination.PageSize,
          TotalRecords: result.pagination.TotalRecords,
          TotalPages: Math.max(1, result.pagination.TotalPages)
        });
      } catch (error) {
        if (cancelled) return;
        setRecords([]);
        setPagination({ Page: page, PageSize: pageSize, TotalRecords: 0, TotalPages: 1 });
        notifyError(getAdministratorListError(error), "administrator-list-load");
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    }

    loadAdministrators();

    return () => {
      cancelled = true;
    };
  }, [filters, page, pageSize, refreshKey]);

  const openAdd = () => {
    setAdding(true);
  };

  const saveAdministrator = async (record: AdministratorRecord) => {
    if (adding) {
      await administratorApi.addAdministrator({
        Username: record.email,
        Fullname: record.name,
        RoleCode: record.role,
        LoginPassword: record.loginPassword ?? "",
        ConfirmLoginPassword: record.confirmLoginPassword ?? "",
        TrustAccess: 1,
        WillAccess: record.willAccess ? 1 : 0,
        LoginStatus: record.status === "ACTIVE" ? 1 : 0
      });
      notifySuccess("Administrator added successfully.", "administrator-add");
      setAdding(false);
      setPage(1);
      setRefreshKey((current) => current + 1);
      return;
    }

    await administratorApi.editAdministrator(Number(record.id), {
      Username: record.email,
      Fullname: record.name,
      RoleCode: record.role,
      TrustAccess: 1,
      WillAccess: record.willAccess ? 1 : 0,
      LoginStatus: record.status === "ACTIVE" ? 1 : 0
    });
    notifySuccess("Administrator updated successfully.", "administrator-update");
    setEditingRecord(null);
    setRefreshKey((current) => current + 1);
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
              Rank
              <select
                value={draftFilters.role}
                onChange={(event) => setDraftFilters((current) => ({ ...current, role: event.target.value as AdministratorFilters["role"] }))}
                disabled={rolesLoading}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                <option value={allFilter}>{rolesLoading ? "Loading ranks..." : "All Ranks"}</option>
                {administratorRoleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
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
          <div className="text-sm font-semibold text-textSecondary">{pagination.TotalRecords} internal users</div>
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
              {[10, 20, 50, 100].map((size) => (
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
                <th className="border-b border-line px-4 py-3 font-semibold">The Will Access</th>
                <th className="border-b border-line px-4 py-3 font-semibold">Last Login</th>
                <th className="border-b border-line px-4 py-3 font-semibold">Status</th>
                <th className="border-b border-line px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => {
                return (
                <tr key={record.id} className="transition hover:bg-gray-50">
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{(pagination.Page - 1) * pagination.PageSize + index + 1}</td>
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
                    <RoleBadge role={record.role} label={record.roleName} />
                  </td>
                  <td className="border-b border-line px-4 py-3">
                    <AccessPill enabled={record.willAccess} />
                  </td>
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{record.lastLogin}</td>
                  <td className="border-b border-line px-4 py-3">
                    <StatusPill status={record.status} />
                  </td>
                  <td className="border-b border-line px-4 py-3">
                    <TableActionMenu open={openActionId === record.id} onOpenChange={(open) => setOpenActionId(open ? record.id : null)} ariaLabel={`Actions for ${record.name}`}>
                      <button type="button" onClick={() => openEditModal(record)} className="block w-full rounded-md px-3 py-2 text-left text-sm shadow-none hover:bg-gray-50">
                        Edit
                      </button>
                      <button type="button" onClick={() => openPasswordModal(record)} className="block w-full rounded-md px-3 py-2 text-left text-sm shadow-none hover:bg-gray-50">
                        Change Password
                      </button>
                    </TableActionMenu>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {recordsLoading ? (
            <div className="p-4">
              <LoadingSkeleton />
            </div>
          ) : null}
          {!recordsLoading && records.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No administrators found" description="Adjust the search filters and try again." />
            </div>
          ) : null}
        </div>

        <Pagination currentPage={page} pageCount={Math.max(1, pagination.TotalPages)} totalRecords={pagination.TotalRecords} pageSize={pageSize} itemLabel="users" onPageChange={setPage} />
      </section>

      <AdministratorModal
        title={adding ? "Add Administrator" : "Edit Administrator"}
        open={adding || Boolean(editingRecord)}
        record={editingRecord ?? createEmptyAdministrator()}
        roleOptions={administratorRoleOptions}
        requirePassword={adding}
        onClose={() => {
          setAdding(false);
          setEditingRecord(null);
        }}
        onSubmit={saveAdministrator}
      />

      <ChangePasswordModal record={passwordRecord} createdBy={session?.userId ?? ""} onClose={() => setPasswordRecord(null)} />
    </>
  );
}

function AdministratorModal({
  title,
  open,
  record,
  roleOptions,
  requirePassword,
  onClose,
  onSubmit
}: {
  title: string;
  open: boolean;
  record: AdministratorRecord;
  roleOptions: Array<{ value: AdministratorRole; label: string }>;
  requirePassword: boolean;
  onClose: () => void;
  onSubmit: (record: AdministratorRecord) => Promise<void>;
}) {
  const [draft, setDraft] = useState(record);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDraft(record);
  }, [record]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (requirePassword && !isValidPasswordCriteria(draft.loginPassword ?? "")) {
      notifyError(passwordCriteriaMessage, "administrator-add-password-criteria");
      return;
    }

    if (requirePassword && draft.loginPassword !== draft.confirmLoginPassword) {
      notifyError("Login password and confirm login password do not match.", "administrator-add-password-mismatch");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ ...draft, email: draft.email.trim(), name: draft.name.trim(), willAccess: draft.willAccess ? true : false });
    } catch (error) {
      notifyError(getAdministratorSaveError(error), "administrator-save-error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-2xl grid-rows-[auto_minmax(0,1fr)] gap-0 p-0">
        <DialogHeader className="mx-6 mt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Update administrator access details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 rounded-lg border border-line bg-white p-4">
              <TextField label="Email" type="email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} required />
              <TextField label="Full Name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} required />
              {requirePassword ? (
                <>
                  <div className="rounded-lg border border-brandGold/40 bg-[#FFF8E1] px-4 py-3 text-sm leading-6 text-textPrimary">
                    {passwordCriteriaMessage}
                  </div>
                  <PasswordField label="Login Password" value={draft.loginPassword ?? ""} onChange={(value) => setDraft((current) => ({ ...current, loginPassword: value }))} />
                  <PasswordField label="Confirm Login Password" value={draft.confirmLoginPassword ?? ""} onChange={(value) => setDraft((current) => ({ ...current, confirmLoginPassword: value }))} />
                </>
              ) : null}
              <label className="block text-sm font-medium text-textPrimary">
                Role <span className="text-red-600">*</span>
                <select
                  value={draft.role}
                  onChange={(event) => {
                    const role = event.target.value as AdministratorRole;
                    const roleName = roleOptions.find((option) => option.value === role)?.label ?? roles[role];
                    setDraft((current) => ({ ...current, role, roleName }));
                  }}
                  className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
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
              <label className="flex items-start gap-3 rounded-lg border border-line bg-soft px-4 py-3 text-sm font-medium text-textPrimary">
                <input
                  type="checkbox"
                  checked={draft.willAccess}
                  value={draft.willAccess ? 1 : 0}
                  onChange={(event) => setDraft((current) => ({ ...current, willAccess: event.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-line text-ink focus:ring-ink"
                />
                <span>
                  Allow access to The Will
                </span>
              </label>
            </div>
          </div>
          <DialogFooter className="mt-0 bg-soft px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordModal({ record, createdBy, onClose }: { record: AdministratorRecord | null; createdBy: string; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      setNewPassword("");
      setConfirmPassword("");
      setSubmitting(false);
    }
  }, [record]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!record) return;

    if (!isValidPasswordCriteria(newPassword)) {
      notifyError(passwordCriteriaMessage, "administrator-password-criteria");
      return;
    }
    if (newPassword !== confirmPassword) {
      notifyError("New password and confirm new password do not match.", "administrator-password-mismatch");
      return;
    }

    if (!createdBy) {
      notifyError("Unable to identify the current user. Please sign in again.", "administrator-password-current-user");
      return;
    }

    setSubmitting(true);
    try {
      await administratorApi.changePassword(Number(record.id), {
        UserID: Number(record.id),
        LoginPassword: newPassword,
        ConfirmLoginPassword: confirmPassword,
        CreatedBy: createdBy
      });
      notifySuccess("Password changed successfully.", "administrator-password-change");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (error) {
      notifyError(getAdministratorPasswordError(error), "administrator-password-change-error");
    } finally {
      setSubmitting(false);
    }
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
            <div className="rounded-lg border border-brandGold/40 bg-[#FFF8E1] px-4 py-3 text-sm leading-6 text-textPrimary">
              {passwordCriteriaMessage}
            </div>
            <PasswordField label="New Password" value={newPassword} onChange={setNewPassword} />
            <PasswordField label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} />
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</Button>
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

function RoleBadge({ role, label }: { role: AdministratorRole; label: string }) {
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
      {label}
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

function AccessPill({ enabled }: { enabled: boolean }) {
  return (
    <span className={enabled ? "inline-flex items-center rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700" : "inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-textSecondary"}>
      {enabled ? "Allowed" : "Not Allowed"}
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
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-textSecondary shadow-none hover:bg-gray-100 hover:text-textPrimary"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

function createEmptyAdministrator(): AdministratorRecord {
  return {
    id: "",
    email: "",
    name: "",
    role: "AD",
    roleName: roles.AD,
    willAccess: false,
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

function mapAdminRoleOptions(roleList: RoleLookupItem[]) {
  return roleList
    .filter((role): role is RoleLookupItem & { RoleCode: AdministratorRole } => administratorRoles.includes(role.RoleCode as AdministratorRole))
    .map((role) => ({
      value: role.RoleCode,
      label: role.RoleName || roles[role.RoleCode]
    }));
}

function getRoleLookupError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message || "Unable to load administrator ranks.";
}

function mapAdministratorRecord(item: AdministratorListItem): AdministratorRecord {
  const role = normalizeAdministratorRole(item.RoleCode);
  const name = item.FullName?.trim() || item.DisplayName?.trim() || item.Username?.trim() || item.Email?.trim() || "-";

  return {
    id: String(item.UserID),
    email: item.Email?.trim() || item.Username?.trim() || "-",
    name,
    role,
    roleName: item.RoleName?.trim() || roles[role],
    willAccess: item.WillAccess === true || item.WillAccess === 1,
    status: item.LoginStatus ? "ACTIVE" : "INACTIVE",
    lastLogin: item.LastLogin?.trim() || "-"
  };
}

function normalizeAdministratorRole(roleCode: string | undefined): AdministratorRole {
  if (roleCode === "SA" || roleCode === "AD" || roleCode === "OP" || roleCode === "AC") {
    return roleCode;
  }

  return "AD";
}

function getAdministratorListError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message || "Unable to load administrator list.";
}

function getAdministratorPasswordError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message || "Unable to change administrator password.";
}

function getAdministratorSaveError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message || "Unable to save administrator.";
}

function getUserInitials(record: AdministratorRecord) {
  const parts = record.name.trim().split(/\s+/);
  const fallback = record.email.slice(0, 2).toUpperCase();
  if (parts.length === 0) return fallback;
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase() || fallback;
}
