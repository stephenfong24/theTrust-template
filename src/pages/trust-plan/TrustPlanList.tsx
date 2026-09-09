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
  return normalizeReferencePayload({
    generatedAt: new Date().toISOString(),
    trustPlanId: plan.id,
    steps: {
      step1BasicInformation: {
        productCode: plan.basicInfo.productCode,
        productName: plan.basicInfo.productName,
        productCategory: plan.basicInfo.productCategory,
        productDescription: plan.basicInfo.productDescription,
        minimumPlacement: plan.basicInfo.minimumPlacement,
        maximumPlacement: plan.basicInfo.maximumPlacement,
        noMaximum: plan.basicInfo.noMaximum,
        fundManagementPeriod: plan.basicInfo.fundManagementPeriod,
        fundManagementPeriodUnit: plan.basicInfo.fundManagementPeriodUnit,
        effectiveDate: plan.basicInfo.effectiveDate,
        endDate: plan.basicInfo.endDate,
        noEndDate: plan.basicInfo.noEndDate,
        productStatus: plan.basicInfo.productStatus,
        allowNewSubscription: plan.basicInfo.allowNewSubscription,
        executionRanks: plan.basicInfo.executionRanks
      },
      step2PaymentAndFees: {
        paymentConfig: createPaymentPayload(plan),
        fees: plan.fees
      },
      step3TenureAndWithdrawal: createTenurePayload(plan),
      step4DividendReturn: createReturnPayload(plan),
      step5DividendPayout: {
        payoutFrequency: plan.payoutConfig.payoutFrequency,
        calculationStart: plan.payoutConfig.calculationStart,
        allowDividendRedeposit: plan.payoutConfig.allowDividendRedeposit
      },
      step6BonusConfiguration: createBonusPayload(plan),
      step7CommissionConfiguration: createCommissionPayload(plan),
      step8CommissionRules: {
        calculationBasis: plan.commissionRules.calculationBasis,
        rankDetermination: plan.commissionRules.rankDetermination
      },
      step9ComplimentaryBenefits: createBenefitsPayload(plan)
    }
  });
}

function createPaymentPayload(plan: TrustPlan) {
  return {
    paymentFrequency: plan.paymentConfig.paymentFrequency,
    ...(plan.paymentConfig.paymentFrequency && plan.paymentConfig.paymentFrequency !== "One-Off"
      ? {
          paymentTerm: plan.paymentConfig.paymentTerm,
          paymentTermUnit: plan.paymentConfig.paymentTermUnit
        }
      : {})
  };
}

function createTenurePayload(plan: TrustPlan) {
  return {
    lockInPeriod: plan.tenureConfig.lockInPeriod,
    lockInPeriodUnit: plan.tenureConfig.lockInPeriodUnit,
    allowEarlyWithdrawal: plan.tenureConfig.allowEarlyWithdrawal,
    ...(plan.tenureConfig.allowEarlyWithdrawal
      ? {
          earlyWithdrawalFeeType: plan.tenureConfig.earlyWithdrawalFeeType,
          earlyWithdrawalFeeValue: plan.tenureConfig.earlyWithdrawalFeeValue
        }
      : {}),
    allowRedeposit: plan.tenureConfig.allowRedeposit
  };
}

function createReturnPayload(plan: TrustPlan) {
  const method = plan.returnConfig.method;
  return {
    method,
    ...(method === "Fixed Rate" ? { fixedRate: plan.returnConfig.fixedRate } : {}),
    ...(method === "Investment Tier Rate" ? { investmentTiers: plan.returnConfig.investmentTiers } : {}),
    ...(method === "Period / Year Tiered Rate" ? { periodRates: plan.returnConfig.periodRates } : {}),
    ...(method === "Investment + Period Tier Rate" ? { matrixTiers: plan.returnConfig.matrixTiers } : {}),
    ...(method === "Fixed Rate + Bonus" ? { fixedBonus: plan.returnConfig.fixedBonus } : {}),
    ...(method === "Redeposit / Accumulated Return" ? { redeposit: plan.returnConfig.redeposit } : {})
  };
}

function createBonusPayload(plan: TrustPlan) {
  return {
    hasBonusReturn: plan.hasBonusReturn,
    ...(plan.hasBonusReturn ? { bonusRules: plan.bonusRules } : {})
  };
}

function createCommissionPayload(plan: TrustPlan) {
  return {
    enabled: plan.commissionConfig.enabled,
    ...(plan.commissionConfig.enabled
      ? {
          method: plan.commissionConfig.method,
          ...(plan.commissionConfig.method === "One-Off Commission" ? { oneOff: plan.commissionConfig.oneOff } : {}),
          ...(plan.commissionConfig.method === "Monthly Recurring Commission" ? { monthly: plan.commissionConfig.monthly } : {}),
          ...(plan.commissionConfig.method === "Yearly Commission" ? { yearly: plan.commissionConfig.yearly } : {}),
          ...(plan.commissionConfig.method === "Multi-Year Tiered Commission" ? { multiYear: plan.commissionConfig.multiYear } : {}),
          ...(plan.commissionConfig.method === "Hybrid Commission" ? { hybrid: plan.commissionConfig.hybrid } : {})
        }
      : {})
  };
}

function createBenefitsPayload(plan: TrustPlan) {
  return {
    hasComplimentaryBenefits: plan.hasComplimentaryBenefits,
    ...(plan.hasComplimentaryBenefits ? { benefits: plan.benefits } : {})
  };
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
      oneOff: { tiers: normalizeCommissionTiers(plan.commissionConfig.oneOff.tiers) },
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

const referencePayloadKeys = new Set([
  "productCategory",
  "fundManagementPeriodUnit",
  "productStatus",
  "paymentFrequency",
  "paymentTermUnit",
  "feeType",
  "rateType",
  "chargeTiming",
  "lockInPeriodUnit",
  "earlyWithdrawalFeeType",
  "method",
  "calculationBasis",
  "payoutFrequency",
  "calculationStart",
  "triggerType",
  "bonusRateType",
  "payoutTiming",
  "commissionType",
  "commissionMethod",
  "rankDetermination",
  "fulfilmentMethod"
]);

function toReferenceCode(value: string) {
  return value.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}

function normalizeCommissionType(value: string): TrustPlan["commissionConfig"]["oneOff"]["tiers"][number]["commissionType"] {
  return toReferenceCode(value) === "OVERRIDING" ? "OVERRIDING" : "PERSONAL";
}

function normalizeCommissionTiers(tiers: TrustPlan["commissionConfig"]["oneOff"]["tiers"] = []) {
  return tiers.map((tier) => ({ ...tier, commissionType: normalizeCommissionType(tier.commissionType) }));
}

function normalizeReferencePayload<T>(value: T, key = ""): T {
  if (Array.isArray(value)) return value.map((item) => normalizeReferencePayload(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, normalizeReferencePayload(entryValue, entryKey)])) as T;
  }
  if (typeof value === "string" && referencePayloadKeys.has(key)) return toReferenceCode(value) as T;
  return value;
}
