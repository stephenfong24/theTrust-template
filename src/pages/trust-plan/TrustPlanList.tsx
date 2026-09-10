import { Copy, Edit, Eye, MoreHorizontal, Plus, Power, RotateCcw, Search } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/common/Pagination";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/ui/button";
import { trustPlanMockData, trustPlanStorageKey } from "../../data/trustPlanMockData";
import { notifySuccess } from "../../services/notificationService";
import type { TrustPlan } from "../../types/trustPlan";
import { buildTrustPlanPayload, createStaticFeeRules } from "../../utils/trustPlanPayload";

const allFilter = "all";

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
  const [activationPreview, setActivationPreview] = useState<TrustPlan | null>(null);
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
        productCode: "",
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
    if (nextStatus === "Active") {
      setActivationPreview(record);
      setOpenActionId(null);
      return;
    }

    updateStatus(record, nextStatus);
  };

  const updateStatus = (record: TrustPlan, nextStatus: TrustPlan["basicInfo"]["productStatus"]) => {
    const nextRecords = records.map((item) =>
      item.id === record.id ? { ...item, basicInfo: { ...item.basicInfo, productStatus: nextStatus }, updatedAt: new Date().toISOString() } : item
    );
    setRecords(nextRecords);
    saveTrustPlans(nextRecords);
    notifySuccess(`Trust plan ${nextStatus === "Active" ? "activated" : "deactivated"} successfully.`, "trust-plan-status");
    setOpenActionId(null);
  };

  const confirmActivation = () => {
    if (!activationPreview) return;
    updateStatus(activationPreview, "Active");
    setActivationPreview(null);
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

      <ActivationJsonModal plan={activationPreview} onClose={() => setActivationPreview(null)} onConfirm={confirmActivation} />
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

function ActivationJsonModal({ plan, onClose, onConfirm }: { plan: TrustPlan | null; onClose: () => void; onConfirm: () => void }) {
  if (!plan) return null;

  const json = JSON.stringify(createActivationJson(plan), null, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-brandGold/30 bg-white shadow-[0_28px_80px_rgba(17,17,17,0.28)]">
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-textPrimary">Activate Trust Plan</h2>
              <p className="mt-1 text-sm text-textSecondary">Review generated JSON data from steps 1 - 9 before activation.</p>
            </div>
            <StatusBadge status={plan.basicInfo.productStatus} />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-soft p-5">
          <div className="mb-3 grid gap-3 sm:grid-cols-3">
            <SummaryItem label="Product Code" value={plan.basicInfo.productCode} />
            <SummaryItem label="Product Name" value={plan.basicInfo.productName} />
            <SummaryItem label="Category" value={plan.basicInfo.productCategory} />
          </div>
          <pre className="max-h-[54vh] overflow-auto rounded-lg border border-line bg-[#111111] p-4 text-xs leading-5 text-white shadow-inner">
            {json}
          </pre>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-line bg-white px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={onConfirm}>
            <Power className="h-4 w-4" />
            Activate
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</div>
      <div className="mt-1 text-sm font-semibold text-textPrimary">{value || "-"}</div>
    </div>
  );
}

function createActivationJson(plan: TrustPlan) {
  return buildTrustPlanPayload(plan);
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
  return plans.map((plan) => {
    const isMyTrust = plan.id === "TP-MYTRUST" || plan.basicInfo.productName === "MyTrust";
    return {
      ...plan,
      basicInfo: {
        ...plan.basicInfo,
        productDescription: isMyTrust ? "My Trust Product" : plan.basicInfo.productDescription,
        minimumPlacement: isMyTrust ? 10000 : plan.basicInfo.minimumPlacement,
        noMaximum: isMyTrust ? true : plan.basicInfo.noMaximum,
        maximumPlacement: isMyTrust || plan.basicInfo.noMaximum ? undefined : plan.basicInfo.maximumPlacement,
        fundManagementPeriod: isMyTrust ? 2 : plan.basicInfo.fundManagementPeriod,
        fundManagementPeriodUnit: isMyTrust ? "Years" : plan.basicInfo.fundManagementPeriodUnit,
        executionRanks: plan.basicInfo.executionRanks?.length ? plan.basicInfo.executionRanks : ["STR", "TR", "TM", "TD", "GTD", "CTD"]
      },
      paymentConfig: { ...plan.paymentConfig, paymentFrequency: isMyTrust ? "One-Off" : plan.paymentConfig.paymentFrequency },
      tenureConfig: {
        ...plan.tenureConfig,
        lockInPeriod: isMyTrust ? 2 : plan.tenureConfig.lockInPeriod,
        lockInPeriodUnit: isMyTrust ? "Years" : plan.tenureConfig.lockInPeriodUnit,
        allowEarlyWithdrawal: isMyTrust ? true : plan.tenureConfig.allowEarlyWithdrawal,
        earlyWithdrawalFeeType: isMyTrust ? "Percentage" : plan.tenureConfig.earlyWithdrawalFeeType,
        earlyWithdrawalFeeValue: isMyTrust ? 30 : plan.tenureConfig.earlyWithdrawalFeeValue
      },
      fees: createStaticFeeRules(plan.fees),
      payoutConfig: { ...plan.payoutConfig, payoutFrequency: isMyTrust ? "Quarterly" : plan.payoutConfig.payoutFrequency, calculationStart: "From Commencement Date", allowDividendRedeposit: isMyTrust ? false : plan.payoutConfig.allowDividendRedeposit },
      hasBonusReturn: isMyTrust ? false : plan.hasBonusReturn,
      bonusRules: isMyTrust ? [] : plan.bonusRules,
      returnConfig: { ...plan.returnConfig, method: enabledReturnMethodOptions.includes(plan.returnConfig.method) ? plan.returnConfig.method : "Investment + Period Tier Rate", matrixTiers: isMyTrust ? createMyTrustMatrixTiers() : plan.returnConfig.matrixTiers },
      commissionConfig: {
        ...plan.commissionConfig,
        method: enabledCommissionMethodOptions.includes(plan.commissionConfig.method) ? plan.commissionConfig.method : "One-Off Commission",
        oneOff: { tiers: isMyTrust ? createMyTrustCommissionTiers(plan.id) : normalizeCommissionTiers(plan.commissionConfig.oneOff.tiers) },
        monthly: { ...plan.commissionConfig.monthly, tiers: normalizeCommissionTiers(plan.commissionConfig.monthly.tiers) },
        yearly: { years: plan.commissionConfig.yearly.years.map((year) => ({ ...year, tiers: normalizeCommissionTiers(year.tiers) })) },
        multiYear: { plans: plan.commissionConfig.multiYear.plans.map((commissionPlan) => ({ ...commissionPlan, years: commissionPlan.years.map((year) => ({ ...year, tiers: normalizeCommissionTiers(year.tiers) })) })) },
        hybrid: {
          phases: plan.commissionConfig.hybrid.phases.map((phase) => {
            const legacyPhase = phase as typeof phase & { fromPeriod?: number; toPeriod?: number; periodUnit?: string };
            return {
              id: phase.id,
              fromYear: phase.fromYear ?? legacyPhase.fromPeriod ?? 1,
              toYear: phase.toYear ?? legacyPhase.toPeriod ?? legacyPhase.fromPeriod ?? 1,
              commissionMethod: phase.commissionMethod === "Monthly Commission" ? "Monthly Recurring Commission" : phase.commissionMethod,
              tiers: normalizeCommissionTiers(phase.tiers)
            };
          })
        }
      },
      commissionRules: {
        ...plan.commissionRules,
        calculationBasis: "Gross Placement Amount",
        rankDetermination: "Rank at Completed"
      },
      hasComplimentaryBenefits: isMyTrust ? true : plan.hasComplimentaryBenefits,
      benefits: isMyTrust ? createMyTrustBenefitTiers() : plan.benefits.map((benefit) => ({ ...benefit, maximumPlacement: benefit.noMaximum ? undefined : benefit.maximumPlacement }))
    };
  }) as TrustPlan[];
}

function createMyTrustMatrixTiers(): TrustPlan["returnConfig"]["matrixTiers"] {
  return [
    { id: "TP-MYTRUST-MATRIX-1", minimumPlacement: 10000, maximumPlacement: 99999.99, noMaximum: false, yearlyRates: { 1: 8, 2: 8 } },
    { id: "TP-MYTRUST-MATRIX-2", minimumPlacement: 100000, maximumPlacement: 249999.99, noMaximum: false, yearlyRates: { 1: 8, 2: 9 } },
    { id: "TP-MYTRUST-MATRIX-3", minimumPlacement: 250000, maximumPlacement: 499999.99, noMaximum: false, yearlyRates: { 1: 8, 2: 9.5 } },
    { id: "TP-MYTRUST-MATRIX-4", minimumPlacement: 500000, maximumPlacement: 999999.99, noMaximum: false, yearlyRates: { 1: 8, 2: 10 } },
    { id: "TP-MYTRUST-MATRIX-5", minimumPlacement: 1000000, noMaximum: true, yearlyRates: { 1: 9, 2: 11 } }
  ];
}

function createMyTrustCommissionTiers(planId: string): TrustPlan["commissionConfig"]["oneOff"]["tiers"] {
  return [
    { id: `${planId}-TR`, rank: "TR", commissionType: "PERSONAL", rate: 5 },
    { id: `${planId}-TM`, rank: "TM", commissionType: "OVERRIDING", rate: 0.3 },
    { id: `${planId}-TD`, rank: "TD", commissionType: "OVERRIDING", rate: 0.2 },
    { id: `${planId}-GTD`, rank: "GTD", commissionType: "OVERRIDING", rate: 0.1 },
    { id: `${planId}-CTD`, rank: "CTD", commissionType: "OVERRIDING", rate: 0.05 }
  ];
}

function createMyTrustBenefitTiers(): TrustPlan["benefits"] {
  return [
    { id: "TP-MYTRUST-BENEFIT-1", minimumPlacement: 100000, maximumPlacement: 249999.99, noMaximum: false, benefitName: "Free Insurance Trust", benefitValue: 1800, fulfilmentMethod: "Manual" },
    { id: "TP-MYTRUST-BENEFIT-2", minimumPlacement: 250000, maximumPlacement: 499999.99, noMaximum: false, benefitName: "Free Hybrid Trust", benefitValue: 4800, fulfilmentMethod: "Manual" },
    { id: "TP-MYTRUST-BENEFIT-3", minimumPlacement: 500000, maximumPlacement: 999999.99, noMaximum: false, benefitName: "Free Private Trust", benefitValue: 30000, fulfilmentMethod: "Manual" },
    { id: "TP-MYTRUST-BENEFIT-4", minimumPlacement: 1000000, noMaximum: true, benefitName: "Free Private Trust + Premium Will", benefitValue: 35000, fulfilmentMethod: "Manual" }
  ];
}

function formatCurrency(value?: number) {
  return `RM ${Number(value ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const enabledReturnMethodOptions = ["Investment + Period Tier Rate"];
const returnMethodOptions = enabledReturnMethodOptions;
const enabledCommissionMethodOptions = ["One-Off Commission"];
const commissionMethodOptions = enabledCommissionMethodOptions;

function toReferenceCode(value: string) {
  return value.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}

function normalizeCommissionType(value: string): TrustPlan["commissionConfig"]["oneOff"]["tiers"][number]["commissionType"] {
  return toReferenceCode(value) === "OVERRIDING" ? "OVERRIDING" : "PERSONAL";
}

function normalizeCommissionTiers(tiers: TrustPlan["commissionConfig"]["oneOff"]["tiers"] = []) {
  return tiers.map((tier) => ({ ...tier, commissionType: normalizeCommissionType(tier.commissionType) }));
}
