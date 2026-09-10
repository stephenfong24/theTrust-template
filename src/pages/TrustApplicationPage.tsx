import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Copy, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { StatusBadge } from "../components/common/StatusBadge";
import { Button } from "../components/ui/button";
import { trustPlanMockData } from "../data/trustPlanMockData";
import { useAuth } from "../hooks/useAuth";
import { notifySuccess } from "../services/notificationService";

const storageKey = "theTrust.applicationDrafts";
const newApplicationId = "new";

const steps = [
  { slug: "personal-details", label: "Personal Details" },
  { slug: "trust-asset", label: "Trust Asset" },
  { slug: "beneficiaries-details", label: "Beneficiaries Details" },
  { slug: "beneficiary-allocations", label: "Beneficiary Allocations" },
  { slug: "execution-of-trust-deed", label: "Execution of Trust Deed" },
  { slug: "review", label: "Review" }
] as const;

type StepSlug = (typeof steps)[number]["slug"];
type OcrConfidenceScores = Record<string, number>;

interface AllocationEntry {
  id: string;
  beneficiaryId: string;
  percentage: string;
}

interface CoBrokerEntry {
  id: string;
  email: string;
  percentage: string;
}

interface SupportingDocumentDraft {
  id: string;
  label: string;
  fileName: string;
  fileError: string;
}

interface AllocationRemoveTarget {
  group: "main" | "substitute";
  id: string;
  label: string;
}

interface BeneficiaryDraft {
  id: string;
  fullName: string;
  identityType: string;
  identityNumber: string;
  nationality: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  contactNumber: string;
  relationship: string;
  relationshipOther: string;
  address1: string;
  address2: string;
  postcode: string;
  city: string;
  state: string;
  country: string;
  usTaxReturn: string;
  otherTaxResident: string;
  taxResidenceCountry: string;
  tinNumber: string;
  tinUnavailableReason: string;
  tinUnavailableExplanation: string;
}

interface PersonalDetailsDraft {
  fullName: string;
  identityType: string;
  identityNumber: string;
  nationality: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  contactNumber: string;
  address1: string;
  address2: string;
  postcode: string;
  city: string;
  state: string;
  country: string;
  usTaxReturn: string;
  otherTaxResident: string;
  taxResidenceCountry: string;
  tinNumber: string;
  tinUnavailableReason: string;
  tinUnavailableExplanation: string;
  employerName: string;
  natureOfBusiness: string;
  occupation: string;
  annualIncome: string;
  totalNetWorth: string;
  sourceOfFunds: string[];
  otherSourceOfFunds: string;
  trustPlanId: string;
  ocrConfidence: OcrConfidenceScores;
  ocrFileName: string;
  trustAssetAmount: string;
  settlorBankName: string;
  settlorBankNameOther: string;
  settlorBankAccountHolder: string;
  settlorBankAccountNumber: string;
  settlorBankAddress: string;
  settlorSwiftCode: string;
  guaranteedReturnInstruction: string;
  paymentSource: string;
  jointAccountName: string;
  thirdPartyName: string;
  thirdPartyIdentityNumber: string;
  thirdPartyRelationship: string;
  thirdPartyRelationshipOther: string;
  paymentBankName: string;
  paymentBankNameOther: string;
  paymentBankAccountHolder: string;
  paymentBankAccountNumber: string;
  beneficiaries: BeneficiaryDraft[];
  beneficiaryAllocationType: string;
  allocationMainBeneficiaryId: string;
  allocationSubstituteBeneficiaryId: string;
  allocationSubstituteBeneficiaries: AllocationEntry[];
  allocationMainBeneficiaries: AllocationEntry[];
  trustDeedSigningMethod: string;
  specialCircumstance: string;
  interpreterName: string;
  interpreterIdentityNumber: string;
  interpreterLanguage: string;
  interpreterRelationship: string;
  interpreterRelationshipOther: string;
  supportingDocuments: SupportingDocumentDraft[];
  supportingDocumentsConfirmed: boolean;
  coBrokers: CoBrokerEntry[];
}

const allocationTypeOptions = [
  "Type 1 - 100% to one Main Beneficiary with one Substitute Beneficiary",
  "Type 2 - 100% to one Main Beneficiary with equal shares to multiple Substitute Beneficiaries",
  "Type 3 - 100% to one Main Beneficiary with specific allocation to multiple Substitute Beneficiaries",
  "Type 4 - 100% to one Main Beneficiary with Trustee Company",
  "Type 5 - Equal shares to multiple Main Beneficiaries",
  "Type 6 - Specific allocation for each Beneficiaries",
  "Type 7 - 100% to Trustee Company"
];

const allocationTypes = {
  type1: allocationTypeOptions[0],
  type2: allocationTypeOptions[1],
  type3: allocationTypeOptions[2],
  type4: allocationTypeOptions[3],
  type5: allocationTypeOptions[4],
  type6: allocationTypeOptions[5],
  type7: allocationTypeOptions[6]
};

const signingMethodOptions = ["Signature", "Thumbprint"];
const specialCircumstanceOptions = ["None", "Illiterate", "Blind", "Less proficient in English"];
const supportingDocumentAccept = ".pdf,.jpg,.jpeg,.png,.docx,.xlsx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const supportingDocumentMaxSize = 5 * 1024 * 1024;
const allowedSupportingDocumentExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".xlsx"];

const emptyDraft: PersonalDetailsDraft = {
  fullName: "",
  identityType: "NRIC",
  identityNumber: "",
  nationality: "Malaysian",
  gender: "",
  dateOfBirth: "",
  email: "",
  contactNumber: "",
  address1: "",
  address2: "",
  postcode: "",
  city: "",
  state: "",
  country: "Malaysia",
  usTaxReturn: "No",
  otherTaxResident: "No",
  taxResidenceCountry: "",
  tinNumber: "",
  tinUnavailableReason: "",
  tinUnavailableExplanation: "",
  employerName: "",
  natureOfBusiness: "",
  occupation: "",
  annualIncome: "",
  totalNetWorth: "",
  sourceOfFunds: ["Current Income"],
  otherSourceOfFunds: "",
  trustPlanId: "TP-MYTRUST",
  ocrConfidence: {},
  ocrFileName: "",
  trustAssetAmount: "",
  settlorBankName: "",
  settlorBankNameOther: "",
  settlorBankAccountHolder: "",
  settlorBankAccountNumber: "",
  settlorBankAddress: "",
  settlorSwiftCode: "",
  guaranteedReturnInstruction: "Withdraw to bank account",
  paymentSource: "My Personal Account",
  jointAccountName: "",
  thirdPartyName: "",
  thirdPartyIdentityNumber: "",
  thirdPartyRelationship: "",
  thirdPartyRelationshipOther: "",
  paymentBankName: "",
  paymentBankNameOther: "",
  paymentBankAccountHolder: "",
  paymentBankAccountNumber: "",
  beneficiaries: [createEmptyBeneficiary()],
  beneficiaryAllocationType: allocationTypes.type1,
  allocationMainBeneficiaryId: "",
  allocationSubstituteBeneficiaryId: "",
  allocationSubstituteBeneficiaries: [createEmptyAllocationEntry()],
  allocationMainBeneficiaries: [createEmptyAllocationEntry()],
  trustDeedSigningMethod: "Signature",
  specialCircumstance: "None",
  interpreterName: "",
  interpreterIdentityNumber: "",
  interpreterLanguage: "",
  interpreterRelationship: "",
  interpreterRelationshipOther: "",
  supportingDocuments: createEmptySupportingDocuments(),
  supportingDocumentsConfirmed: false,
  coBrokers: []
};

const bankOptions = [
  "",
  "Maybank",
  "CIMB Bank Berhad",
  "Public Bank Berhad",
  "RHB Bank Berhad",
  "Hong Leong Bank Berhad",
  "HSBC Bank Malaysia Berhad",
  "OCBC Bank (Malaysia) Berhad",
  "Others"
];

const paymentSourceOptions = ["My Personal Account", "Joint Account", "Third Party"];

const relationshipOptions = ["", "Spouse", "Parent", "Child", "Sibling", "Grandparent", "Grandchild", "Grandnephew", "Others"];
const beneficiaryRelationshipOptions = ["", "Spouse", "Parent", "Child", "Daughter", "Son", "Sibling", "Grandparent", "Grandchild", "Grandnephew", "Others"];
const identityTypeOptions = ["NRIC", "Passport", "Company ID"];
const nationalityOptions = ["Malaysian", "Singaporean", "Indonesian", "Other"];
const genderOptions = ["", "Male", "Female"];
const countryOptions = ["Malaysia", "Singapore", "Indonesia", "Other"];
const taxReasonOptions = ["", "[A] TIN is not issued by the country / jurisdiction of tax residence", "[B] Unable to provide TIN. Please explain why you are unable to provide", "[C] TIN is not required by country of tax residence"];

const guaranteedReturnOptions = [
  {
    value: "Withdraw to bank account",
    label: "I wish to have the guaranteed returns withdrawn and transferred into the above bank account."
  },
  {
    value: "Redeposit as trust asset",
    label: "I wish to have the guaranteed returns to be re-deposited as Trust Asset."
  }
];

function createEmptyBeneficiary(): BeneficiaryDraft {
  return {
    id: `BEN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fullName: "",
    identityType: "NRIC",
    identityNumber: "",
    nationality: "Malaysian",
    gender: "",
    dateOfBirth: "",
    email: "",
    contactNumber: "",
    relationship: "",
    relationshipOther: "",
    address1: "",
    address2: "",
    postcode: "",
    city: "",
    state: "",
    country: "Malaysia",
    usTaxReturn: "No",
    otherTaxResident: "No",
    taxResidenceCountry: "",
    tinNumber: "",
    tinUnavailableReason: "",
    tinUnavailableExplanation: ""
  };
}

function createEmptyAllocationEntry(): AllocationEntry {
  return {
    id: `ALLOC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    beneficiaryId: "",
    percentage: ""
  };
}

function createEmptyCoBroker(): CoBrokerEntry {
  return {
    id: `COB-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: "",
    percentage: ""
  };
}

function createEmptySupportingDocuments(): SupportingDocumentDraft[] {
  return [1, 2, 3].map((number) => ({
    id: `DOC-${number}`,
    label: `Supporting Document ${number}`,
    fileName: "",
    fileError: ""
  }));
}

export function TrustApplicationPage() {
  const { applicationId = newApplicationId, step = "personal-details" } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const currentStep = steps.find((entry) => entry.slug === step);
  const [draft, setDraft] = useState<PersonalDetailsDraft>(() => loadDraft(applicationId));

  if (applicationId === newApplicationId && session?.role !== "AG") return <Navigate to="/access-denied" replace />;
  if (!currentStep) return <Navigate to={`/trust/applications/${applicationId}/personal-details`} replace />;

  const isPersonalDetails = currentStep.slug === "personal-details";
  const isTrustAsset = currentStep.slug === "trust-asset";
  const isBeneficiariesDetails = currentStep.slug === "beneficiaries-details";
  const isBeneficiaryAllocations = currentStep.slug === "beneficiary-allocations";
  const isExecutionOfTrustDeed = currentStep.slug === "execution-of-trust-deed";
  const isReview = currentStep.slug === "review";

  const saveDraft = (nextStep?: StepSlug) => {
    saveApplicationDraft(applicationId, draft);
    notifySuccess(nextStep ? `${currentStep.label} saved. Continue with the next step.` : `${currentStep.label} saved.`, "trust-application-draft");
    if (nextStep) navigate(`/trust/applications/${applicationId}/${nextStep}`);
  };

  const submitApplication = () => {
    saveApplicationDraft(applicationId, draft);
    notifySuccess("Trust application submitted successfully.", "trust-application-submit");
    navigate("/trust/listing");
  };

  return (
    <>
      <PageHeader
        title={applicationId === newApplicationId ? "New Trust Application" : "Trust Application"}
        description="Each section has its own URL and saves as a draft before moving to the next application stage."
        actions={
          <Button variant="outline" type="button" asChild>
            <Link to="/trust/listing">
              <ArrowLeft className="h-4 w-4" />
              Back to Listing
            </Link>
          </Button>
        }
      />

      <ApplicationStepNav applicationId={applicationId} currentStep={currentStep.slug} />

      {isPersonalDetails ? (
        <PersonalDetailsStep draft={draft} onChange={setDraft} onSave={() => saveDraft()} onSaveNext={() => saveDraft("trust-asset")} />
      ) : isTrustAsset ? (
        <TrustAssetStep applicationId={applicationId} draft={draft} onChange={setDraft} onSave={() => saveDraft()} onSaveNext={() => saveDraft("beneficiaries-details")} />
      ) : isBeneficiariesDetails ? (
        <BeneficiariesDetailsStep applicationId={applicationId} draft={draft} onChange={setDraft} onSave={() => saveDraft()} onSaveNext={() => saveDraft("beneficiary-allocations")} />
      ) : isBeneficiaryAllocations ? (
        <BeneficiaryAllocationsStep applicationId={applicationId} draft={draft} onChange={setDraft} onSave={() => saveDraft()} onSaveNext={() => saveDraft("execution-of-trust-deed")} />
      ) : isExecutionOfTrustDeed ? (
        <ExecutionOfTrustDeedStep applicationId={applicationId} draft={draft} onChange={setDraft} onSave={() => saveDraft()} onSaveNext={() => saveDraft("review")} />
      ) : isReview ? (
        <ReviewStep applicationId={applicationId} draft={draft} onChange={setDraft} onSave={() => saveDraft()} onSubmit={submitApplication} />
      ) : (
        null
      )}
    </>
  );
}

function ApplicationStepNav({ applicationId, currentStep }: { applicationId: string; currentStep: StepSlug }) {
  const currentIndex = steps.findIndex((step) => step.slug === currentStep);

  return (
    <nav className="mb-5 overflow-hidden rounded-lg border border-line bg-white shadow-soft" aria-label="Trust application steps">
      <ol className="grid gap-px bg-line md:grid-cols-3 xl:grid-cols-6">
        {steps.map((step, index) => {
          const isActive = step.slug === currentStep;
          const isComplete = index < currentIndex;
          return (
            <li key={step.slug} className="bg-white">
              <Link
                to={`/trust/applications/${applicationId}/${step.slug}`}
                className={isActive ? "flex h-full min-h-16 items-center gap-3 border-l-4 border-brandGold bg-[#FFFBEB] px-4 py-3" : "flex h-full min-h-16 items-center gap-3 border-l-4 border-transparent px-4 py-3 hover:bg-gray-50"}
              >
                <span className={isActive || isComplete ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white" : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-soft text-xs font-semibold text-textSecondary"}>
                  {isComplete ? <CheckCircle2 className="h-4 w-4 text-brandGold" /> : index + 1}
                </span>
                <span className="min-w-0 text-sm font-semibold text-textPrimary">{step.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function PersonalDetailsStep({ draft, onChange, onSave, onSaveNext }: { draft: PersonalDetailsDraft; onChange: (draft: PersonalDetailsDraft) => void; onSave: () => void; onSaveNext: () => void }) {
  const selectedPlan = useMemo(() => trustPlanMockData.find((plan) => plan.id === draft.trustPlanId) ?? trustPlanMockData[0], [draft.trustPlanId]);
  const [isExtractingIc, setIsExtractingIc] = useState(false);

  const update = <K extends keyof PersonalDetailsDraft>(key: K, value: PersonalDetailsDraft[K]) => {
    onChange({ ...draft, [key]: value });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSaveNext();
  };

  const handleIcUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (draft.identityType !== "NRIC") {
      event.target.value = "";
      return;
    }
    if (!file) return;
    const fileName = file.name;
    event.target.value = "";
    setIsExtractingIc(true);
    window.setTimeout(() => {
      onChange({
        ...draft,
        fullName: draft.fullName || "Tan Ah Kao",
        identityType: "NRIC",
        identityNumber: draft.identityNumber || "880101-10-5235",
        address1: draft.address1 || "No 1 Jalan Main",
        address2: draft.address2 || "Taman Damai",
        postcode: draft.postcode || "12345",
        city: draft.city || "Ipoh",
        state: draft.state || "Perak",
        country: "Malaysia",
        nationality: "Malaysian",
        dateOfBirth: draft.dateOfBirth || "1988-01-01",
        ocrConfidence: {
          "IC Number": 90,
          "Full Name": 100,
          "Address Line 1": 88,
          "Address Line 2": 82,
          Postcode: 95,
          City: 93,
          State: 91,
          Country: 99
        },
        ocrFileName: fileName
      });
      setIsExtractingIc(false);
    }, 1200);
  };

  const canExtractIc = draft.identityType === "NRIC" && !isExtractingIc;

  return (
    <form onSubmit={submit} className="relative space-y-5" aria-busy={isExtractingIc}>
      {isExtractingIc ? <ExtractionOverlay /> : null}
      <Section title="Personal Details">
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            <label className={canExtractIc ? "flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-brandGold/70 bg-white px-5 py-6 text-center transition hover:bg-[#FFFBEB]" : "flex min-h-44 cursor-not-allowed flex-col items-center justify-center rounded-lg border border-dashed border-line bg-soft px-5 py-6 text-center opacity-70"}>
              <UploadCloud className="h-9 w-9 text-brandGold" />
              <span className="mt-3 text-sm font-semibold text-textPrimary">Upload front IC</span>
              <span className="mt-1 text-xs text-textSecondary">{draft.identityType === "NRIC" ? "Demo OCR auto-fills these fields" : "Available for NRIC only"}</span>
              <input type="file" accept="image/*,.pdf" onChange={handleIcUpload} disabled={!canExtractIc} className="sr-only" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Readout label="Uploaded File" value={draft.ocrFileName || "No file uploaded"} />
              <OcrConfidenceList scores={draft.ocrConfidence} />
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <h3 className="border-b border-line pb-2 text-sm font-semibold text-textPrimary">Identity Information</h3>
              <div className="mt-3 grid content-start gap-4 md:grid-cols-2">
                <TextInput label="Full Name" value={draft.fullName} onChange={(value) => update("fullName", value)} required />
                <SelectInput label="Type of Identity" value={draft.identityType} options={["NRIC", "Passport", "Company ID"]} onChange={(value) => update("identityType", value)} />
                <TextInput label="NRIC No. / Passport No. / ID No." value={draft.identityNumber} onChange={(value) => update("identityNumber", value)} required />
                <SelectInput label="Nationality" value={draft.nationality} options={["Malaysian", "Singaporean", "Indonesian", "Other"]} onChange={(value) => update("nationality", value)} />
                <SelectInput label="Gender" value={draft.gender} options={["", "Male", "Female"]} onChange={(value) => update("gender", value)} />
                <TextInput label="Date of Birth" type="date" value={draft.dateOfBirth} onChange={(value) => update("dateOfBirth", value)} />
              </div>
            </div>
            <div>
              <h3 className="border-b border-line pb-2 text-sm font-semibold text-textPrimary">Contact & Address</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <TextInput label="Email" type="email" value={draft.email} onChange={(value) => update("email", value)} />
                <TextInput label="Contact Number" value={draft.contactNumber} onChange={(value) => update("contactNumber", value)} />
                <TextInput label="Address Line 1" value={draft.address1} onChange={(value) => update("address1", value)} required />
                <TextInput label="Address Line 2" value={draft.address2} onChange={(value) => update("address2", value)} />
                <TextInput label="Postcode" value={draft.postcode} onChange={(value) => update("postcode", value)} />
                <TextInput label="City" value={draft.city} onChange={(value) => update("city", value)} />
                <TextInput label="State" value={draft.state} onChange={(value) => update("state", value)} />
                <SelectInput label="Country" value={draft.country} options={["Malaysia", "Singapore", "Indonesia", "Other"]} onChange={(value) => update("country", value)} />
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Tax Return">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectInput label="Do you currently file a tax return in the United States of America?" value={draft.usTaxReturn} options={["No", "Yes"]} onChange={(value) => update("usTaxReturn", value)} />
          <SelectInput label="Are you a tax resident in, or do you file tax returns in any country other than Malaysia?" value={draft.otherTaxResident} options={["No", "Yes"]} onChange={(value) => update("otherTaxResident", value)} />
          {draft.otherTaxResident === "Yes" ? (
            <>
              <SelectInput label="Country / Jurisdiction of Tax Residence" value={draft.taxResidenceCountry} options={["", "Malaysia", "Singapore", "United States", "Other"]} onChange={(value) => update("taxResidenceCountry", value)} />
              <TextInput label="Tax Identification Number (TIN) or equivalent number" value={draft.tinNumber} onChange={(value) => update("tinNumber", value)} />
              <SelectInput
                className="md:col-span-2"
                label="Please indicate reason [A], [B] or [C] if TIN is not available"
                value={draft.tinUnavailableReason}
                options={["", "[A] TIN is not issued by the country / jurisdiction of tax residence", "[B] Unable to provide TIN. Please explain why you are unable to provide", "[C] TIN is not required by country of tax residence"]}
                onChange={(value) => update("tinUnavailableReason", value)}
              />
              {draft.tinUnavailableReason.startsWith("[B]") ? (
                <TextArea className="md:col-span-2" label="Explanation for unavailable TIN" value={draft.tinUnavailableExplanation} onChange={(value) => update("tinUnavailableExplanation", value)} />
              ) : null}
            </>
          ) : null}
        </div>
      </Section>

      <Section title="Client Due Diligence">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="Employer / Name of Company" value={draft.employerName} onChange={(value) => update("employerName", value)} />
          <TextInput label="Nature of Business" value={draft.natureOfBusiness} onChange={(value) => update("natureOfBusiness", value)} />
          <TextInput label="Occupation" value={draft.occupation} onChange={(value) => update("occupation", value)} />
          <SelectInput label="Annual Salary / Income" value={draft.annualIncome} options={["", "Up to RM100,000", "RM100,001 - RM300,000", "RM300,001 - RM500,000", "RM500,001 - RM1,000,000", "Above RM1,000,000"]} onChange={(value) => update("annualIncome", value)} />
          <SelectInput label="Total Net Worth" value={draft.totalNetWorth} options={["", "Up to RM500,000", "RM500,001 - RM1,000,000", "RM1,000,001 - RM2,000,000", "RM2,000,001 - RM5,000,000", "Above RM5,000,000"]} onChange={(value) => update("totalNetWorth", value)} />
        </div>
      </Section>

      <Section title="Source of Funds">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-textPrimary">Please mark one or more options that apply to the funds placed or to be placed.</legend>
          {["Current Income", "Inheritance", "Borrowed Capital", "Sales of asset(s)", "Other"].map((source) => (
            <label key={source} className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
              <input
                type="checkbox"
                checked={draft.sourceOfFunds.includes(source)}
                onChange={(event) => {
                  const nextSources = event.target.checked ? [...draft.sourceOfFunds, source] : draft.sourceOfFunds.filter((item) => item !== source);
                  update("sourceOfFunds", nextSources);
                }}
                className="h-4 w-4 accent-[#111111]"
              />
              {source}
            </label>
          ))}
        </fieldset>
        {draft.sourceOfFunds.includes("Other") ? <TextInput className="mt-4" label="Other source of funds" value={draft.otherSourceOfFunds} onChange={(value) => update("otherSourceOfFunds", value)} /> : null}
      </Section>

      <Section title="Plan">
        <div className="grid gap-3 lg:grid-cols-3">
          {trustPlanMockData.map((plan) => {
            const selected = plan.id === selectedPlan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => update("trustPlanId", plan.id)}
                className={selected ? "rounded-lg border border-ink bg-ink p-4 text-left text-white shadow-soft" : "rounded-lg border border-line bg-white p-4 text-left transition hover:border-brandGold hover:bg-[#FFFBEB]"}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className={selected ? "block text-sm font-semibold text-white" : "block text-sm font-semibold text-textPrimary"}>{plan.basicInfo.productName}</span>
                    <span className={selected ? "mt-1 block text-xs leading-5 text-gray-200" : "mt-1 block text-xs leading-5 text-textSecondary"}>
                      {plan.basicInfo.productCategory} plan, minimum placement {formatCurrency(plan.basicInfo.minimumPlacement)}, {plan.payoutConfig.payoutFrequency || "configured"} payout.
                    </span>
                  </span>
                  <StatusBadge status={plan.basicInfo.productStatus} />
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-3 border-t border-line bg-white/95 px-1 py-4 backdrop-blur sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onSave}>Save Draft</Button>
        <Button type="submit">
          Save & Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

function TrustAssetStep({
  applicationId,
  draft,
  onChange,
  onSave,
  onSaveNext
}: {
  applicationId: string;
  draft: PersonalDetailsDraft;
  onChange: (draft: PersonalDetailsDraft) => void;
  onSave: () => void;
  onSaveNext: () => void;
}) {
  const selectedPlan = trustPlanMockData.find((plan) => plan.id === draft.trustPlanId) ?? trustPlanMockData[0];
  const minimumAmount = selectedPlan.basicInfo.minimumPlacement;

  const update = <K extends keyof PersonalDetailsDraft>(key: K, value: PersonalDetailsDraft[K]) => {
    onChange({ ...draft, [key]: value });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSaveNext();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Section title="Trust Asset">
        <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.85fr)_1fr]">
          <div className="space-y-4">
            <TextInput label="Trust Asset Amount (MYR)" type="number" value={draft.trustAssetAmount} onChange={(value) => update("trustAssetAmount", value)} required />
            <div className="rounded-lg border border-line bg-soft px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Minimum Amount</div>
              <div className="mt-1 text-lg font-semibold text-textPrimary">{formatCurrency(minimumAmount)}</div>
              <div className="mt-1 text-xs text-textSecondary">Based on selected plan: {selectedPlan.basicInfo.productName}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-textPrimary">Settlor Bank Account Details</h3>
              <p className="mt-1 text-sm leading-6 text-textSecondary">Please fill in the bank account details. The trust asset will be deposited into this bank account upon maturity.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectInput label="Bank Name" value={draft.settlorBankName} options={bankOptions} onChange={(value) => update("settlorBankName", value)} />
              {draft.settlorBankName === "Others" ? <TextInput label="Other Bank Name" value={draft.settlorBankNameOther} onChange={(value) => update("settlorBankNameOther", value)} /> : null}
              <TextInput label="Bank Account Holder" value={draft.settlorBankAccountHolder} onChange={(value) => update("settlorBankAccountHolder", value)} />
              <TextInput label="Bank Account Number" value={draft.settlorBankAccountNumber} onChange={(value) => update("settlorBankAccountNumber", value)} />
              <TextInput label="Swiftcode" value={draft.settlorSwiftCode} onChange={(value) => update("settlorSwiftCode", value)} />
              <TextArea className="md:col-span-2" label="Bank Address" value={draft.settlorBankAddress} onChange={(value) => update("settlorBankAddress", value)} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Guaranteed Returns">
        <div className="space-y-3">
          {guaranteedReturnOptions.map((option) => (
            <label key={option.value} className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm font-semibold text-textPrimary hover:bg-gray-50">
              <input
                type="radio"
                name="guaranteedReturnInstruction"
                value={option.value}
                checked={draft.guaranteedReturnInstruction === option.value}
                onChange={() => update("guaranteedReturnInstruction", option.value)}
                className="mt-0.5 h-4 w-4 accent-[#111111]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Payments to Trustee">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-textPrimary">
            I/We hereby declare that the payment made payable to <strong>CNB Amanah Berhad</strong> (Trustee Company) is from:
          </p>
          <SelectInput label="Payment Source" value={draft.paymentSource} options={paymentSourceOptions} onChange={(value) => update("paymentSource", value)} />

          {draft.paymentSource === "Joint Account" ? (
            <div className="rounded-lg border border-line bg-soft p-4">
              <TextInput label="Joint Account Holder Name" value={draft.jointAccountName} onChange={(value) => update("jointAccountName", value)} />
            </div>
          ) : null}

          {draft.paymentSource === "Third Party" ? (
            <div className="rounded-lg border border-line bg-soft p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="Third Party Name" value={draft.thirdPartyName} onChange={(value) => update("thirdPartyName", value)} />
                <TextInput label="NRIC No. / Passport No. / ID No." value={draft.thirdPartyIdentityNumber} onChange={(value) => update("thirdPartyIdentityNumber", value)} />
                <SelectInput label="Relationship" value={draft.thirdPartyRelationship} options={relationshipOptions} onChange={(value) => update("thirdPartyRelationship", value)} />
                {draft.thirdPartyRelationship === "Others" ? <TextInput label="Other Relationship" value={draft.thirdPartyRelationshipOther} onChange={(value) => update("thirdPartyRelationshipOther", value)} /> : null}
                <SelectInput label="Bank Name" value={draft.paymentBankName} options={bankOptions} onChange={(value) => update("paymentBankName", value)} />
                {draft.paymentBankName === "Others" ? <TextInput label="Other Bank Name" value={draft.paymentBankNameOther} onChange={(value) => update("paymentBankNameOther", value)} /> : null}
                <TextInput label="Bank Account Holder" value={draft.paymentBankAccountHolder} onChange={(value) => update("paymentBankAccountHolder", value)} />
                <TextInput label="Bank Account Number" value={draft.paymentBankAccountNumber} onChange={(value) => update("paymentBankAccountNumber", value)} />
              </div>
            </div>
          ) : null}
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-3 border-t border-line bg-white/95 px-1 py-4 backdrop-blur sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" asChild>
          <Link to={`/trust/applications/${applicationId}/personal-details`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onSave}>Save Draft</Button>
          <Button type="submit">
            Save & Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}

function BeneficiariesDetailsStep({
  applicationId,
  draft,
  onChange,
  onSave,
  onSaveNext
}: {
  applicationId: string;
  draft: PersonalDetailsDraft;
  onChange: (draft: PersonalDetailsDraft) => void;
  onSave: () => void;
  onSaveNext: () => void;
}) {
  const beneficiaries = draft.beneficiaries.length ? draft.beneficiaries : [createEmptyBeneficiary()];
  const [removeTarget, setRemoveTarget] = useState<BeneficiaryDraft | null>(null);

  const updateBeneficiary = (id: string, patch: Partial<BeneficiaryDraft>) => {
    onChange({
      ...draft,
      beneficiaries: beneficiaries.map((beneficiary) => (beneficiary.id === id ? { ...beneficiary, ...patch } : beneficiary))
    });
  };

  const addBeneficiary = () => {
    onChange({ ...draft, beneficiaries: [...beneficiaries, createEmptyBeneficiary()] });
  };

  const removeBeneficiary = (id: string) => {
    if (beneficiaries.length === 1 || beneficiaries[0]?.id === id) return;
    onChange({ ...draft, beneficiaries: beneficiaries.filter((beneficiary) => beneficiary.id !== id) });
  };

  const copySettlorAddress = (id: string) => {
    updateBeneficiary(id, {
      address1: draft.address1,
      address2: draft.address2,
      postcode: draft.postcode,
      city: draft.city,
      state: draft.state,
      country: draft.country
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSaveNext();
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-textPrimary">Beneficiaries Details</h2>
          <p className="mt-1 text-sm text-textSecondary">Add at least one beneficiary. Each beneficiary can have separate address and tax information.</p>
        </div>
        <Button type="button" onClick={addBeneficiary}>
          <Plus className="h-4 w-4" />
          Add Beneficiary
        </Button>
      </div>

      {beneficiaries.map((beneficiary, index) => (
        <Section
          key={beneficiary.id}
          title={`Beneficiary ${index + 1}`}
          actions={
            beneficiaries.length > 1 && index > 0 ? (
              <Button type="button" variant="ghost" size="icon" onClick={() => setRemoveTarget(beneficiary)} aria-label={`Remove beneficiary ${index + 1}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null
          }
        >
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-5">
              <div>
                <div className="flex min-h-[50px] items-center border-b border-line pb-2">
                  <h3 className="text-sm font-semibold text-textPrimary">Identity Information</h3>
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <TextInput label="Full Name" value={beneficiary.fullName} onChange={(value) => updateBeneficiary(beneficiary.id, { fullName: value })} required />
                  <SelectInput label="Type of Identity" value={beneficiary.identityType} options={identityTypeOptions} onChange={(value) => updateBeneficiary(beneficiary.id, { identityType: value })} />
                  <TextInput label="NRIC No. / Passport No. / ID No." value={beneficiary.identityNumber} onChange={(value) => updateBeneficiary(beneficiary.id, { identityNumber: value })} required />
                  <SelectInput label="Nationality" value={beneficiary.nationality} options={nationalityOptions} onChange={(value) => updateBeneficiary(beneficiary.id, { nationality: value })} />
                  <SelectInput label="Gender" value={beneficiary.gender} options={genderOptions} onChange={(value) => updateBeneficiary(beneficiary.id, { gender: value })} />
                  <TextInput label="Date of Birth" type="date" value={beneficiary.dateOfBirth} onChange={(value) => updateBeneficiary(beneficiary.id, { dateOfBirth: value })} />
                  <TextInput label="Email" type="email" value={beneficiary.email} onChange={(value) => updateBeneficiary(beneficiary.id, { email: value })} />
                  <TextInput label="Contact Number" value={beneficiary.contactNumber} onChange={(value) => updateBeneficiary(beneficiary.id, { contactNumber: value })} />
                  <SelectInput label="Relationship" value={beneficiary.relationship} options={beneficiaryRelationshipOptions} onChange={(value) => updateBeneficiary(beneficiary.id, { relationship: value })} />
                  {beneficiary.relationship === "Others" ? <TextInput label="Other Relationship" value={beneficiary.relationshipOther} onChange={(value) => updateBeneficiary(beneficiary.id, { relationshipOther: value })} /> : null}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex min-h-[50px] flex-col gap-3 border-b border-line pb-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold text-textPrimary">Address</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => copySettlorAddress(beneficiary.id)} className="border-brandGold/45 bg-[#FFFBEB] text-textPrimary hover:bg-[#FFF4C7]">
                    <Copy className="h-4 w-4" />
                    Use Settlor Address
                  </Button>
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <TextInput className="md:col-span-2" label="Address Line 1" value={beneficiary.address1} onChange={(value) => updateBeneficiary(beneficiary.id, { address1: value })} required />
                  <TextInput className="md:col-span-2" label="Address Line 2" value={beneficiary.address2} onChange={(value) => updateBeneficiary(beneficiary.id, { address2: value })} />
                  <TextInput label="Postcode" value={beneficiary.postcode} onChange={(value) => updateBeneficiary(beneficiary.id, { postcode: value })} />
                  <TextInput label="City" value={beneficiary.city} onChange={(value) => updateBeneficiary(beneficiary.id, { city: value })} />
                  <TextInput label="State" value={beneficiary.state} onChange={(value) => updateBeneficiary(beneficiary.id, { state: value })} />
                  <SelectInput label="Country" value={beneficiary.country} options={countryOptions} onChange={(value) => updateBeneficiary(beneficiary.id, { country: value })} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="border-b border-line pb-2 text-sm font-semibold text-textPrimary">Tax Return</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <SelectInput label="Do you currently file a tax return in the United States of America?" value={beneficiary.usTaxReturn} options={["No", "Yes"]} onChange={(value) => updateBeneficiary(beneficiary.id, { usTaxReturn: value })} />
              <SelectInput label="Are you a tax resident in, or do you file tax returns in any country other than Malaysia?" value={beneficiary.otherTaxResident} options={["No", "Yes"]} onChange={(value) => updateBeneficiary(beneficiary.id, { otherTaxResident: value })} />
              {beneficiary.otherTaxResident === "Yes" ? (
                <>
                  <SelectInput label="Country / Jurisdiction of Tax Residence" value={beneficiary.taxResidenceCountry} options={["", "Malaysia", "Singapore", "United States", "Other"]} onChange={(value) => updateBeneficiary(beneficiary.id, { taxResidenceCountry: value })} />
                  <TextInput label="Tax Identification Number (TIN) or equivalent number" value={beneficiary.tinNumber} onChange={(value) => updateBeneficiary(beneficiary.id, { tinNumber: value })} />
                  <SelectInput className="md:col-span-2" label="Please indicate reason [A], [B] or [C] if TIN is not available" value={beneficiary.tinUnavailableReason} options={taxReasonOptions} onChange={(value) => updateBeneficiary(beneficiary.id, { tinUnavailableReason: value })} />
                  {beneficiary.tinUnavailableReason.startsWith("[B]") ? (
                    <TextArea className="md:col-span-2" label="Explanation for unavailable TIN" value={beneficiary.tinUnavailableExplanation} onChange={(value) => updateBeneficiary(beneficiary.id, { tinUnavailableExplanation: value })} />
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </Section>
      ))}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-3 border-t border-line bg-white/95 px-1 py-4 backdrop-blur sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" asChild>
          <Link to={`/trust/applications/${applicationId}/trust-asset`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onSave}>Save Draft</Button>
          <Button type="submit">
            Save & Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      </form>
      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove beneficiary"
        message={removeTarget ? `Are you sure you want to remove ${removeTarget.fullName || "this beneficiary"}? This record will be removed from the draft.` : "Are you sure you want to remove this beneficiary?"}
        confirmText="Remove"
        destructive
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) removeBeneficiary(removeTarget.id);
          setRemoveTarget(null);
        }}
      />
    </>
  );
}

function BeneficiaryAllocationsStep({
  applicationId,
  draft,
  onChange,
  onSave,
  onSaveNext
}: {
  applicationId: string;
  draft: PersonalDetailsDraft;
  onChange: (draft: PersonalDetailsDraft) => void;
  onSave: () => void;
  onSaveNext: () => void;
}) {
  const beneficiaries = draft.beneficiaries.length ? draft.beneficiaries : [createEmptyBeneficiary()];
  const beneficiaryOptions = [
    { value: "", label: "Please select" },
    ...beneficiaries.map((beneficiary, index) => ({
      value: beneficiary.id,
      label: beneficiary.fullName || `Beneficiary ${index + 1}`
    }))
  ];
  const substituteEntries = draft.allocationSubstituteBeneficiaries.length ? draft.allocationSubstituteBeneficiaries : [createEmptyAllocationEntry()];
  const mainEntries = draft.allocationMainBeneficiaries.length ? draft.allocationMainBeneficiaries : [createEmptyAllocationEntry()];
  const [removeAllocationTarget, setRemoveAllocationTarget] = useState<AllocationRemoveTarget | null>(null);
  const isType1 = draft.beneficiaryAllocationType === allocationTypes.type1;
  const isType2 = draft.beneficiaryAllocationType === allocationTypes.type2;
  const isType3 = draft.beneficiaryAllocationType === allocationTypes.type3;
  const isType4 = draft.beneficiaryAllocationType === allocationTypes.type4;
  const isType5 = draft.beneficiaryAllocationType === allocationTypes.type5;
  const isType6 = draft.beneficiaryAllocationType === allocationTypes.type6;
  const isType7 = draft.beneficiaryAllocationType === allocationTypes.type7;
  const activeEntries = isType5 || isType6 ? mainEntries : substituteEntries;
  const allocationTotal = activeEntries.reduce((total, entry) => total + (Number.parseFloat(entry.percentage) || 0), 0);

  const update = <K extends keyof PersonalDetailsDraft>(key: K, value: PersonalDetailsDraft[K]) => {
    onChange({ ...draft, [key]: value });
  };

  const updateEntry = (group: "main" | "substitute", id: string, patch: Partial<AllocationEntry>) => {
    const key = group === "main" ? "allocationMainBeneficiaries" : "allocationSubstituteBeneficiaries";
    const entries = group === "main" ? mainEntries : substituteEntries;
    update(key, entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)) as PersonalDetailsDraft[typeof key]);
  };

  const addEntry = (group: "main" | "substitute") => {
    const key = group === "main" ? "allocationMainBeneficiaries" : "allocationSubstituteBeneficiaries";
    const entries = group === "main" ? mainEntries : substituteEntries;
    update(key, [...entries, createEmptyAllocationEntry()] as PersonalDetailsDraft[typeof key]);
  };

  const removeEntry = (group: "main" | "substitute", id: string) => {
    const key = group === "main" ? "allocationMainBeneficiaries" : "allocationSubstituteBeneficiaries";
    const entries = group === "main" ? mainEntries : substituteEntries;
    if (entries.length <= 1) return;
    update(key, entries.filter((entry) => entry.id !== id) as PersonalDetailsDraft[typeof key]);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSaveNext();
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-5">
        <Section
          title="Beneficiary Allocations"
          description="Select the allocation method and assign beneficiaries based on the selected trust instruction."
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.8fr)_1fr]">
            <div className="space-y-4 rounded-lg border border-line bg-soft p-4">
              <SelectInput
                label="Allocation Type"
                value={draft.beneficiaryAllocationType}
                options={allocationTypeOptions}
                onChange={(value) => update("beneficiaryAllocationType", value)}
              />
              <div className="rounded-lg border border-brandGold/35 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Selected Structure</div>
                <p className="mt-2 text-sm font-semibold leading-6 text-textPrimary">{allocationDescription(draft.beneficiaryAllocationType)}</p>
              </div>
              {isType3 || isType6 ? (
                <div className={Math.abs(allocationTotal - 100) < 0.01 ? "rounded-lg border border-green-200 bg-green-50 p-4" : "rounded-lg border border-brandGold/35 bg-[#FFFBEB] p-4"}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Total Allocation</div>
                  <div className="mt-1 text-2xl font-semibold text-textPrimary">{allocationTotal.toFixed(2)}%</div>
                  <p className="mt-1 text-xs leading-5 text-textSecondary">Specific allocation types should total 100% before final submission.</p>
                </div>
              ) : null}
              {isType7 ? (
                <div className="rounded-lg border border-brandGold/35 bg-[#FFFBEB] p-4 text-sm leading-6 text-textPrimary">
                  Kindly ensure that a Private or Hybrid Trust with CNB has been created before selecting 100% allocation to Trustee Company.
                </div>
              ) : null}
            </div>

            <div className="space-y-5">
              {!isType5 && !isType6 && !isType7 ? (
                <div className="rounded-lg border border-line bg-white p-4">
                  <h3 className="border-b border-line pb-2 text-sm font-semibold text-textPrimary">Main Beneficiary</h3>
                  <SelectOptionInput className="mt-3" label="Main Beneficiary" value={draft.allocationMainBeneficiaryId} options={beneficiaryOptions} onChange={(value) => update("allocationMainBeneficiaryId", value)} />
                </div>
              ) : null}

              {isType1 ? (
                <div className="rounded-lg border border-line bg-white p-4">
                  <h3 className="border-b border-line pb-2 text-sm font-semibold text-textPrimary">Substitute Beneficiary</h3>
                  <SelectOptionInput className="mt-3" label="Substitute Beneficiary" value={draft.allocationSubstituteBeneficiaryId} options={beneficiaryOptions} onChange={(value) => update("allocationSubstituteBeneficiaryId", value)} />
                </div>
              ) : null}

              {isType2 || isType3 ? (
                <AllocationEntryGroup
                  title="Substitute Beneficiaries"
                  entries={substituteEntries}
                  options={beneficiaryOptions}
                  withPercentage={isType3}
                  addLabel="Add Substitute Beneficiary"
                  onAdd={() => addEntry("substitute")}
                  onRemove={(id, label) => setRemoveAllocationTarget({ group: "substitute", id, label })}
                  onChange={(id, patch) => updateEntry("substitute", id, patch)}
                />
              ) : null}

              {isType4 ? (
                <div className="rounded-lg border border-line bg-soft p-4 text-sm leading-6 text-textSecondary">
                  Trustee Company will be used as the substitute beneficiary under this allocation type.
                </div>
              ) : null}

              {isType5 || isType6 ? (
                <AllocationEntryGroup
                  title="Main Beneficiaries"
                  entries={mainEntries}
                  options={beneficiaryOptions}
                  withPercentage={isType6}
                  addLabel="Add Main Beneficiary"
                  onAdd={() => addEntry("main")}
                  onRemove={(id, label) => setRemoveAllocationTarget({ group: "main", id, label })}
                  onChange={(id, patch) => updateEntry("main", id, patch)}
                />
              ) : null}

              {isType7 ? (
                <div className="rounded-lg border border-line bg-white p-5">
                  <h3 className="text-sm font-semibold text-textPrimary">Trustee Company Allocation</h3>
                  <div className="mt-3 rounded-lg bg-soft px-4 py-3 text-sm font-semibold text-textPrimary">100% to CNB Amanah Berhad</div>
                </div>
              ) : null}
            </div>
          </div>
        </Section>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-3 border-t border-line bg-white/95 px-1 py-4 backdrop-blur sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" asChild>
            <Link to={`/trust/applications/${applicationId}/beneficiaries-details`}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={onSave}>Save Draft</Button>
            <Button type="submit">
              Save & Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
      <ConfirmDialog
        open={Boolean(removeAllocationTarget)}
        title="Remove allocation row"
        message={removeAllocationTarget ? `Are you sure you want to remove ${removeAllocationTarget.label}? This allocation row will be removed from the draft.` : "Are you sure you want to remove this allocation row?"}
        confirmText="Remove"
        destructive
        onClose={() => setRemoveAllocationTarget(null)}
        onConfirm={() => {
          if (removeAllocationTarget) removeEntry(removeAllocationTarget.group, removeAllocationTarget.id);
          setRemoveAllocationTarget(null);
        }}
      />
    </>
  );
}

function AllocationEntryGroup({
  title,
  entries,
  options,
  withPercentage,
  addLabel,
  onAdd,
  onRemove,
  onChange
}: {
  title: string;
  entries: AllocationEntry[];
  options: { value: string; label: string }[];
  withPercentage: boolean;
  addLabel: string;
  onAdd: () => void;
  onRemove: (id: string, label: string) => void;
  onChange: (id: string, patch: Partial<AllocationEntry>) => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
        <h3 className="text-sm font-semibold text-textPrimary">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={onAdd} className="border-brandGold/45 bg-[#FFFBEB] hover:bg-[#FFF4C7]">
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>
      <div className="mt-3 space-y-3">
        {entries.map((entry, index) => (
          <div key={entry.id} className={withPercentage ? "grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_44px]" : "grid gap-3 md:grid-cols-[minmax(0,1fr)_44px]"}>
            <SelectOptionInput label={`${title.slice(0, -1)} ${index + 1}`} value={entry.beneficiaryId} options={options} onChange={(value) => onChange(entry.id, { beneficiaryId: value })} />
            {withPercentage ? <TextInput label="Allocation (%)" type="number" value={entry.percentage} onChange={(value) => onChange(entry.id, { percentage: value })} /> : null}
            <div className="flex items-end">
              {index > 0 ? (
                <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(entry.id, `${title.slice(0, -1).toLowerCase()} ${index + 1}`)} aria-label={`Remove ${title.toLowerCase()} row ${index + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function allocationDescription(type: string) {
  if (type === allocationTypes.type2) return "One main beneficiary receives 100%; multiple substitute beneficiaries share equally if the main beneficiary cannot receive.";
  if (type === allocationTypes.type3) return "One main beneficiary receives 100%; substitute beneficiaries receive specific percentage allocations if needed.";
  if (type === allocationTypes.type4) return "One main beneficiary receives 100%, with Trustee Company named as the substitute.";
  if (type === allocationTypes.type5) return "Multiple main beneficiaries share the trust asset equally.";
  if (type === allocationTypes.type6) return "Multiple main beneficiaries receive specific percentage allocations.";
  if (type === allocationTypes.type7) return "Trustee Company receives 100% of the trust asset allocation.";
  return "One main beneficiary receives 100%, with one substitute beneficiary named.";
}

function ExecutionOfTrustDeedStep({
  applicationId,
  draft,
  onChange,
  onSave,
  onSaveNext
}: {
  applicationId: string;
  draft: PersonalDetailsDraft;
  onChange: (draft: PersonalDetailsDraft) => void;
  onSave: () => void;
  onSaveNext: () => void;
}) {
  const requiresInterpreter = draft.specialCircumstance !== "None";

  const update = <K extends keyof PersonalDetailsDraft>(key: K, value: PersonalDetailsDraft[K]) => {
    onChange({ ...draft, [key]: value });
  };

  const updateSpecialCircumstance = (value: string) => {
    onChange({
      ...draft,
      specialCircumstance: value,
      ...(value === "None"
        ? {
            interpreterName: "",
            interpreterIdentityNumber: "",
            interpreterLanguage: "",
            interpreterRelationship: "",
            interpreterRelationshipOther: ""
          }
        : {})
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSaveNext();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Section
        title="Execution of Trust Deed"
        description="Record how the settlor will execute the trust deed and capture any interpreter or read-over requirements."
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.75fr)_1fr]">
          <div className="space-y-4 rounded-lg border border-line bg-soft p-4">
            <SelectInput label="Signing of Trust Deed by" value={draft.trustDeedSigningMethod} options={signingMethodOptions} onChange={(value) => update("trustDeedSigningMethod", value)} />
            <div className="rounded-lg border border-brandGold/35 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Execution Method</div>
              <p className="mt-2 text-sm font-semibold leading-6 text-textPrimary">{draft.trustDeedSigningMethod === "Thumbprint" ? "Settlor will execute the trust deed using thumbprint, with witness handling as required." : "Settlor will execute the trust deed by signature."}</p>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-line bg-white p-4">
            <h3 className="border-b border-line pb-2 text-sm font-semibold text-textPrimary">Special Circumstances</h3>
            <SelectInput label="Special Circumstances" value={draft.specialCircumstance} options={specialCircumstanceOptions} onChange={updateSpecialCircumstance} />
            {requiresInterpreter ? (
              <div className="rounded-lg border border-line bg-soft p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput label="Read over, explained and/or interpreted by" value={draft.interpreterName} onChange={(value) => update("interpreterName", value)} required />
                  <TextInput label="NRIC or Passport No." value={draft.interpreterIdentityNumber} onChange={(value) => update("interpreterIdentityNumber", value)} required />
                  <TextInput label="Language or Dialect" value={draft.interpreterLanguage} onChange={(value) => update("interpreterLanguage", value)} required />
                  <SelectInput label="Relationship with Settlor" value={draft.interpreterRelationship} options={relationshipOptions} onChange={(value) => update("interpreterRelationship", value)} />
                  {draft.interpreterRelationship === "Others" ? (
                    <TextInput className="md:col-span-2" label="Other Relationship with Settlor" value={draft.interpreterRelationshipOther} onChange={(value) => update("interpreterRelationshipOther", value)} />
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-line bg-soft p-4 text-sm leading-6 text-textSecondary">
                No read-over or interpretation details are required for this application.
              </div>
            )}
          </div>
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-3 border-t border-line bg-white/95 px-1 py-4 backdrop-blur sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" asChild>
          <Link to={`/trust/applications/${applicationId}/beneficiary-allocations`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onSave}>Save Draft</Button>
          <Button type="submit">
            Save & Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}

function ReviewStep({
  applicationId,
  draft,
  onChange,
  onSave,
  onSubmit
}: {
  applicationId: string;
  draft: PersonalDetailsDraft;
  onChange: (draft: PersonalDetailsDraft) => void;
  onSave: () => void;
  onSubmit: () => void;
}) {
  const beneficiaries = draft.beneficiaries.length ? draft.beneficiaries : [createEmptyBeneficiary()];
  const selectedPlan = trustPlanMockData.find((plan) => plan.id === draft.trustPlanId);
  const [removeCoBrokerTarget, setRemoveCoBrokerTarget] = useState<CoBrokerEntry | null>(null);

  const updateSupportingDocument = (id: string, patch: Partial<SupportingDocumentDraft>) => {
    const selectedIndex = draft.supportingDocuments.findIndex((document) => document.id === id);
    onChange({
      ...draft,
      supportingDocuments: draft.supportingDocuments.map((document, index) => {
        if (index > selectedIndex && patch.fileName === "") return { ...document, fileName: "", fileError: "" };
        return document.id === id ? { ...document, ...patch } : document;
      })
    });
  };

  const updateSupportingDocumentsConfirmed = (checked: boolean) => {
    onChange({ ...draft, supportingDocumentsConfirmed: checked });
  };

  const updateCoBroker = (id: string, patch: Partial<CoBrokerEntry>) => {
    onChange({
      ...draft,
      coBrokers: draft.coBrokers.map((coBroker) => (coBroker.id === id ? { ...coBroker, ...patch } : coBroker))
    });
  };

  const addCoBroker = () => {
    onChange({ ...draft, coBrokers: [...draft.coBrokers, createEmptyCoBroker()] });
  };

  const removeCoBroker = (id: string) => {
    onChange({ ...draft, coBrokers: draft.coBrokers.filter((coBroker) => coBroker.id !== id) });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-5">
        <Section title="Review" description="Review the completed trust application details before final submission.">
          <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.7fr)_1fr]">
            <div className="space-y-4 rounded-lg border border-line bg-soft p-4">
              <div className="rounded-lg border border-brandGold/35 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Application Summary</div>
                <div className="mt-3 space-y-3">
                  <SummaryRow label="Settlor" value={draft.fullName} />
                  <SummaryRow label="Trust Plan" value={selectedPlan?.basicInfo.productName} />
                  <SummaryRow label="Trust Asset Amount" value={draft.trustAssetAmount ? `RM ${Number(draft.trustAssetAmount).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ""} />
                  <SummaryRow label="Beneficiaries" value={String(beneficiaries.length)} />
                  <SummaryRow label="Allocation Type" value={draft.beneficiaryAllocationType} />
                </div>
              </div>
              <div className="rounded-lg border border-line bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Submission Status</div>
                <p className="mt-2 text-sm font-semibold leading-6 text-textPrimary">Ready for final review and submission.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ReviewCard title="Personal Details">
                <SummaryRow label="Full Name" value={draft.fullName} />
                <SummaryRow label="Type of Identity" value={draft.identityType} />
                <SummaryRow label="Identity No." value={draft.identityNumber} />
                <SummaryRow label="Nationality" value={draft.nationality} />
                <SummaryRow label="Gender" value={draft.gender} />
                <SummaryRow label="Date of Birth" value={draft.dateOfBirth} />
                <SummaryRow label="Email" value={draft.email} />
                <SummaryRow label="Contact Number" value={draft.contactNumber} />
                <SummaryRow label="Address" value={formatAddress(draft)} />
              </ReviewCard>

              <ReviewCard title="Tax & Due Diligence">
                <SummaryRow label="US Tax Return" value={draft.usTaxReturn} />
                <SummaryRow label="Other Tax Resident" value={draft.otherTaxResident} />
                {draft.otherTaxResident === "Yes" ? (
                  <>
                    <SummaryRow label="Tax Residence Country" value={draft.taxResidenceCountry} />
                    <SummaryRow label="TIN" value={draft.tinNumber} />
                    <SummaryRow label="TIN Reason" value={draft.tinUnavailableReason} />
                    <SummaryRow label="TIN Explanation" value={draft.tinUnavailableExplanation} />
                  </>
                ) : null}
                <SummaryRow label="Employer" value={draft.employerName} />
                <SummaryRow label="Occupation" value={draft.occupation} />
                <SummaryRow label="Annual Income" value={draft.annualIncome} />
                <SummaryRow label="Total Net Worth" value={draft.totalNetWorth} />
                <SummaryRow label="Source of Funds" value={draft.sourceOfFunds.join(", ")} />
                {draft.sourceOfFunds.includes("Other") ? <SummaryRow label="Other Source" value={draft.otherSourceOfFunds} /> : null}
              </ReviewCard>
            </div>
          </div>
        </Section>

        <Section title="Trust Asset">
          <div className="grid gap-4 lg:grid-cols-2">
            <ReviewCard title="Asset Placement">
              <SummaryRow label="Trust Asset Amount" value={draft.trustAssetAmount ? `RM ${Number(draft.trustAssetAmount).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ""} />
              <SummaryRow label="Guaranteed Returns" value={draft.guaranteedReturnInstruction} />
              <SummaryRow label="Payment Source" value={draft.paymentSource} />
              {draft.paymentSource === "Joint Account" ? <SummaryRow label="Joint Account Holder" value={draft.jointAccountName} /> : null}
              {draft.paymentSource === "Third Party" ? (
                <>
                  <SummaryRow label="Third Party Name" value={draft.thirdPartyName} />
                  <SummaryRow label="Third Party ID" value={draft.thirdPartyIdentityNumber} />
                  <SummaryRow label="Relationship" value={draft.thirdPartyRelationship === "Others" ? draft.thirdPartyRelationshipOther : draft.thirdPartyRelationship} />
                </>
              ) : null}
            </ReviewCard>

            <ReviewCard title="Bank Details">
              <SummaryRow label="Bank Name" value={draft.settlorBankName === "Others" ? draft.settlorBankNameOther : draft.settlorBankName} />
              <SummaryRow label="Account Holder" value={draft.settlorBankAccountHolder} />
              <SummaryRow label="Account Number" value={draft.settlorBankAccountNumber} />
              <SummaryRow label="Swiftcode" value={draft.settlorSwiftCode} />
              <SummaryRow label="Bank Address" value={draft.settlorBankAddress} />
            </ReviewCard>
          </div>
        </Section>

        <Section title="Beneficiaries Details">
          <div className="grid gap-4 xl:grid-cols-2">
            {beneficiaries.map((beneficiary, index) => (
              <ReviewCard key={beneficiary.id} title={`Beneficiary ${index + 1}`}>
                <SummaryRow label="Full Name" value={beneficiary.fullName} />
                <SummaryRow label="Type of Identity" value={beneficiary.identityType} />
                <SummaryRow label="Identity No." value={beneficiary.identityNumber} />
                <SummaryRow label="Relationship" value={beneficiary.relationship === "Others" ? beneficiary.relationshipOther : beneficiary.relationship} />
                <SummaryRow label="Email" value={beneficiary.email} />
                <SummaryRow label="Contact Number" value={beneficiary.contactNumber} />
                <SummaryRow label="Address" value={formatAddress(beneficiary)} />
                <SummaryRow label="Other Tax Resident" value={beneficiary.otherTaxResident} />
              </ReviewCard>
            ))}
          </div>
        </Section>

        <Section title="Beneficiary Allocations">
          <div className="grid gap-4 lg:grid-cols-2">
            <ReviewCard title="Allocation Method">
              <SummaryRow label="Type" value={draft.beneficiaryAllocationType} />
              <SummaryRow label="Main Beneficiary" value={getBeneficiaryName(beneficiaries, draft.allocationMainBeneficiaryId)} />
              <SummaryRow label="Substitute Beneficiary" value={getBeneficiaryName(beneficiaries, draft.allocationSubstituteBeneficiaryId)} />
            </ReviewCard>
            <ReviewCard title="Allocation Rows">
              <AllocationSummaryRows draft={draft} beneficiaries={beneficiaries} />
            </ReviewCard>
          </div>
        </Section>

        <Section title="Execution of Trust Deed">
          <div className="grid gap-4 lg:grid-cols-2">
            <ReviewCard title="Execution Method">
              <SummaryRow label="Signing By" value={draft.trustDeedSigningMethod} />
              <SummaryRow label="Special Circumstances" value={draft.specialCircumstance} />
            </ReviewCard>
            <ReviewCard title="Read-over / Interpreter Details">
              {draft.specialCircumstance === "None" ? (
                <p className="text-sm font-semibold text-textSecondary">No read-over or interpretation details required.</p>
              ) : (
                <>
                  <SummaryRow label="Interpreted By" value={draft.interpreterName} />
                  <SummaryRow label="NRIC or Passport No." value={draft.interpreterIdentityNumber} />
                  <SummaryRow label="Language or Dialect" value={draft.interpreterLanguage} />
                  <SummaryRow label="Relationship" value={draft.interpreterRelationship === "Others" ? draft.interpreterRelationshipOther : draft.interpreterRelationship} />
                </>
              )}
            </ReviewCard>
          </div>
        </Section>

        <Section title="Supporting Documents" description="Upload up to three supporting documents for final submission review.">
          <div className="mb-4 rounded-lg border border-brandGold/35 bg-[#FFFBEB] p-4 text-sm font-semibold leading-6 text-textPrimary">
            Allowed file types: PDF, JPG, JPEG, PNG, DOCX and XLSX. Maximum file size: 5 MB per file.
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {draft.supportingDocuments.map((document, index) => (
              <SupportingDocumentInput
                key={document.id}
                document={document}
                disabled={index > 0 && !draft.supportingDocuments[index - 1]?.fileName}
                onChange={(patch) => updateSupportingDocument(document.id, patch)}
              />
            ))}
          </div>
          <label className="mt-4 flex items-start gap-3 rounded-lg border border-brandGold/35 bg-[#FFFBEB] p-4 text-sm font-semibold text-textPrimary">
            <input
              type="checkbox"
              checked={draft.supportingDocumentsConfirmed}
              onChange={(event) => updateSupportingDocumentsConfirmed(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line text-ink focus:ring-ink"
            />
            <span>I confirm all related documents have been uploaded.</span>
          </label>
        </Section>

        <Section
          title="Co-broker"
          description="Optional co-broker allocation. Add only when commission sharing applies."
          actions={
            <Button type="button" variant="outline" size="sm" onClick={addCoBroker} className="border-brandGold/45 bg-[#FFFBEB] hover:bg-[#FFF4C7]">
              <Plus className="h-4 w-4" />
              Add Co-broker
            </Button>
          }
        >
          {draft.coBrokers.length ? (
            <div className="space-y-3">
              {draft.coBrokers.map((coBroker, index) => (
                <div key={coBroker.id} className="grid gap-3 rounded-lg border border-line bg-white p-4 md:grid-cols-[minmax(0,1fr)_180px_44px]">
                  <TextInput label={`Co-broker Email ${index + 1}`} type="email" value={coBroker.email} onChange={(value) => updateCoBroker(coBroker.id, { email: value })} />
                  <TextInput label="Allocation (%)" type="number" value={coBroker.percentage} onChange={(value) => updateCoBroker(coBroker.id, { percentage: value })} />
                  <div className="flex items-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setRemoveCoBrokerTarget(coBroker)} aria-label={`Remove co-broker ${index + 1}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-soft p-5 text-sm font-semibold text-textSecondary">No co-broker added.</div>
          )}
        </Section>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-3 border-t border-line bg-white/95 px-1 py-4 backdrop-blur sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" asChild>
            <Link to={`/trust/applications/${applicationId}/execution-of-trust-deed`}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={onSave}>Save Draft</Button>
            <Button type="submit" disabled={!draft.supportingDocumentsConfirmed}>
              Submit
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
      <ConfirmDialog
        open={Boolean(removeCoBrokerTarget)}
        title="Remove co-broker"
        message={removeCoBrokerTarget ? `Are you sure you want to remove ${removeCoBrokerTarget.email || "this co-broker"}? This co-broker allocation will be removed from the draft.` : "Are you sure you want to remove this co-broker?"}
        confirmText="Remove"
        destructive
        onClose={() => setRemoveCoBrokerTarget(null)}
        onConfirm={() => {
          if (removeCoBrokerTarget) removeCoBroker(removeCoBrokerTarget.id);
          setRemoveCoBrokerTarget(null);
        }}
      />
    </>
  );
}

function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-soft p-4">
      <h3 className="border-b border-line pb-2 text-sm font-semibold text-textPrimary">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function SupportingDocumentInput({ document, disabled, onChange }: { document: SupportingDocumentDraft; disabled: boolean; onChange: (patch: Partial<SupportingDocumentDraft>) => void }) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      onChange({ fileName: "", fileError: "" });
      return;
    }

    const validationError = validateSupportingDocumentFile(file);
    if (validationError) {
      event.target.value = "";
      onChange({ fileName: "", fileError: validationError });
      return;
    }

    onChange({ fileName: file.name, fileError: "" });
  };

  return (
    <label className={`block rounded-lg border border-line bg-soft p-4 text-sm font-semibold text-textPrimary ${disabled ? "opacity-60" : ""}`}>
      <span className="flex items-center gap-2 border-b border-line pb-2">
        <UploadCloud className="h-4 w-4 text-brandGold" />
        {document.label}
      </span>
      <input
        type="file"
        accept={supportingDocumentAccept}
        disabled={disabled}
        className="mt-4 block w-full text-sm font-semibold text-textPrimary file:mr-4 file:rounded-lg file:border file:border-brandGold/45 file:bg-[#FFFBEB] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-textPrimary hover:file:bg-[#FFF4C7] disabled:cursor-not-allowed disabled:text-textSecondary disabled:file:border-line disabled:file:bg-gray-100 disabled:file:text-textSecondary"
        onChange={handleFileChange}
      />
      <span className="mt-3 block truncate text-xs font-semibold text-textSecondary">{disabled ? "Select the previous document first" : document.fileName || "No file selected"}</span>
      {document.fileError ? <span className="mt-2 block text-xs font-semibold text-red-600">{document.fileError}</span> : null}
    </label>
  );
}

function validateSupportingDocumentFile(file: File) {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
  if (!allowedSupportingDocumentExtensions.includes(extension)) return "Only PDF, JPG, JPEG, PNG, DOCX and XLSX files are allowed.";
  if (file.size > supportingDocumentMaxSize) return "File size must not be more than 5 MB.";
  return "";
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1 rounded-lg bg-white px-3 py-2 sm:grid-cols-[170px_1fr]">
      <span className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</span>
      <span className="break-words text-sm font-semibold text-textPrimary">{value || "-"}</span>
    </div>
  );
}

function AllocationSummaryRows({ draft, beneficiaries }: { draft: PersonalDetailsDraft; beneficiaries: BeneficiaryDraft[] }) {
  const isSubstituteList = draft.beneficiaryAllocationType === allocationTypes.type2 || draft.beneficiaryAllocationType === allocationTypes.type3;
  const isMainList = draft.beneficiaryAllocationType === allocationTypes.type5 || draft.beneficiaryAllocationType === allocationTypes.type6;
  const entries = isMainList ? draft.allocationMainBeneficiaries : isSubstituteList ? draft.allocationSubstituteBeneficiaries : [];

  if (draft.beneficiaryAllocationType === allocationTypes.type7) return <SummaryRow label="Trustee Company" value="100% to CNB Amanah Berhad" />;
  if (!entries.length) return <SummaryRow label="Rows" value="No dynamic allocation rows" />;

  return (
    <>
      {entries.map((entry, index) => (
        <SummaryRow
          key={entry.id}
          label={`${isMainList ? "Main" : "Substitute"} ${index + 1}`}
          value={`${getBeneficiaryName(beneficiaries, entry.beneficiaryId)}${entry.percentage ? `, ${entry.percentage}%` : ""}`}
        />
      ))}
    </>
  );
}

function getBeneficiaryName(beneficiaries: BeneficiaryDraft[], id: string) {
  return beneficiaries.find((beneficiary) => beneficiary.id === id)?.fullName || "";
}

function formatAddress(record: Pick<PersonalDetailsDraft, "address1" | "address2" | "postcode" | "city" | "state" | "country">) {
  return [record.address1, record.address2, record.postcode, record.city, record.state, record.country].filter(Boolean).join(", ");
}

function Section({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="relative mb-5 border-b border-line pb-4">
        <h2 className="px-12 text-center text-xl font-semibold text-brandGold">{title}</h2>
        {description ? <p className="mx-auto mt-1 max-w-3xl text-center text-sm text-textSecondary">{description}</p> : null}
        {actions ? <div className="absolute right-0 top-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ExtractionOverlay() {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/70 px-4 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="w-full max-w-sm rounded-lg border border-line bg-white p-6 text-center shadow-[0_24px_70px_rgba(17,17,17,0.16)]">
        <Loader2 className="mx-auto h-9 w-9 animate-spin text-brandGold" />
        <h2 className="mt-4 text-base font-semibold text-textPrimary">Extracting IC details</h2>
        <p className="mt-2 text-sm leading-6 text-textSecondary">Please wait while the demo OCR reads the uploaded IC and fills the related fields.</p>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, type = "text", required = false, className = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; className?: string }) {
  return (
    <label className={`block text-sm font-semibold text-textPrimary ${className}`}>
      <span className="flex min-h-10 items-end">{label}</span>
      <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
    </label>
  );
}

function TextArea({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`block text-sm font-semibold text-textPrimary ${className}`}>
      <span className="flex min-h-10 items-end">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-textPrimary transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
    </label>
  );
}

function SelectInput({ label, value, options, onChange, className = "" }: { label: string; value: string; options: string[]; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`block text-sm font-semibold text-textPrimary ${className}`}>
      <span className="flex min-h-10 items-end">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        {options.map((option) => (
          <option key={option} value={option}>{option || "Please select"}</option>
        ))}
      </select>
    </label>
  );
}

function SelectOptionInput({
  label,
  value,
  options,
  onChange,
  className = ""
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-semibold text-textPrimary ${className}`}>
      <span className="flex min-h-10 items-end">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function Readout({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</span>
        {badge ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{badge}</span> : null}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-textPrimary">{value}</div>
    </div>
  );
}

function OcrConfidenceList({ scores }: { scores: OcrConfidenceScores }) {
  const entries = Object.entries(scores);

  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-textSecondary">OCR Confidence</span>
        {entries.length ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Demo</span> : null}
      </div>
      {entries.length ? (
        <div className="mt-2 space-y-1.5">
          {entries.map(([field, score]) => (
            <div key={field} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-textSecondary">{field}</span>
              <span className="font-semibold text-textPrimary">{score}%</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-1 text-sm font-semibold text-textPrimary">Pending upload</div>
      )}
    </div>
  );
}

function loadDraft(applicationId?: string): PersonalDetailsDraft {
  if (typeof window === "undefined") return emptyDraft;
  const drafts = readDrafts();
  const savedDraft = drafts[applicationId || newApplicationId] as Partial<PersonalDetailsDraft> | undefined;
  return normalizeDraft({ ...emptyDraft, ...savedDraft });
}

function saveApplicationDraft(applicationId: string | undefined, draft: PersonalDetailsDraft) {
  const drafts = readDrafts();
  drafts[applicationId || newApplicationId] = { ...draft, savedAt: new Date().toISOString() };
  window.localStorage.setItem(storageKey, JSON.stringify(drafts));
}

function readDrafts(): Record<string, unknown> {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeDraft(draft: PersonalDetailsDraft): PersonalDetailsDraft {
  const beneficiaries = Array.isArray(draft.beneficiaries) && draft.beneficiaries.length ? draft.beneficiaries : [createEmptyBeneficiary()];
  const substituteBeneficiaries = Array.isArray(draft.allocationSubstituteBeneficiaries) && draft.allocationSubstituteBeneficiaries.length ? draft.allocationSubstituteBeneficiaries : [createEmptyAllocationEntry()];
  const mainBeneficiaries = Array.isArray(draft.allocationMainBeneficiaries) && draft.allocationMainBeneficiaries.length ? draft.allocationMainBeneficiaries : [createEmptyAllocationEntry()];
  const supportingDocuments = Array.isArray(draft.supportingDocuments) ? draft.supportingDocuments : [];
  const coBrokers = Array.isArray(draft.coBrokers) ? draft.coBrokers : [];
  return {
    ...draft,
    ocrConfidence: draft.ocrConfidence && typeof draft.ocrConfidence === "object" ? draft.ocrConfidence : {},
    beneficiaries: beneficiaries.map((beneficiary) => {
      const fallback = createEmptyBeneficiary();
      return { ...fallback, ...beneficiary, id: beneficiary.id || fallback.id };
    }),
    beneficiaryAllocationType: draft.beneficiaryAllocationType || allocationTypes.type1,
    allocationMainBeneficiaryId: draft.allocationMainBeneficiaryId || "",
    allocationSubstituteBeneficiaryId: draft.allocationSubstituteBeneficiaryId || "",
    allocationSubstituteBeneficiaries: substituteBeneficiaries.map((entry) => {
      const fallback = createEmptyAllocationEntry();
      return { ...fallback, ...entry, id: entry.id || fallback.id };
    }),
    allocationMainBeneficiaries: mainBeneficiaries.map((entry) => {
      const fallback = createEmptyAllocationEntry();
      return { ...fallback, ...entry, id: entry.id || fallback.id };
    }),
    trustDeedSigningMethod: draft.trustDeedSigningMethod || "Signature",
    specialCircumstance: draft.specialCircumstance || "None",
    interpreterName: draft.interpreterName || "",
    interpreterIdentityNumber: draft.interpreterIdentityNumber || "",
    interpreterLanguage: draft.interpreterLanguage || "",
    interpreterRelationship: draft.interpreterRelationship || "",
    interpreterRelationshipOther: draft.interpreterRelationshipOther || "",
    supportingDocuments: createEmptySupportingDocuments().map((document, index) => ({
      ...document,
      ...supportingDocuments[index],
      id: document.id,
      label: document.label,
      fileName: supportingDocuments[index]?.fileName || "",
      fileError: supportingDocuments[index]?.fileError || ""
    })),
    supportingDocumentsConfirmed: Boolean(draft.supportingDocumentsConfirmed),
    coBrokers: coBrokers.map((coBroker) => {
      const fallback = createEmptyCoBroker();
      return { ...fallback, ...coBroker, id: coBroker.id || fallback.id };
    })
  };
}

function formatCurrency(value?: number) {
  return `RM ${Number(value ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
