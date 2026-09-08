import { Copy, Edit, Eye, MoreHorizontal, Plus, Power, RotateCcw, Search } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/common/Pagination";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/ui/button";
import { trustPlanMockData, trustPlanStorageKey } from "../../data/trustPlanMockData";
import { notifySuccess } from "../../services/notificationService";
import type { FeeRule, TrustPlan } from "../../types/trustPlan";

const allFilter = "all";
const staticFeeTypes = ["Setup Fee", "Admin Fee", "Processing Fee"] as const;

interface TrustPlanFilters {
  query: string;
  productCategory: string;
  status: string;
  returnMethod: string;
  commissionMethod: string;
}

export function TrustPlanList() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<TrustPlan[]>(loadTrustPlans);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<TrustPlanFilters>(createEmptyFilters());
  const [filters, setFilters] = useState<TrustPlanFilters>(createEmptyFilters());

  const filteredRecords = useMemo(() => applyFilters(records, filters), [records, filters]);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pageRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({ ...draftFilters, query: draftFilters.query.trim() });
    setPage(1);
  };

  const resetFilters = () => {
    const empty = createEmptyFilters();
    setDraftFilters(empty);
    setFilters(empty);
    setPage(1);
  };

  const duplicatePlan = (record: TrustPlan) => {
    const copy: TrustPlan = {
      ...structuredClone(record),
      id: `TP-${Date.now()}`,
      basicInfo: {
        ...record.basicInfo,
        productCode: `${record.basicInfo.productCode}_COPY`,
        productName: `${record.basicInfo.productName} Copy`,
        productStatus: "Draft" as const
      },
      updatedAt: new Date().toISOString()
    };
    const nextRecords = [copy, ...records];
    setRecords(nextRecords);
    saveTrustPlans(nextRecords);
    notifySuccess("Trust plan duplicated as draft.", "trust-plan-duplicate");
    setOpenActionId(null);
  };

  const toggleStatus = (record: TrustPlan) => {
    const nextStatus: TrustPlan["basicInfo"]["productStatus"] = record.basicInfo.productStatus === "Active" ? "Inactive" : "Active";
    const nextRecords = records.map((item) =>
      item.id === record.id ? { ...item, basicInfo: { ...item.basicInfo, productStatus: nextStatus }, updatedAt: new Date().toISOString() } : item
    );
    setRecords(nextRecords);
    saveTrustPlans(nextRecords);
    notifySuccess(`Trust plan ${nextStatus === "Active" ? "activated" : "deactivated"} successfully.`, "trust-plan-status");
    setOpenActionId(null);
  };

  return (
    <>
      <PageHeader
        title="Trust Plan"
        description="Manage trust products, return structures, commission rules, fees, benefits and product configuration."
        actions={
          <Button type="button" onClick={() => navigate("/trust-plan/add")}>
            <Plus className="h-4 w-4" />
            Add Trust Plan
          </Button>
        }
      />

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line p-4">
          <form onSubmit={submitFilters} className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_170px_150px_210px_230px_auto_auto]">
            <label className="block text-sm font-semibold text-textPrimary">
              Search
              <span className="relative mt-1 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
                <input
                  value={draftFilters.query}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
                  placeholder="Product Code / Product Name"
                  className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </span>
            </label>
            <FilterSelect label="Product Category" value={draftFilters.productCategory} onChange={(value) => setDraftFilters((current) => ({ ...current, productCategory: value }))} options={["Trust", "Saving Trust", "Flexi Trust", "Other"]} />
            <FilterSelect label="Status" value={draftFilters.status} onChange={(value) => setDraftFilters((current) => ({ ...current, status: value }))} options={["Draft", "Active", "Inactive"]} />
            <FilterSelect label="Return Method" value={draftFilters.returnMethod} onChange={(value) => setDraftFilters((current) => ({ ...current, returnMethod: value }))} options={returnMethodOptions} />
            <FilterSelect label="Commission Method" value={draftFilters.commissionMethod} onChange={(value) => setDraftFilters((current) => ({ ...current, commissionMethod: value }))} options={commissionMethodOptions} />
            <Button type="button" variant="outline" onClick={resetFilters} className="self-end">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button type="submit" className="self-end">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-textSecondary">{filteredRecords.length} trust plans</div>
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
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                {["Product Code", "Product Name", "Product Category", "Minimum Placement", "Tenure", "Return Method", "Payout Frequency", "Commission Method", "Effective Date", "Status", "Action"].map((header) => (
                  <th key={header} className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record) => (
                <tr key={record.id} className="transition hover:bg-gray-50">
                  <td className="border-b border-line px-4 py-3 font-semibold text-textPrimary">{record.basicInfo.productCode}</td>
                  <td className="min-w-44 border-b border-line px-4 py-3 text-textPrimary">{record.basicInfo.productName}</td>
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{record.basicInfo.productCategory}</td>
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{formatCurrency(record.basicInfo.minimumPlacement)}</td>
                  <td className="border-b border-line px-4 py-3 text-textSecondary">
                    {record.basicInfo.fundManagementPeriod} {record.basicInfo.fundManagementPeriodUnit}
                  </td>
                  <td className="min-w-52 border-b border-line px-4 py-3 text-textSecondary">{record.returnConfig.method || "-"}</td>
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{record.payoutConfig.payoutFrequency || "-"}</td>
                  <td className="min-w-52 border-b border-line px-4 py-3 text-textSecondary">{record.commissionConfig.method || "-"}</td>
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{record.basicInfo.effectiveDate || "-"}</td>
                  <td className="min-w-24 border-b border-line px-4 py-3">
                    <StatusBadge status={record.basicInfo.productStatus} />
                  </td>
                  <td className="border-b border-line px-4 py-3">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenActionId((current) => (current === record.id ? null : record.id))}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-textSecondary hover:bg-gray-100"
                        aria-label={`Actions for ${record.basicInfo.productName}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openActionId === record.id ? (
                        <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-line bg-white p-2 shadow-soft">
                          <ActionLink to={`/trust-plan/edit/${record.id}`} icon={<Eye className="h-4 w-4" />} label="View" />
                          <ActionLink to={`/trust-plan/edit/${record.id}`} icon={<Edit className="h-4 w-4" />} label="Edit" />
                          <ActionButton onClick={() => duplicatePlan(record)} icon={<Copy className="h-4 w-4" />} label="Duplicate" />
                          <ActionButton onClick={() => toggleStatus(record)} icon={<Power className="h-4 w-4" />} label={record.basicInfo.productStatus === "Active" ? "Deactivate" : "Activate"} />
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} pageCount={pageCount} totalRecords={filteredRecords.length} pageSize={pageSize} itemLabel="plans" onPageChange={setPage} />
      </section>
    </>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-textPrimary">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        <option value={allFilter}>All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-textPrimary hover:bg-gray-50">
      {icon}
      {label}
    </Link>
  );
}

function ActionButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-textPrimary hover:bg-gray-50">
      {icon}
      {label}
    </button>
  );
}

function createEmptyFilters(): TrustPlanFilters {
  return { query: "", productCategory: allFilter, status: allFilter, returnMethod: allFilter, commissionMethod: allFilter };
}

function applyFilters(records: TrustPlan[], filters: TrustPlanFilters) {
  const query = filters.query.toLowerCase();
  return records.filter((record) => {
    const matchesQuery = !query || `${record.basicInfo.productCode} ${record.basicInfo.productName}`.toLowerCase().includes(query);
    const matchesCategory = filters.productCategory === allFilter || record.basicInfo.productCategory === filters.productCategory;
    const matchesStatus = filters.status === allFilter || record.basicInfo.productStatus === filters.status;
    const matchesReturn = filters.returnMethod === allFilter || record.returnConfig.method === filters.returnMethod;
    const matchesCommission = filters.commissionMethod === allFilter || record.commissionConfig.method === filters.commissionMethod;
    return matchesQuery && matchesCategory && matchesStatus && matchesReturn && matchesCommission;
  });
}

export function loadTrustPlans(): TrustPlan[] {
  const saved = window.localStorage.getItem(trustPlanStorageKey);
  if (!saved) {
    const normalizedPlans = normalizeTrustPlans(trustPlanMockData);
    saveTrustPlans(normalizedPlans);
    return normalizedPlans;
  }
  try {
    return normalizeTrustPlans(JSON.parse(saved) as TrustPlan[]);
  } catch {
    return trustPlanMockData;
  }
}

export function saveTrustPlans(plans: TrustPlan[]) {
  window.localStorage.setItem(trustPlanStorageKey, JSON.stringify(plans));
}

function normalizeTrustPlans(plans: TrustPlan[]) {
  return plans.map((plan) => ({
    ...plan,
    basicInfo: {
      ...plan.basicInfo,
      executionRanks: plan.basicInfo.executionRanks?.length ? plan.basicInfo.executionRanks : ["STR", "TR", "TM", "TD", "GTD", "CTD"]
    },
    fees: createStaticFeeRules(plan.fees),
    payoutConfig: { ...plan.payoutConfig, calculationStart: plan.payoutConfig.calculationStart === "From Commencement Date" ? plan.payoutConfig.calculationStart : "From Commencement Date" },
    returnConfig: { ...plan.returnConfig, method: enabledReturnMethodOptions.includes(plan.returnConfig.method) ? plan.returnConfig.method : "Investment + Period Tier Rate" },
    commissionConfig: {
      ...plan.commissionConfig,
      method: enabledCommissionMethodOptions.includes(plan.commissionConfig.method) ? plan.commissionConfig.method : "One-Off Commission",
      hybrid: {
        phases: plan.commissionConfig.hybrid.phases.map((phase) => {
          const legacyPhase = phase as typeof phase & { fromPeriod?: number; toPeriod?: number; periodUnit?: string };
          return {
            id: phase.id,
            fromYear: phase.fromYear ?? legacyPhase.fromPeriod ?? 1,
            toYear: phase.toYear ?? legacyPhase.toPeriod ?? legacyPhase.fromPeriod ?? 1,
            commissionMethod: phase.commissionMethod === "Monthly Commission" ? "Monthly Recurring Commission" : phase.commissionMethod,
            tiers: phase.tiers ?? []
          };
        })
      }
    },
    commissionRules: {
      ...plan.commissionRules,
      calculationBasis: String(plan.commissionRules.calculationBasis) === "Collected Amount" ? "Gross Placement Amount" : plan.commissionRules.calculationBasis,
      rankDetermination: String(plan.commissionRules.rankDetermination) === "Rank at Approval" ? "Rank at Completed" : plan.commissionRules.rankDetermination
    }
  })) as TrustPlan[];
}

function createStaticFeeRules(fees: FeeRule[] = []): FeeRule[] {
  return staticFeeTypes.map((feeType) => {
    const existing = fees.find((fee) => fee.feeType === feeType);
    return existing ?? { id: `FEE-${feeType.replace(/\s+/g, "-").toUpperCase()}`, feeType, rateType: "Percentage", value: 0, chargeTiming: "Upon Creation" };
  });
}

function formatCurrency(value?: number) {
  return `RM ${Number(value ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const enabledReturnMethodOptions = ["Investment + Period Tier Rate"];
const returnMethodOptions = enabledReturnMethodOptions;
const enabledCommissionMethodOptions = ["One-Off Commission"];
const commissionMethodOptions = enabledCommissionMethodOptions;
