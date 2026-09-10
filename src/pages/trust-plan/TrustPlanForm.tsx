import { AlertCircle, ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleHelp, Info, Plus, Save, Trash2, Zap } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/ui/button";
import { createEmptyTrustPlan } from "../../data/trustPlanMockData";
import { notifySuccess } from "../../services/notificationService";
import type {
  BenefitTier,
  BonusRule,
  CommissionMethod,
  CommissionPhase,
  CommissionPlan,
  CommissionTier,
  FeeRule,
  InvestmentTier,
  MatrixTier,
  PeriodRate,
  ReturnMethod,
  TrustPlan,
  TrustExecutionRank,
  YearlyCommission
} from "../../types/trustPlan";
import { buildTrustPlanPayload, createStaticFeeRules, getNullableMaximum } from "../../utils/trustPlanPayload";
import { loadTrustPlans, saveTrustPlans } from "./TrustPlanList";

const steps = [
  "Basic Information",
  "Payment & Fees",
  "Tenure & Withdrawal",
  "Dividend / Return",
  "Dividend Payout",
  "Bonus Configuration",
  "Commission Configuration",
  "Commission Rules",
  "Complimentary Benefits",
  "Review"
] as const;

type StepName = (typeof steps)[number];
type DeleteTarget = { title: string; onConfirm: () => void } | null;
const defaultReturnMethod: ReturnMethod = "Investment + Period Tier Rate";
const enabledReturnMethods: ReturnMethod[] = ["Investment + Period Tier Rate"];
const defaultCommissionMethod: CommissionMethod = "One-Off Commission";
const enabledCommissionMethods: CommissionMethod[] = ["One-Off Commission"];

const fieldHelpText: Record<string, string> = {
  "Product Name": "Customer-facing product name shown in trust plan selection, approvals, account records and reports.",
  "Product Category": "Groups the plan under a trust category so products can be filtered and managed consistently.",
  "Minimum Placement": "Lowest placement amount a client must invest before this trust plan can be selected.",
  "Maximum Placement": "Highest placement amount allowed for this plan unless No Maximum is enabled.",
  "Fund Management Period": "Total period the funds are managed; it drives tenure checks, maturity and generated year-based return columns.",
  "Product Status": "Controls whether the plan is still a draft, available for use, or inactive.",
  "Eligible Execution Ranks": "Select which trust ranks are allowed to execute this trust plan.",
  "Product Description": "Internal description of the product terms for operations, review and reference.",
  "Payment Frequency": "How often the client is expected to make payments for this plan.",
  "Payment Term": "How long payments continue when they are collected over time.",
  "Lock-In Period": "Period before the client can withdraw without triggering early withdrawal restrictions.",
  "Allow Early Withdrawal": "Enables withdrawals before maturity and shows the fee settings used for those withdrawals.",
  "Early Withdrawal Fee Type": "Chooses whether early withdrawal fees are calculated as a percentage or a fixed amount.",
  "Early Withdrawal Fee Value": "Amount or percentage charged when a client withdraws before the allowed period.",
  "Annual Return Rate (% p.a.)": "Annual percentage return used for fixed-rate dividend calculations.",
  "Calculation Basis": "Determines the amount or day-count basis used when calculating returns.",
  "Base Annual Return Rate (%)": "Base annual return before bonus rules are applied.",
  "Base Annual Return Rate": "Base annual rate used for accumulated or redeposited return calculations.",
  "Redeposit Calculation Basis": "Determines which dividend amount is used when calculating redeposit returns.",
  "Does Redeposit Generate Additional Return?": "Controls whether redeposited dividends earn a separate additional return.",
  "Additional Return Rate": "Extra rate applied to eligible redeposited dividend amounts.",
  "Additional Return Period": "Length of time the additional redeposit return should apply.",
  "Payout Frequency": "How often dividends or returns are paid to the client.",
  "Payout Calculation Start": "Date basis used to start dividend calculation schedules.",
  "Allow Dividend Redeposit": "Permits dividends to be reinvested instead of paid out.",
  "Has Bonus Return": "Enables bonus return rules for milestone, tenure or other qualifying conditions.",
  "Commission Enabled": "Turns agent commission calculation on or off for this trust plan.",
  "Maximum Total Commission": "Read-only total of all configured one-off commission tier rates.",
  "Commission Start Month": "First month eligible for monthly recurring commission.",
  "Commission End Month": "Last month eligible for monthly recurring commission.",
  "Total Monthly Commission": "Read-only total of all configured monthly commission tier rates.",
  "Commission Calculation Basis": "Amount used to calculate commission, such as gross placement or net amount after fees.",
  "Rank Determination": "Point in the workflow where the agent rank is checked for commission eligibility.",
  "Has Complimentary Benefits": "Enables benefit tiers such as gifts, services or privileges tied to placement amounts.",
  "Plan Label": "Name for this commission plan tab in multi-year commission structures.",
  "Category": "Product category shown in the review summary.",
  "Fee Rules": "Number of fee rows configured for this plan.",
  "Configured Rules": "Number of return rule rows configured for the selected return method.",
  "Early Withdrawal": "Review indicator showing whether early withdrawal is enabled.",
  "Dividend Redeposit": "Review indicator showing whether dividend redeposit is enabled.",
  "Has Bonus": "Review indicator showing whether bonus returns are enabled.",
  "Rules": "Number of bonus rules configured for this plan.",
  "Enabled": "Review indicator showing whether commission is enabled.",
  "Method": "Selected commission or return method in the review summary.",
  "Basis": "Selected basis used in the review summary.",
  "Benefit Tiers": "Number of complimentary benefit tiers configured."
};

export function TrustPlanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<TrustPlan[]>(loadTrustPlans);
  const existing = id ? plans.find((plan) => plan.id === id) : undefined;
  const [plan, setPlan] = useState<TrustPlan>(() => normalizeFormPlan(existing ? structuredClone(existing) : createEmptyTrustPlan()));
  const [currentStep, setCurrentStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [activationPreviewOpen, setActivationPreviewOpen] = useState(false);
  const [activationErrors, setActivationErrors] = useState<ValidationItem[]>([]);

  const stepErrors = useMemo(() => getStepErrorMap(validateStepCompletion(plan)), [plan]);
  const isEdit = Boolean(id);

  const updatePlan = (updater: (current: TrustPlan) => TrustPlan) => {
    setPlan((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }));
    setDirty(true);
  };

  const persistPlan = (nextPlan: TrustPlan) => {
    const nextPlans = plans.some((item) => item.id === nextPlan.id) ? plans.map((item) => (item.id === nextPlan.id ? nextPlan : item)) : [nextPlan, ...plans];
    setPlans(nextPlans);
    saveTrustPlans(nextPlans);
    setDirty(false);
  };

  const saveDraft = () => {
    const draft = { ...plan, basicInfo: { ...plan.basicInfo, productStatus: "Draft" as const } };
    setPlan(draft);
    persistPlan(draft);
    notifySuccess("Trust plan draft saved successfully.", "trust-plan-draft");
  };

  const showPayload = () => {
    setActivationErrors([]);
    setActivationPreviewOpen(true);
  };

  const submitPlan = () => {
    const errors = validateForActivation(plan);
    if (errors.length > 0) {
      setActivationErrors(errors);
      setActivationPreviewOpen(false);
      return;
    }
    const active = { ...plan, basicInfo: { ...plan.basicInfo, productStatus: "Active" as const } };
    setPlan(active);
    persistPlan(active);
    notifySuccess("Trust plan activated successfully.", "trust-plan-activated");
    navigate("/trust-plan");
  };

  const leavePage = () => {
    if (dirty) {
      setLeaveOpen(true);
      return;
    }
    navigate("/trust-plan");
  };

  const yearCount = getYearCount(plan);

  return (
    <>
      <PageHeader
        title={isEdit ? "Edit Trust Plan" : "Add Trust Plan"}
        description="Configure the trust product, returns, payouts, commission rules, benefits and requirements."
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={plan.basicInfo.productStatus} />
            <Button type="button" variant="outline" onClick={leavePage}>
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </Button>
          </div>
        }
      />

      {activationErrors.length > 0 && !activationPreviewOpen ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <AlertCircle className="h-4 w-4" />
            Unable to activate Trust Plan.
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {activationErrors.map((error) => (
              <button
                key={error.key}
                type="button"
                onClick={() => {
                  setCurrentStep(error.step);
                  setActivationErrors([]);
                }}
                className="rounded-md border border-red-200 bg-white px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
              >
                {error.message}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-5 lg:self-start">
          <div className="overflow-x-auto rounded-lg border border-line bg-white p-3 shadow-soft lg:overflow-visible">
            <div className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
              {steps.map((step, index) => {
                const active = index === currentStep;
                const completed = index < currentStep && !stepErrors[index];
                const hasError = stepErrors[index];
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setCurrentStep(index)}
                    className={
                      active
                        ? "flex items-center gap-3 rounded-lg border border-ink bg-ink px-3 py-2.5 text-left text-sm font-semibold text-white"
                        : hasError
                          ? "flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-100"
                          : "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm font-semibold text-textPrimary hover:bg-gray-50"
                    }
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs">
                      {completed ? <Check className="h-4 w-4" /> : hasError ? <AlertCircle className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className="whitespace-nowrap lg:whitespace-normal">{step}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white shadow-soft">
          <div className="border-b border-line p-5">
            <div className="text-sm font-semibold uppercase tracking-wide text-textSecondary">Step {currentStep + 1} of {steps.length}</div>
            <h2 className="mt-1 text-xl font-semibold text-textPrimary">{steps[currentStep]}</h2>
          </div>
          <div className="min-w-0 p-5">
            {currentStep === 0 ? <BasicInformationStep plan={plan} updatePlan={updatePlan} /> : null}
            {currentStep === 1 ? <PaymentFeeStep plan={plan} updatePlan={updatePlan} /> : null}
            {currentStep === 2 ? <TenureWithdrawalStep plan={plan} updatePlan={updatePlan} /> : null}
            {currentStep === 3 ? <ReturnConfigurationStep plan={plan} updatePlan={updatePlan} setDeleteTarget={setDeleteTarget} yearCount={yearCount} /> : null}
            {currentStep === 4 ? <DividendPayoutStep plan={plan} updatePlan={updatePlan} /> : null}
            {currentStep === 5 ? <BonusConfigurationStep plan={plan} updatePlan={updatePlan} setDeleteTarget={setDeleteTarget} /> : null}
            {currentStep === 6 ? <CommissionConfigurationStep plan={plan} updatePlan={updatePlan} setDeleteTarget={setDeleteTarget} /> : null}
            {currentStep === 7 ? <CommissionRulesStep plan={plan} updatePlan={updatePlan} /> : null}
            {currentStep === 8 ? <BenefitsStep plan={plan} updatePlan={updatePlan} setDeleteTarget={setDeleteTarget} /> : null}
            {currentStep === 9 ? <ReviewStep plan={plan} setCurrentStep={setCurrentStep} /> : null}
          </div>
          <div className="flex flex-col gap-3 border-t border-line p-5 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" disabled={currentStep === 0} onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={saveDraft}>
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
              {currentStep === steps.length - 1 ? (
                <>
                  <Button type="button" variant="outline" onClick={showPayload}>
                    <Zap className="h-4 w-4" />
                    Payload
                  </Button>
                  <Button type="button" onClick={submitPlan}>
                    Submit
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => setCurrentStep((step) => Math.min(steps.length - 1, step + 1))}>
                  Save & Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete configuration row"
        message={deleteTarget?.title ?? "Are you sure you want to delete this row?"}
        confirmText="Delete"
        destructive
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          deleteTarget?.onConfirm();
          setDeleteTarget(null);
        }}
      />
      <ConfirmDialog
        open={leaveOpen}
        title="You have unsaved changes."
        message="Are you sure you want to leave this page?"
        confirmText="Leave"
        onClose={() => setLeaveOpen(false)}
        onConfirm={() => navigate("/trust-plan")}
      />
      <ActivationJsonModal
        open={activationPreviewOpen}
        plan={plan}
        onClose={() => setActivationPreviewOpen(false)}
      />
    </>
  );
}

function BasicInformationStep({ plan, updatePlan }: StepProps) {
  return (
    <FormGrid>
      <ReadOnlyValue label="Trust Plan ID" value={plan.id} />
      <SelectInput label="Product Category" required value={plan.basicInfo.productCategory} options={["Trust", "Saving Trust", "Flexi Trust", "Other"]} onChange={(value) => updatePlan((plan) => ({ ...plan, basicInfo: { ...plan.basicInfo, productCategory: value } }))} />
      <TextInput label="Product Name" required value={plan.basicInfo.productName} onChange={(value) => updatePlan((plan) => ({ ...plan, basicInfo: { ...plan.basicInfo, productName: value } }))} />
      <CurrencyInput label="Minimum Placement" required value={plan.basicInfo.minimumPlacement} onChange={(value) => updatePlan((plan) => ({ ...plan, basicInfo: { ...plan.basicInfo, minimumPlacement: value } }))} />
      <CurrencyInput
        label="Maximum Placement"
        value={plan.basicInfo.maximumPlacement}
        disabled={plan.basicInfo.noMaximum}
        onChange={(value) => updatePlan((plan) => ({ ...plan, basicInfo: { ...plan.basicInfo, maximumPlacement: value } }))}
        labelAction={
          <InlineCheckbox label="No Maximum" checked={plan.basicInfo.noMaximum} onChange={(checked) => updatePlan((plan) => ({ ...plan, basicInfo: { ...plan.basicInfo, noMaximum: checked, maximumPlacement: checked ? undefined : plan.basicInfo.maximumPlacement } }))} />
        }
      />
      <NumberWithUnit label="Fund Management Period" required value={plan.basicInfo.fundManagementPeriod} unit={plan.basicInfo.fundManagementPeriodUnit} units={["Months", "Years"]} onValueChange={(value) => updatePlan((plan) => ({ ...plan, basicInfo: { ...plan.basicInfo, fundManagementPeriod: value } }))} onUnitChange={(unit) => updatePlan((plan) => ({ ...plan, basicInfo: { ...plan.basicInfo, fundManagementPeriodUnit: unit as "Months" | "Years" } }))} />
      <SelectInput label="Product Status" value={plan.basicInfo.productStatus} options={["Draft", "Active", "Inactive"]} onChange={(value) => updatePlan((plan) => ({ ...plan, basicInfo: { ...plan.basicInfo, productStatus: value as TrustPlan["basicInfo"]["productStatus"] } }))} />
      <CheckboxGroup
        label="Eligible Execution Ranks"
        required
        options={executionRankOptions}
        selected={plan.basicInfo.executionRanks}
        onChange={(executionRanks) => updatePlan((plan) => ({ ...plan, basicInfo: { ...plan.basicInfo, executionRanks } }))}
        className="md:col-span-2"
      />
      <TextareaInput label="Product Description" value={plan.basicInfo.productDescription} onChange={(value) => updatePlan((plan) => ({ ...plan, basicInfo: { ...plan.basicInfo, productDescription: value } }))} className="md:col-span-2" />
    </FormGrid>
  );
}

function ActivationJsonModal({
  open,
  plan,
  onClose
}: {
  open: boolean;
  plan: TrustPlan;
  onClose: () => void;
}) {
  if (!open) return null;

  const json = JSON.stringify(createActivationJson(plan), null, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-brandGold/30 bg-white shadow-[0_28px_80px_rgba(17,17,17,0.28)]">
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-textPrimary">Trust Plan Payload</h2>
              <p className="mt-1 text-sm text-textSecondary">Generated JSON data from steps 1 - 9.</p>
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
          <Button type="button" onClick={onClose}>Close</Button>
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

function PaymentFeeStep({ plan, updatePlan }: StepProps) {
  return (
    <div className="grid gap-5">
      <Card title="Payment Configuration">
        <FormGrid>
          <SelectInput label="Payment Frequency" value={plan.paymentConfig.paymentFrequency} options={["One-Off", "Monthly", "Quarterly", "Half-Yearly", "Yearly"]} onChange={(value) => updatePlan((plan) => ({ ...plan, paymentConfig: { ...plan.paymentConfig, paymentFrequency: value as TrustPlan["paymentConfig"]["paymentFrequency"], paymentTerm: value === "One-Off" ? undefined : plan.paymentConfig.paymentTerm } }))} />
          {plan.paymentConfig.paymentFrequency && plan.paymentConfig.paymentFrequency !== "One-Off" ? (
            <NumberWithUnit label="Payment Term" value={plan.paymentConfig.paymentTerm ?? 0} unit={plan.paymentConfig.paymentTermUnit} units={["Months", "Years"]} onValueChange={(value) => updatePlan((plan) => ({ ...plan, paymentConfig: { ...plan.paymentConfig, paymentTerm: value } }))} onUnitChange={(unit) => updatePlan((plan) => ({ ...plan, paymentConfig: { ...plan.paymentConfig, paymentTermUnit: unit as "Months" | "Years" } }))} />
          ) : null}
        </FormGrid>
      </Card>
      <EditableSection
        title="Fee Configuration"
        description="Configure setup, admin and processing fees. Rows are editable inline."
      >
        <FeeTable rows={plan.fees} updateRows={(fees) => updatePlan((plan) => ({ ...plan, fees: createStaticFeeRules(fees) }))} />
      </EditableSection>
    </div>
  );
}

function TenureWithdrawalStep({ plan, updatePlan }: StepProps) {
  return (
    <FormGrid>
      <ReadOnlyValue label="Fund Management Period" value={`${plan.basicInfo.fundManagementPeriod} ${plan.basicInfo.fundManagementPeriodUnit}`} />
      <NumberWithUnit label="Lock-In Period" required value={plan.tenureConfig.lockInPeriod ?? 0} unit={plan.tenureConfig.lockInPeriodUnit} units={["Months", "Years"]} onValueChange={(value) => updatePlan((plan) => ({ ...plan, tenureConfig: { ...plan.tenureConfig, lockInPeriod: value } }))} onUnitChange={(unit) => updatePlan((plan) => ({ ...plan, tenureConfig: { ...plan.tenureConfig, lockInPeriodUnit: unit as "Months" | "Years" } }))} />
      <ToggleInput label="Allow Early Withdrawal" checked={plan.tenureConfig.allowEarlyWithdrawal} onChange={(checked) => updatePlan((plan) => ({ ...plan, tenureConfig: { ...plan.tenureConfig, allowEarlyWithdrawal: checked } }))} />
      {plan.tenureConfig.allowEarlyWithdrawal ? (
        <>
          <SelectInput label="Early Withdrawal Fee Type" value={plan.tenureConfig.earlyWithdrawalFeeType} options={["Percentage", "Fixed Amount"]} onChange={(value) => updatePlan((plan) => ({ ...plan, tenureConfig: { ...plan.tenureConfig, earlyWithdrawalFeeType: value as "Percentage" | "Fixed Amount" } }))} />
          <NumberInput label="Early Withdrawal Fee Value" value={plan.tenureConfig.earlyWithdrawalFeeValue} onChange={(value) => updatePlan((plan) => ({ ...plan, tenureConfig: { ...plan.tenureConfig, earlyWithdrawalFeeValue: value } }))} />
        </>
      ) : null}
    </FormGrid>
  );
}

function ReturnConfigurationStep({ plan, updatePlan, setDeleteTarget, yearCount }: StepPropsWithDelete & { yearCount: number }) {
  const method = plan.returnConfig.method || defaultReturnMethod;
  return (
    <div className="grid gap-5">
      <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {returnMethods.map((option) => {
          const active = method === option.title;
          const enabled = enabledReturnMethods.includes(option.title);
          return (
            <button
              key={option.title}
              type="button"
              disabled={!enabled}
              aria-disabled={!enabled}
              onClick={() => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, method: option.title } }))}
              className={
                active
                  ? "min-w-0 rounded-lg border border-ink bg-ink p-4 text-left text-white"
                  : enabled
                    ? "min-w-0 rounded-lg border border-line bg-white p-4 text-left hover:border-ink"
                    : "min-w-0 cursor-not-allowed rounded-lg border border-line bg-gray-50 p-4 text-left opacity-60"
              }
            >
              <div className="text-sm font-semibold">{option.title}</div>
              <p className={active ? "mt-1 text-xs text-white/75" : "mt-1 text-xs text-textSecondary"}>{option.description}</p>
            </button>
          );
        })}
      </div>

      {method === "Fixed Rate" ? (
        <Card title="Fixed Rate Configuration">
          <FormGrid>
            <NumberInput label="Annual Return Rate (% p.a.)" required value={plan.returnConfig.fixedRate.annualRate} onChange={(value) => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, fixedRate: { ...plan.returnConfig.fixedRate, annualRate: value } } }))} />
            <SelectInput label="Calculation Basis" value={plan.returnConfig.fixedRate.calculationBasis} options={calculationBasisOptions} onChange={(value) => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, fixedRate: { ...plan.returnConfig.fixedRate, calculationBasis: value } } }))} />
          </FormGrid>
        </Card>
      ) : null}

      {method === "Investment Tier Rate" ? (
        <EditableSection title="Investment Tier Rate Table" onAdd={() => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, investmentTiers: [...plan.returnConfig.investmentTiers, { id: createId("TIER"), minimumAmount: 0, noMaximum: true, annualRate: 0 }] } }))} addLabel="Add Investment Tier">
          <InvestmentTierTable rows={plan.returnConfig.investmentTiers} updateRows={(investmentTiers) => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, investmentTiers } }))} setDeleteTarget={setDeleteTarget} />
        </EditableSection>
      ) : null}

      {method === "Period / Year Tiered Rate" ? (
        <EditableSection title="Period / Year Tiered Rate" onAdd={() => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, periodRates: [...plan.returnConfig.periodRates, { id: createId("PERIOD"), fromPeriod: 1, toPeriod: 1, returnRate: 0 }] } }))} addLabel="Add Period">
          <PeriodRateTable rows={plan.returnConfig.periodRates} updateRows={(periodRates) => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, periodRates } }))} setDeleteTarget={setDeleteTarget} />
        </EditableSection>
      ) : null}

      {method === "Investment + Period Tier Rate" ? (
        <EditableSection title="Investment + Period Tier Rate Matrix" description={`Year columns are generated from the ${yearCount}-year fund management period.`} onAdd={() => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, matrixTiers: [...plan.returnConfig.matrixTiers, { id: createId("MATRIX"), minimumPlacement: 0, noMaximum: true, yearlyRates: createYearRateMap(yearCount) }] } }))} addLabel="Add Investment Tier">
          <MatrixTierTable rows={plan.returnConfig.matrixTiers} yearCount={yearCount} updateRows={(matrixTiers) => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, matrixTiers } }))} setDeleteTarget={setDeleteTarget} />
        </EditableSection>
      ) : null}

      {method === "Fixed Rate + Bonus" ? (
        <Card title="Fixed Rate + Bonus">
          <FormGrid>
            <NumberInput label="Base Annual Return Rate (%)" value={plan.returnConfig.fixedBonus.baseAnnualRate} onChange={(value) => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, fixedBonus: { baseAnnualRate: value } } }))} />
            <InfoNote>Bonus rules are configured in Step 6 and will be included in the activation review.</InfoNote>
          </FormGrid>
        </Card>
      ) : null}

      {method === "Redeposit / Accumulated Return" ? (
        <Card title="Redeposit / Accumulated Return">
          <FormGrid>
            <NumberInput label="Base Annual Return Rate" value={plan.returnConfig.redeposit.baseAnnualRate} onChange={(value) => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, redeposit: { ...plan.returnConfig.redeposit, baseAnnualRate: value } } }))} />
            <SelectInput label="Redeposit Calculation Basis" value={plan.returnConfig.redeposit.calculationBasis} options={["Dividend Amount", "Accumulated Dividend", "Configured Amount"]} onChange={(value) => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, redeposit: { ...plan.returnConfig.redeposit, calculationBasis: value } } }))} />
            <ToggleInput label="Does Redeposit Generate Additional Return?" checked={plan.returnConfig.redeposit.generatesAdditionalReturn} onChange={(checked) => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, redeposit: { ...plan.returnConfig.redeposit, generatesAdditionalReturn: checked } } }))} />
            {plan.returnConfig.redeposit.generatesAdditionalReturn ? (
              <>
                <NumberInput label="Additional Return Rate" value={plan.returnConfig.redeposit.additionalReturnRate} onChange={(value) => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, redeposit: { ...plan.returnConfig.redeposit, additionalReturnRate: value } } }))} />
                <NumberInput label="Additional Return Period" value={plan.returnConfig.redeposit.additionalReturnPeriod} onChange={(value) => updatePlan((plan) => ({ ...plan, returnConfig: { ...plan.returnConfig, redeposit: { ...plan.returnConfig.redeposit, additionalReturnPeriod: value } } }))} />
              </>
            ) : null}
            <InfoNote>Redeposit rules can vary by product and should be configured according to the approved product terms.</InfoNote>
          </FormGrid>
        </Card>
      ) : null}
    </div>
  );
}

function DividendPayoutStep({ plan, updatePlan }: StepProps) {
  return (
    <FormGrid>
      <SelectInput label="Payout Frequency" required value={plan.payoutConfig.payoutFrequency} options={["Monthly", "Quarterly", "Half-Yearly", "Yearly", "At Maturity"]} onChange={(value) => updatePlan((plan) => ({ ...plan, payoutConfig: { ...plan.payoutConfig, payoutFrequency: value as TrustPlan["payoutConfig"]["payoutFrequency"] } }))} />
      <SelectInput label="Payout Calculation Start" value={plan.payoutConfig.calculationStart} options={["From Commencement Date"]} onChange={(value) => updatePlan((plan) => ({ ...plan, payoutConfig: { ...plan.payoutConfig, calculationStart: value as TrustPlan["payoutConfig"]["calculationStart"] } }))} />
      <ToggleInput label="Allow Dividend Redeposit" checked={plan.payoutConfig.allowDividendRedeposit} onChange={(checked) => updatePlan((plan) => ({ ...plan, payoutConfig: { ...plan.payoutConfig, allowDividendRedeposit: checked } }))} />
    </FormGrid>
  );
}

function BonusConfigurationStep({ plan, updatePlan, setDeleteTarget }: StepPropsWithDelete) {
  return (
    <div className="grid gap-5">
      <ToggleInput label="Has Bonus Return" checked={plan.hasBonusReturn} onChange={(checked) => updatePlan((plan) => ({ ...plan, hasBonusReturn: checked }))} />
      {plan.hasBonusReturn ? (
        <EditableSection title="Bonus Rules" onAdd={() => updatePlan((plan) => ({ ...plan, bonusRules: [...plan.bonusRules, { id: createId("BONUS"), bonusName: "", triggerType: "Year Milestone", bonusRateType: "Percentage", bonusValue: 0, calculationBasis: "Original Investment", payoutTiming: "At Maturity" }] }))} addLabel="Add Bonus Rule">
          <BonusRuleTable rows={plan.bonusRules} updateRows={(bonusRules) => updatePlan((plan) => ({ ...plan, bonusRules }))} setDeleteTarget={setDeleteTarget} />
        </EditableSection>
      ) : null}
    </div>
  );
}

function CommissionConfigurationStep({ plan, updatePlan, setDeleteTarget }: StepPropsWithDelete) {
  const method = plan.commissionConfig.method || defaultCommissionMethod;
  return (
    <div className="grid gap-5">
      <ToggleInput label="Commission Enabled" checked={plan.commissionConfig.enabled} onChange={(checked) => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, enabled: checked } }))} />
      {plan.commissionConfig.enabled ? (
        <>
          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {commissionMethods.map((option) => {
              const active = method === option.title;
              const enabled = enabledCommissionMethods.includes(option.title);
              return (
                <button
                  key={option.title}
                  type="button"
                  disabled={!enabled}
                  aria-disabled={!enabled}
                  onClick={() => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, method: option.title } }))}
                  className={
                    active
                      ? "min-w-0 rounded-lg border border-ink bg-ink p-4 text-left text-white"
                      : enabled
                        ? "min-w-0 rounded-lg border border-line bg-white p-4 text-left hover:border-ink"
                        : "min-w-0 cursor-not-allowed rounded-lg border border-line bg-gray-50 p-4 text-left opacity-60"
                  }
                >
                  <div className="text-sm font-semibold">{option.title}</div>
                  <p className={active ? "mt-1 text-xs text-white/75" : "mt-1 text-xs text-textSecondary"}>{option.description}</p>
                </button>
              );
            })}
          </div>
          {method === "One-Off Commission" ? (
            <Card title="One-Off Commission">
              <FormGrid>
                <ReadOnlyValue label="Maximum Total Commission" value={`${sumRates(plan.commissionConfig.oneOff.tiers).toFixed(2)}%`} />
              </FormGrid>
              <CommissionTierTable rows={plan.commissionConfig.oneOff.tiers} updateRows={(tiers) => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, oneOff: { ...plan.commissionConfig.oneOff, tiers } } }))} setDeleteTarget={setDeleteTarget} onAdd={() => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, oneOff: { ...plan.commissionConfig.oneOff, tiers: [...plan.commissionConfig.oneOff.tiers, createCommissionTier()] } } }))} />
            </Card>
          ) : null}
          {method === "Monthly Recurring Commission" ? (
            <Card title="Monthly Recurring Commission">
              <FormGrid>
                <NumberInput label="Commission Start Month" value={plan.commissionConfig.monthly.startMonth} onChange={(value) => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, monthly: { ...plan.commissionConfig.monthly, startMonth: value } } }))} />
                <NumberInput label="Commission End Month" value={plan.commissionConfig.monthly.endMonth} onChange={(value) => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, monthly: { ...plan.commissionConfig.monthly, endMonth: value } } }))} />
                <ReadOnlyValue label="Total Monthly Commission" value={`${sumRates(plan.commissionConfig.monthly.tiers).toFixed(2)}%`} />
              </FormGrid>
              <CommissionTierTable rows={plan.commissionConfig.monthly.tiers} updateRows={(tiers) => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, monthly: { ...plan.commissionConfig.monthly, tiers } } }))} setDeleteTarget={setDeleteTarget} onAdd={() => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, monthly: { ...plan.commissionConfig.monthly, tiers: [...plan.commissionConfig.monthly.tiers, createCommissionTier()] } } }))} />
            </Card>
          ) : null}
          {method === "Yearly Commission" ? <YearlyCommissionEditor plan={plan} updatePlan={updatePlan} setDeleteTarget={setDeleteTarget} /> : null}
          {method === "Multi-Year Tiered Commission" ? <MultiYearCommissionEditor plan={plan} updatePlan={updatePlan} setDeleteTarget={setDeleteTarget} /> : null}
          {method === "Hybrid Commission" ? <HybridCommissionEditor plan={plan} updatePlan={updatePlan} setDeleteTarget={setDeleteTarget} /> : null}
        </>
      ) : null}
    </div>
  );
}

function CommissionRulesStep({ plan, updatePlan }: StepProps) {
  return (
    <div className="grid gap-5">
      <FormGrid>
        <SelectInput label="Commission Calculation Basis" required value={plan.commissionRules.calculationBasis} options={["Gross Placement Amount"]} onChange={(value) => updatePlan((plan) => ({ ...plan, commissionRules: { ...plan.commissionRules, calculationBasis: value as TrustPlan["commissionRules"]["calculationBasis"] } }))} />
        <SelectInput label="Rank Determination" value={plan.commissionRules.rankDetermination} options={["Rank at Completed"]} onChange={(value) => updatePlan((plan) => ({ ...plan, commissionRules: { ...plan.commissionRules, rankDetermination: value as TrustPlan["commissionRules"]["rankDetermination"] } }))} />
      </FormGrid>
      <InfoNote>Commission will be calculated using the selected amount basis and agent rank determination rule.</InfoNote>
    </div>
  );
}

function BenefitsStep({ plan, updatePlan, setDeleteTarget }: StepPropsWithDelete) {
  return (
    <div className="grid gap-5">
      <ToggleInput label="Has Complimentary Benefits" checked={plan.hasComplimentaryBenefits} onChange={(checked) => updatePlan((plan) => ({ ...plan, hasComplimentaryBenefits: checked }))} />
      {plan.hasComplimentaryBenefits ? (
        <EditableSection title="Benefit Tiers" onAdd={() => updatePlan((plan) => ({ ...plan, benefits: [...plan.benefits, { id: createId("BENEFIT"), minimumPlacement: 0, noMaximum: true, benefitName: "", benefitValue: 0, fulfilmentMethod: "Manual" }] }))} addLabel="Add Benefit Tier">
          <BenefitTable rows={plan.benefits} updateRows={(benefits) => updatePlan((plan) => ({ ...plan, benefits }))} setDeleteTarget={setDeleteTarget} />
        </EditableSection>
      ) : null}
    </div>
  );
}

function ReviewStep({ plan, setCurrentStep }: { plan: TrustPlan; setCurrentStep: (step: number) => void }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 xl:grid-cols-2">
        {reviewSections.map((section) => (
          <Card key={section.title} title={section.title} action={<button type="button" onClick={() => setCurrentStep(section.step)} className="text-sm font-semibold text-ink hover:underline">Edit</button>}>
            <dl className="grid gap-2 text-sm">
              {section.items(plan).map((item) => (
                <div key={item.label} className="flex justify-between gap-4 border-b border-line py-2 last:border-0">
                  <dt className="text-textSecondary">{item.label}</dt>
                  <dd className="text-right font-medium text-textPrimary">{item.value || "-"}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FeeTable({ rows, updateRows }: Omit<TableProps<FeeRule>, "setDeleteTarget">) {
  return <EditableTable headers={["Fee Type", "Rate Type", "Value", "Charge Timing"]} rows={createStaticFeeRules(rows)} empty="No fee rules configured.">{(row) => [
    <StaticCell value={row.feeType} />,
    <SelectCell value={row.rateType} options={["Percentage", "Fixed Amount"]} onChange={(rateType) => updateRow(rows, updateRows, row.id, { rateType: rateType as FeeRule["rateType"] })} />,
    <NumberCell value={row.value} onChange={(value) => updateRow(rows, updateRows, row.id, { value })} prefix={row.rateType === "Fixed Amount" ? "RM" : undefined} suffix={row.rateType === "Percentage" ? "%" : undefined} />,
    <SelectCell value={row.chargeTiming} options={["Upon Creation", "Upon Payment", "Monthly", "Yearly", "Upon Withdrawal", "At Maturity"]} onChange={(chargeTiming) => updateRow(rows, updateRows, row.id, { chargeTiming })} />
  ]}</EditableTable>;
}

function InvestmentTierTable({ rows, updateRows, setDeleteTarget }: TableProps<InvestmentTier>) {
  return <EditableTable headers={["Minimum Amount", "Maximum Amount", "Above / No Maximum", "Annual Return Rate (%)", "Action"]} rows={rows} empty="No investment tiers added.">{(row) => [
    <NumberCell value={row.minimumAmount} prefix="RM" onChange={(minimumAmount) => updateRow(rows, updateRows, row.id, { minimumAmount })} />,
    <NumberCell value={row.maximumAmount} prefix="RM" onChange={(maximumAmount) => updateRow(rows, updateRows, row.id, { maximumAmount })} />,
    <NoMaximumCell checked={row.noMaximum} onChange={(noMaximum) => updateRow(rows, updateRows, row.id, { noMaximum, maximumAmount: noMaximum ? undefined : row.maximumAmount })} />,
    <NumberCell value={row.annualRate} suffix="%" onChange={(annualRate) => updateRow(rows, updateRows, row.id, { annualRate })} />,
    <DeleteCell onDelete={() => setDeleteTarget({ title: "Delete this investment tier?", onConfirm: () => updateRows(rows.filter((item) => item.id !== row.id)) })} />
  ]}</EditableTable>;
}

function PeriodRateTable({ rows, updateRows, setDeleteTarget }: TableProps<PeriodRate>) {
  return <EditableTable headers={["From Year / Period", "To Year / Period", "Return Rate (% p.a.)", "Action"]} rows={rows} empty="No period rates added.">{(row) => [
    <NumberCell value={row.fromPeriod} onChange={(fromPeriod) => updateRow(rows, updateRows, row.id, { fromPeriod })} />,
    <NumberCell value={row.toPeriod} onChange={(toPeriod) => updateRow(rows, updateRows, row.id, { toPeriod })} />,
    <NumberCell value={row.returnRate} suffix="%" onChange={(returnRate) => updateRow(rows, updateRows, row.id, { returnRate })} />,
    <DeleteCell onDelete={() => setDeleteTarget({ title: "Delete this period rate?", onConfirm: () => updateRows(rows.filter((item) => item.id !== row.id)) })} />
  ]}</EditableTable>;
}

function MatrixTierTable({ rows, updateRows, setDeleteTarget, yearCount }: TableProps<MatrixTier> & { yearCount: number }) {
  const headers = ["Minimum Placement", "Maximum Placement", "Above / No Maximum", ...Array.from({ length: yearCount }, (_, index) => `Year ${index + 1}`), "Action"];
  return <EditableTable headers={headers} rows={rows} empty="No matrix tiers added.">{(row) => [
    <NumberCell value={row.minimumPlacement} prefix="RM" onChange={(minimumPlacement) => updateRow(rows, updateRows, row.id, { minimumPlacement })} />,
    <NumberCell value={row.maximumPlacement} prefix="RM" onChange={(maximumPlacement) => updateRow(rows, updateRows, row.id, { maximumPlacement })} />,
    <NoMaximumCell checked={row.noMaximum} onChange={(noMaximum) => updateRow(rows, updateRows, row.id, { noMaximum, maximumPlacement: noMaximum ? undefined : row.maximumPlacement })} />,
    ...Array.from({ length: yearCount }, (_, index) => {
      const year = index + 1;
      return <NumberCell value={row.yearlyRates[year] ?? 0} suffix="%" onChange={(rate) => updateRow(rows, updateRows, row.id, { yearlyRates: { ...row.yearlyRates, [year]: rate } })} />;
    }),
    <DeleteCell onDelete={() => setDeleteTarget({ title: "Delete this matrix tier?", onConfirm: () => updateRows(rows.filter((item) => item.id !== row.id)) })} />
  ]}</EditableTable>;
}

function BonusRuleTable({ rows, updateRows, setDeleteTarget }: TableProps<BonusRule>) {
  return <EditableTable headers={["Bonus Name", "Trigger Type", "Trigger Year / Period", "Bonus Rate Type", "Bonus Value", "Calculation Basis", "Payout Timing", "Action"]} rows={rows} empty="No bonus rules added.">{(row) => [
    <TextCell value={row.bonusName} onChange={(bonusName) => updateRow(rows, updateRows, row.id, { bonusName })} />,
    <SelectCell value={row.triggerType} options={["Year Milestone", "Maturity", "Investment Threshold", "Custom"]} onChange={(triggerType) => updateRow(rows, updateRows, row.id, { triggerType })} />,
    <NumberCell value={row.triggerPeriod ?? 0} onChange={(triggerPeriod) => updateRow(rows, updateRows, row.id, { triggerPeriod })} />,
    <SelectCell value={row.bonusRateType} options={["Percentage", "Fixed Amount"]} onChange={(bonusRateType) => updateRow(rows, updateRows, row.id, { bonusRateType: bonusRateType as BonusRule["bonusRateType"] })} />,
    <NumberCell value={row.bonusValue} onChange={(bonusValue) => updateRow(rows, updateRows, row.id, { bonusValue })} />,
    <SelectCell value={row.calculationBasis} options={["Original Investment", "First Year Payment", "Accumulated Investment", "Current Balance"]} onChange={(calculationBasis) => updateRow(rows, updateRows, row.id, { calculationBasis })} />,
    <SelectCell value={row.payoutTiming} options={["Immediately", "At Maturity", "Scheduled"]} onChange={(payoutTiming) => updateRow(rows, updateRows, row.id, { payoutTiming })} />,
    <DeleteCell onDelete={() => setDeleteTarget({ title: "Delete this bonus rule?", onConfirm: () => updateRows(rows.filter((item) => item.id !== row.id)) })} />
  ]}</EditableTable>;
}

function CommissionTierTable({ rows, updateRows, setDeleteTarget, onAdd }: TableProps<CommissionTier> & { onAdd: () => void }) {
  return (
    <div className="mt-4">
      <EditableSection title="Commission Tier Table" onAdd={onAdd} addLabel="Add Tier">
        <EditableTable headers={["Rank", "Commission Type", "Rate (%)", "Action"]} rows={rows} empty="No commission tiers added.">{(row) => [
          <SelectCell value={row.rank} options={rankOptions} getOptionLabel={getRankLabel} onChange={(rank) => updateRow(rows, updateRows, row.id, { rank })} />,
          <SelectCell value={row.commissionType} options={commissionTypeOptions} onChange={(commissionType) => updateRow(rows, updateRows, row.id, { commissionType: commissionType as CommissionTier["commissionType"] })} />,
          <NumberCell value={row.rate} suffix="%" onChange={(rate) => updateRow(rows, updateRows, row.id, { rate })} />,
          <DeleteCell onDelete={() => setDeleteTarget({ title: "Delete this commission tier?", onConfirm: () => updateRows(rows.filter((item) => item.id !== row.id)) })} />
        ]}</EditableTable>
      </EditableSection>
    </div>
  );
}

function BenefitTable({ rows, updateRows, setDeleteTarget }: TableProps<BenefitTier>) {
  return <EditableTable headers={["Minimum Placement", "Maximum Placement", "Above / No Maximum", "Benefit Name", "Benefit Value", "Fulfilment Method", "Action"]} rows={rows} empty="No benefit tiers added.">{(row) => [
    <NumberCell value={row.minimumPlacement} prefix="RM" onChange={(minimumPlacement) => updateRow(rows, updateRows, row.id, { minimumPlacement })} />,
    <NumberCell value={row.maximumPlacement} prefix="RM" onChange={(maximumPlacement) => updateRow(rows, updateRows, row.id, { maximumPlacement })} />,
    <NoMaximumCell checked={row.noMaximum} onChange={(noMaximum) => updateRow(rows, updateRows, row.id, { noMaximum, maximumPlacement: noMaximum ? undefined : row.maximumPlacement })} />,
    <TextCell value={row.benefitName} onChange={(benefitName) => updateRow(rows, updateRows, row.id, { benefitName })} />,
    <NumberCell value={row.benefitValue} prefix="RM" onChange={(benefitValue) => updateRow(rows, updateRows, row.id, { benefitValue })} />,
    <SelectCell value={row.fulfilmentMethod} options={["Manual", "System Generated", "External"]} onChange={(fulfilmentMethod) => updateRow(rows, updateRows, row.id, { fulfilmentMethod })} />,
    <DeleteCell onDelete={() => setDeleteTarget({ title: "Delete this benefit tier?", onConfirm: () => updateRows(rows.filter((item) => item.id !== row.id)) })} />
  ]}</EditableTable>;
}

function YearlyCommissionEditor({ plan, updatePlan, setDeleteTarget }: StepPropsWithDelete) {
  const addYear = () => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, yearly: { years: [...plan.commissionConfig.yearly.years, { id: createId("YEAR"), year: plan.commissionConfig.yearly.years.length + 1, tiers: [] }] } } }));
  return (
    <EditableSection title="Yearly Commission" onAdd={addYear} addLabel="Add Year">
      <div className="grid gap-4">
        {plan.commissionConfig.yearly.years.map((year) => (
          <Card key={year.id} title={`Year ${year.year}`} action={<Button type="button" size="sm" variant="outline" onClick={() => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, yearly: { years: plan.commissionConfig.yearly.years.map((item) => item.id === year.id ? { ...item, tiers: [...item.tiers, createCommissionTier()] } : item) } } }))}>Add Tier</Button>}>
            <CommissionTierTable rows={year.tiers} updateRows={(tiers) => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, yearly: { years: plan.commissionConfig.yearly.years.map((item) => item.id === year.id ? { ...item, tiers } : item) } } }))} setDeleteTarget={setDeleteTarget} onAdd={() => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, yearly: { years: plan.commissionConfig.yearly.years.map((item) => item.id === year.id ? { ...item, tiers: [...item.tiers, createCommissionTier()] } : item) } } }))} />
          </Card>
        ))}
      </div>
    </EditableSection>
  );
}

function MultiYearCommissionEditor({ plan, updatePlan, setDeleteTarget }: StepPropsWithDelete) {
  const [activePlanId, setActivePlanId] = useState(plan.commissionConfig.multiYear.plans[0]?.id ?? "");
  const plans = plan.commissionConfig.multiYear.plans;
  const activePlan = plans.find((item) => item.id === activePlanId) ?? plans[0];
  const addPlan = () => {
    const newPlan: CommissionPlan = { id: createId("PLAN"), label: `Plan ${plans.length + 1}`, years: [] };
    updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, multiYear: { plans: [...plan.commissionConfig.multiYear.plans, newPlan] } } }));
    setActivePlanId(newPlan.id);
  };
  return (
    <EditableSection title="Multi-Year Tiered Commission" description="Use plan tabs and year sections for Saving Trust-style structures." onAdd={addPlan} addLabel="Add Plan">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {plans.map((item) => <button key={item.id} type="button" onClick={() => setActivePlanId(item.id)} className={activePlan?.id === item.id ? "rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white" : "rounded-lg border border-line px-3 py-2 text-sm font-semibold"}>{item.label}</button>)}
        </div>
        {activePlan ? (
          <Card title={activePlan.label} action={<Button type="button" size="sm" variant="outline" onClick={() => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, multiYear: { plans: plan.commissionConfig.multiYear.plans.map((item) => item.id === activePlan.id ? { ...item, years: [...item.years, { id: createId("YEAR"), year: item.years.length + 1, tiers: [] }] } : item) } } }))}>Add Year</Button>}>
            <FormGrid>
              <TextInput label="Plan Label" value={activePlan.label} onChange={(label) => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, multiYear: { plans: plan.commissionConfig.multiYear.plans.map((item) => item.id === activePlan.id ? { ...item, label } : item) } } }))} />
            </FormGrid>
            <div className="mt-4 grid gap-4">
              {activePlan.years.map((year) => (
                <CommissionTierTable key={year.id} rows={year.tiers} updateRows={(tiers) => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, multiYear: { plans: plan.commissionConfig.multiYear.plans.map((item) => item.id === activePlan.id ? { ...item, years: item.years.map((entry) => entry.id === year.id ? { ...entry, tiers } : entry) } : item) } } }))} setDeleteTarget={setDeleteTarget} onAdd={() => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, multiYear: { plans: plan.commissionConfig.multiYear.plans.map((item) => item.id === activePlan.id ? { ...item, years: item.years.map((entry) => entry.id === year.id ? { ...entry, tiers: [...entry.tiers, createCommissionTier()] } : entry) } : item) } } }))} />
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </EditableSection>
  );
}

function HybridCommissionEditor({ plan, updatePlan, setDeleteTarget }: StepPropsWithDelete) {
  const [collapsedPhaseIds, setCollapsedPhaseIds] = useState<string[]>([]);
  const phases = plan.commissionConfig.hybrid.phases;
  const updatePhases = (phases: CommissionPhase[]) => updatePlan((plan) => ({ ...plan, commissionConfig: { ...plan.commissionConfig, hybrid: { phases } } }));
  const updatePhase = (id: string, patch: Partial<CommissionPhase>) => updatePhases(phases.map((phase) => (phase.id === id ? { ...phase, ...patch } : phase)));
  const addPhase = () => updatePhases([...phases, { id: createId("PHASE"), fromYear: phases.length + 1, toYear: phases.length + 1, commissionMethod: "One-Off Commission", tiers: [] }]);
  const toggleCollapsed = (id: string) => setCollapsedPhaseIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));

  return (
    <EditableSection title="Hybrid Commission Phases" onAdd={addPhase} addLabel="Add Commission Phase">
      <div className="grid gap-4">
        {phases.length === 0 ? <div className="rounded-lg border border-dashed border-line bg-soft p-4 text-sm text-textSecondary">No commission phases added.</div> : null}
        {phases.map((phase, index) => {
          const collapsed = collapsedPhaseIds.includes(phase.id);
          const errors = getHybridPhaseErrors(phases, phase);
          return (
            <div key={phase.id} className="min-w-0 overflow-hidden rounded-lg border border-line bg-white">
              <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-base font-semibold text-textPrimary">Phase {index + 1}</h4>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => toggleCollapsed(phase.id)}>
                    {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    {collapsed ? "Expand" : "Collapse"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setDeleteTarget({ title: "Delete this commission phase?", onConfirm: () => updatePhases(phases.filter((item) => item.id !== phase.id)) })}>
                    <Trash2 className="h-4 w-4" />
                    Delete Phase
                  </Button>
                </div>
              </div>
              {collapsed ? null : (
                <div className="grid gap-4 p-4">
                  <FormGrid>
                    <NumberInput label="From Year" value={phase.fromYear} onChange={(fromYear) => updatePhase(phase.id, { fromYear })} />
                    <NumberInput label="To Year" value={phase.toYear} onChange={(toYear) => updatePhase(phase.id, { toYear })} />
                    <SelectInput label="Commission Method" value={phase.commissionMethod} options={hybridCommissionMethodOptions} onChange={(commissionMethod) => updatePhase(phase.id, { commissionMethod })} />
                  </FormGrid>
                  {errors.length > 0 ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {errors.map((error) => <div key={error}>{error}</div>)}
                    </div>
                  ) : null}
                  <div>
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h5 className="text-sm font-semibold text-textPrimary">Commission Rate Table</h5>
                      <Button type="button" size="sm" variant="outline" onClick={() => updatePhase(phase.id, { tiers: [...phase.tiers, createHybridCommissionTier(phase.tiers)] })}>
                        <Plus className="h-4 w-4" />
                        Add Rank
                      </Button>
                    </div>
                    <EditableTable headers={["Rank", "Commission Type", getHybridRateLabel(phase.commissionMethod), "Action"]} rows={phase.tiers} empty="No commission rates added.">{(row) => [
                      <SelectCell value={row.rank} options={rankOptions} getOptionLabel={getRankLabel} onChange={(rank) => updatePhase(phase.id, { tiers: phase.tiers.map((tier) => (tier.id === row.id ? { ...tier, rank } : tier)) })} />,
                      <SelectCell value={row.commissionType} options={commissionTypeOptions} onChange={(commissionType) => updatePhase(phase.id, { tiers: phase.tiers.map((tier) => (tier.id === row.id ? { ...tier, commissionType: commissionType as CommissionTier["commissionType"] } : tier)) })} />,
                      <NumberCell value={row.rate} suffix="%" onChange={(rate) => updatePhase(phase.id, { tiers: phase.tiers.map((tier) => (tier.id === row.id ? { ...tier, rate } : tier)) })} />,
                      <DeleteCell onDelete={() => setDeleteTarget({ title: "Delete this commission rate?", onConfirm: () => updatePhase(phase.id, { tiers: phase.tiers.filter((tier) => tier.id !== row.id) }) })} />
                    ]}</EditableTable>
                  </div>
                  <HybridPhaseSummary phase={phase} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </EditableSection>
  );
}

function EditableSection({ title, description, addLabel, onAdd, children }: { title: string; description?: string; addLabel?: string; onAdd?: () => void; children: ReactNode }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-textPrimary">{title}</h3>
          {description ? <p className="mt-1 text-sm text-textSecondary">{description}</p> : null}
        </div>
        {onAdd && addLabel ? (
          <Button type="button" size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        ) : null}
      </div>
      <div className="min-w-0 p-4">{children}</div>
    </div>
  );
}

function EditableTable<T extends { id: string }>({ headers, rows, empty, children }: { headers: string[]; rows: T[]; empty: string; children: (row: T) => ReactNode[] }) {
  if (rows.length === 0) return <div className="rounded-lg border border-dashed border-line bg-soft p-4 text-sm text-textSecondary">{empty}</div>;
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
          <tr>{headers.map((header) => <th key={header} className="whitespace-nowrap border-b border-line px-3 py-2 font-semibold">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>{children(row).map((cell, index) => <td key={index} className="min-w-36 border-b border-line px-3 py-2 align-top">{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 gap-4 md:grid-cols-2">{children}</div>;
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
        <h3 className="text-base font-semibold text-textPrimary">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function TextInput({ label, value, onChange, type = "text", required, disabled, placeholder, helper, className = "", labelAction }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; disabled?: boolean; placeholder?: string; helper?: string; className?: string; labelAction?: ReactNode }) {
  return <label className={`block text-sm font-medium text-textPrimary ${className}`}><FieldLabel label={label} required={required} action={labelAction} /><input type={type} value={value} disabled={disabled} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition disabled:bg-gray-50 disabled:text-textSecondary focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />{helper ? <span className="mt-1 block text-xs text-textSecondary">{helper}</span> : null}</label>;
}

function TextareaInput({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <label className={`block text-sm font-medium text-textPrimary ${className}`}><FieldLabel label={label} /><textarea value={value} rows={4} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" /></label>;
}

function SelectInput({ label, value, options, onChange, required }: { label: string; value: string; options: string[]; onChange: (value: string) => void; required?: boolean }) {
  return <label className="block text-sm font-medium text-textPrimary"><FieldLabel label={label} required={required} /><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"><option value="">Select</option>{options.map((option) => <option key={option} value={option}>{getReferenceLabel(option)}</option>)}</select></label>;
}

type NumericInputValue = number | undefined;

function parseNumericInput(value: string): NumericInputValue {
  return value === "" ? undefined : Number(value);
}

function NumberInput({ label, value, onChange, required, suffix }: { label: string; value?: number; onChange: (value: NumericInputValue) => void; required?: boolean; suffix?: string }) {
  return <label className="block text-sm font-medium text-textPrimary"><FieldLabel label={label} required={required} /><span className="relative mt-1 block"><input type="number" min="0" step="0.01" value={value ?? ""} onChange={(event) => onChange(parseNumericInput(event.target.value))} className={`h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink ${suffix ? "pr-24" : "pr-3"}`} />{suffix ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-textSecondary">{suffix}</span> : null}</span></label>;
}

function CurrencyInput({ label, value, onChange, required, disabled, labelAction }: { label: string; value?: number; onChange: (value: NumericInputValue) => void; required?: boolean; disabled?: boolean; labelAction?: ReactNode }) {
  return <label className="block text-sm font-medium text-textPrimary"><FieldLabel label={label} required={required} action={labelAction} /><span className="relative mt-1 block"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-textSecondary">RM</span><input type="number" min="0" step="0.01" disabled={disabled} value={value ?? ""} onChange={(event) => onChange(parseNumericInput(event.target.value))} className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm transition disabled:bg-gray-50 disabled:text-textSecondary focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" /></span></label>;
}

function NumberWithUnit({ label, value, unit, units, onValueChange, onUnitChange, required }: { label: string; value?: number; unit: string; units: string[]; onValueChange: (value: NumericInputValue) => void; onUnitChange: (unit: string) => void; required?: boolean }) {
  return <label className="block text-sm font-medium text-textPrimary"><FieldLabel label={label} required={required} /><span className="mt-1 grid grid-cols-[1fr_120px] gap-2"><input type="number" min="0" value={value ?? ""} onChange={(event) => onValueChange(parseNumericInput(event.target.value))} className="h-11 rounded-lg border border-line bg-white px-3 text-sm" /><select value={unit} onChange={(event) => onUnitChange(event.target.value)} className="h-11 rounded-lg border border-line bg-white px-3 text-sm">{units.map((unit) => <option key={unit}>{unit}</option>)}</select></span></label>;
}

function ToggleInput({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-textPrimary"><span className="min-w-0"><FieldLabel label={label} /></span><button type="button" onClick={() => onChange(!checked)} className={checked ? "relative h-6 w-11 shrink-0 rounded-full bg-ink" : "relative h-6 w-11 shrink-0 rounded-full bg-gray-300"} aria-pressed={checked}><span className={checked ? "absolute right-1 top-1 h-4 w-4 rounded-full bg-white" : "absolute left-1 top-1 h-4 w-4 rounded-full bg-white"} /></button></label>;
}

function InlineCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-textPrimary">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-line" />
      {label}
    </span>
  );
}

function CheckboxGroup({ label, options, selected, onChange, required, className = "" }: { label: string; options: Array<{ label: string; value: TrustExecutionRank }>; selected: TrustExecutionRank[]; onChange: (selected: TrustExecutionRank[]) => void; required?: boolean; className?: string }) {
  const toggle = (value: TrustExecutionRank, checked: boolean) => {
    onChange(checked ? [...selected, value] : selected.filter((item) => item !== value));
  };

  return (
    <div className={`block text-sm font-medium text-textPrimary ${className}`}>
      <FieldLabel label={label} required={required} />
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {options.map((option) => (
          <label key={option.value} className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-textPrimary">
            <input type="checkbox" checked={selected.includes(option.value)} onChange={(event) => toggle(option.value, event.target.checked)} className="h-4 w-4 rounded border-line" />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-line bg-soft px-3 py-2"><div className="text-xs font-semibold uppercase tracking-wide text-textSecondary"><FieldLabel label={label} /></div><div className="mt-1 text-sm font-semibold text-textPrimary">{value}</div></div>;
}

function FieldLabel({ label, required, action }: { label: string; required?: boolean; action?: ReactNode }) {
  return (
    <span className="flex min-h-5 items-center justify-between gap-3">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span className="truncate">{label}</span>
        {required ? <span className="shrink-0 text-red-600">*</span> : null}
        <FieldHelp label={label} />
      </span>
      {action}
    </span>
  );
}

function FieldHelp({ label }: { label: string }) {
  const help = fieldHelpText[label];
  if (!help) return null;

  return (
    <span className="group/help relative inline-flex shrink-0">
      <span
        aria-label={`What is ${label} used for?`}
        className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-line bg-white text-textSecondary transition hover:border-ink hover:text-ink focus:border-ink focus:text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
        role="button"
        tabIndex={0}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-max max-w-[min(18rem,80vw)] -translate-x-1/2 rounded-md bg-ink px-3 py-2 text-left text-xs font-medium normal-case leading-relaxed tracking-normal text-white shadow-soft group-hover/help:block group-focus-within/help:block">
        {help}
      </span>
    </span>
  );
}

function InfoNote({ children }: { children: ReactNode }) {
  return <div className="flex gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 md:col-span-2"><Info className="mt-0.5 h-4 w-4 shrink-0" />{children}</div>;
}

function TextCell({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full min-w-36 rounded-lg border border-line px-2 text-sm" />;
}

function StaticCell({ value }: { value: string }) {
  return <input value={value} readOnly className="h-10 w-full min-w-36 rounded-lg border border-line bg-soft px-2 text-sm text-textPrimary" />;
}

function NumberCell({ value, onChange, prefix, suffix }: { value?: number; onChange: (value: NumericInputValue) => void; prefix?: string; suffix?: string }) {
  return <span className="relative block"><input type="number" min="0" step="0.01" value={value ?? ""} onChange={(event) => onChange(parseNumericInput(event.target.value))} className={`h-10 w-full min-w-28 rounded-lg border border-line px-2 text-sm ${prefix ? "pl-10" : ""} ${suffix ? "pr-8" : ""}`} />{prefix ? <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-textSecondary">{prefix}</span> : null}{suffix ? <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-textSecondary">{suffix}</span> : null}</span>;
}

function SelectCell({ value, options, onChange, getOptionLabel = getReferenceLabel }: { value: string; options: string[]; onChange: (value: string) => void; getOptionLabel?: (value: string) => string }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 min-w-36 rounded-lg border border-line bg-white px-2 text-sm">{options.map((option) => <option key={option} value={option}>{getOptionLabel(option)}</option>)}</select>;
}

function NoMaximumCell({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-10 min-w-32 items-center gap-2 text-sm text-textPrimary">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-line" />
      <span className="text-textSecondary">Yes</span>
    </label>
  );
}

function DeleteCell({ onDelete }: { onDelete: () => void }) {
  return <Button type="button" size="sm" variant="outline" onClick={onDelete}><Trash2 className="h-4 w-4" />Delete</Button>;
}

interface StepProps {
  plan: TrustPlan;
  updatePlan: (updater: (current: TrustPlan) => TrustPlan) => void;
}

interface StepPropsWithDelete extends StepProps {
  setDeleteTarget: (target: DeleteTarget) => void;
}

interface TableProps<T> {
  rows: T[];
  updateRows: (rows: T[]) => void;
  setDeleteTarget: (target: DeleteTarget) => void;
}

interface ValidationItem {
  key: string;
  message: string;
  step: number;
}

function updateRow<T extends { id: string }>(rows: T[], updateRows: (rows: T[]) => void, id: string, patch: Partial<T>) {
  updateRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
}

function normalizeFormPlan(plan: TrustPlan): TrustPlan {
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
      executionRanks: plan.basicInfo.executionRanks?.length ? plan.basicInfo.executionRanks : executionRankOptions.map((option) => option.value)
    },
    paymentConfig: {
      ...plan.paymentConfig,
      paymentFrequency: isMyTrust ? "One-Off" : plan.paymentConfig.paymentFrequency
    },
    tenureConfig: {
      ...plan.tenureConfig,
      lockInPeriod: isMyTrust ? 2 : plan.tenureConfig.lockInPeriod,
      lockInPeriodUnit: isMyTrust ? "Years" : plan.tenureConfig.lockInPeriodUnit,
      allowEarlyWithdrawal: isMyTrust ? true : plan.tenureConfig.allowEarlyWithdrawal,
      earlyWithdrawalFeeType: isMyTrust ? "Percentage" : plan.tenureConfig.earlyWithdrawalFeeType,
      earlyWithdrawalFeeValue: isMyTrust ? 30 : plan.tenureConfig.earlyWithdrawalFeeValue
    },
    returnConfig: {
      ...plan.returnConfig,
      method: enabledReturnMethods.includes(plan.returnConfig.method as ReturnMethod) ? plan.returnConfig.method : defaultReturnMethod,
      matrixTiers: isMyTrust ? createMyTrustMatrixTiers() : plan.returnConfig.matrixTiers
    },
    payoutConfig: {
      ...plan.payoutConfig,
      payoutFrequency: isMyTrust ? "Quarterly" : plan.payoutConfig.payoutFrequency,
      calculationStart: "From Commencement Date",
      allowDividendRedeposit: isMyTrust ? false : plan.payoutConfig.allowDividendRedeposit
    },
    hasBonusReturn: isMyTrust ? false : plan.hasBonusReturn,
    bonusRules: isMyTrust ? [] : plan.bonusRules,
    commissionConfig: {
      ...plan.commissionConfig,
      method: enabledCommissionMethods.includes(plan.commissionConfig.method as CommissionMethod) ? plan.commissionConfig.method : defaultCommissionMethod,
      oneOff: { tiers: isMyTrust ? createMyTrustCommissionTiers(plan.id) : normalizeCommissionTiers(plan.commissionConfig.oneOff.tiers) },
      monthly: { ...plan.commissionConfig.monthly, tiers: normalizeCommissionTiers(plan.commissionConfig.monthly.tiers) },
      yearly: { years: plan.commissionConfig.yearly.years.map((year) => ({ ...year, tiers: normalizeCommissionTiers(year.tiers) })) },
      multiYear: { plans: plan.commissionConfig.multiYear.plans.map((commissionPlan) => ({ ...commissionPlan, years: commissionPlan.years.map((year) => ({ ...year, tiers: normalizeCommissionTiers(year.tiers) })) })) },
      hybrid: { phases: plan.commissionConfig.hybrid.phases.map((phase) => ({ ...phase, tiers: normalizeCommissionTiers(phase.tiers) })) }
    },
    commissionRules: {
      ...plan.commissionRules,
      calculationBasis: "Gross Placement Amount",
      rankDetermination: "Rank at Completed"
    },
    hasComplimentaryBenefits: isMyTrust ? true : plan.hasComplimentaryBenefits,
    benefits: isMyTrust ? createMyTrustBenefitTiers() : plan.benefits.map((benefit) => ({ ...benefit, maximumPlacement: benefit.noMaximum ? undefined : benefit.maximumPlacement })),
    fees: createStaticFeeRules(plan.fees)
  };
}

function createCommissionTier(): CommissionTier {
  return { id: createId("COMM"), rank: "TR", commissionType: "PERSONAL", rate: 0 };
}

function createMyTrustMatrixTiers(): MatrixTier[] {
  return [
    { id: "TP-MYTRUST-MATRIX-1", minimumPlacement: 10000, maximumPlacement: 99999.99, noMaximum: false, yearlyRates: { 1: 8, 2: 8 } },
    { id: "TP-MYTRUST-MATRIX-2", minimumPlacement: 100000, maximumPlacement: 249999.99, noMaximum: false, yearlyRates: { 1: 8, 2: 9 } },
    { id: "TP-MYTRUST-MATRIX-3", minimumPlacement: 250000, maximumPlacement: 499999.99, noMaximum: false, yearlyRates: { 1: 8, 2: 9.5 } },
    { id: "TP-MYTRUST-MATRIX-4", minimumPlacement: 500000, maximumPlacement: 999999.99, noMaximum: false, yearlyRates: { 1: 8, 2: 10 } },
    { id: "TP-MYTRUST-MATRIX-5", minimumPlacement: 1000000, noMaximum: true, yearlyRates: { 1: 9, 2: 11 } }
  ];
}

function createMyTrustCommissionTiers(planId: string): CommissionTier[] {
  return [
    { id: `${planId}-TR`, rank: "TR", commissionType: "PERSONAL", rate: 5 },
    { id: `${planId}-TM`, rank: "TM", commissionType: "OVERRIDING", rate: 0.3 },
    { id: `${planId}-TD`, rank: "TD", commissionType: "OVERRIDING", rate: 0.2 },
    { id: `${planId}-GTD`, rank: "GTD", commissionType: "OVERRIDING", rate: 0.1 },
    { id: `${planId}-CTD`, rank: "CTD", commissionType: "OVERRIDING", rate: 0.05 }
  ];
}

function createMyTrustBenefitTiers(): BenefitTier[] {
  return [
    { id: "TP-MYTRUST-BENEFIT-1", minimumPlacement: 100000, maximumPlacement: 249999.99, noMaximum: false, benefitName: "Free Insurance Trust", benefitValue: 1800, fulfilmentMethod: "Manual" },
    { id: "TP-MYTRUST-BENEFIT-2", minimumPlacement: 250000, maximumPlacement: 499999.99, noMaximum: false, benefitName: "Free Hybrid Trust", benefitValue: 4800, fulfilmentMethod: "Manual" },
    { id: "TP-MYTRUST-BENEFIT-3", minimumPlacement: 500000, maximumPlacement: 999999.99, noMaximum: false, benefitName: "Free Private Trust", benefitValue: 30000, fulfilmentMethod: "Manual" },
    { id: "TP-MYTRUST-BENEFIT-4", minimumPlacement: 1000000, noMaximum: true, benefitName: "Free Private Trust + Premium Will", benefitValue: 35000, fulfilmentMethod: "Manual" }
  ];
}

function createHybridCommissionTier(tiers: CommissionTier[]): CommissionTier {
  const nextRank = rankOptions.find((rank) => !tiers.some((tier) => tier.rank === rank)) ?? "TR";
  return { id: createId("COMM"), rank: nextRank, commissionType: nextRank === "TR" ? "PERSONAL" : "OVERRIDING", rate: 0 };
}

function getHybridRateLabel(method: string) {
  if (method === "Monthly Recurring Commission") return "Rate (% / Month)";
  if (method === "Yearly Commission") return "Rate (% / Year)";
  return "Rate (%)";
}

function HybridPhaseSummary({ phase }: { phase: CommissionPhase }) {
  const total = sumRates(phase.tiers);
  if (phase.commissionMethod === "Monthly Recurring Commission") {
    return (
      <div className="grid gap-2 rounded-lg bg-soft p-4 text-sm sm:grid-cols-2">
        <SummaryValue label="Total / Month" value={`${formatRate(total, 3)}%`} />
        <SummaryValue label="Annual Equivalent" value={`${formatRate(total * 12, 2)}%`} />
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-soft p-4 text-sm">
      <SummaryValue label={phase.commissionMethod === "Yearly Commission" ? "Total / Year" : "Maximum Total Commission"} value={`${formatRate(total, 2)}%`} />
    </div>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-semibold text-textSecondary">{label}</span>
      <span className="font-semibold text-textPrimary">{value}</span>
    </div>
  );
}

function getHybridCommissionErrors(phases: CommissionPhase[]) {
  return phases.flatMap((phase) => getHybridPhaseErrors(phases, phase));
}

function getHybridPhaseErrors(phases: CommissionPhase[], phase: CommissionPhase) {
  const errors: string[] = [];
  if (phase.fromYear === undefined) errors.push("From Year is required.");
  if (phase.toYear === undefined) errors.push("To Year is required.");
  if (Number(phase.fromYear ?? 0) < 1) errors.push("From Year must be 1 or higher.");
  if (phase.toYear !== undefined && phase.fromYear !== undefined && phase.toYear < phase.fromYear) errors.push("To Year must be greater than or equal to From Year.");
  if (phases.some((item) => item.id !== phase.id && yearsOverlap(phase, item))) errors.push("Commission phases must not overlap.");
  if (phase.tiers.length === 0) errors.push("Add at least one commission rate row.");
  if (hasDuplicateRanks(phase.tiers)) errors.push("Rank cannot be duplicated within the same phase.");
  if (phase.tiers.some((tier) => Number(tier.rate ?? 0) < 0)) errors.push("Rate must be 0 or higher.");
  return errors;
}

function yearsOverlap(a: CommissionPhase, b: CommissionPhase) {
  if (a.fromYear === undefined || a.toYear === undefined || b.fromYear === undefined || b.toYear === undefined) return false;
  return a.fromYear <= b.toYear && b.fromYear <= a.toYear;
}

function hasDuplicateRanks(tiers: CommissionTier[]) {
  const ranks = tiers.map((tier) => tier.rank).filter(Boolean);
  return new Set(ranks).size !== ranks.length;
}

function formatRate(value: number, digits: number) {
  return Number(value || 0).toFixed(digits);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getYearCount(plan: TrustPlan) {
  const period = plan.basicInfo.fundManagementPeriod ?? 0;
  const years = plan.basicInfo.fundManagementPeriodUnit === "Years" ? period : Math.ceil(period / 12);
  return Math.max(1, Math.min(30, years || 1));
}

function createYearRateMap(yearCount: number) {
  return Object.fromEntries(Array.from({ length: yearCount }, (_, index) => [index + 1, 0]));
}

function sumRates(tiers: CommissionTier[]) {
  return tiers.reduce((sum, tier) => sum + Number(tier.rate || 0), 0);
}

function validateForActivation(plan: TrustPlan): ValidationItem[] {
  return validateStepCompletion(plan);
}

function createActivationJson(plan: TrustPlan) {
  return buildTrustPlanPayload(plan);
}

function validateStepCompletion(plan: TrustPlan): ValidationItem[] {
  const errors: ValidationItem[] = [];
  const add = (key: string, message: string, step: number) => errors.push({ key, message, step });
  if (!plan.basicInfo.productName.trim()) add("productName", "Product Name is required.", 0);
  if (!plan.basicInfo.productCategory) add("productCategory", "Product Category is required.", 0);
  if (plan.basicInfo.minimumPlacement === undefined || plan.basicInfo.minimumPlacement === null) add("minimumPlacement", "Minimum Placement is required.", 0);
  if (Number(plan.basicInfo.minimumPlacement ?? 0) < 0) add("minimumPlacementNegative", "Minimum Placement cannot be negative.", 0);
  if (plan.basicInfo.minimumPlacement !== undefined && getNullableMaximum(plan.basicInfo.noMaximum, plan.basicInfo.maximumPlacement) !== null && Number(plan.basicInfo.maximumPlacement) < plan.basicInfo.minimumPlacement) add("maximumPlacement", "Maximum Placement must be greater than or equal to Minimum Placement.", 0);
  if (!plan.basicInfo.fundManagementPeriod) add("fundPeriod", "Fund Management Period is required.", 0);
  if (Number(plan.basicInfo.fundManagementPeriod ?? 0) < 1) add("fundPeriodPositive", "Fund Management Period must be greater than 0.", 0);
  if (!plan.basicInfo.executionRanks.length) add("executionRanks", "At least one eligible execution rank is required.", 0);
  if (!plan.tenureConfig.lockInPeriod) add("lockInPeriod", "Lock-In Period is required.", 2);
  if (Number(plan.tenureConfig.lockInPeriod ?? 0) <= 0) add("lockInPeriodPositive", "Lock-In Period must be greater than 0.", 2);
  if (plan.tenureConfig.allowEarlyWithdrawal && !plan.tenureConfig.earlyWithdrawalFeeType) add("earlyWithdrawalFeeType", "Early Withdrawal Fee Type is required when early withdrawal is allowed.", 2);
  if (plan.tenureConfig.allowEarlyWithdrawal && plan.tenureConfig.earlyWithdrawalFeeValue === undefined) add("earlyWithdrawalFeeValue", "Early Withdrawal Fee Value is required when early withdrawal is allowed.", 2);
  if (plan.tenureConfig.allowEarlyWithdrawal && Number(plan.tenureConfig.earlyWithdrawalFeeValue ?? 0) < 0) add("earlyWithdrawalFeeNegative", "Early Withdrawal Fee Value cannot be negative.", 2);
  if (!plan.returnConfig.method) add("returnMethod", "Return Method is required.", 3);
  if (!hasValidReturnRule(plan)) add("returnRule", "At least one valid return rule is required.", 3);
  validatePlacementTiers(plan.returnConfig.matrixTiers, "matrixTier", 3, add);
  validateMatrixRates(plan, add);
  if (!plan.payoutConfig.payoutFrequency) add("payoutFrequency", "Payout Frequency is required.", 4);
  if (plan.commissionConfig.enabled && !plan.commissionConfig.method) add("commissionMethod", "Commission Method is required.", 6);
  if (plan.commissionConfig.enabled && !hasValidCommission(plan)) {
    add("commissionConfig", "Valid commission configuration is required.", 6);
  }
  validateCommissionTiers(plan.commissionConfig.oneOff.tiers, add);
  if (plan.commissionRules.calculationBasis !== "Gross Placement Amount") add("commissionBasis", "Commission Calculation Basis must be Gross Placement Amount.", 7);
  if (plan.commissionRules.rankDetermination !== "Rank at Completed") add("rankDetermination", "Rank Determination must be Rank at Completed.", 7);
  if (plan.hasComplimentaryBenefits) {
    validatePlacementTiers(plan.benefits, "benefitTier", 8, add);
    plan.benefits.forEach((benefit, index) => {
      if (!benefit.benefitName.trim()) add(`benefitName-${index}`, `Benefit Tier ${index + 1}: Benefit Name is required.`, 8);
      if (Number(benefit.benefitValue ?? 0) < 0) add(`benefitValue-${index}`, `Benefit Tier ${index + 1}: Benefit Value cannot be negative.`, 8);
    });
  }
  return errors;
}

function validatePlacementTiers(
  tiers: Array<{ minimumPlacement?: number; maximumPlacement?: number; noMaximum: boolean }>,
  keyPrefix: string,
  step: number,
  add: (key: string, message: string, step: number) => void
) {
  const sorted = [...tiers].sort((a, b) => Number(a.minimumPlacement ?? 0) - Number(b.minimumPlacement ?? 0));
  const unlimitedIndex = sorted.findIndex((tier) => tier.noMaximum);
  if (sorted.filter((tier) => tier.noMaximum).length > 1) add(`${keyPrefix}-unlimited`, "Only one unlimited placement tier is allowed.", step);
  if (unlimitedIndex >= 0 && unlimitedIndex !== sorted.length - 1) add(`${keyPrefix}-unlimited-last`, "Unlimited placement tier must be the final tier.", step);

  sorted.forEach((tier, index) => {
    if (tier.minimumPlacement === undefined || tier.minimumPlacement === null) add(`${keyPrefix}-minimum-${index}`, `Tier ${index + 1}: Minimum Placement is required.`, step);
    if (Number(tier.minimumPlacement ?? 0) < 0) add(`${keyPrefix}-minimum-negative-${index}`, `Tier ${index + 1}: Minimum Placement cannot be negative.`, step);
    const maximumPlacement = getNullableMaximum(tier.noMaximum, tier.maximumPlacement);
    if (tier.minimumPlacement !== undefined && maximumPlacement !== null && maximumPlacement < tier.minimumPlacement) add(`${keyPrefix}-maximum-${index}`, `Tier ${index + 1}: Maximum Placement must be greater than or equal to Minimum Placement.`, step);
    const nextTier = sorted[index + 1];
    if (nextTier?.minimumPlacement !== undefined && maximumPlacement !== null && maximumPlacement >= nextTier.minimumPlacement) add(`${keyPrefix}-overlap-${index}`, `Tier ${index + 1}: Placement tiers must not overlap.`, step);
  });
}

function validateMatrixRates(plan: TrustPlan, add: (key: string, message: string, step: number) => void) {
  const yearCount = getYearCount(plan);
  plan.returnConfig.matrixTiers.forEach((tier, tierIndex) => {
    Array.from({ length: yearCount }, (_, index) => index + 1).forEach((year) => {
      const rate = tier.yearlyRates[year];
      if (rate === undefined || rate === null || Number.isNaN(Number(rate))) add(`matrix-rate-${tierIndex}-${year}`, `Matrix Tier ${tierIndex + 1}: Year ${year} rate is required.`, 3);
      if (Number(rate) < 0) add(`matrix-rate-negative-${tierIndex}-${year}`, `Matrix Tier ${tierIndex + 1}: Year ${year} rate cannot be negative.`, 3);
    });
  });
}

function validateCommissionTiers(tiers: CommissionTier[], add: (key: string, message: string, step: number) => void) {
  const ranks = tiers.map((tier) => tier.rank).filter(Boolean);
  if (new Set(ranks).size !== ranks.length) add("commissionDuplicateRanks", "Duplicate rank configuration is not allowed for one-off commission.", 6);
  tiers.forEach((tier, index) => {
    if (!tier.rank) add(`commissionRank-${index}`, `Commission Tier ${index + 1}: Rank is required.`, 6);
    if (!tier.commissionType) add(`commissionType-${index}`, `Commission Tier ${index + 1}: Commission Type is required.`, 6);
    if (Number(tier.rate ?? 0) < 0) add(`commissionRate-${index}`, `Commission Tier ${index + 1}: Commission Rate cannot be negative.`, 6);
  });
}

function getStepErrorMap(errors: ValidationItem[]) {
  return errors.reduce<Record<number, boolean>>((map, error) => ({ ...map, [error.step]: true }), {});
}

function hasValidReturnRule(plan: TrustPlan) {
  const method = plan.returnConfig.method;
  if (method === "Fixed Rate") return Boolean(plan.returnConfig.fixedRate.annualRate);
  if (method === "Investment Tier Rate") return plan.returnConfig.investmentTiers.some((tier) => Number(tier.annualRate ?? 0) > 0);
  if (method === "Period / Year Tiered Rate") return plan.returnConfig.periodRates.some((tier) => Number(tier.returnRate ?? 0) > 0);
  if (method === "Investment + Period Tier Rate") return plan.returnConfig.matrixTiers.some((tier) => Object.values(tier.yearlyRates).some((rate) => Number(rate) > 0));
  if (method === "Fixed Rate + Bonus") return Boolean(plan.returnConfig.fixedBonus.baseAnnualRate);
  if (method === "Redeposit / Accumulated Return") return Boolean(plan.returnConfig.redeposit.baseAnnualRate);
  return false;
}

function hasValidCommission(plan: TrustPlan) {
  const config = plan.commissionConfig;
  if (config.method === "One-Off Commission") return config.oneOff.tiers.some((tier) => Number(tier.rate ?? 0) > 0);
  if (config.method === "Monthly Recurring Commission") return config.monthly.tiers.some((tier) => Number(tier.rate ?? 0) > 0);
  if (config.method === "Yearly Commission") return config.yearly.years.some((year) => year.tiers.some((tier) => Number(tier.rate ?? 0) > 0));
  if (config.method === "Multi-Year Tiered Commission") return config.multiYear.plans.some((plan) => plan.years.some((year) => year.tiers.some((tier) => Number(tier.rate ?? 0) > 0)));
  if (config.method === "Hybrid Commission") return getHybridCommissionErrors(config.hybrid.phases).length === 0;
  return false;
}

function formatCurrency(value?: number) {
  return `RM ${Number(value ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatExecutionRanks(ranks: TrustExecutionRank[]) {
  if (!ranks.length) return "-";
  return ranks.map((rank) => executionRankOptions.find((option) => option.value === rank)?.label ?? rank).join(", ");
}

const returnMethods: Array<{ title: ReturnMethod; description: string }> = [
  { title: "Fixed Rate", description: "Same return rate throughout the trust period." },
  { title: "Investment Tier Rate", description: "Different return rate based on investment amount." },
  { title: "Period / Year Tiered Rate", description: "Different return rate based on year or period." },
  { title: "Investment + Period Tier Rate", description: "Different return rate based on both investment amount and year." },
  { title: "Fixed Rate + Bonus", description: "Regular return plus milestone or maturity bonus." },
  { title: "Redeposit / Accumulated Return", description: "Supports dividend redeposit and accumulated return calculations." }
];

const commissionMethods = [
  { title: "One-Off Commission" as const, description: "Paid once based on the trust placement." },
  { title: "Monthly Recurring Commission" as const, description: "Paid monthly during the configured commission period." },
  { title: "Yearly Commission" as const, description: "Paid based on different yearly rates." },
  { title: "Multi-Year Tiered Commission" as const, description: "Different commission rates by year and rank / tier." },
  { title: "Hybrid Commission" as const, description: "Combination of one-off and recurring commission." }
];

const rankOptions = ["TR", "TM", "TD", "GTD", "CTD"];
const rankLabels: Record<string, string> = {
  TR: "Trust Representative",
  TM: "Trust Manager",
  TD: "Trust Director",
  GTD: "Group Trust Director",
  CTD: "Chief Trust Director"
};
const commissionTypeOptions = ["PERSONAL", "OVERRIDING"];
const hybridCommissionMethodOptions = ["One-Off Commission", "Monthly Recurring Commission", "Yearly Commission"];
const calculationBasisOptions = ["Original Investment Amount", "Current Balance", "Daily Balance", "Accumulated Balance"];
const executionRankOptions: Array<{ label: string; value: TrustExecutionRank }> = [
  { label: "Saving Trust Representative", value: "STR" },
  { label: "Trust Representative", value: "TR" },
  { label: "Trust Manager", value: "TM" },
  { label: "Trust Director", value: "TD" },
  { label: "Group Trust Director", value: "GTD" },
  { label: "Chief Trust Director", value: "CTD" }
];

function toReferenceCode(value: string) {
  return value.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}

function getReferenceLabel(value: string) {
  if (!value || value !== toReferenceCode(value)) return value;
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function getRankLabel(value: string) {
  return rankLabels[value] ?? value;
}

function normalizeCommissionType(value: string): CommissionTier["commissionType"] {
  return toReferenceCode(value) === "OVERRIDING" ? "OVERRIDING" : "PERSONAL";
}

function normalizeCommissionTiers(tiers: CommissionTier[] = []): CommissionTier[] {
  return tiers.map((tier) => ({ ...tier, commissionType: normalizeCommissionType(tier.commissionType) }));
}

const reviewSections: Array<{ title: string; step: number; items: (plan: TrustPlan) => Array<{ label: string; value: string }> }> = [
  { title: "Basic Information", step: 0, items: (plan) => [{ label: "Category", value: plan.basicInfo.productCategory }, { label: "Product Name", value: plan.basicInfo.productName }, { label: "Minimum Placement", value: formatCurrency(plan.basicInfo.minimumPlacement) }, { label: "Eligible Ranks", value: formatExecutionRanks(plan.basicInfo.executionRanks) }] },
  { title: "Payment & Fees", step: 1, items: (plan) => [{ label: "Payment Frequency", value: plan.paymentConfig.paymentFrequency }, { label: "Fee Rules", value: String(plan.fees.length) }] },
  { title: "Tenure", step: 2, items: (plan) => [{ label: "Fund Management Period", value: `${plan.basicInfo.fundManagementPeriod} ${plan.basicInfo.fundManagementPeriodUnit}` }, { label: "Lock-In Period", value: plan.tenureConfig.lockInPeriod ? `${plan.tenureConfig.lockInPeriod} ${plan.tenureConfig.lockInPeriodUnit}` : "-" }, { label: "Early Withdrawal", value: plan.tenureConfig.allowEarlyWithdrawal ? "Yes" : "No" }] },
  { title: "Return Configuration", step: 3, items: (plan) => [{ label: "Return Method", value: plan.returnConfig.method }, { label: "Configured Rules", value: String(plan.returnConfig.investmentTiers.length + plan.returnConfig.periodRates.length + plan.returnConfig.matrixTiers.length) }] },
  { title: "Payout Configuration", step: 4, items: (plan) => [{ label: "Payout Frequency", value: plan.payoutConfig.payoutFrequency }, { label: "Dividend Redeposit", value: plan.payoutConfig.allowDividendRedeposit ? "Yes" : "No" }] },
  { title: "Bonus Rules", step: 5, items: (plan) => [{ label: "Has Bonus", value: plan.hasBonusReturn ? "Yes" : "No" }, { label: "Rules", value: String(plan.bonusRules.length) }] },
  { title: "Commission", step: 6, items: (plan) => [{ label: "Enabled", value: plan.commissionConfig.enabled ? "Yes" : "No" }, { label: "Method", value: plan.commissionConfig.method }, { label: "Basis", value: plan.commissionRules.calculationBasis }] },
  { title: "Complimentary Benefits", step: 8, items: (plan) => [{ label: "Has Benefits", value: plan.hasComplimentaryBenefits ? "Yes" : "No" }, { label: "Benefit Tiers", value: String(plan.benefits.length) }] }
];
