import clsx from "clsx";
import { Building2, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search, Settings } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { configApi, type BankListItem } from "../api/configApi";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { notifyError, notifySuccess } from "../services/notificationService";

type SettingsTab = "system" | "bank";
type StatusFilter = "all" | "active" | "inactive";

const pageSize = 10;
const bankCodePattern = /^[A-Z]{1,10}$/;

export function GeneralSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("system");
  const [sstPercentage, setSstPercentage] = useState("");
  const [configLoading, setConfigLoading] = useState(true);
  const [configSubmitting, setConfigSubmitting] = useState(false);
  const [configLoadError, setConfigLoadError] = useState("");
  const [banks, setBanks] = useState<BankListItem[]>([]);
  const [bankLoading, setBankLoading] = useState(true);
  const [bankLoadError, setBankLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [bankModal, setBankModal] = useState<BankModalState>({ open: false, mode: "add" });

  useEffect(() => {
    void loadConfig();
    void loadBanks();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const loadConfig = async () => {
    setConfigLoading(true);
    setConfigLoadError("");

    try {
      const config = await configApi.getConfigList();
      setSstPercentage(String(config.SST ?? ""));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load general configuration.";
      setConfigLoadError(message);
      notifyError(message, "general-settings-load-error");
    } finally {
      setConfigLoading(false);
    }
  };

  const loadBanks = async () => {
    setBankLoading(true);
    setBankLoadError("");

    try {
      const bankList = await configApi.getBankList();
      setBanks(bankList);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load bank list.";
      setBankLoadError(message);
      notifyError(message, "bank-list-load-error");
    } finally {
      setBankLoading(false);
    }
  };

  const submitConfig = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const sst = Number(sstPercentage);
    if (!Number.isFinite(sst) || sst < 0 || sst > 100) {
      notifyError("SST must be between 0 and 100.", "general-settings-validation-error");
      return;
    }

    setConfigSubmitting(true);

    try {
      await configApi.updateConfig({ SST: sst });
      notifySuccess("General settings saved successfully.", "general-settings-save");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to save general settings.", "general-settings-save-error");
    } finally {
      setConfigSubmitting(false);
    }
  };

  const filteredBanks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return banks.filter((bank) => {
      const bankStatus = getBankStatus(bank);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && bankStatus === 0) ||
        (statusFilter === "inactive" && bankStatus === 1);
      const matchesSearch =
        !normalizedSearch ||
        getDisplayBankCode(bank).toLowerCase().includes(normalizedSearch) ||
        bank.BankName.toLowerCase().includes(normalizedSearch) ||
        bank.BankNameDetail.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [banks, searchTerm, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredBanks.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pagedBanks = filteredBanks.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const openAddBank = () => setBankModal({ open: true, mode: "add" });
  const openEditBank = (bank: BankListItem) => setBankModal({ open: true, mode: "edit", bank });
  const closeBankModal = () => setBankModal({ open: false, mode: "add" });

  const saveBank = async (values: BankFormValues) => {
    if (bankModal.mode === "add") {
      await configApi.addBank({
        BankCode: values.bankCode,
        BankNameDetail: values.bankNameDetail
      });
      notifySuccess("Bank added successfully.", "bank-add-success");
    } else if (bankModal.bank) {
      await configApi.editBank({
        RowID: bankModal.bank.RowID,
        BankNameDetail: values.bankNameDetail,
        BankStatus: values.bankStatus
      });
      notifySuccess("Bank updated successfully.", "bank-edit-success");
    }

    closeBankModal();
    await loadBanks();
  };

  return (
    <>
      <PageHeader title="General" description="Manage general system configuration." />

      <section className="flex overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <aside className="w-[280px] shrink-0 border-r border-line bg-white">
          <SettingsTabButton
            active={activeTab === "system"}
            icon={<Settings className="h-5 w-5" />}
            title="System"
            description="System settings and defaults"
            onClick={() => setActiveTab("system")}
          />
          <SettingsTabButton
            active={activeTab === "bank"}
            icon={<Building2 className="h-5 w-5" />}
            title="Bank Management"
            description="Manage master bank list"
            onClick={() => setActiveTab("bank")}
          />
        </aside>

        <div className="min-h-[560px] min-w-0 flex-1 p-5">
          {activeTab === "system" ? (
            <SystemSettingsPanel
              loading={configLoading}
              loadError={configLoadError}
              submitting={configSubmitting}
              sstPercentage={sstPercentage}
              onSstPercentageChange={setSstPercentage}
              onSubmit={submitConfig}
            />
          ) : (
            <BankManagementPanel
              banks={pagedBanks}
              currentPage={safeCurrentPage}
              loading={bankLoading}
              loadError={bankLoadError}
              pageCount={pageCount}
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              totalRecords={filteredBanks.length}
              onAddBank={openAddBank}
              onEditBank={openEditBank}
              onPageChange={setCurrentPage}
              onSearchTermChange={setSearchTerm}
              onStatusFilterChange={setStatusFilter}
            />
          )}
        </div>
      </section>

      <BankFormPanel modal={bankModal} onClose={closeBankModal} onSubmit={saveBank} />
    </>
  );
}

function SettingsTabButton({
  active,
  description,
  icon,
  onClick,
  title
}: {
  active: boolean;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? { backgroundColor: "#FFF0B8" } : undefined}
      className={clsx(
        "flex w-full items-start gap-4 border-b border-l-4 border-b-line px-6 py-5 text-left transition",
        active
          ? "border-l-brandGold text-[#8A650F] shadow-[inset_0_0_0_1px_rgba(212,175,55,0.35)]"
          : "border-l-transparent bg-white text-textPrimary hover:bg-gray-50"
      )}
    >
      <span className={clsx("mt-0.5", active ? "text-[#b88700]" : "text-textPrimary")}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className={clsx("mt-1 block text-xs leading-5", active ? "text-[#7d651f]" : "text-textSecondary")}>{description}</span>
      </span>
    </button>
  );
}

function SystemSettingsPanel({
  loading,
  loadError,
  onSstPercentageChange,
  onSubmit,
  sstPercentage,
  submitting
}: {
  loading: boolean;
  loadError: string;
  onSstPercentageChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  sstPercentage: string;
  submitting: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-textPrimary">System</h2>
      <p className="mt-1 text-sm text-textSecondary">Update system settings and defaults.</p>

      {loading ? (
        <div className="mt-8 flex min-h-32 items-center justify-center gap-2 rounded-lg border border-line bg-gray-50 text-sm text-textSecondary">
          <Loader2 className="h-4 w-4 animate-spin text-brandGold" />
          Loading system settings
        </div>
      ) : loadError ? (
        <div className="mt-8">
          <EmptyState title="Unable to load settings" description={loadError} />
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-7 space-y-5">
          <label className="block text-sm font-medium text-textPrimary">
            SST Percentage
            <input
              type="text"
              inputMode="decimal"
              value={sstPercentage}
              onChange={(event) => onSstPercentageChange(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 min-w-24 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Submitting" : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}

function BankManagementPanel({
  banks,
  currentPage,
  loading,
  loadError,
  onAddBank,
  onEditBank,
  onPageChange,
  onSearchTermChange,
  onStatusFilterChange,
  pageCount,
  searchTerm,
  statusFilter,
  totalRecords
}: {
  banks: BankListItem[];
  currentPage: number;
  loading: boolean;
  loadError: string;
  onAddBank: () => void;
  onEditBank: (bank: BankListItem) => void;
  onPageChange: (page: number) => void;
  onSearchTermChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  pageCount: number;
  searchTerm: string;
  statusFilter: StatusFilter;
  totalRecords: number;
}) {
  const firstRecordNumber = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRecordNumber = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-textPrimary">Bank Management</h2>
          <p className="mt-1 text-sm text-textSecondary">Manage banks available for agent bank accounts and payouts.</p>
        </div>
        <button
          type="button"
          onClick={onAddBank}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brandGold px-5 text-sm font-semibold text-ink transition hover:bg-[#c59814]"
        >
          <Plus className="h-5 w-5" />
          Add Bank
        </button>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative block">
          <span className="sr-only">Search bank info</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Search by bank code or bank name..."
            className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm text-textPrimary shadow-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
          className="h-11 rounded-lg border border-line bg-white px-3 text-sm text-textPrimary shadow-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          aria-label="Filter bank status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-line">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-textSecondary">
            <Loader2 className="h-4 w-4 animate-spin text-brandGold" />
            Loading bank list
          </div>
        ) : loadError ? (
          <div className="p-5">
            <EmptyState title="Unable to load bank list" description={loadError} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full border-collapse text-sm">
                <thead className="bg-gray-50 text-left text-textPrimary">
                  <tr>
                    <th className="w-20 px-4 py-3 font-semibold">No.</th>
                    <th className="px-4 py-3 font-semibold">Bank Code</th>
                    <th className="px-4 py-3 font-semibold">Bank Name</th>
                    <th className="w-28 px-4 py-3 font-semibold">Status</th>
                    <th className="w-28 px-4 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {banks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-textSecondary">
                        No banks found.
                      </td>
                    </tr>
                  ) : (
                    banks.map((bank, index) => {
                      const status = getBankStatus(bank);
                      return (
                        <tr key={bank.RowID} className="bg-white text-textPrimary">
                          <td className="px-4 py-3">{(currentPage - 1) * pageSize + index + 1}</td>
                          <td className="px-4 py-3 font-medium">{getDisplayBankCode(bank)}</td>
                          <td className="px-4 py-3">{bank.BankNameDetail}</td>
                          <td className="px-4 py-3">
                            <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", status === 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600")}>
                              {status === 0 ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => onEditBank(bank)}
                              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-textPrimary transition hover:bg-gray-50"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-line px-4 py-4 text-sm text-textSecondary sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {firstRecordNumber} - {lastRecordNumber} of {totalRecords} records
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {getVisiblePageNumbers(currentPage, pageCount).map((pageNumber, index) =>
                  pageNumber === "..." ? (
                    <span key={`${pageNumber}-${index}`} className="inline-flex h-9 w-9 items-center justify-center text-sm font-semibold text-textSecondary">
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => onPageChange(pageNumber)}
                      className={
                        pageNumber === currentPage
                          ? "inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brandGold text-sm font-semibold text-ink shadow-soft"
                          : "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-sm font-semibold text-textPrimary transition hover:bg-gray-50"
                      }
                    >
                      {pageNumber}
                    </button>
                  )
                )}
                <button
                  type="button"
                  disabled={currentPage === pageCount}
                  onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface BankFormValues {
  bankCode: string;
  bankNameDetail: string;
  bankStatus: number;
}

type BankModalState =
  | { open: false; mode: "add"; bank?: undefined }
  | { open: true; mode: "add"; bank?: undefined }
  | { open: true; mode: "edit"; bank: BankListItem };

function BankFormPanel({
  modal,
  onClose,
  onSubmit
}: {
  modal: BankModalState;
  onClose: () => void;
  onSubmit: (values: BankFormValues) => Promise<void>;
}) {
  const [bankCode, setBankCode] = useState("");
  const [bankNameDetail, setBankNameDetail] = useState("");
  const [bankStatus, setBankStatus] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!modal.open) return;

    if (modal.mode === "edit") {
      setBankCode(stripBankCodePrefix(modal.bank.BankCode ?? modal.bank.BankName));
      setBankNameDetail(modal.bank.BankNameDetail);
      setBankStatus(getBankStatus(modal.bank));
    } else {
      setBankCode("");
      setBankNameDetail("");
      setBankStatus(0);
    }
  }, [modal]);

  if (!modal.open) return null;

  const title = modal.mode === "add" ? "Add Bank" : "Edit Bank";
  const description = modal.mode === "add" ? "Add a new bank to the system." : "Update bank name detail and status.";
  const submitLabel = modal.mode === "add" ? "Add Bank" : "Save Changes";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (modal.mode === "add" && !bankCodePattern.test(bankCode)) {
      notifyError("Bank code must be 1 to 10 capital letters A-Z only.", "bank-code-validation-error");
      return;
    }

    if (!bankNameDetail.trim()) {
      notifyError("Bank name detail is required.", "bank-name-validation-error");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        bankCode,
        bankNameDetail: bankNameDetail.trim(),
        bankStatus
      });
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to save bank.", "bank-save-error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={modal.open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <BankFormSection title="Bank Information" icon={Building2}>
              {modal.mode === "add" ? (
                <label className="block text-sm font-medium text-textPrimary">
                  Bank Code <span className="text-red-600">*</span>
                  <input
                    type="text"
                    value={bankCode}
                    onChange={(event) => setBankCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 10))}
                    className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                    maxLength={10}
                    placeholder="MBB"
                  />
                </label>
              ) : null}

              <label className="block text-sm font-medium text-textPrimary">
                Bank Name <span className="text-red-600">*</span>
                <input
                  type="text"
                  value={bankNameDetail}
                  onChange={(event) => setBankNameDetail(event.target.value.slice(0, 100))}
                  className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  maxLength={100}
                  placeholder="Search bank name..."
                />
              </label>

              {modal.mode === "edit" ? (
                <label className="block text-sm font-medium text-textPrimary">
                  Status <span className="text-red-600">*</span>
                  <select
                    value={bankStatus}
                    onChange={(event) => setBankStatus(Number(event.target.value))}
                    className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    <option value={0}>Active</option>
                    <option value={1}>Inactive</option>
                  </select>
                </label>
              ) : null}

              {modal.mode === "add" ? (
                <div className="rounded-lg border border-brandGold/30 bg-[#fff8dd] px-4 py-3 text-sm leading-5 text-[#7b5d0d]">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold text-[#6f5208]">Full code will be generated automatically.</p>
                      <p className="mt-1 text-xs">Example: MY-MYR-MBB</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </BankFormSection>
          </div>

          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BankFormSection({ title, icon: Icon, children }: { title: string; icon: typeof Building2; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="mb-4 flex items-center gap-2 border-b border-line pb-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-soft text-brandGold">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-textPrimary">{title}</h3>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function getDisplayBankCode(bank: BankListItem) {
  return bank.BankName || (bank.BankCode ? `MY-MYR-${bank.BankCode}` : "");
}

function stripBankCodePrefix(value: string) {
  return value.replace(/^MY-MYR-/i, "");
}

function getBankStatus(bank: BankListItem) {
  return bank.BankStatus ?? bank.Status ?? 0;
}

function getVisiblePageNumbers(currentPage: number, pageCount: number): Array<number | "..."> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, "...", pageCount - 2, pageCount - 1, pageCount];
  if (currentPage >= pageCount - 2) return [1, 2, 3, "...", pageCount - 2, pageCount - 1, pageCount];
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", pageCount];
}
