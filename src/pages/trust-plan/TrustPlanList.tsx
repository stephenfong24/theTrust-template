import { BadgeCheck, BriefcaseBusiness, CalendarDays, Edit, Eye, FileText, Landmark, Plus, RotateCcw, Search } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { lookupApi } from "../../api/lookupApi";
import { trustPlanApi, normalizeTrustPlanStatus, type TrustProductListItem } from "../../api/trustPlanApi";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/common/Pagination";
import { StatusBadge } from "../../components/common/StatusBadge";
import { TableActionMenu } from "../../components/common/TableActionMenu";
import { Button } from "../../components/ui/button";
import { notifyError } from "../../services/notificationService";
import type { TrustPlan } from "../../types/trustPlan";
import { mapTrustProductDetailsToPlan } from "../../utils/trustPlanDetailsMapper";
import { createStaticFeeRules } from "../../utils/trustPlanPayload";

const allFilter = "all";
const statusOptions = ["Draft", "Active", "Inactive"];

type SelectOption = { value: string; label: string };

interface TrustPlanFilters {
  query: string;
  productCategory: string;
  status: string;
}

export function TrustPlanList() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<TrustProductListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewPlan, setViewPlan] = useState<TrustPlan | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [draftFilters, setDraftFilters] = useState<TrustPlanFilters>(createEmptyFilters());
  const [filters, setFilters] = useState<TrustPlanFilters>(createEmptyFilters());

  useEffect(() => {
    let active = true;

    lookupApi
      .getTrustCategoriesList()
      .then((categories) => {
        if (!active) return;
        setCategoryOptions(
          categories
            .map((category) => ({
              value: category.CategoryID?.trim(),
              label: category.CategoryName?.trim() || category.CategoryID?.trim()
            }))
            .filter((category): category is SelectOption => Boolean(category.value && category.label))
        );
      })
      .catch((error) => {
        if (active) notifyError(getErrorMessage(error, "Unable to load trust categories."), "trust-plan-categories-error");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);

    trustPlanApi
      .getTrustProductList({
        Search: filters.query,
        ProductCategory: filters.productCategory === allFilter ? undefined : filters.productCategory,
        Status: filters.status === allFilter ? undefined : toReferenceCode(filters.status),
        Page: page,
        PageSize: pageSize
      })
      .then((data) => {
        if (!active) return;
        setRecords(data.Records ?? []);
        setTotalRecords(data.TotalRecords ?? 0);
        setPageCount(Math.max(1, data.TotalPages ?? 1));
      })
      .catch((error) => {
        if (!active) return;
        setRecords([]);
        setTotalRecords(0);
        setPageCount(1);
        setFailed(true);
        notifyError(getErrorMessage(error, "Unable to load trust product list."), "trust-plan-list-error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, page, pageSize]);

  useEffect(() => {
    if (!openActionId) return undefined;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-action-menu-root]")) return;
      setOpenActionId(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [openActionId]);

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

  const openViewDrawer = async (productCode: string) => {
    setOpenActionId(null);
    setViewOpen(true);
    setViewLoading(true);
    setViewPlan(null);

    try {
      const details = await trustPlanApi.getTrustProductDetails(productCode);
      setViewPlan(mapTrustProductDetailsToPlan(details));
    } catch (error) {
      notifyError(getErrorMessage(error, "Unable to load trust product details."), "trust-plan-view-error");
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
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
          <form onSubmit={submitFilters} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,520px)_220px_180px_auto]">
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
            <FilterSelect label="Product Category" value={draftFilters.productCategory} onChange={(value) => setDraftFilters((current) => ({ ...current, productCategory: value }))} options={categoryOptions} />
            <FilterSelect label="Status" value={draftFilters.status} onChange={(value) => setDraftFilters((current) => ({ ...current, status: value }))} options={statusOptions} />
            <div className="flex flex-col gap-3 self-end sm:flex-row md:col-span-2 xl:col-span-1">
              <Button type="button" variant="outline" onClick={resetFilters} className="w-full sm:flex-1 xl:w-auto xl:flex-none">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button type="submit" className="w-full sm:flex-1 xl:w-auto xl:flex-none">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </form>
        </div>

        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-textSecondary">{loading ? "Loading trust plans..." : `${totalRecords} trust plans`}</div>
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
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                {["Product Name", "Product Category", "Minimum Placement", "Tenure", "Return Method", "Payout Frequency", "Commission Method", "Status", "Action"].map((header) => (
                  <th key={header} className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="border-b border-line px-4 py-10 text-center text-sm text-textSecondary">
                    {failed ? "Unable to load trust product list." : "No trust plans found."}
                  </td>
                </tr>
              ) : null}
              {records.map((record) => {
                return (
                  <tr key={record.ProductCode} className="transition hover:bg-gray-50">
                    <td className="min-w-44 border-b border-line px-4 py-3 text-textPrimary">
                      <div className="font-semibold">{record.ProductName || "-"}</div>
                    </td>
                    <td className="border-b border-line px-4 py-3 text-textSecondary">{record.ProductCategoryName || record.ProductCategory || "-"}</td>
                    <td className="border-b border-line px-4 py-3 text-textSecondary">{formatCurrency(record.MinimumPlacement)}</td>
                    <td className="border-b border-line px-4 py-3 text-textSecondary">
                      {record.FundManagementPeriod || "-"} {formatReferenceLabel(record.FundManagementPeriodUnit)}
                    </td>
                    <td className="min-w-52 border-b border-line px-4 py-3 text-textSecondary">{formatReferenceLabel(record.ReturnMethod) || "-"}</td>
                    <td className="border-b border-line px-4 py-3 text-textSecondary">{formatReferenceLabel(record.PayoutFrequency) || "-"}</td>
                    <td className="min-w-52 border-b border-line px-4 py-3 text-textSecondary">{formatReferenceLabel(record.CommissionMethod) || "-"}</td>
                    <td className="min-w-24 border-b border-line px-4 py-3">
                      <StatusBadge status={normalizeTrustPlanStatus(record.ProductStatus)} />
                    </td>
                    <td className="border-b border-line px-4 py-3">
                      <TableActionMenu open={openActionId === record.ProductCode} onOpenChange={(open) => setOpenActionId(open ? record.ProductCode : null)} ariaLabel={`Actions for ${record.ProductName}`}>
                        <ActionButton onClick={() => openViewDrawer(record.ProductCode)} icon={<Eye className="h-4 w-4" />} label="View" />
                        <ActionLink to={`/trust-plan/edit/${encodeURIComponent(record.ProductCode)}`} icon={<Edit className="h-4 w-4" />} label="Edit" />
                      </TableActionMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} pageCount={pageCount} totalRecords={totalRecords} pageSize={pageSize} itemLabel="plans" onPageChange={setPage} />
      </section>

      <TrustPlanViewDrawer open={viewOpen} loading={viewLoading} plan={viewPlan} onClose={() => setViewOpen(false)} />
    </>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<string | SelectOption>; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-textPrimary">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        <option value={allFilter}>All</option>
        {options.map((option) => {
          const normalizedOption = typeof option === "string" ? { value: option, label: option } : option;
          return (
          <option key={normalizedOption.value} value={normalizedOption.value}>
            {normalizedOption.label}
          </option>
          );
        })}
      </select>
    </label>
  );
}

function ActionLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link to={to} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-textPrimary hover:bg-gray-50">
      {icon}
      {label}
    </Link>
  );
}

function ActionButton({ onClick, icon, label }: { onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-textPrimary hover:bg-gray-50">
      {icon}
      {label}
    </button>
  );
}

function TrustPlanViewDrawer({ open, loading, plan, onClose }: { open: boolean; loading: boolean; plan: TrustPlan | null; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/35" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close trust plan details" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-[0_20px_80px_rgba(17,17,17,0.28)]">
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-textPrimary">Trust Plan Details</h2>
              <p className="mt-1 text-sm text-textSecondary">{plan?.basicInfo.productName || "Loading product information..."}</p>
            </div>
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? <div className="rounded-lg border border-line bg-soft p-4 text-sm text-textSecondary">Loading trust product details...</div> : null}
          {!loading && plan ? <TrustPlanViewContent plan={plan} /> : null}
        </div>
      </aside>
    </div>
  );
}

function TrustPlanViewContent({ plan }: { plan: TrustPlan }) {
  const yearCount = getYearCount(plan);

  return (
    <div className="space-y-4">
      <TrustPlanDetailSection title="Step 1 - Basic Information" icon={FileText}>
        <TrustPlanCompactGrid>
          <TrustPlanDetailField label="Product Category" value={plan.basicInfo.productCategory} />
          <TrustPlanDetailField label="Product Name" value={plan.basicInfo.productName} />
          <TrustPlanDetailField label="Product Status" value={plan.basicInfo.productStatus} />
          <TrustPlanDetailField label="Minimum Placement" value={formatCurrency(plan.basicInfo.minimumPlacement)} />
          <TrustPlanDetailField label="Maximum Placement" value={formatMaximum(plan.basicInfo.noMaximum, plan.basicInfo.maximumPlacement)} />
          <TrustPlanDetailField label="Fund Management Period" value={formatUnitValue(plan.basicInfo.fundManagementPeriod, plan.basicInfo.fundManagementPeriodUnit)} />
          <TrustPlanDetailField label="Eligible Execution Ranks" value={formatRankList(plan.basicInfo.executionRanks)} wide />
          <TrustPlanDetailField label="Product Description" value={plan.basicInfo.productDescription || "-"} wide />
        </TrustPlanCompactGrid>
      </TrustPlanDetailSection>

      <TrustPlanDetailSection title="Step 2 - Payment & Fees" icon={Landmark}>
        <TrustPlanCompactGrid>
          <TrustPlanDetailField label="Payment Frequency" value={plan.paymentConfig.paymentFrequency || "-"} />
          <TrustPlanDetailField label="Payment Term" value={plan.paymentConfig.paymentFrequency && plan.paymentConfig.paymentFrequency !== "One-Off" ? formatUnitValue(plan.paymentConfig.paymentTerm, plan.paymentConfig.paymentTermUnit) : "Not applicable"} />
        </TrustPlanCompactGrid>
        <TrustPlanDetailTable headers={["Fee Type", "Rate Type", "Value", "Charge Timing"]} rows={createStaticFeeRules(plan.fees).map((fee) => [fee.feeType, fee.rateType, formatFeeValue(fee), fee.chargeTiming])} empty="No fee rules configured." />
      </TrustPlanDetailSection>

      <TrustPlanDetailSection title="Step 3 - Tenure & Withdrawal" icon={CalendarDays}>
        <TrustPlanCompactGrid>
          <TrustPlanDetailField label="Fund Management Period" value={formatUnitValue(plan.basicInfo.fundManagementPeriod, plan.basicInfo.fundManagementPeriodUnit)} />
          <TrustPlanDetailField label="Lock-In Period" value={formatUnitValue(plan.tenureConfig.lockInPeriod, plan.tenureConfig.lockInPeriodUnit)} />
          <TrustPlanDetailField label="Allow Early Withdrawal" value={formatBoolean(plan.tenureConfig.allowEarlyWithdrawal)} />
          <TrustPlanDetailField label="Early Withdrawal Fee Type" value={plan.tenureConfig.allowEarlyWithdrawal ? plan.tenureConfig.earlyWithdrawalFeeType : "Not applicable"} />
          <TrustPlanDetailField label="Early Withdrawal Fee Value" value={plan.tenureConfig.allowEarlyWithdrawal ? formatFeeValue({ rateType: plan.tenureConfig.earlyWithdrawalFeeType, value: plan.tenureConfig.earlyWithdrawalFeeValue }) : "Not applicable"} />
        </TrustPlanCompactGrid>
      </TrustPlanDetailSection>

      <TrustPlanDetailSection title="Step 4 - Dividend / Return" icon={CalendarDays}>
        <TrustPlanCompactGrid>
          <TrustPlanDetailField label="Return Method" value={plan.returnConfig.method || "-"} wide />
        </TrustPlanCompactGrid>
        <TrustPlanReturnDetails plan={plan} yearCount={yearCount} />
      </TrustPlanDetailSection>

      <TrustPlanDetailSection title="Step 5 - Dividend Payout" icon={Landmark}>
        <TrustPlanCompactGrid>
          <TrustPlanDetailField label="Payout Frequency" value={plan.payoutConfig.payoutFrequency || "-"} />
          <TrustPlanDetailField label="Payout Calculation Start" value={plan.payoutConfig.calculationStart || "-"} />
          <TrustPlanDetailField label="Allow Dividend Redeposit" value={formatBoolean(plan.payoutConfig.allowDividendRedeposit)} />
        </TrustPlanCompactGrid>
      </TrustPlanDetailSection>

      <TrustPlanDetailSection title="Step 6 - Bonus Configuration" icon={BadgeCheck}>
        <TrustPlanCompactGrid>
          <TrustPlanDetailField label="Has Bonus Return" value={formatBoolean(plan.hasBonusReturn)} />
        </TrustPlanCompactGrid>
        {plan.hasBonusReturn ? (
          <TrustPlanDetailTable headers={["Bonus Name", "Trigger Type", "Trigger Period", "Bonus Rate Type", "Bonus Value", "Calculation Basis", "Payout Timing"]} rows={plan.bonusRules.map((rule) => [rule.bonusName, rule.triggerType, formatNumber(rule.triggerPeriod), rule.bonusRateType, formatFeeValue({ rateType: rule.bonusRateType, value: rule.bonusValue }), rule.calculationBasis, rule.payoutTiming])} empty="No bonus rules added." />
        ) : null}
      </TrustPlanDetailSection>

      <TrustPlanDetailSection title="Step 7 - Commission Configuration" icon={BriefcaseBusiness}>
        <TrustPlanCompactGrid>
          <TrustPlanDetailField label="Commission Enabled" value={formatBoolean(plan.commissionConfig.enabled)} />
          <TrustPlanDetailField label="Commission Method" value={plan.commissionConfig.enabled ? plan.commissionConfig.method || "-" : "Not applicable"} />
        </TrustPlanCompactGrid>
        {plan.commissionConfig.enabled ? <TrustPlanCommissionDetails plan={plan} /> : null}
      </TrustPlanDetailSection>

      <TrustPlanDetailSection title="Step 8 - Commission Rules" icon={FileText}>
        <TrustPlanCompactGrid>
          <TrustPlanDetailField label="Commission Calculation Basis" value={plan.commissionRules.calculationBasis || "-"} />
          <TrustPlanDetailField label="Rank Determination" value={plan.commissionRules.rankDetermination || "-"} />
        </TrustPlanCompactGrid>
      </TrustPlanDetailSection>

      <TrustPlanDetailSection title="Step 9 - Complimentary Benefits" icon={BadgeCheck}>
        <TrustPlanCompactGrid>
          <TrustPlanDetailField label="Has Complimentary Benefits" value={formatBoolean(plan.hasComplimentaryBenefits)} />
        </TrustPlanCompactGrid>
        {plan.hasComplimentaryBenefits ? (
          <TrustPlanDetailTable headers={["Minimum Placement", "Maximum Placement", "Benefit Name", "Benefit Value", "Fulfilment Method"]} rows={plan.benefits.map((benefit) => [formatCurrency(benefit.minimumPlacement), formatMaximum(benefit.noMaximum, benefit.maximumPlacement), benefit.benefitName, formatCurrency(benefit.benefitValue), benefit.fulfilmentMethod])} empty="No benefit tiers added." />
        ) : null}
      </TrustPlanDetailSection>
    </div>
  );
}

function TrustPlanReturnDetails({ plan, yearCount }: { plan: TrustPlan; yearCount: number }) {
  const method = plan.returnConfig.method;
  if (method === "Fixed Rate") {
    return (
      <TrustPlanCompactGrid>
        <TrustPlanDetailField label="Annual Return Rate" value={formatPercent(plan.returnConfig.fixedRate.annualRate)} />
        <TrustPlanDetailField label="Calculation Basis" value={plan.returnConfig.fixedRate.calculationBasis || "-"} />
      </TrustPlanCompactGrid>
    );
  }
  if (method === "Investment Tier Rate") {
    return <TrustPlanDetailTable headers={["Minimum Amount", "Maximum Amount", "Annual Return Rate"]} rows={plan.returnConfig.investmentTiers.map((tier) => [formatCurrency(tier.minimumAmount), formatMaximum(tier.noMaximum, tier.maximumAmount), formatPercent(tier.annualRate)])} empty="No investment tiers added." />;
  }
  if (method === "Period / Year Tiered Rate") {
    return <TrustPlanDetailTable headers={["From Year / Period", "To Year / Period", "Return Rate"]} rows={plan.returnConfig.periodRates.map((rate) => [formatNumber(rate.fromPeriod), formatNumber(rate.toPeriod), formatPercent(rate.returnRate)])} empty="No period rates added." />;
  }
  if (method === "Investment + Period Tier Rate") {
    const years = Array.from({ length: yearCount }, (_, index) => index + 1);
    return <TrustPlanDetailTable headers={["Minimum Placement", "Maximum Placement", ...years.map((year) => `Year ${year}`)]} rows={plan.returnConfig.matrixTiers.map((tier) => [formatCurrency(tier.minimumPlacement), formatMaximum(tier.noMaximum, tier.maximumPlacement), ...years.map((year) => formatPercent(tier.yearlyRates[year]))])} empty="No matrix tiers added." />;
  }
  if (method === "Fixed Rate + Bonus") {
    return (
      <TrustPlanCompactGrid>
        <TrustPlanDetailField label="Base Annual Return Rate" value={formatPercent(plan.returnConfig.fixedBonus.baseAnnualRate)} />
      </TrustPlanCompactGrid>
    );
  }
  if (method === "Redeposit / Accumulated Return") {
    return (
      <TrustPlanCompactGrid>
        <TrustPlanDetailField label="Base Annual Return Rate" value={formatPercent(plan.returnConfig.redeposit.baseAnnualRate)} />
        <TrustPlanDetailField label="Redeposit Calculation Basis" value={plan.returnConfig.redeposit.calculationBasis || "-"} />
        <TrustPlanDetailField label="Generates Additional Return" value={formatBoolean(plan.returnConfig.redeposit.generatesAdditionalReturn)} />
        <TrustPlanDetailField label="Additional Return Rate" value={plan.returnConfig.redeposit.generatesAdditionalReturn ? formatPercent(plan.returnConfig.redeposit.additionalReturnRate) : "Not applicable"} />
        <TrustPlanDetailField label="Additional Return Period" value={plan.returnConfig.redeposit.generatesAdditionalReturn ? formatNumber(plan.returnConfig.redeposit.additionalReturnPeriod) : "Not applicable"} />
      </TrustPlanCompactGrid>
    );
  }
  return <div className="rounded-lg border border-dashed border-line bg-soft p-3 text-sm text-textSecondary">No return method selected.</div>;
}

function TrustPlanCommissionDetails({ plan }: { plan: TrustPlan }) {
  const method = plan.commissionConfig.method;
  if (method === "One-Off Commission") {
    return (
      <>
        <TrustPlanCompactGrid>
          <TrustPlanDetailField label="Maximum Total Commission" value={formatPercent(sumRates(plan.commissionConfig.oneOff.tiers))} />
        </TrustPlanCompactGrid>
        <TrustPlanCommissionTable rows={plan.commissionConfig.oneOff.tiers} />
      </>
    );
  }
  if (method === "Monthly Recurring Commission") {
    return (
      <>
        <TrustPlanCompactGrid>
          <TrustPlanDetailField label="Commission Start Month" value={formatNumber(plan.commissionConfig.monthly.startMonth)} />
          <TrustPlanDetailField label="Commission End Month" value={formatNumber(plan.commissionConfig.monthly.endMonth)} />
          <TrustPlanDetailField label="Total Monthly Commission" value={formatPercent(sumRates(plan.commissionConfig.monthly.tiers))} />
        </TrustPlanCompactGrid>
        <TrustPlanCommissionTable rows={plan.commissionConfig.monthly.tiers} />
      </>
    );
  }
  if (method === "Yearly Commission") {
    return (
      <div className="space-y-3">
        {plan.commissionConfig.yearly.years.length === 0 ? <div className="rounded-lg border border-dashed border-line bg-soft p-3 text-sm text-textSecondary">No yearly commission rows added.</div> : null}
        {plan.commissionConfig.yearly.years.map((year, index) => (
          <div key={year.id} className="space-y-2">
            <h4 className="text-sm font-semibold text-textPrimary">Year {formatNumber(year.year) || index + 1}</h4>
            <TrustPlanCommissionTable rows={year.tiers} />
          </div>
        ))}
      </div>
    );
  }
  if (method === "Multi-Year Tiered Commission") {
    return (
      <div className="space-y-3">
        {plan.commissionConfig.multiYear.plans.length === 0 ? <div className="rounded-lg border border-dashed border-line bg-soft p-3 text-sm text-textSecondary">No commission plans added.</div> : null}
        {plan.commissionConfig.multiYear.plans.map((commissionPlan) => (
          <div key={commissionPlan.id} className="space-y-2">
            <h4 className="text-sm font-semibold text-textPrimary">{commissionPlan.label || "Commission Plan"}</h4>
            {commissionPlan.years.map((year, index) => (
              <div key={year.id} className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Year {formatNumber(year.year) || index + 1}</div>
                <TrustPlanCommissionTable rows={year.tiers} />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (method === "Hybrid Commission") {
    return (
      <div className="space-y-3">
        {plan.commissionConfig.hybrid.phases.length === 0 ? <div className="rounded-lg border border-dashed border-line bg-soft p-3 text-sm text-textSecondary">No commission phases added.</div> : null}
        {plan.commissionConfig.hybrid.phases.map((phase, index) => (
          <div key={phase.id} className="space-y-2">
            <TrustPlanCompactGrid>
              <TrustPlanDetailField label={`Phase ${index + 1} From Year`} value={formatNumber(phase.fromYear)} />
              <TrustPlanDetailField label={`Phase ${index + 1} To Year`} value={formatNumber(phase.toYear)} />
              <TrustPlanDetailField label={`Phase ${index + 1} Commission Method`} value={phase.commissionMethod || "-"} />
            </TrustPlanCompactGrid>
            <TrustPlanCommissionTable rows={phase.tiers} rateHeader={getHybridRateLabel(phase.commissionMethod)} />
          </div>
        ))}
      </div>
    );
  }
  return <div className="rounded-lg border border-dashed border-line bg-soft p-3 text-sm text-textSecondary">No commission method selected.</div>;
}

function TrustPlanCommissionTable({ rows, rateHeader = "Rate" }: { rows: TrustPlan["commissionConfig"]["oneOff"]["tiers"]; rateHeader?: string }) {
  return <TrustPlanDetailTable headers={["Rank", "Commission Type", rateHeader]} rows={rows.map((tier) => [getRankLabel(tier.rank), tier.commissionType, formatPercent(tier.rate)])} empty="No commission tiers added." />;
}

function TrustPlanDetailSection({ title, icon: Icon, children }: { title: string; icon: typeof BriefcaseBusiness; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="mb-4 flex items-center gap-2 border-b border-line pb-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-soft text-brandGold">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-textPrimary">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function TrustPlanCompactGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function TrustPlanDetailField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2 xl:col-span-3" : undefined}>
      <div className="text-xs font-medium text-textSecondary">{label}</div>
      <div className="mt-1 whitespace-pre-line break-words text-sm font-semibold text-textPrimary">{value || "-"}</div>
    </div>
  );
}

function TrustPlanDetailTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  if (rows.length === 0) return <div className="mt-4 rounded-lg border border-dashed border-line bg-soft p-3 text-sm text-textSecondary">{empty}</div>;

  return (
    <div className="mt-4 max-w-full overflow-x-auto rounded-lg border border-line">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
          <tr>{headers.map((header) => <th key={header} className="whitespace-nowrap border-b border-line px-3 py-2 font-semibold">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap border-b border-line px-3 py-2 text-textPrimary">{cell || "-"}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function createEmptyFilters(): TrustPlanFilters {
  return { query: "", productCategory: allFilter, status: allFilter };
}

function formatCurrency(value?: number) {
  return `RM ${Number(value ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMaximum(noMaximum: boolean, value?: number) {
  return noMaximum ? "No Maximum" : formatCurrency(value);
}

function formatUnitValue(value: number | undefined, unit: string) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "-";
  return `${value} ${unit}`;
}

function formatNumber(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "-";
  return String(value);
}

function formatPercent(value?: number) {
  return `${Number(value ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatBoolean(value: boolean) {
  return value ? "Yes" : "No";
}

function formatFeeValue(fee: { rateType?: string; value?: number }) {
  return fee.rateType === "Fixed Amount" ? formatCurrency(fee.value) : formatPercent(fee.value);
}

function formatRankList(ranks: string[]) {
  return ranks.map(getRankLabel).join(", ") || "-";
}

function getYearCount(plan: TrustPlan) {
  const period = plan.basicInfo.fundManagementPeriod ?? 0;
  const years = plan.basicInfo.fundManagementPeriodUnit === "Years" ? period : Math.ceil(period / 12);
  return Math.max(1, Math.min(30, years || 1));
}

function sumRates(tiers: TrustPlan["commissionConfig"]["oneOff"]["tiers"]) {
  return tiers.reduce((sum, tier) => sum + Number(tier.rate || 0), 0);
}

function getHybridRateLabel(method: string) {
  if (method === "Monthly Recurring Commission") return "Rate (% / Month)";
  if (method === "Yearly Commission") return "Rate (% / Year)";
  return "Rate (%)";
}

function getRankLabel(value: string) {
  const rankLabels: Record<string, string> = {
    STR: "Saving Trust Representative",
    TR: "Trust Representative",
    TM: "Trust Manager",
    TD: "Trust Director",
    GTD: "Group Trust Director",
    CTD: "Chief Trust Director"
  };
  return rankLabels[value] ?? value;
}

function formatReferenceLabel(value: string | undefined) {
  if (!value) return "";
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function toReferenceCode(value: string) {
  return value.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
