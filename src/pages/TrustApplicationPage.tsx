import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Copy, ExternalLink, FileText, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { StatusBadge } from "../components/common/StatusBadge";
import { DatePickerInput } from "../components/forms/DatePickerInput";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { lookupApi, type BankLookupItem, type CountryLookupItem, type RelationshipLookupItem } from "../api/lookupApi";
import { trustApplicationApi, type TrustApplicationDetail, type TrustApplicationPlanDetail, type TrustApplicationStepResult, type TrustMalaysiaIcExtractionResult, type TrustMalaysiaIcFieldResult, type TrustMalaysiaIcSource } from "../api/trustApplicationApi";
import { trustPlanApi, type TrustProductListItem } from "../api/trustPlanApi";
import { trustPlanMockData } from "../data/trustPlanMockData";
import { useAuth } from "../hooks/useAuth";
import { notifyError, notifySuccess } from "../services/notificationService";

const storageKey = "theTrust.applicationDrafts";
const newApplicationId = "new";

const steps = [
  { slug: "personal-details", label: "Personal Details" },
  { slug: "trust-asset", label: "Trust Asset" },
  { slug: "beneficiaries-details", label: "Beneficiaries Details" },
  { slug: "beneficiary-allocations", label: "Beneficiary Allocations" },
  { slug: "execution-of-trust-deed", label: "Execution of Trust Deed" },
  { slug: "supporting-documents", label: "Supporting Documents" },
  { slug: "co-broker", label: "Co-broker" },
  { slug: "review", label: "Review" }
] as const;

type StepSlug = (typeof steps)[number]["slug"];
type OcrConfidenceScores = Record<string, number>;
type SelectOption = { value: string; label: string };
type ApplicationTrustPlanOption = {
  productCode: string;
  productName: string;
  productCategory: string;
  minimumPlacement: number;
  maximumPlacement: number | null;
  payoutFrequency: string;
  productStatus: string;
};
type PayloadPreview = {
  step: StepSlug;
  title: string;
  endpoint: string;
  payload: Record<string, unknown>;
};

interface TrustApplicationWorkflowState {
  trustId: number | null;
  applicationStatus: string;
  currentStep: number;
  lastCompletedStep: number;
}

const defaultOcrConfidenceScores: OcrConfidenceScores = {
  "IC Number": 0,
  "Full Name": 0,
  "Address Line 1": 0,
  "Address Line 2": 0,
  Postcode: 0,
  City: 0,
  State: 0
};

interface IcExtractionData {
  fullName: string;
  identityNumber: string;
  address1: string;
  address2: string;
  postcode: string;
  city: string;
  state: string;
  birthday: string;
  confidence: OcrConfidenceScores;
  fileName: string;
}

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
  fileName: string;
  fileSize: number;
  fileExtension: string;
  fileUrl: string;
  uploadedAt: string;
  fileError: string;
  file?: File;
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
  minorDistributionToGuardian: boolean;
  minorDistributionByTrustee: boolean;
  minorDistributionReleaseAge: string;
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
  caretakerDistributionEnabled: boolean;
  caretakerMainName: string;
  caretakerMainIdentityNumber: string;
  caretakerMainContactNumber: string;
  caretakerSubstituteName: string;
  caretakerSubstituteIdentityNumber: string;
  caretakerSubstituteContactNumber: string;
  minorDistributionToGuardian: boolean;
  minorDistributionByTrustee: boolean;
  minorDistributionReleaseAge: string;
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
const identityTypeSelectOptions: SelectOption[] = [
  { value: "NRIC", label: "NRIC" },
  { value: "PASSPORT", label: "Passport" },
  { value: "COMPANY_ID", label: "Company ID" }
];
const annualIncomeOptions: SelectOption[] = [
  { value: "", label: "Please select" },
  { value: "UP_TO_RM100_000", label: "Up to RM100,000" },
  { value: "RM100_001_RM300_000", label: "RM100,001 - RM300,000" },
  { value: "RM300_001_RM500_000", label: "RM300,001 - RM500,000" },
  { value: "RM500_001_RM1_000_000", label: "RM500,001 - RM1,000,000" },
  { value: "ABOVE_RM1_000_000", label: "Above RM1,000,000" }
];
const netWorthOptions: SelectOption[] = [
  { value: "", label: "Please select" },
  { value: "UP_TO_RM500_000", label: "Up to RM500,000" },
  { value: "RM500_001_RM1_000_000", label: "RM500,001 - RM1,000,000" },
  { value: "RM1_000_001_RM2_000_000", label: "RM1,000,001 - RM2,000,000" },
  { value: "RM2_000_001_RM5_000_000", label: "RM2,000,001 - RM5,000,000" },
  { value: "ABOVE_RM5_000_000", label: "Above RM5,000,000" }
];
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
  country: "MALAYSIA",
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
  trustPlanId: "",
  ocrConfidence: { ...defaultOcrConfidenceScores },
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
  caretakerDistributionEnabled: false,
  caretakerMainName: "",
  caretakerMainIdentityNumber: "",
  caretakerMainContactNumber: "",
  caretakerSubstituteName: "",
  caretakerSubstituteIdentityNumber: "",
  caretakerSubstituteContactNumber: "",
  minorDistributionToGuardian: false,
  minorDistributionByTrustee: false,
  minorDistributionReleaseAge: "",
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

const fallbackBankOptions: SelectOption[] = [
  { value: "", label: "Please select" },
  { value: "Maybank", label: "Maybank" },
  { value: "CIMB Bank Berhad", label: "CIMB Bank Berhad" },
  { value: "Public Bank Berhad", label: "Public Bank Berhad" },
  { value: "RHB Bank Berhad", label: "RHB Bank Berhad" },
  { value: "Hong Leong Bank Berhad", label: "Hong Leong Bank Berhad" },
  { value: "HSBC Bank Malaysia Berhad", label: "HSBC Bank Malaysia Berhad" },
  { value: "OCBC Bank (Malaysia) Berhad", label: "OCBC Bank (Malaysia) Berhad" },
  { value: "Other", label: "Other" }
];

const paymentSourceOptions = ["My Personal Account", "Joint Account", "Third Party"];

const fallbackRelationshipOptions: SelectOption[] = [
  { value: "", label: "Please select" },
  { value: "Spouse", label: "Spouse" },
  { value: "Parent", label: "Parent" },
  { value: "Child", label: "Child" },
  { value: "Sibling", label: "Sibling" },
  { value: "Grandparent", label: "Grandparent" },
  { value: "Grandchild", label: "Grandchild" },
  { value: "Grandnephew", label: "Grandnephew" },
  { value: "Others", label: "Others" }
];
const fallbackNationalityOptions = ["Malaysian", "Singaporean", "Indonesian", "Other"];
const genderOptions = ["", "Male", "Female"];
const fallbackCountryOptions = ["MALAYSIA", "SINGAPORE", "INDONESIA", "OTHER"];
const taxReasonOptions = ["", "[A] TIN is not issued by the country / jurisdiction of tax residence", "[B] Unable to provide TIN. Please explain why you are unable to provide", "[C] TIN is not required by country of tax residence"];
const uploadIcButtonClassName = "border-brandGold bg-brandGold text-white shadow-[0_8px_18px_rgba(188,141,49,0.24)] hover:border-[#A57724] hover:bg-[#A57724] focus-visible:ring-brandGold";
const settlorAddressButtonClassName = "border-ink/20 bg-ink text-white shadow-[0_8px_18px_rgba(17,17,17,0.16)] hover:border-ink hover:bg-black focus-visible:ring-ink";

function toUppercaseInput(value: string) {
  return value.toUpperCase();
}

function toLowercaseInput(value: string) {
  return value.toLowerCase();
}

const guaranteedReturnOptions = [
  {
    value: "Withdraw to bank account",
    label: "I wish to have the trust proceeds to be withdrawn and transferred into my bank account."
  },
  {
    value: "Redeposit as trust asset",
    label: "I wish to have the trust proceeds to be re-deposited as Trust Asset."
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
    country: "MALAYSIA",
    usTaxReturn: "No",
    otherTaxResident: "No",
    taxResidenceCountry: "",
    tinNumber: "",
    tinUnavailableReason: "",
    tinUnavailableExplanation: "",
    minorDistributionToGuardian: false,
    minorDistributionByTrustee: false,
    minorDistributionReleaseAge: ""
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
  return [];
}

export function TrustApplicationPage() {
  const { applicationId = newApplicationId, step = "personal-details" } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const currentStep = steps.find((entry) => entry.slug === step);
  const [draft, setDraft] = useState<PersonalDetailsDraft>(() => loadDraft(applicationId));
  const [workflow, setWorkflow] = useState<TrustApplicationWorkflowState>(() => ({
    trustId: parseTrustApplicationId(applicationId),
    applicationStatus: applicationId === newApplicationId ? "NEW" : "",
    currentStep: applicationId === newApplicationId ? 1 : 0,
    lastCompletedStep: 0
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [countryOptions, setCountryOptions] = useState(fallbackCountryOptions);
  const [nationalityOptions, setNationalityOptions] = useState(fallbackNationalityOptions);
  const [bankOptions, setBankOptions] = useState<SelectOption[]>(fallbackBankOptions);
  const [isBankLookupReady, setIsBankLookupReady] = useState(false);
  const [relationshipOptions, setRelationshipOptions] = useState<SelectOption[]>(fallbackRelationshipOptions);
  const [trustPlanOptions, setTrustPlanOptions] = useState<ApplicationTrustPlanOption[]>([]);
  const [payloadPreview, setPayloadPreview] = useState<PayloadPreview | null>(null);
  const userRole = session?.role;
  const isAgent = userRole === "AG";
  const currentStepNumber = currentStep ? getStepNumber(currentStep.slug) : 1;
  const isSubmittedAgentApplication = isAgent && Boolean(workflow.applicationStatus && workflow.applicationStatus !== "NEW" && workflow.applicationStatus !== "DRAFT");
  const isReviewSubmitDisabled = userRole !== "AG" || isSubmittedAgentApplication;

  useEffect(() => {
    let mounted = true;

    async function loadTrustApplicationLookups() {
      const [countriesResult, banksResult, relationshipsResult, trustProductsResult] = await Promise.allSettled([
        lookupApi.getCountryList(),
        lookupApi.getBankList(),
        lookupApi.getRelationshipList(),
        trustPlanApi.getTrustProductList({
          Status: "ACTIVE",
          Page: 1,
          PageSize: 100
        })
      ]);
      if (!mounted) return;

      if (countriesResult.status === "fulfilled") {
        const mappedCountries = mapCountryNameOptions(countriesResult.value);
        const mappedNationalities = mapNationalityOptions(countriesResult.value);
        setCountryOptions(mappedCountries.length ? mappedCountries : fallbackCountryOptions);
        setNationalityOptions(mappedNationalities.length ? mappedNationalities : fallbackNationalityOptions);
      } else {
        notifyError(getLookupErrorMessage(countriesResult.reason, "Unable to load country lookup data."), "trust-application-country-lookup");
        setCountryOptions(fallbackCountryOptions);
        setNationalityOptions(fallbackNationalityOptions);
      }

      if (banksResult.status === "fulfilled") {
        const mappedBanks = mapBankNameOptions(banksResult.value);
        setBankOptions(mappedBanks.length ? mappedBanks : fallbackBankOptions);
      } else {
        notifyError(getLookupErrorMessage(banksResult.reason, "Unable to load bank lookup data."), "trust-application-bank-lookup");
        setBankOptions(fallbackBankOptions);
      }
      setIsBankLookupReady(true);

      if (relationshipsResult.status === "fulfilled") {
        const mappedRelationships = mapRelationshipOptions(relationshipsResult.value);
        setRelationshipOptions(mappedRelationships.length ? mappedRelationships : fallbackRelationshipOptions);
      } else {
        notifyError(getLookupErrorMessage(relationshipsResult.reason, "Unable to load relationship lookup data."), "trust-application-relationship-lookup");
        setRelationshipOptions(fallbackRelationshipOptions);
      }

      if (trustProductsResult.status === "fulfilled") {
        const mappedTrustPlans = mapTrustProductOptions(trustProductsResult.value.Records);
        setTrustPlanOptions(mappedTrustPlans);
      } else {
        notifyError(getLookupErrorMessage(trustProductsResult.reason, "Unable to load active trust product list."), "trust-application-trust-plan-lookup");
        setTrustPlanOptions(mapMockTrustPlanOptions());
      }
    }

    loadTrustApplicationLookups();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const trustId = parseTrustApplicationId(applicationId);

    setDraft(loadDraft(applicationId));
    setWorkflow({
      trustId,
      applicationStatus: applicationId === newApplicationId ? "NEW" : "",
      currentStep: applicationId === newApplicationId ? 1 : 0,
      lastCompletedStep: 0
    });

    if (!trustId) return;

    const loadedTrustId = trustId;

    async function loadTrustApplication() {
      try {
        const detail = await trustApplicationApi.getTrustApplication(loadedTrustId);
        if (!mounted) return;
        setTrustPlanOptions((currentOptions) => mergeTrustPlanDetailOption(currentOptions, detail.TrustPlan));
        setWorkflow(mapDetailToWorkflow(detail));
        setDraft((currentDraft) => normalizeDraft({ ...currentDraft, ...mapTrustApplicationDetailToDraft(detail) }));
      } catch (error) {
        if (!mounted) return;
        notifyError(error instanceof Error ? error.message : "Unable to load trust application.", "trust-application-load");
      }
    }

    loadTrustApplication();

    return () => {
      mounted = false;
    };
  }, [applicationId]);

  useEffect(() => {
    if (!isBankLookupReady) return;

    setDraft((currentDraft) => {
      const settlorBankName = getMatchedSelectOptionValue(currentDraft.settlorBankName, bankOptions);
      const paymentBankName = getMatchedSelectOptionValue(currentDraft.paymentBankName, bankOptions);

      if (settlorBankName === currentDraft.settlorBankName && paymentBankName === currentDraft.paymentBankName) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        settlorBankName,
        paymentBankName
      };
    });
  }, [bankOptions, isBankLookupReady]);

  useEffect(() => {
    if (!trustPlanOptions[0]) return;

    const isSelectedPlanAvailable = trustPlanOptions.some((plan) => plan.productCode === draft.trustPlanId);
    const shouldSelectDefaultPlan = !draft.trustPlanId || (applicationId === newApplicationId && !isSelectedPlanAvailable);

    if (shouldSelectDefaultPlan) {
      setDraft((currentDraft) => ({ ...currentDraft, trustPlanId: trustPlanOptions[0].productCode }));
    }
  }, [applicationId, draft.trustPlanId, trustPlanOptions]);

  if (applicationId === newApplicationId && session?.role !== "AG") return <Navigate to="/access-denied" replace />;
  if (!currentStep) return <Navigate to={`/trust/applications/${applicationId}/personal-details`} replace />;
  if (isAgent && !isStepAccessibleForRole(currentStepNumber, workflow, userRole, applicationId)) {
    return <Navigate to={`/trust/applications/${applicationId}/${getStepSlug(getFirstAccessibleStepNumber(workflow, userRole, applicationId))}`} replace />;
  }

  const isPersonalDetails = currentStep.slug === "personal-details";
  const isTrustAsset = currentStep.slug === "trust-asset";
  const isBeneficiariesDetails = currentStep.slug === "beneficiaries-details";
  const isBeneficiaryAllocations = currentStep.slug === "beneficiary-allocations";
  const isExecutionOfTrustDeed = currentStep.slug === "execution-of-trust-deed";
  const isSupportingDocuments = currentStep.slug === "supporting-documents";
  const isCoBroker = currentStep.slug === "co-broker";
  const isReview = currentStep.slug === "review";

  const saveDraft = async (nextStep?: StepSlug) => {
    if (isSubmittedAgentApplication) {
      notifyError("Submitted trust applications cannot be edited by agents.", "trust-application-edit-locked");
      return;
    }

    const trustId = workflow.trustId ?? parseTrustApplicationId(applicationId);
    setIsSaving(true);
    try {
      const draftToSave = await uploadPendingSupportingDocumentsIfNeeded(currentStep.slug, trustId, draft, setDraft);
      const payload = buildTrustApplicationStepPayload(currentStep.slug, trustId, draftToSave, trustPlanOptions);
      const result = await trustApplicationApi.saveStep(getStepNumber(currentStep.slug), payload);
      const nextWorkflow = mapStepResultToWorkflow(result);
      setWorkflow(nextWorkflow);
      const savedApplicationId = String(result.TrustID);
      let savedDraft = draftToSave;

      if (currentStep.slug === "beneficiaries-details") {
        try {
          const detail = await trustApplicationApi.getTrustApplication(result.TrustID);
          setTrustPlanOptions((currentOptions) => mergeTrustPlanDetailOption(currentOptions, detail.TrustPlan));
          savedDraft = normalizeDraft({ ...draftToSave, ...mapTrustApplicationDetailToDraft(detail) });
          setDraft(savedDraft);
        } catch {
          notifyError("Beneficiaries were saved, but the latest beneficiary IDs could not be refreshed. Please reload before saving allocations.", "trust-application-beneficiary-refresh");
        }
      }

      saveApplicationDraft(savedApplicationId, savedDraft);
      notifySuccess(nextStep ? `${currentStep.label} completed. Continue with the next step.` : `${currentStep.label} completed.`, "trust-application-draft");
      if (nextStep) navigate(`/trust/applications/${savedApplicationId}/${nextStep}`);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : `Unable to save ${currentStep.label}.`, "trust-application-save");
    } finally {
      setIsSaving(false);
    }
  };

  const submitApplication = async () => {
    if (isReviewSubmitDisabled) return;
    const trustId = workflow.trustId ?? parseTrustApplicationId(applicationId);
    const payload = buildTrustApplicationStepPayload("review", trustId, draft, trustPlanOptions);
    setIsSaving(true);
    try {
      const result = await trustApplicationApi.saveStep(8, payload);
      setWorkflow(mapStepResultToWorkflow(result));
      saveApplicationDraft(String(result.TrustID), draft);
      notifySuccess("Trust application submitted successfully.", "trust-application-submit");
      navigate("/trust/listing");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to submit trust application.", "trust-application-submit");
    } finally {
      setIsSaving(false);
    }
  };

  const showPayload = (step: StepSlug) => {
    setPayloadPreview(buildTrustApplicationPayloadPreview(step, applicationId, draft, trustPlanOptions));
  };

  const refreshTrustApplication = async (trustId: number, baseDraft: PersonalDetailsDraft = draft) => {
    const detail = await trustApplicationApi.getTrustApplication(trustId);
    setTrustPlanOptions((currentOptions) => mergeTrustPlanDetailOption(currentOptions, detail.TrustPlan));
    setWorkflow(mapDetailToWorkflow(detail));
    const refreshedDraft = normalizeDraft({ ...baseDraft, ...mapTrustApplicationDetailToDraft(detail) });
    setDraft(refreshedDraft);
    saveApplicationDraft(String(trustId), refreshedDraft);
    return refreshedDraft;
  };

  const uploadSupportingDocument = async (file: File) => {
    const trustId = workflow.trustId ?? parseTrustApplicationId(applicationId);
    if (!trustId) throw new Error("Trust ID is required before uploading supporting documents.");

    await trustApplicationApi.uploadSupportingDocument({ trustId, file });
    await refreshTrustApplication(trustId);
  };

  const removeSupportingDocument = async (supportingDocumentId: string) => {
    const trustId = workflow.trustId ?? parseTrustApplicationId(applicationId);
    if (!trustId) throw new Error("Trust ID is required before removing supporting documents.");

    const parsedSupportingDocumentId = Number(supportingDocumentId);
    if (!Number.isFinite(parsedSupportingDocumentId) || parsedSupportingDocumentId <= 0) {
      throw new Error("Invalid supporting document.");
    }

    await trustApplicationApi.removeSupportingDocument(parsedSupportingDocumentId);
    await refreshTrustApplication(trustId);
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

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(200px,250px)_minmax(0,1fr)]">
        <ApplicationStepNav applicationId={workflow.trustId ? String(workflow.trustId) : applicationId} currentStep={currentStep.slug} workflow={workflow} role={userRole} />

        <div className="min-w-0">
          {isPersonalDetails ? (
            <PersonalDetailsStep draft={draft} countryOptions={countryOptions} nationalityOptions={nationalityOptions} trustPlanOptions={trustPlanOptions} onChange={setDraft} onShowPayload={() => showPayload("personal-details")} onSaveNext={() => saveDraft("trust-asset")} isSaving={isSaving} />
          ) : isTrustAsset ? (
            <TrustAssetStep applicationId={applicationId} draft={draft} bankOptions={bankOptions} relationshipOptions={relationshipOptions} trustPlanOptions={trustPlanOptions} onChange={setDraft} onShowPayload={() => showPayload("trust-asset")} onSaveNext={() => saveDraft("beneficiaries-details")} isSaving={isSaving} />
          ) : isBeneficiariesDetails ? (
            <BeneficiariesDetailsStep applicationId={applicationId} draft={draft} countryOptions={countryOptions} nationalityOptions={nationalityOptions} relationshipOptions={relationshipOptions} onChange={setDraft} onShowPayload={() => showPayload("beneficiaries-details")} onSaveNext={() => saveDraft("beneficiary-allocations")} isSaving={isSaving} />
          ) : isBeneficiaryAllocations ? (
            <BeneficiaryAllocationsStep applicationId={applicationId} draft={draft} onChange={setDraft} onShowPayload={() => showPayload("beneficiary-allocations")} onSaveNext={() => saveDraft("execution-of-trust-deed")} isSaving={isSaving} />
          ) : isExecutionOfTrustDeed ? (
            <ExecutionOfTrustDeedStep applicationId={applicationId} draft={draft} relationshipOptions={relationshipOptions} onChange={setDraft} onShowPayload={() => showPayload("execution-of-trust-deed")} onSaveNext={() => saveDraft("supporting-documents")} isSaving={isSaving} />
          ) : isSupportingDocuments ? (
            <SupportingDocumentsStep applicationId={applicationId} draft={draft} onChange={setDraft} onUploadDocument={uploadSupportingDocument} onRemoveDocument={removeSupportingDocument} onShowPayload={() => showPayload("supporting-documents")} onSaveNext={() => saveDraft("co-broker")} isSaving={isSaving} />
          ) : isCoBroker ? (
            <CoBrokerStep applicationId={applicationId} draft={draft} onChange={setDraft} onShowPayload={() => showPayload("co-broker")} onSaveNext={() => saveDraft("review")} isSaving={isSaving} />
          ) : isReview ? (
            <ReviewStep applicationId={applicationId} draft={draft} relationshipOptions={relationshipOptions} trustPlanOptions={trustPlanOptions} onShowPayload={() => showPayload("review")} onSubmit={submitApplication} isSaving={isSaving} submitDisabled={isReviewSubmitDisabled} />
          ) : (
            null
          )}
        </div>
      </div>

      <PayloadPreviewDialog preview={payloadPreview} onOpenChange={(open) => {
        if (!open) setPayloadPreview(null);
      }} />
    </>
  );
}

function ApplicationStepNav({ applicationId, currentStep, workflow, role }: { applicationId: string; currentStep: StepSlug; workflow: TrustApplicationWorkflowState; role?: string }) {
  const currentIndex = steps.findIndex((step) => step.slug === currentStep);

  return (
    <aside className="min-w-0 lg:sticky lg:top-5 lg:self-start">
      <nav className="overflow-x-auto rounded-lg border border-line bg-white p-3 shadow-soft lg:overflow-visible" aria-label="Trust application steps">
        <ol className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
          {steps.map((step, index) => {
            const isActive = step.slug === currentStep;
            const stepNumber = index + 1;
            const isComplete = workflow.lastCompletedStep >= stepNumber;
            const isAccessible = isStepAccessibleForRole(stepNumber, workflow, role, applicationId);
            const content = (
              <>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs">
                  {isComplete ? <CheckCircle2 className={isActive ? "h-4 w-4 text-white" : "h-4 w-4 text-brandGold"} /> : index + 1}
                </span>
                <span className="whitespace-nowrap lg:whitespace-normal">{step.label}</span>
              </>
            );
            const className = isActive
              ? "flex h-full items-center gap-3 rounded-lg border border-ink bg-ink px-3 py-2.5 text-left text-sm font-semibold text-white"
              : isComplete
                ? "flex h-full items-center gap-3 rounded-lg border border-brandGold/35 bg-[#FFFBEB] px-3 py-2.5 text-left text-sm font-semibold text-textPrimary hover:bg-[#FFF4C7]"
                : isAccessible
                  ? "flex h-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm font-semibold text-textPrimary hover:bg-gray-50"
                  : "flex h-full cursor-not-allowed items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm font-semibold text-textSecondary opacity-55";
            return (
              <li key={step.slug}>
                {isAccessible ? (
                  <Link to={`/trust/applications/${applicationId}/${step.slug}`} className={className} title={step.label}>
                    {content}
                  </Link>
                ) : (
                  <span className={className} title={`${step.label} is locked until previous steps are completed.`}>
                    {content}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}

function PayloadPreviewDialog({ preview, onOpenChange }: { preview: PayloadPreview | null; onOpenChange: (open: boolean) => void }) {
  const formattedPayload = preview ? JSON.stringify(preview.payload, null, 2) : "";

  return (
    <Dialog open={Boolean(preview)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{preview ? `${preview.title} Payload` : "Payload"}</DialogTitle>
          <DialogDescription>
            {preview ? `POST ${preview.endpoint}` : "JSON payload preview."}
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto rounded-lg border border-line bg-white p-4 text-left text-xs font-semibold leading-5 text-textPrimary">
          <code>{formattedPayload}</code>
        </pre>
      </DialogContent>
    </Dialog>
  );
}

function IcExtractionModal({
  open,
  source,
  onOpenChange,
  onConfirm
}: {
  open: boolean;
  source: TrustMalaysiaIcSource;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: IcExtractionData) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanTimerRef = useRef<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [extracted, setExtracted] = useState<IcExtractionData | null>(null);

  useEffect(() => {
    if (open) {
      setExtracted(createEmptyIcExtraction());
      return;
    }
    resetModal();
  }, [open]);

  useEffect(() => {
    return () => {
      clearScanTimer();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateIcImageFile(file);
    if (validationError) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      notifyError(validationError, "ic-extraction-validation");
      setExtracted(null);
      setIsScanning(false);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setExtracted(null);
    setIsScanning(true);
    clearScanTimer();
    try {
      const result = await trustApplicationApi.extractMalaysiaIc({ file, source });
      setExtracted(mapMalaysiaIcApiResultToExtraction(result, file.name));
    } catch (apiError) {
      notifyError(apiError instanceof Error ? apiError.message : "Unable to extract IC details.", "ic-extraction-api");
      setExtracted(createEmptyIcExtraction(file.name));
    } finally {
      setIsScanning(false);
    }
  };

  const confirm = () => {
    if (!extracted || isScanning) return;
    onConfirm(extracted);
  };

  const updateExtracted = (patch: Partial<IcExtractionData>) => {
    setExtracted((current) => ({ ...(current ?? createEmptyIcExtraction()), ...patch }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>IC Extraction</DialogTitle>
          <DialogDescription>Upload a JPG or PNG image. The system extracts IC details after upload; review and edit the values before confirming.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-44 w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-brandGold/60 bg-white p-4 text-center transition hover:bg-[#FFFBEB] sm:h-48"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Selected IC preview" className="absolute inset-0 h-full w-full object-contain p-3" />
              ) : (
                <span className="relative z-10 flex flex-col items-center gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-brandGold/40 bg-[#FFFBEB] text-brandGold">
                    <UploadCloud className="h-7 w-7" />
                  </span>
                  <span className="text-sm font-semibold text-textPrimary">Upload IC</span>
                  <span className="text-xs font-medium text-textSecondary">JPG or PNG only, maximum 5MB</span>
                </span>
              )}
              {isScanning ? (
                <span className="absolute inset-0 z-20 overflow-hidden bg-white/20">
                  <span className="absolute inset-y-0 -left-1/3 w-1/3 animate-[icScanLight_1.25s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-gray-200/75 to-transparent blur-md" />
                  <span className="absolute inset-y-0 -left-1/3 w-1/4 animate-[icScanLight_1.25s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-gray-100/95 to-transparent" />
                  <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">Scanning...</span>
                </span>
              ) : null}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="sr-only" onChange={handleFileChange} />
            <OcrConfidenceList scores={extracted?.confidence ?? defaultOcrConfidenceScores} />
          </div>

          <div className="grid content-start gap-x-5 gap-y-3 md:grid-cols-2">
            <TextInput label="Full Name" value={extracted?.fullName ?? ""} onChange={(value) => updateExtracted({ fullName: toUppercaseInput(value) })} />
            <TextInput label="NRIC No." value={extracted?.identityNumber ?? ""} onChange={(value) => {
              const identityNumber = toUppercaseInput(value);
              updateExtracted({ identityNumber, birthday: calculateBirthdayFromIc(identityNumber) });
            }} />
            <TextInput className="md:col-span-2" label="Address 1" value={extracted?.address1 ?? ""} onChange={(value) => updateExtracted({ address1: toUppercaseInput(value) })} />
            <TextInput className="md:col-span-2" label="Address 2" value={extracted?.address2 ?? ""} onChange={(value) => updateExtracted({ address2: toUppercaseInput(value) })} />
            <TextInput label="Postcode" value={extracted?.postcode ?? ""} onChange={(value) => updateExtracted({ postcode: toUppercaseInput(value) })} />
            <TextInput label="City" value={extracted?.city ?? ""} onChange={(value) => updateExtracted({ city: toUppercaseInput(value) })} />
            <TextInput label="State" value={extracted?.state ?? ""} onChange={(value) => updateExtracted({ state: toUppercaseInput(value) })} />
            <TextInput label="Birthday" type="date" value={extracted?.birthday ?? ""} onChange={() => undefined} disabled />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={confirm} disabled={isScanning}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  function resetModal() {
    clearScanTimer();
    setIsScanning(false);
    setExtracted(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
  }

  function clearScanTimer() {
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
  }
}

function PersonalDetailsStep({
  draft,
  countryOptions,
  nationalityOptions,
  trustPlanOptions,
  onChange,
  onShowPayload,
  onSaveNext,
  isSaving
}: {
  draft: PersonalDetailsDraft;
  countryOptions: string[];
  nationalityOptions: string[];
  trustPlanOptions: ApplicationTrustPlanOption[];
  onChange: (draft: PersonalDetailsDraft) => void;
  onShowPayload: () => void;
  onSaveNext: () => void;
  isSaving: boolean;
}) {
  const selectedPlan = useMemo(() => getSelectedTrustPlanOption(trustPlanOptions, draft.trustPlanId), [draft.trustPlanId, trustPlanOptions]);
  const [isIcModalOpen, setIsIcModalOpen] = useState(false);
  const canUploadIc = canUploadIdentityDocument(draft.identityType);
  const countrySelectOptions = useMemo(() => withPleaseSelectOption(mergeSelectedOption(countryOptions, draft.country)), [countryOptions, draft.country]);
  const nationalitySelectOptions = useMemo(() => withPleaseSelectOption(mergeSelectedOption(nationalityOptions, draft.nationality)), [nationalityOptions, draft.nationality]);
  const taxResidenceCountryOptions = useMemo(() => ["", ...mergeSelectedOption(countryOptions, draft.taxResidenceCountry)], [countryOptions, draft.taxResidenceCountry]);

  const update = <K extends keyof PersonalDetailsDraft>(key: K, value: PersonalDetailsDraft[K]) => {
    onChange({ ...draft, [key]: value });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.sourceOfFunds.length) {
      notifyError("Please select at least one source of funds.", "trust-application-step1-source-of-funds");
      return;
    }
    if (!draft.trustPlanId) {
      notifyError("Please select a trust plan.", "trust-application-step1-trust-plan");
      return;
    }
    onSaveNext();
  };

  const handleIcConfirm = (extracted: IcExtractionData) => {
    onChange({
      ...draft,
      fullName: toUppercaseInput(extracted.fullName),
      identityType: "NRIC",
      identityNumber: toUppercaseInput(extracted.identityNumber),
      address1: toUppercaseInput(extracted.address1),
      address2: toUppercaseInput(extracted.address2),
      postcode: toUppercaseInput(extracted.postcode),
      city: toUppercaseInput(extracted.city),
      state: toUppercaseInput(extracted.state),
      country: "MALAYSIA",
      nationality: "Malaysian",
      dateOfBirth: extracted.birthday,
      ocrConfidence: extracted.confidence,
      ocrFileName: extracted.fileName
    });
    setIsIcModalOpen(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <IcExtractionModal source="TRUST_APPLICANT" open={isIcModalOpen} onOpenChange={setIsIcModalOpen} onConfirm={handleIcConfirm} />
      <Section
        title="Personal Details"
        leadingActions={(
          <Button type="button" variant="outline" size="sm" disabled={!canUploadIc} onClick={() => canUploadIc && setIsIcModalOpen(true)} className={uploadIcButtonClassName} title={canUploadIc ? "Upload IC" : "Upload is available for NRIC only"}>
            <UploadCloud className="h-4 w-4" />
            Upload IC
          </Button>
        )}
      >
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="pt-3">
              <FormSubsectionHeader title="Identity Information" />
              <div className="mt-3 grid content-start gap-x-5 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
                <TextInput label="Full Name" value={draft.fullName} onChange={(value) => update("fullName", toUppercaseInput(value))} required />
                <SelectOptionInput label="Type of Identity" value={draft.identityType} options={identityTypeSelectOptions} onChange={(value) => update("identityType", value)} required />
                <TextInput label="NRIC No. / Passport No. / ID No." value={draft.identityNumber} onChange={(value) => update("identityNumber", toUppercaseInput(value))} required />
                <SelectInput label="Nationality" value={draft.nationality} options={nationalitySelectOptions} onChange={(value) => update("nationality", value)} required />
                <SelectInput label="Gender" value={draft.gender} options={["", "Male", "Female"]} onChange={(value) => update("gender", value)} required />
                <TextInput label="Date of Birth" type="date" value={draft.dateOfBirth} onChange={(value) => update("dateOfBirth", value)} required />
              </div>
            </div>
            <div className="pt-2">
              <FormSubsectionHeader title="Contact & Address" />
              <div className="mt-3 grid gap-x-5 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
                <TextInput className="xl:col-span-2" label="Email" type="email" value={draft.email} onChange={(value) => update("email", toLowercaseInput(value))} required />
                <TextInput className="xl:col-span-2" label="Contact Number" value={draft.contactNumber} onChange={(value) => update("contactNumber", value)} required />
                <TextInput className="xl:col-span-2" label="Address Line 1" value={draft.address1} onChange={(value) => update("address1", toUppercaseInput(value))} required />
                <TextInput className="xl:col-span-2" label="Address Line 2" value={draft.address2} onChange={(value) => update("address2", toUppercaseInput(value))} required />
                <TextInput label="Postcode" value={draft.postcode} onChange={(value) => update("postcode", toUppercaseInput(value))} required />
                <TextInput label="City" value={draft.city} onChange={(value) => update("city", toUppercaseInput(value))} required />
                <TextInput label="State" value={draft.state} onChange={(value) => update("state", toUppercaseInput(value))} required />
                <SelectInput label="Country" value={draft.country} options={countrySelectOptions} onChange={(value) => update("country", toUppercaseInput(value))} required />
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Tax Return">
        <div className="grid gap-x-5 gap-y-3 md:grid-cols-2">
          <SelectInput label="Do you currently file a tax return in the United States of America?" value={draft.usTaxReturn} options={["No", "Yes"]} onChange={(value) => update("usTaxReturn", value)} required />
          <SelectInput label="Are you a tax resident in, or do you file tax returns in any country other than Malaysia?" value={draft.otherTaxResident} options={["No", "Yes"]} onChange={(value) => update("otherTaxResident", value)} required />
          {draft.otherTaxResident === "Yes" ? (
            <>
              <SelectInput label="Country / Jurisdiction of Tax Residence" value={draft.taxResidenceCountry} options={taxResidenceCountryOptions} onChange={(value) => update("taxResidenceCountry", toUppercaseInput(value))} required />
              <TextInput
                label="Tax Identification Number (TIN) or equivalent number"
                value={draft.tinNumber}
                onChange={(value) => {
                  const tinNumber = toUppercaseInput(value);
                  onChange({
                    ...draft,
                    tinNumber,
                    ...(tinNumber.trim() ? { tinUnavailableReason: "", tinUnavailableExplanation: "" } : {})
                  });
                }}
                required={!draft.tinUnavailableReason}
              />
              <SelectInput
                className="md:col-span-2"
                label="Please indicate reason [A], [B] or [C] if TIN is not available"
                value={draft.tinUnavailableReason}
                options={["", "[A] TIN is not issued by the country / jurisdiction of tax residence", "[B] Unable to provide TIN. Please explain why you are unable to provide", "[C] TIN is not required by country of tax residence"]}
                onChange={(value) => {
                  onChange({
                    ...draft,
                    tinUnavailableReason: value,
                    ...(value ? { tinNumber: "" } : {}),
                    ...(value.startsWith("[B]") ? {} : { tinUnavailableExplanation: "" })
                  });
                }}
                required={!draft.tinNumber}
              />
              {draft.tinUnavailableReason.startsWith("[B]") ? (
                <TextArea className="md:col-span-2" label="Explanation for unavailable TIN" value={draft.tinUnavailableExplanation} onChange={(value) => update("tinUnavailableExplanation", value)} required />
              ) : null}
            </>
          ) : null}
        </div>
      </Section>

      <Section title="Client Due Diligence">
        <div className="grid gap-x-5 gap-y-3 md:grid-cols-2">
          <TextInput label="Employer / Name of Company" value={draft.employerName} onChange={(value) => update("employerName", value)} required />
          <TextInput label="Nature of Business" value={draft.natureOfBusiness} onChange={(value) => update("natureOfBusiness", value)} required />
          <TextInput label="Occupation" value={draft.occupation} onChange={(value) => update("occupation", value)} required />
          <SelectOptionInput label="Annual Salary / Income" value={draft.annualIncome} options={annualIncomeOptions} onChange={(value) => update("annualIncome", value)} required />
          <SelectOptionInput label="Total Net Worth" value={draft.totalNetWorth} options={netWorthOptions} onChange={(value) => update("totalNetWorth", value)} required />
        </div>
      </Section>

      <Section title="Source of Funds">
        <fieldset>
          <legend className="text-sm font-semibold text-textPrimary">Please mark one or more options that apply to the funds placed or to be placed.</legend>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            {["Current Income", "Inheritance", "Borrowed Capital", "Sales of asset(s)", "Other"].map((source) => (
              <label key={source} className="inline-flex items-center gap-2 text-sm font-semibold text-textPrimary">
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
          </div>
        </fieldset>
        {draft.sourceOfFunds.includes("Other") ? <TextInput className="mt-4" label="Other source of funds" value={draft.otherSourceOfFunds} onChange={(value) => update("otherSourceOfFunds", value)} required /> : null}
      </Section>

      <Section title="Plan">
        <div className="grid gap-3 lg:grid-cols-3">
          {trustPlanOptions.map((plan) => {
            const selected = plan.productCode === selectedPlan.productCode;
            return (
              <button
                key={plan.productCode}
                type="button"
                onClick={() => update("trustPlanId", plan.productCode)}
                className={selected ? "rounded-lg border border-ink bg-ink p-4 text-left text-white shadow-soft" : "rounded-lg border border-line bg-white p-4 text-left transition hover:border-brandGold hover:bg-[#FFFBEB]"}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className={selected ? "block text-sm font-semibold text-white" : "block text-sm font-semibold text-textPrimary"}>{plan.productName}</span>
                    <span className={selected ? "mt-1 block text-xs leading-5 text-gray-200" : "mt-1 block text-xs leading-5 text-textSecondary"}>
                      {plan.productCategory} plan, minimum placement {formatCurrency(plan.minimumPlacement)}, {plan.payoutFrequency || "configured"} payout.
                    </span>
                  </span>
                  <StatusBadge status={plan.productStatus} />
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-3 border-t border-line bg-white/95 px-1 py-4 backdrop-blur sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onShowPayload}>
          <FileText className="h-4 w-4" />
          Show Payload
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save & Next"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

function TrustAssetStep({
  applicationId,
  draft,
  bankOptions,
  relationshipOptions,
  trustPlanOptions,
  onChange,
  onShowPayload,
  onSaveNext,
  isSaving
}: {
  applicationId: string;
  draft: PersonalDetailsDraft;
  bankOptions: SelectOption[];
  relationshipOptions: SelectOption[];
  trustPlanOptions: ApplicationTrustPlanOption[];
  onChange: (draft: PersonalDetailsDraft) => void;
  onShowPayload: () => void;
  onSaveNext: () => void;
  isSaving: boolean;
}) {
  const selectedPlan = getSelectedTrustPlanOption(trustPlanOptions, draft.trustPlanId);
  const minimumAmount = selectedPlan.minimumPlacement;
  const maximumAmount = selectedPlan.maximumPlacement;
  const settlorBankOptions = useMemo(() => withPleaseSelectOptionItem(bankOptions), [bankOptions]);
  const paymentBankOptions = useMemo(() => withPleaseSelectOptionItem(bankOptions), [bankOptions]);
  const thirdPartyRelationshipOptions = useMemo(() => mergeSelectedSelectOption(relationshipOptions, draft.thirdPartyRelationship), [relationshipOptions, draft.thirdPartyRelationship]);

  const update = <K extends keyof PersonalDetailsDraft>(key: K, value: PersonalDetailsDraft[K]) => {
    onChange({ ...draft, [key]: value });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.guaranteedReturnInstruction) {
      notifyError("Please select a trust proceeds option.", "trust-application-step2-trust-proceeds");
      return;
    }
    onSaveNext();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Section title="Trust Asset">
        <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.82fr)_1fr]">
          <div className="space-y-3">
            <TextInput label="Trust Asset Amount (MYR)" type="number" value={draft.trustAssetAmount} onChange={(value) => update("trustAssetAmount", value)} required />
            <div className="rounded-lg border border-line bg-soft px-4 py-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Minimum Amount</div>
                  <div className="mt-1 text-lg font-semibold text-textPrimary">{formatCurrency(minimumAmount)}</div>
                </div>
                {maximumAmount !== null ? (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Maximum Amount</div>
                    <div className="mt-1 text-lg font-semibold text-textPrimary">{formatCurrency(maximumAmount)}</div>
                  </div>
                ) : null}
              </div>
              <div className="mt-1 text-xs text-textSecondary">Based on selected plan: {selectedPlan.productName}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <FormSubsectionHeader title="Settlor Bank Account Details" />
              <p className="mt-1 text-sm leading-5 text-textSecondary">The trust asset will be deposited into this bank account upon maturity.</p>
            </div>
            <div className="grid gap-x-5 gap-y-3 md:grid-cols-2">
              <SelectOptionInput label="Bank Name" value={draft.settlorBankName} options={settlorBankOptions} onChange={(value) => update("settlorBankName", value)} required />
              {isOtherOption(draft.settlorBankName) ? <TextInput label="Other Bank Name" value={draft.settlorBankNameOther} onChange={(value) => update("settlorBankNameOther", value)} required /> : null}
              <TextInput label="Bank Account Holder" value={draft.settlorBankAccountHolder} onChange={(value) => update("settlorBankAccountHolder", toUppercaseInput(value))} required />
              <TextInput label="Bank Account Number" value={draft.settlorBankAccountNumber} onChange={(value) => update("settlorBankAccountNumber", value)} required />
              <TextInput label="Swiftcode" value={draft.settlorSwiftCode} onChange={(value) => update("settlorSwiftCode", value)} />
              <TextArea className="md:col-span-2" label="Bank Address" value={draft.settlorBankAddress} onChange={(value) => update("settlorBankAddress", value)} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Trust Proceeds">
        <div className="grid gap-3 lg:grid-cols-2">
          {guaranteedReturnOptions.map((option) => (
            <label key={option.value} className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm font-semibold leading-5 text-textPrimary hover:bg-gray-50">
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
        <div className="space-y-3">
          <p className="text-sm leading-5 text-textPrimary">
            I/We hereby declare that the payment made payable to <strong>CNB Amanah Berhad</strong> (Trustee Company) is from:
          </p>
          <SelectInput label="Payment Source" value={draft.paymentSource} options={paymentSourceOptions} onChange={(value) => update("paymentSource", value)} required />

          {draft.paymentSource === "Joint Account" ? (
            <div className="rounded-lg border border-line bg-soft p-4">
              <TextInput label="Joint Account Holder Name" value={draft.jointAccountName} onChange={(value) => update("jointAccountName", value)} required />
            </div>
          ) : null}

          {draft.paymentSource === "Third Party" ? (
            <div className="rounded-lg border border-line bg-soft p-4">
              <div className="grid gap-x-5 gap-y-3 md:grid-cols-2">
                <TextInput label="Third Party Name" value={draft.thirdPartyName} onChange={(value) => update("thirdPartyName", value)} required />
                <TextInput label="NRIC No. / Passport No. / ID No." value={draft.thirdPartyIdentityNumber} onChange={(value) => update("thirdPartyIdentityNumber", toUppercaseInput(value))} required />
                <SelectOptionInput label="Relationship" value={draft.thirdPartyRelationship} options={thirdPartyRelationshipOptions} onChange={(value) => update("thirdPartyRelationship", value)} required />
                {isOtherOption(draft.thirdPartyRelationship) ? <TextInput label="Other Relationship" value={draft.thirdPartyRelationshipOther} onChange={(value) => update("thirdPartyRelationshipOther", value)} required /> : null}
                <SelectOptionInput label="Bank Name" value={draft.paymentBankName} options={paymentBankOptions} onChange={(value) => update("paymentBankName", value)} required />
                {isOtherOption(draft.paymentBankName) ? <TextInput label="Other Bank Name" value={draft.paymentBankNameOther} onChange={(value) => update("paymentBankNameOther", value)} required /> : null}
                <TextInput label="Bank Account Holder" value={draft.paymentBankAccountHolder} onChange={(value) => update("paymentBankAccountHolder", toUppercaseInput(value))} required />
                <TextInput label="Bank Account Number" value={draft.paymentBankAccountNumber} onChange={(value) => update("paymentBankAccountNumber", value)} required />
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
          <Button type="button" variant="outline" onClick={onShowPayload}>
            <FileText className="h-4 w-4" />
            Show Payload
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save & Next"}
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
  countryOptions,
  nationalityOptions,
  relationshipOptions,
  onChange,
  onShowPayload,
  onSaveNext,
  isSaving
}: {
  applicationId: string;
  draft: PersonalDetailsDraft;
  countryOptions: string[];
  nationalityOptions: string[];
  relationshipOptions: SelectOption[];
  onChange: (draft: PersonalDetailsDraft) => void;
  onShowPayload: () => void;
  onSaveNext: () => void;
  isSaving: boolean;
}) {
  const beneficiaries = draft.beneficiaries.length ? draft.beneficiaries : [createEmptyBeneficiary()];
  const [removeTarget, setRemoveTarget] = useState<BeneficiaryDraft | null>(null);
  const [icTargetBeneficiaryId, setIcTargetBeneficiaryId] = useState<string | null>(null);
  const substituteCaretakerStarted = [
    draft.caretakerSubstituteName,
    draft.caretakerSubstituteIdentityNumber,
    draft.caretakerSubstituteContactNumber
  ].some((value) => value.trim());
  const substituteCaretakerComplete = [
    draft.caretakerSubstituteName,
    draft.caretakerSubstituteIdentityNumber,
    draft.caretakerSubstituteContactNumber
  ].every((value) => value.trim());
  const showMinorDistributionSection = hasMinorBeneficiaryForDistribution(beneficiaries);
  const beneficiaryRelationshipOptions = useMemo(
    () => beneficiaries.reduce((options, beneficiary) => mergeSelectedSelectOption(options, beneficiary.relationship), relationshipOptions),
    [beneficiaries, relationshipOptions]
  );

  const update = <K extends keyof PersonalDetailsDraft>(key: K, value: PersonalDetailsDraft[K]) => {
    onChange({ ...draft, [key]: value });
  };

  const updateBeneficiaries = (nextBeneficiaries: BeneficiaryDraft[]) => {
    onChange({
      ...draft,
      beneficiaries: nextBeneficiaries,
      ...(!hasMinorBeneficiaryForDistribution(nextBeneficiaries) ? getClearedMinorDistribution() : {})
    });
  };

  const updateBeneficiary = (id: string, patch: Partial<BeneficiaryDraft>) => {
    updateBeneficiaries(beneficiaries.map((beneficiary) => (beneficiary.id === id ? { ...beneficiary, ...patch } : beneficiary)));
  };

  const updateBeneficiaryDateOfBirth = (id: string, value: string) => {
    updateBeneficiary(id, { dateOfBirth: value });
  };

  const addBeneficiary = () => {
    onChange({ ...draft, beneficiaries: [...beneficiaries, createEmptyBeneficiary()] });
  };

  const removeBeneficiary = (id: string) => {
    if (beneficiaries.length === 1 || beneficiaries[0]?.id === id) return;
    updateBeneficiaries(beneficiaries.filter((beneficiary) => beneficiary.id !== id));
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

  const openBeneficiaryIcModal = (id: string) => {
    const beneficiary = beneficiaries.find((entry) => entry.id === id);
    if (!beneficiary || !canUploadIdentityDocument(beneficiary.identityType)) return;
    setIcTargetBeneficiaryId(id);
  };

  const handleBeneficiaryIcConfirm = (extracted: IcExtractionData) => {
    if (!icTargetBeneficiaryId) return;
    updateBeneficiary(icTargetBeneficiaryId, {
      fullName: toUppercaseInput(extracted.fullName),
      identityType: "NRIC",
      identityNumber: toUppercaseInput(extracted.identityNumber),
      nationality: "Malaysian",
      dateOfBirth: extracted.birthday,
      address1: toUppercaseInput(extracted.address1),
      address2: toUppercaseInput(extracted.address2),
      postcode: toUppercaseInput(extracted.postcode),
      city: toUppercaseInput(extracted.city),
      state: toUppercaseInput(extracted.state),
      country: "MALAYSIA"
    });
    setIcTargetBeneficiaryId(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.caretakerDistributionEnabled) {
      const mainCaretakerComplete = [
        draft.caretakerMainName,
        draft.caretakerMainIdentityNumber,
        draft.caretakerMainContactNumber
      ].every((value) => value.trim());

      if (!mainCaretakerComplete) {
        notifyError("Please complete all main caretaker details before continuing.", "trust-application-caretaker-main");
        return;
      }

      if (substituteCaretakerStarted && !substituteCaretakerComplete) {
        notifyError("Please complete all substitute caretaker details, or leave all substitute fields empty.", "trust-application-caretaker-substitute");
        return;
      }
    }

    if (showMinorDistributionSection && !draft.minorDistributionToGuardian && !draft.minorDistributionByTrustee) {
      notifyError("Please select a minor beneficiary distribution option before continuing.", "trust-application-minor-distribution-option");
      return;
    }

    if (showMinorDistributionSection && ((draft.minorDistributionReleaseAge.trim() && !draft.minorDistributionByTrustee) || (draft.minorDistributionByTrustee && !draft.minorDistributionReleaseAge.trim()))) {
      notifyError("Please complete the Trustee Company distribution option and release age for minor beneficiaries.", "trust-application-minor-distribution");
      return;
    }

    const incompleteBeneficiaryIndex = beneficiaries.findIndex((beneficiary) => {
      const requiresOtherTaxDetails = beneficiary.otherTaxResident === "Yes";
      const requiresTinExplanation = beneficiary.tinUnavailableReason.startsWith("[B]");
      return [
        beneficiary.identityType,
        beneficiary.nationality,
        beneficiary.email,
        beneficiary.contactNumber,
        beneficiary.relationship,
        beneficiary.postcode,
        beneficiary.city,
        beneficiary.state,
        beneficiary.country,
        beneficiary.usTaxReturn,
        beneficiary.otherTaxResident,
        ...(requiresOtherTaxDetails
          ? [beneficiary.taxResidenceCountry, beneficiary.tinNumber, beneficiary.tinUnavailableReason]
          : []),
        ...(requiresTinExplanation ? [beneficiary.tinUnavailableExplanation] : [])
      ].some((value) => !value.trim());
    });

    if (incompleteBeneficiaryIndex >= 0) {
      notifyError(`Please complete all mandatory details for Beneficiary ${incompleteBeneficiaryIndex + 1}.`, "trust-application-beneficiary-required");
      return;
    }

    onSaveNext();
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
      <IcExtractionModal source="TRUST_BENEFICIARY" open={Boolean(icTargetBeneficiaryId)} onOpenChange={(open) => !open && setIcTargetBeneficiaryId(null)} onConfirm={handleBeneficiaryIcConfirm} />
      <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <div>
          <h2 className="text-base font-semibold text-textPrimary">Beneficiaries Details</h2>
          <p className="mt-1 text-sm text-textSecondary">Add at least one beneficiary. Each beneficiary can have separate address and tax information.</p>
        </div>
      </div>

      <Section title="Caretaker Details">
        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-lg border border-brandGold/35 bg-[#FFFBEB] p-4 text-sm font-semibold leading-6 text-textPrimary">
            <input
              type="checkbox"
              checked={draft.caretakerDistributionEnabled}
              onChange={(event) => update("caretakerDistributionEnabled", event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-line text-ink focus:ring-ink"
            />
            <span>Distribute to my caretaker to take care of my maintenance, medical/hospitalisation, household expenses and other personal needs. My caretaker's details as below:</span>
          </label>

          <div className={draft.caretakerDistributionEnabled ? "space-y-4" : "space-y-4 opacity-60"}>
            <div>
              <FormSubsectionHeader title="Main Caretaker" />
              <div className="mt-3 grid gap-x-5 gap-y-3 md:grid-cols-3">
                <TextInput label="Name" value={draft.caretakerMainName} onChange={(value) => update("caretakerMainName", toUppercaseInput(value))} required={draft.caretakerDistributionEnabled} disabled={!draft.caretakerDistributionEnabled} />
                <TextInput label="IC No." value={draft.caretakerMainIdentityNumber} onChange={(value) => update("caretakerMainIdentityNumber", toUppercaseInput(value))} required={draft.caretakerDistributionEnabled} disabled={!draft.caretakerDistributionEnabled} />
                <TextInput label="Contact No." value={draft.caretakerMainContactNumber} onChange={(value) => update("caretakerMainContactNumber", value)} required={draft.caretakerDistributionEnabled} disabled={!draft.caretakerDistributionEnabled} />
              </div>
            </div>

            <div>
              <FormSubsectionHeader title="Substitute Caretaker" />
              <div className="mt-3 grid gap-x-5 gap-y-3 md:grid-cols-3">
                <TextInput label="Name" value={draft.caretakerSubstituteName} onChange={(value) => update("caretakerSubstituteName", toUppercaseInput(value))} required={draft.caretakerDistributionEnabled && substituteCaretakerStarted} disabled={!draft.caretakerDistributionEnabled} />
                <TextInput label="IC No." value={draft.caretakerSubstituteIdentityNumber} onChange={(value) => update("caretakerSubstituteIdentityNumber", toUppercaseInput(value))} required={draft.caretakerDistributionEnabled && substituteCaretakerStarted} disabled={!draft.caretakerDistributionEnabled} />
                <TextInput label="Contact No." value={draft.caretakerSubstituteContactNumber} onChange={(value) => update("caretakerSubstituteContactNumber", value)} required={draft.caretakerDistributionEnabled && substituteCaretakerStarted} disabled={!draft.caretakerDistributionEnabled} />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {beneficiaries.map((beneficiary, index) => (
        <Section
          key={beneficiary.id}
          title={`Beneficiary ${index + 1}`}
          leadingActions={(
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canUploadIdentityDocument(beneficiary.identityType)}
              onClick={() => openBeneficiaryIcModal(beneficiary.id)}
              className={uploadIcButtonClassName}
              title={canUploadIdentityDocument(beneficiary.identityType) ? "Upload IC" : "Upload is available for NRIC only"}
            >
              <UploadCloud className="h-4 w-4" />
              Upload IC
            </Button>
          )}
          actions={
            beneficiaries.length > 1 && index > 0 ? (
              <Button type="button" variant="ghost" size="icon" onClick={() => setRemoveTarget(beneficiary)} aria-label={`Remove beneficiary ${index + 1}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null
          }
        >
          <div className="space-y-4">
            <div>
              <FormSubsectionHeader title="Identity Information" />
              <div className="mt-3 grid gap-x-5 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
                <TextInput label="Full Name" value={beneficiary.fullName} onChange={(value) => updateBeneficiary(beneficiary.id, { fullName: toUppercaseInput(value) })} required />
                <SelectOptionInput label="Type of Identity" value={beneficiary.identityType} options={identityTypeSelectOptions} onChange={(value) => updateBeneficiary(beneficiary.id, { identityType: value })} required />
                <TextInput label="NRIC No. / Passport No. / ID No." value={beneficiary.identityNumber} onChange={(value) => updateBeneficiary(beneficiary.id, { identityNumber: toUppercaseInput(value) })} required />
                <SelectInput label="Nationality" value={beneficiary.nationality} options={withPleaseSelectOption(mergeSelectedOption(nationalityOptions, beneficiary.nationality))} onChange={(value) => updateBeneficiary(beneficiary.id, { nationality: value })} required />
                {shouldShowBeneficiaryGenderAndDateOfBirth(beneficiary.identityType) ? (
                  <>
                    <SelectInput label="Gender" value={beneficiary.gender} options={genderOptions} onChange={(value) => updateBeneficiary(beneficiary.id, { gender: value })} />
                    <TextInput label="Date of Birth" type="date" value={beneficiary.dateOfBirth} onChange={(value) => updateBeneficiaryDateOfBirth(beneficiary.id, value)} />
                  </>
                ) : null}
              </div>

              <div className="mt-3 grid gap-x-5 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
                <TextInput label="Email" type="email" value={beneficiary.email} onChange={(value) => updateBeneficiary(beneficiary.id, { email: toLowercaseInput(value) })} required />
                <TextInput label="Contact Number" value={beneficiary.contactNumber} onChange={(value) => updateBeneficiary(beneficiary.id, { contactNumber: value })} required />
                <SelectOptionInput label="Relationship" value={beneficiary.relationship} options={beneficiaryRelationshipOptions} onChange={(value) => updateBeneficiary(beneficiary.id, { relationship: value })} required />
                {isOtherOption(beneficiary.relationship) ? <TextInput label="Other Relationship" value={beneficiary.relationshipOther} onChange={(value) => updateBeneficiary(beneficiary.id, { relationshipOther: value })} /> : null}
              </div>
            </div>

            <div className="pt-2">
              <FormSubsectionHeader
                title="Address"
                actions={(
                  <Button type="button" variant="outline" size="sm" onClick={() => copySettlorAddress(beneficiary.id)} className={settlorAddressButtonClassName}>
                  <Copy className="h-4 w-4" />
                  Use Settlor Address
                  </Button>
                )}
              />
              <div className="mt-3 grid gap-x-5 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
                <TextInput className="md:col-span-2" label="Address Line 1" value={beneficiary.address1} onChange={(value) => updateBeneficiary(beneficiary.id, { address1: toUppercaseInput(value) })} required />
                <TextInput className="md:col-span-2" label="Address Line 2" value={beneficiary.address2} onChange={(value) => updateBeneficiary(beneficiary.id, { address2: toUppercaseInput(value) })} />
                <TextInput label="Postcode" value={beneficiary.postcode} onChange={(value) => updateBeneficiary(beneficiary.id, { postcode: toUppercaseInput(value) })} required />
                <TextInput label="City" value={beneficiary.city} onChange={(value) => updateBeneficiary(beneficiary.id, { city: toUppercaseInput(value) })} required />
                <TextInput label="State" value={beneficiary.state} onChange={(value) => updateBeneficiary(beneficiary.id, { state: toUppercaseInput(value) })} required />
                <SelectInput label="Country" value={beneficiary.country} options={withPleaseSelectOption(mergeSelectedOption(countryOptions, beneficiary.country))} onChange={(value) => updateBeneficiary(beneficiary.id, { country: toUppercaseInput(value) })} required />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <FormSubsectionHeader title="Tax Return" />
            <div className="mt-3 grid gap-x-5 gap-y-3 md:grid-cols-2">
              <SelectInput label="Do you currently file a tax return in the United States of America?" value={beneficiary.usTaxReturn} options={["No", "Yes"]} onChange={(value) => updateBeneficiary(beneficiary.id, { usTaxReturn: value })} required />
              <SelectInput label="Are you a tax resident in, or do you file tax returns in any country other than Malaysia?" value={beneficiary.otherTaxResident} options={["No", "Yes"]} onChange={(value) => updateBeneficiary(beneficiary.id, { otherTaxResident: value })} required />
              {beneficiary.otherTaxResident === "Yes" ? (
                <>
                  <SelectInput label="Country / Jurisdiction of Tax Residence" value={beneficiary.taxResidenceCountry} options={["", ...mergeSelectedOption(countryOptions, beneficiary.taxResidenceCountry)]} onChange={(value) => updateBeneficiary(beneficiary.id, { taxResidenceCountry: toUppercaseInput(value) })} required />
                  <TextInput label="Tax Identification Number (TIN) or equivalent number" value={beneficiary.tinNumber} onChange={(value) => updateBeneficiary(beneficiary.id, { tinNumber: toUppercaseInput(value) })} required />
                  <SelectInput className="md:col-span-2" label="Please indicate reason [A], [B] or [C] if TIN is not available" value={beneficiary.tinUnavailableReason} options={taxReasonOptions} onChange={(value) => updateBeneficiary(beneficiary.id, { tinUnavailableReason: value })} required />
                  {beneficiary.tinUnavailableReason.startsWith("[B]") ? (
                    <TextArea className="md:col-span-2" label="Explanation for unavailable TIN" value={beneficiary.tinUnavailableExplanation} onChange={(value) => updateBeneficiary(beneficiary.id, { tinUnavailableExplanation: value })} required />
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </Section>
      ))}

      <div className="flex justify-start">
        <Button type="button" onClick={addBeneficiary}>
          <Plus className="h-4 w-4" />
          Add Beneficiary
        </Button>
      </div>

      {showMinorDistributionSection ? (
        <Section title="Distribution To Minor Beneficiary (If Applicable)">
          <div className="space-y-4">
            <p className="text-sm leading-6 text-textSecondary">I prefer any distribution to minor beneficiary (below 18 years old) to be:</p>
            <div className="space-y-3">
              <label className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm font-semibold leading-5 text-textPrimary">
                <input
                  type="radio"
                  name="minorDistribution"
                  checked={draft.minorDistributionToGuardian}
                  onChange={() => onChange({
                    ...draft,
                    minorDistributionToGuardian: true,
                    minorDistributionByTrustee: false,
                    minorDistributionReleaseAge: ""
                  })}
                  className="mt-0.5 h-4 w-4 border-line text-ink focus:ring-ink"
                />
                <span>Distributed to the guardian of the minor beneficiary.</span>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm font-semibold leading-6 text-textPrimary">
                <input
                  type="radio"
                  name="minorDistribution"
                  checked={draft.minorDistributionByTrustee}
                  onChange={() => onChange({
                    ...draft,
                    minorDistributionByTrustee: true,
                    minorDistributionToGuardian: false
                  })}
                  className="mt-1 h-4 w-4 shrink-0 border-line text-ink focus:ring-ink"
                />
                <span className="min-w-0 flex-1">
                  Hold by the Trustee Company and distribute to the minor beneficiary upon he/she attains the age of{" "}
                  <input
                    type="number"
                    min="18"
                    required={draft.minorDistributionByTrustee}
                    value={draft.minorDistributionReleaseAge}
                    onChange={(event) => update("minorDistributionReleaseAge", event.target.value)}
                    placeholder="eg: 21"
                    className="mx-1 inline-block h-8 w-20 border-0 border-b border-textPrimary bg-transparent px-1 text-center text-sm font-semibold text-textPrimary align-middle transition placeholder:text-textSecondary focus:border-ink focus:outline-none focus:ring-0"
                    aria-label="Release Age"
                  />
                  years old.
                </span>
              </label>
            </div>
          </div>
        </Section>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-3 border-t border-line bg-white/95 px-1 py-4 backdrop-blur sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" asChild>
          <Link to={`/trust/applications/${applicationId}/trust-asset`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onShowPayload}>
            <FileText className="h-4 w-4" />
            Show Payload
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save & Next"}
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
  onShowPayload,
  onSaveNext,
  isSaving
}: {
  applicationId: string;
  draft: PersonalDetailsDraft;
  onChange: (draft: PersonalDetailsDraft) => void;
  onShowPayload: () => void;
  onSaveNext: () => void;
  isSaving: boolean;
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
            <Button type="button" variant="outline" onClick={onShowPayload}>
              <FileText className="h-4 w-4" />
              Show Payload
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save & Next"}
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
  relationshipOptions,
  onChange,
  onShowPayload,
  onSaveNext,
  isSaving
}: {
  applicationId: string;
  draft: PersonalDetailsDraft;
  relationshipOptions: SelectOption[];
  onChange: (draft: PersonalDetailsDraft) => void;
  onShowPayload: () => void;
  onSaveNext: () => void;
  isSaving: boolean;
}) {
  const requiresInterpreter = draft.specialCircumstance !== "None";
  const interpreterRelationshipOptions = useMemo(() => mergeSelectedSelectOption(relationshipOptions, draft.interpreterRelationship), [relationshipOptions, draft.interpreterRelationship]);

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
                  <TextInput label="NRIC or Passport No." value={draft.interpreterIdentityNumber} onChange={(value) => update("interpreterIdentityNumber", toUppercaseInput(value))} required />
                  <TextInput label="Language or Dialect" value={draft.interpreterLanguage} onChange={(value) => update("interpreterLanguage", value)} required />
                  <SelectOptionInput label="Relationship with Settlor" value={draft.interpreterRelationship} options={interpreterRelationshipOptions} onChange={(value) => update("interpreterRelationship", value)} />
                  {isOtherOption(draft.interpreterRelationship) ? (
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
          <Button type="button" variant="outline" onClick={onShowPayload}>
            <FileText className="h-4 w-4" />
            Show Payload
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save & Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}

function SupportingDocumentsStep({
  applicationId,
  draft,
  onChange,
  onUploadDocument,
  onRemoveDocument,
  onShowPayload,
  onSaveNext,
  isSaving
}: {
  applicationId: string;
  draft: PersonalDetailsDraft;
  onChange: (draft: PersonalDetailsDraft) => void;
  onUploadDocument: (file: File) => Promise<void>;
  onRemoveDocument: (supportingDocumentId: string) => Promise<void>;
  onShowPayload: () => void;
  onSaveNext: () => void;
  isSaving: boolean;
}) {
  const [fileError, setFileError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SupportingDocumentDraft | null>(null);
  const isBusy = isSaving || isUploading || isRemoving;

  const addSupportingDocument = async (file: File | null) => {
    if (!file) return;

    const validationError = validateSupportingDocumentFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setFileError("");
    setIsUploading(true);

    try {
      await onUploadDocument(file);
      notifySuccess("Supporting document uploaded successfully.", "trust-application-supporting-document-upload");
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Unable to upload supporting document.");
      notifyError(error instanceof Error ? error.message : "Unable to upload supporting document.", "trust-application-supporting-document-upload");
    } finally {
      setIsUploading(false);
    }
  };

  const removeSupportingDocument = async () => {
    if (!removeTarget) return;

    setIsRemoving(true);

    try {
      await onRemoveDocument(removeTarget.id);
      notifySuccess("Supporting document removed successfully.", "trust-application-supporting-document-remove");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to remove supporting document.", "trust-application-supporting-document-remove");
    } finally {
      setIsRemoving(false);
      setRemoveTarget(null);
    }
  };

  const updateSupportingDocumentsConfirmed = (checked: boolean) => {
    onChange({ ...draft, supportingDocumentsConfirmed: checked });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSaveNext();
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-5">
        <Section title="Supporting Documents" description="Upload supporting documents before moving to co-broker setup.">
        <div className="mb-4 rounded-lg border border-brandGold/35 bg-[#FFFBEB] p-4 text-sm font-semibold leading-6 text-textPrimary">
          Allowed file types: PDF, JPG, JPEG, PNG, DOCX and XLSX. Maximum file size: 5 MB per file.
        </div>

        <SupportingDocumentUploader onFileSelected={addSupportingDocument} fileError={fileError} isUploading={isUploading} />

        <div className="mt-4 overflow-hidden rounded-lg border border-line">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-soft px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-textPrimary">Uploaded Documents</h3>
              <p className="mt-1 text-xs font-semibold text-textSecondary">{draft.supportingDocuments.length} file{draft.supportingDocuments.length === 1 ? "" : "s"} uploaded</p>
            </div>
          </div>

          {draft.supportingDocuments.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line text-left text-sm">
                <thead className="bg-white text-xs font-semibold uppercase text-textSecondary">
                  <tr>
                    <th className="px-4 py-3">File Name</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Extension</th>
                    <th className="px-4 py-3">File URL</th>
                    <th className="px-4 py-3">Uploaded At</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-white">
                  {draft.supportingDocuments.map((document) => (
                    <tr key={document.id}>
                      <td className="max-w-[280px] px-4 py-3 font-semibold text-textPrimary">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-brandGold" />
                          <span className="truncate" title={document.fileName}>{document.fileName}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-textSecondary">{formatFileSize(document.fileSize)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold uppercase text-textSecondary">{document.fileExtension.replace(".", "")}</td>
                      <td className="max-w-[260px] px-4 py-3">
                        {document.fileUrl ? (
                          <a className="inline-flex max-w-full items-center gap-2 font-semibold text-ink underline-offset-4 hover:underline" href={document.fileUrl} target="_blank" rel="noreferrer">
                            <span className="truncate">{document.fileUrl}</span>
                            <ExternalLink className="h-4 w-4 shrink-0" />
                          </a>
                        ) : (
                          <span className="font-semibold text-textSecondary">URL unavailable</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-textSecondary">{formatUploadedAt(document.uploadedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button type="button" variant="outline" size="sm" className="text-red-700 hover:bg-red-50" disabled={isBusy} onClick={() => setRemoveTarget(document)}>
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white px-4 py-8 text-center text-sm font-semibold text-textSecondary">No supporting documents uploaded.</div>
          )}
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

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-3 border-t border-line bg-white/95 px-1 py-4 backdrop-blur sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" asChild>
            <Link to={`/trust/applications/${applicationId}/execution-of-trust-deed`}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={onShowPayload} disabled={isBusy}>
              <FileText className="h-4 w-4" />
              Show Payload
            </Button>
            <Button type="submit" disabled={!draft.supportingDocumentsConfirmed || isBusy}>
              {isUploading ? "Uploading..." : isSaving ? "Saving..." : "Save & Next"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove supporting document?"
        message={removeTarget ? `Are you sure you want to remove ${removeTarget.fileName}? This file will be removed from the draft.` : "Are you sure you want to remove this supporting document?"}
        confirmText={isRemoving ? "Removing..." : "Remove"}
        destructive
        onClose={() => !isRemoving && setRemoveTarget(null)}
        onConfirm={() => {
          void removeSupportingDocument();
        }}
      />
    </>
  );
}

function CoBrokerStep({
  applicationId,
  draft,
  onChange,
  onShowPayload,
  onSaveNext,
  isSaving
}: {
  applicationId: string;
  draft: PersonalDetailsDraft;
  onChange: (draft: PersonalDetailsDraft) => void;
  onShowPayload: () => void;
  onSaveNext: () => void;
  isSaving: boolean;
}) {
  const [removeCoBrokerTarget, setRemoveCoBrokerTarget] = useState<CoBrokerEntry | null>(null);

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
    onSaveNext();
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-5">
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
                  <TextInput label={`Co-broker Email ${index + 1}`} type="email" value={coBroker.email} onChange={(value) => updateCoBroker(coBroker.id, { email: toLowercaseInput(value) })} />
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
            <Link to={`/trust/applications/${applicationId}/supporting-documents`}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={onShowPayload}>
              <FileText className="h-4 w-4" />
              Show Payload
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save & Next"}
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

function ReviewStep({
  applicationId,
  draft,
  relationshipOptions,
  trustPlanOptions,
  onShowPayload,
  onSubmit,
  isSaving,
  submitDisabled
}: {
  applicationId: string;
  draft: PersonalDetailsDraft;
  relationshipOptions: SelectOption[];
  trustPlanOptions: ApplicationTrustPlanOption[];
  onShowPayload: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  submitDisabled: boolean;
}) {
  const beneficiaries = draft.beneficiaries.length ? draft.beneficiaries : [createEmptyBeneficiary()];
  const selectedPlan = getSelectedTrustPlanOption(trustPlanOptions, draft.trustPlanId);
  const [submissionAcknowledged, setSubmissionAcknowledged] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!submissionAcknowledged || submitDisabled || isSaving) return;
    onSubmit();
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-5">
        <Section title="Review" description="Review the completed trust application details before final submission.">
          <div className="space-y-5">
            <div className="rounded-lg border border-brandGold/35 bg-[#FFFBEB] p-4">
              <div className="flex flex-col gap-3 border-b border-brandGold/20 pb-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#8A650F]">Application Summary</div>
                  <p className="mt-1 text-sm text-textSecondary">Key information before final submission.</p>
                </div>
                <div className="rounded-lg border border-brandGold/30 bg-white px-3 py-2 text-sm font-semibold text-textPrimary">
                  Ready for final review and submission.
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <SummaryRow label="Settlor" value={draft.fullName} />
                <SummaryRow label="Trust Plan" value={selectedPlan.productName} />
                <SummaryRow label="Trust Asset Amount" value={draft.trustAssetAmount ? `RM ${Number(draft.trustAssetAmount).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ""} />
                <SummaryRow label="Beneficiaries" value={String(beneficiaries.length)} />
                <div className="lg:col-span-2">
                  <SummaryRow label="Allocation Type" value={draft.beneficiaryAllocationType} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ReviewCard title="Personal Details">
                <SummaryRow label="Full Name" value={draft.fullName} />
                <SummaryRow label="Type of Identity" value={getSelectOptionLabel(identityTypeSelectOptions, draft.identityType)} />
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
                <SummaryRow label="Annual Income" value={getSelectOptionLabel(annualIncomeOptions, draft.annualIncome)} />
                <SummaryRow label="Total Net Worth" value={getSelectOptionLabel(netWorthOptions, draft.totalNetWorth)} />
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
              <SummaryRow label="Trust Proceeds" value={draft.guaranteedReturnInstruction} />
              <SummaryRow label="Payment Source" value={draft.paymentSource} />
              {draft.paymentSource === "Joint Account" ? <SummaryRow label="Joint Account Holder" value={draft.jointAccountName} /> : null}
              {draft.paymentSource === "Third Party" ? (
                <>
                  <SummaryRow label="Third Party Name" value={draft.thirdPartyName} />
                  <SummaryRow label="Third Party ID" value={draft.thirdPartyIdentityNumber} />
                  <SummaryRow label="Relationship" value={isOtherOption(draft.thirdPartyRelationship) ? draft.thirdPartyRelationshipOther : getSelectOptionLabel(relationshipOptions, draft.thirdPartyRelationship)} />
                </>
              ) : null}
            </ReviewCard>

            <ReviewCard title="Bank Details">
              <SummaryRow label="Bank Name" value={isOtherOption(draft.settlorBankName) ? draft.settlorBankNameOther : draft.settlorBankName} />
              <SummaryRow label="Account Holder" value={draft.settlorBankAccountHolder} />
              <SummaryRow label="Account Number" value={draft.settlorBankAccountNumber} />
              <SummaryRow label="Swiftcode" value={draft.settlorSwiftCode} />
              <SummaryRow label="Bank Address" value={draft.settlorBankAddress} />
            </ReviewCard>
          </div>
        </Section>

        <Section title="Beneficiaries Details">
          <div className="space-y-4">
            {draft.caretakerDistributionEnabled ? (
              <ReviewCard title="Caretaker Details">
                <SummaryRow label="Main Name" value={draft.caretakerMainName} />
                <SummaryRow label="Main IC No." value={draft.caretakerMainIdentityNumber} />
                <SummaryRow label="Main Contact No." value={draft.caretakerMainContactNumber} />
                {draft.caretakerSubstituteName || draft.caretakerSubstituteIdentityNumber || draft.caretakerSubstituteContactNumber ? (
                  <>
                    <SummaryRow label="Substitute Name" value={draft.caretakerSubstituteName} />
                    <SummaryRow label="Substitute IC No." value={draft.caretakerSubstituteIdentityNumber} />
                    <SummaryRow label="Substitute Contact No." value={draft.caretakerSubstituteContactNumber} />
                  </>
                ) : null}
              </ReviewCard>
            ) : null}

            {hasMinorBeneficiaryForDistribution(beneficiaries) ? (
              <ReviewCard title="Minor Beneficiary Distribution">
                <SummaryRow label="Distribution" value={formatMinorDistribution(draft)} />
              </ReviewCard>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
            {beneficiaries.map((beneficiary, index) => (
              <ReviewCard key={beneficiary.id} title={`Beneficiary ${index + 1}`}>
                <SummaryRow label="Full Name" value={beneficiary.fullName} />
                <SummaryRow label="Type of Identity" value={getSelectOptionLabel(identityTypeSelectOptions, beneficiary.identityType)} />
                <SummaryRow label="Identity No." value={beneficiary.identityNumber} />
                <SummaryRow label="Relationship" value={isOtherOption(beneficiary.relationship) ? beneficiary.relationshipOther : getSelectOptionLabel(relationshipOptions, beneficiary.relationship)} />
                <SummaryRow label="Email" value={beneficiary.email} />
                <SummaryRow label="Contact Number" value={beneficiary.contactNumber} />
                <SummaryRow label="Address" value={formatAddress(beneficiary)} />
                <SummaryRow label="Other Tax Resident" value={beneficiary.otherTaxResident} />
              </ReviewCard>
            ))}
            </div>
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
                  <SummaryRow label="Relationship" value={isOtherOption(draft.interpreterRelationship) ? draft.interpreterRelationshipOther : getSelectOptionLabel(relationshipOptions, draft.interpreterRelationship)} />
                </>
              )}
            </ReviewCard>
          </div>
        </Section>

        <label className="flex items-start gap-3 rounded-lg border border-brandGold/35 bg-[#FFFBEB] p-4 text-sm font-semibold leading-6 text-textPrimary">
          <input
            type="checkbox"
            checked={submissionAcknowledged}
            onChange={(event) => setSubmissionAcknowledged(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-line text-ink focus:ring-ink"
          />
          <span>I understand that submitting this application will send it for final processing and the details should be reviewed before submission.</span>
        </label>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-3 border-t border-line bg-white/95 px-1 py-4 backdrop-blur sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" asChild>
            <Link to={`/trust/applications/${applicationId}/co-broker`}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={onShowPayload}>
              <FileText className="h-4 w-4" />
              Show Payload
            </Button>
            <Button type="submit" disabled={!submissionAcknowledged || submitDisabled || isSaving}>
              {isSaving ? "Submitting..." : "Submit"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}

function ReviewCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-soft p-4">
      <h3 className="border-b border-line pb-2 text-sm font-semibold text-textPrimary">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function SupportingDocumentUploader({
  onFileSelected,
  fileError,
  isUploading
}: {
  onFileSelected: (file: File | null) => void;
  fileError: string;
  isUploading: boolean;
}) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return;
    onFileSelected(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  return (
    <label className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-brandGold/60 bg-[#FFFBEB] px-4 py-8 text-center transition-colors ${isUploading ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-[#FFF4C7]"}`}>
      {isUploading ? <Loader2 className="h-8 w-8 animate-spin text-brandGold" /> : <UploadCloud className="h-8 w-8 text-brandGold" />}
      <span className="mt-3 text-sm font-semibold text-textPrimary">{isUploading ? "Uploading document..." : "Choose supporting document"}</span>
      <span className="mt-1 text-xs font-semibold text-textSecondary">Upload one file at a time</span>
      <input
        type="file"
        accept={supportingDocumentAccept}
        className="sr-only"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      {fileError ? <span className="mt-3 block text-xs font-semibold text-red-600">{fileError}</span> : null}
    </label>
  );
}

function validateSupportingDocumentFile(file: File) {
  const extension = getSupportingDocumentExtension(file.name);
  if (!allowedSupportingDocumentExtensions.includes(extension)) return "Only PDF, JPG, JPEG, PNG, DOCX and XLSX files are allowed.";
  if (file.size > supportingDocumentMaxSize) return "File size must not be more than 5 MB.";
  return "";
}

function mapTrustProductOptions(products: TrustProductListItem[]): ApplicationTrustPlanOption[] {
  return products
    .map((product) => ({
      productCode: product.ProductCode?.trim(),
      productName: product.ProductName?.trim(),
      productCategory: product.ProductCategoryName?.trim() || product.ProductCategory?.trim() || "",
      minimumPlacement: Number(product.MinimumPlacement ?? 0),
      maximumPlacement: toNullableFiniteNumber(product.MaximumPlacement),
      payoutFrequency: product.PayoutFrequency?.trim() ?? "",
      productStatus: product.ProductStatus?.trim() || "Active"
    }))
    .filter((product): product is ApplicationTrustPlanOption => Boolean(product.productCode && product.productName));
}

function mapMockTrustPlanOptions(): ApplicationTrustPlanOption[] {
  return trustPlanMockData
    .filter((plan) => plan.basicInfo.productStatus === "Active")
    .map((plan) => ({
      productCode: plan.basicInfo.productCode,
      productName: plan.basicInfo.productName,
      productCategory: plan.basicInfo.productCategory,
      minimumPlacement: Number(plan.basicInfo.minimumPlacement ?? 0),
      maximumPlacement: toNullableFiniteNumber(plan.basicInfo.maximumPlacement),
      payoutFrequency: plan.payoutConfig.payoutFrequency,
      productStatus: plan.basicInfo.productStatus
    }));
}

function mergeTrustPlanDetailOption(options: ApplicationTrustPlanOption[], trustPlan?: TrustApplicationPlanDetail | null) {
  const detailOption = mapTrustPlanDetailOption(trustPlan);
  if (!detailOption) return options;

  const existingIndex = options.findIndex((option) => option.productCode === detailOption.productCode);
  if (existingIndex < 0) return [detailOption, ...options];

  return options.map((option, index) => index === existingIndex ? { ...option, ...detailOption } : option);
}

function mapTrustPlanDetailOption(trustPlan?: TrustApplicationPlanDetail | null): ApplicationTrustPlanOption | null {
  if (!trustPlan) return null;

  const productCode = trustPlan?.ProductCode?.trim();
  const productName = trustPlan?.ProductName?.trim();
  if (!productCode || !productName) return null;

  return {
    productCode,
    productName,
    productCategory: trustPlan.ProductCategory?.trim() || "",
    minimumPlacement: Number(trustPlan.MinimumPlacement ?? 0),
    maximumPlacement: toNullableFiniteNumber(trustPlan.MaximumPlacement),
    payoutFrequency: "",
    productStatus: "Active"
  };
}

function getSelectedTrustPlanOption(options: ApplicationTrustPlanOption[], selectedProductCode: string) {
  return options.find((plan) => plan.productCode === selectedProductCode) ?? options[0] ?? mapMockTrustPlanOptions()[0];
}

function resolveProductCode(selectedProductCode: string, options: ApplicationTrustPlanOption[]) {
  const selected = selectedProductCode.trim();
  if (options.some((plan) => plan.productCode === selected)) return selected;
  return selected || options[0]?.productCode || "";
}

function mapCountryNameOptions(countries: CountryLookupItem[]) {
  return uniqueSortedOptions(countries.map((country) => toUppercaseInput(country.CountryName ?? "")));
}

function mapNationalityOptions(countries: CountryLookupItem[]) {
  return uniqueSortedOptions(countries.map((country) => country["Nationality "] ?? country.Nationality));
}

function mapBankNameOptions(banks: BankLookupItem[]) {
  const options = uniqueBankOptions(banks);
  return withPleaseSelectOptionItem(options.length ? appendOption(options, "Other") : []);
}

function mapRelationshipOptions(relationships: RelationshipLookupItem[]) {
  const options = relationships
    .map((relationship) => ({
      value: relationship.RelationshipCode?.trim(),
      label: relationship.RelationshipName?.trim()
    }))
    .filter((relationship): relationship is SelectOption => Boolean(relationship.value && relationship.label));

  const uniqueOptions = Array.from(new Map(options.map((option) => [option.value, option])).values()).sort((a, b) => a.label.localeCompare(b.label));
  return uniqueOptions.length ? [{ value: "", label: "Please select" }, ...uniqueOptions] : [];
}

function getLookupErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

function uniqueSortedOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));
}

function uniqueBankOptions(banks: BankLookupItem[]): SelectOption[] {
  const options = banks
    .map((bank) => ({
      value: bank.BankName?.trim(),
      label: bank.BankDescription?.trim() || bank.BankName?.trim()
    }))
    .filter((bank): bank is SelectOption => Boolean(bank.value && bank.label));

  return Array.from(new Map(options.map((option) => [option.value, option])).values()).sort((a, b) => a.label.localeCompare(b.label));
}

function appendOption(options: SelectOption[], option: string) {
  return [...options.filter((value) => value.value !== option), { value: option, label: option }];
}

function mergeSelectedOption(options: string[], selectedValue: string) {
  const selected = selectedValue.trim();
  if (!selected || options.includes(selected)) return options;
  return [...options, selected];
}

function mergeSelectedSelectOption(options: SelectOption[], selectedValue: string) {
  const selected = selectedValue.trim();
  if (!selected || options.some((option) => option.value === selected)) return options;
  return [...options, { value: selected, label: selected }];
}

function getSelectOptionLabel(options: SelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getMatchedSelectOptionValue(value: string, options: SelectOption[]) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return options.some((option) => option.value === trimmed) ? trimmed : "";
}

function withPleaseSelectOptionItem(options: SelectOption[]) {
  const nextOptions = options.filter((option) => option.value !== "");
  return [{ value: "", label: "Please select" }, ...nextOptions];
}

function normalizeSelectOptionValue(value: string, options: SelectOption[]) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (options.some((option) => option.value === trimmed)) return trimmed;

  const labelMatch = options.find((option) => option.label.toLowerCase() === trimmed.toLowerCase());
  if (labelMatch) return labelMatch.value;

  const referenceCode = toReferenceCode(trimmed);
  if (options.some((option) => option.value === referenceCode)) return referenceCode;

  const referenceLabel = fromReferenceCode(trimmed);
  const referenceLabelMatch = options.find((option) => option.label.toLowerCase() === referenceLabel.toLowerCase());
  return referenceLabelMatch?.value ?? trimmed;
}

function withPleaseSelectOption(options: string[]) {
  return options[0] === "" ? options : ["", ...options];
}

function isOtherOption(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized === "OTHER" || normalized === "OTHERS";
}

function getSupportingDocumentExtension(fileName: string) {
  return `.${fileName.split(".").pop()?.toLowerCase() || ""}`;
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatUploadedAt(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
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

function isMinorDateOfBirth(value: string) {
  const dateOfBirth = parseDateInput(value);
  if (!dateOfBirth) return false;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const birthdayThisYear = new Date(today.getFullYear(), dateOfBirth.getMonth(), dateOfBirth.getDate());
  if (today < birthdayThisYear) age -= 1;
  return age < 18;
}

function hasMinorBeneficiaryForDistribution(beneficiaries: BeneficiaryDraft[]) {
  return beneficiaries.some((beneficiary) => isMinorEligibleIdentityType(beneficiary.identityType) && isMinorDateOfBirth(beneficiary.dateOfBirth));
}

function isMinorEligibleIdentityType(identityType: string) {
  const normalized = identityType.trim().toLowerCase();
  return normalized === "nric" || normalized === "passport";
}

function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function getClearedMinorDistribution() {
  return {
    minorDistributionToGuardian: false,
    minorDistributionByTrustee: false,
    minorDistributionReleaseAge: ""
  };
}

function formatMinorDistribution(distribution: Pick<PersonalDetailsDraft, "minorDistributionToGuardian" | "minorDistributionByTrustee" | "minorDistributionReleaseAge">) {
  if (distribution.minorDistributionToGuardian) return "Distributed to the guardian of the minor beneficiary";
  if (distribution.minorDistributionByTrustee) {
    return distribution.minorDistributionReleaseAge
      ? `Held by the Trustee Company until age ${distribution.minorDistributionReleaseAge}`
      : "Held by the Trustee Company";
  }
  return "";
}

function getStepNumber(step: StepSlug) {
  return steps.findIndex((entry) => entry.slug === step) + 1;
}

function getStepSlug(stepNumber: number): StepSlug {
  return steps[Math.max(0, Math.min(steps.length - 1, stepNumber - 1))].slug;
}

function mapStepResultToWorkflow(result: TrustApplicationStepResult): TrustApplicationWorkflowState {
  return {
    trustId: result.TrustID,
    applicationStatus: result.ApplicationStatus,
    currentStep: result.CurrentStep,
    lastCompletedStep: result.LastCompletedStep
  };
}

function mapDetailToWorkflow(detail: TrustApplicationDetail): TrustApplicationWorkflowState {
  return {
    trustId: detail.TrustID,
    applicationStatus: detail.ApplicationStatus,
    currentStep: detail.CurrentStep,
    lastCompletedStep: detail.LastCompletedStep
  };
}

function getFirstAccessibleStepNumber(workflow: TrustApplicationWorkflowState, role?: string, applicationId = newApplicationId) {
  if (role !== "AG") return 1;
  if (applicationId === newApplicationId) return 1;
  return Math.max(1, Math.min(8, workflow.currentStep || workflow.lastCompletedStep + 1 || 1));
}

function isStepAccessibleForRole(stepNumber: number, workflow: TrustApplicationWorkflowState, role?: string, applicationId = newApplicationId) {
  if (role !== "AG") return true;
  if (applicationId === newApplicationId) return stepNumber === 1;
  if (workflow.applicationStatus && workflow.applicationStatus !== "NEW" && workflow.applicationStatus !== "DRAFT") return stepNumber <= Math.max(1, workflow.lastCompletedStep);
  return stepNumber <= Math.max(1, workflow.currentStep, workflow.lastCompletedStep + 1);
}

async function uploadPendingSupportingDocumentsIfNeeded(
  step: StepSlug,
  trustId: number | null,
  draft: PersonalDetailsDraft,
  onChange: (draft: PersonalDetailsDraft) => void
) {
  if (step !== "supporting-documents") return draft;
  if (!trustId) throw new Error("Trust ID is required before uploading supporting documents.");

  const pendingDocuments = draft.supportingDocuments.filter((document) => document.file);
  if (!pendingDocuments.length) return draft;

  const uploadedDocuments = [...draft.supportingDocuments];
  for (const document of pendingDocuments) {
    const uploaded = await trustApplicationApi.uploadSupportingDocument({ trustId, file: document.file as File });
    const index = uploadedDocuments.findIndex((entry) => entry.id === document.id);
    const nextDocument: SupportingDocumentDraft = {
      id: String(uploaded.SupportingDocumentID),
      fileName: uploaded.OriginalFileName || document.fileName,
      fileSize: Number(uploaded.FileSize ?? document.fileSize),
      fileExtension: uploaded.FileExtension || getSupportingDocumentExtension(uploaded.OriginalFileName || document.fileName),
      fileUrl: uploaded.FileUrl || document.fileUrl,
      uploadedAt: uploaded.CreatedAt || new Date().toISOString(),
      fileError: ""
    };
    if (index >= 0) uploadedDocuments[index] = nextDocument;
  }

  const nextDraft = { ...draft, supportingDocuments: uploadedDocuments };
  onChange(nextDraft);
  return nextDraft;
}

function mapTrustApplicationDetailToDraft(detail: TrustApplicationDetail): Partial<PersonalDetailsDraft> {
  return {
    ...mapStep1ToDraft(detail.Step1),
    ...mapStep2ToDraft(detail.Step2),
    ...mapStep3ToDraft(detail.Step3),
    ...mapStep4ToDraft(detail.Step4),
    ...mapStep5ToDraft(detail.Step5),
    ...mapStep6ToDraft(detail.Step6),
    ...mapStep7ToDraft(detail.Step7)
  };
}

function buildTrustApplicationPayloadPreview(
  step: StepSlug,
  applicationId: string,
  draft: PersonalDetailsDraft,
  trustPlanOptions: ApplicationTrustPlanOption[] = []
): PayloadPreview {
  const trustId = parseTrustApplicationId(applicationId);
  const stepNumber = steps.findIndex((entry) => entry.slug === step) + 1;
  const title = steps.find((entry) => entry.slug === step)?.label ?? "Trust Application";
  const endpoint = step === "review" ? "/api/trust-application/submit" : `/api/trust-application/step-${stepNumber}`;
  const payload = buildTrustApplicationStepPayload(step, trustId, draft, trustPlanOptions);

  return { step, title, endpoint, payload };
}

function buildTrustApplicationStepPayload(
  step: StepSlug,
  trustId: number | null,
  draft: PersonalDetailsDraft,
  trustPlanOptions: ApplicationTrustPlanOption[] = []
): Record<string, unknown> {
  switch (step) {
    case "personal-details":
      return {
        TrustID: trustId,
        ProductCode: resolveProductCode(draft.trustPlanId, trustPlanOptions),
        FullName: draft.fullName,
        IdentityType: toReferenceCode(draft.identityType),
        IdentityNo: draft.identityNumber,
        Nationality: draft.nationality,
        Gender: toReferenceCode(draft.gender),
        DateOfBirth: draft.dateOfBirth || null,
        Email: draft.email,
        ContactNo: draft.contactNumber,
        AddressLine1: draft.address1,
        AddressLine2: draft.address2,
        Postcode: draft.postcode,
        City: draft.city,
        State: draft.state,
        Country: draft.country,
        IsUSTaxPayer: toBooleanYesNo(draft.usTaxReturn),
        HasOtherTaxResidence: toBooleanYesNo(draft.otherTaxResident),
        TaxResidenceCountry: draft.taxResidenceCountry,
        TaxIdentificationNo: draft.tinNumber,
        TINUnavailableReason: toReferenceCode(draft.tinUnavailableReason),
        TINUnavailableExplanation: draft.tinUnavailableExplanation,
        EmployerName: draft.employerName,
        NatureOfBusiness: draft.natureOfBusiness,
        Occupation: draft.occupation,
        AnnualIncomeCode: toReferenceCode(draft.annualIncome),
        NetWorthCode: toReferenceCode(draft.totalNetWorth),
        SourceOfFunds: draft.sourceOfFunds.map((source) => ({
          SourceCode: toReferenceCode(source),
          OtherDescription: source === "Other" ? draft.otherSourceOfFunds : ""
        }))
      };
    case "trust-asset":
      return {
        TrustID: trustId ?? 0,
        TrustAssetAmount: toNullableNumber(draft.trustAssetAmount),
        SettlorBankName: draft.settlorBankName,
        SettlorOtherBankName: draft.settlorBankNameOther,
        SettlorBankAccountHolder: draft.settlorBankAccountHolder,
        SettlorBankAccountNumber: draft.settlorBankAccountNumber,
        SettlorSwiftCode: draft.settlorSwiftCode,
        SettlorBankAddress: draft.settlorBankAddress,
        GuaranteedReturnOption: toReferenceCode(draft.guaranteedReturnInstruction),
        PaymentSource: toReferenceCode(draft.paymentSource),
        JointAccountHolderName: draft.jointAccountName,
        ThirdPartyName: draft.thirdPartyName,
        ThirdPartyIdentityNo: draft.thirdPartyIdentityNumber,
        ThirdPartyRelationship: toReferenceCode(draft.thirdPartyRelationship),
        ThirdPartyOtherRelationship: draft.thirdPartyRelationshipOther,
        ThirdPartyBankName: draft.paymentBankName,
        ThirdPartyOtherBankName: draft.paymentBankNameOther,
        ThirdPartyBankAccountHolder: draft.paymentBankAccountHolder,
        ThirdPartyBankAccountNumber: draft.paymentBankAccountNumber
      };
    case "beneficiaries-details":
      return {
        TrustID: trustId ?? 0,
        CaretakerDistribution: {
          Enabled: draft.caretakerDistributionEnabled,
          Main: {
            Name: draft.caretakerMainName,
            IdentityNo: draft.caretakerMainIdentityNumber,
            ContactNo: draft.caretakerMainContactNumber
          },
          Substitute: {
            Name: draft.caretakerSubstituteName,
            IdentityNo: draft.caretakerSubstituteIdentityNumber,
            ContactNo: draft.caretakerSubstituteContactNumber
          }
        },
        MinorDistribution: hasMinorBeneficiaryForDistribution(draft.beneficiaries)
          ? {
              DistributeToGuardian: draft.minorDistributionToGuardian,
              HoldByTrusteeCompany: draft.minorDistributionByTrustee,
              ReleaseAge: toNullableNumber(draft.minorDistributionReleaseAge)
            }
          : null,
        Beneficiaries: draft.beneficiaries.map((beneficiary) => ({
          BeneficiaryID: parseEntityId(beneficiary.id),
          BeneficiaryClientID: beneficiary.id,
          FullName: beneficiary.fullName,
          IdentityType: toReferenceCode(beneficiary.identityType),
          IdentityNo: beneficiary.identityNumber,
          Nationality: beneficiary.nationality,
          Gender: shouldShowBeneficiaryGenderAndDateOfBirth(beneficiary.identityType) ? toReferenceCode(beneficiary.gender) : null,
          DateOfBirth: shouldShowBeneficiaryGenderAndDateOfBirth(beneficiary.identityType) ? beneficiary.dateOfBirth || null : null,
          Email: beneficiary.email,
          ContactNo: beneficiary.contactNumber,
          RelationshipCode: toReferenceCode(beneficiary.relationship),
          OtherRelationship: beneficiary.relationshipOther,
          AddressLine1: beneficiary.address1,
          AddressLine2: beneficiary.address2,
          Postcode: beneficiary.postcode,
          City: beneficiary.city,
          State: beneficiary.state,
          Country: beneficiary.country,
          IsUSTaxPayer: toBooleanYesNo(beneficiary.usTaxReturn),
          HasOtherTaxResidence: toBooleanYesNo(beneficiary.otherTaxResident),
          TaxResidenceCountry: beneficiary.taxResidenceCountry,
          TaxIdentificationNo: beneficiary.tinNumber,
          TINUnavailableReason: toReferenceCode(beneficiary.tinUnavailableReason),
          TINUnavailableExplanation: beneficiary.tinUnavailableExplanation
        }))
      };
    case "beneficiary-allocations":
      return {
        TrustID: trustId ?? 0,
        AllocationType: getAllocationTypeNumber(draft.beneficiaryAllocationType),
        MainBeneficiaries: getMainAllocationPayload(draft),
        SubstituteBeneficiaries: getSubstituteAllocationPayload(draft)
      };
    case "execution-of-trust-deed":
      return {
        TrustID: trustId ?? 0,
        SigningMethod: toReferenceCode(draft.trustDeedSigningMethod),
        SpecialCircumstance: toReferenceCode(draft.specialCircumstance),
        ReadOverBy: draft.interpreterName,
        ReadOverIdentityNo: draft.interpreterIdentityNumber,
        LanguageOrDialect: draft.interpreterLanguage,
        RelationshipWithSettlor: toReferenceCode(draft.interpreterRelationship),
        OtherRelationshipWithSettlor: draft.interpreterRelationshipOther
      };
    case "supporting-documents":
      return {
        TrustID: trustId ?? 0,
        SupportingDocumentsConfirmed: draft.supportingDocumentsConfirmed,
        SupportingDocuments: draft.supportingDocuments.map((document) => ({
          FileName: document.fileName,
          FileSize: document.fileSize,
          FileExtension: document.fileExtension,
          UploadedAt: document.uploadedAt
        }))
      };
    case "co-broker":
      return {
        TrustID: trustId ?? 0,
        CoBrokers: draft.coBrokers.map((coBroker) => ({
          Email: coBroker.email,
          AllocationPercentage: toNullableNumber(coBroker.percentage)
        }))
      };
    case "review":
      return {
        TrustID: trustId ?? 0
      };
  }
}

function mapStep1ToDraft(step?: Record<string, unknown> | null): Partial<PersonalDetailsDraft> {
  if (!step) return {};
  const sourceOfFunds = asArray(step.SourceOfFunds);
  return {
    trustPlanId: asString(step.ProductCode),
    fullName: toUppercaseInput(asString(step.FullName)),
    identityType: normalizeSelectOptionValue(asString(step.IdentityType), identityTypeSelectOptions),
    identityNumber: toUppercaseInput(asString(step.IdentityNo)),
    nationality: fromReferenceCode(asString(step.Nationality)),
    gender: fromReferenceCode(asString(step.Gender)),
    dateOfBirth: toDateInputValue(asString(step.DateOfBirth)),
    email: toLowercaseInput(asString(step.Email)),
    contactNumber: asString(step.ContactNo),
    address1: toUppercaseInput(asString(step.AddressLine1)),
    address2: toUppercaseInput(asString(step.AddressLine2)),
    postcode: toUppercaseInput(asString(step.Postcode)),
    city: toUppercaseInput(asString(step.City)),
    state: toUppercaseInput(asString(step.State)),
    country: toUppercaseInput(fromReferenceCode(asString(step.Country))),
    usTaxReturn: toYesNo(step.IsUSTaxPayer),
    otherTaxResident: toYesNo(step.HasOtherTaxResidence),
    taxResidenceCountry: toUppercaseInput(fromReferenceCode(asString(step.TaxResidenceCountry))),
    tinNumber: toUppercaseInput(asString(step.TaxIdentificationNo)),
    tinUnavailableReason: fromReferenceCode(asString(step.TINUnavailableReason)),
    tinUnavailableExplanation: asString(step.TINUnavailableExplanation),
    employerName: asString(step.EmployerName),
    natureOfBusiness: asString(step.NatureOfBusiness),
    occupation: asString(step.Occupation),
    annualIncome: normalizeSelectOptionValue(asString(step.AnnualIncomeCode), annualIncomeOptions),
    totalNetWorth: normalizeSelectOptionValue(asString(step.NetWorthCode), netWorthOptions),
    sourceOfFunds: sourceOfFunds.length ? sourceOfFunds.map((source) => fromReferenceCode(asString(source.SourceCode))).filter(Boolean) : emptyDraft.sourceOfFunds,
    otherSourceOfFunds: asString(sourceOfFunds.find((source) => fromReferenceCode(asString(source.SourceCode)) === "Other")?.OtherDescription)
  };
}

function mapStep2ToDraft(step?: Record<string, unknown> | null): Partial<PersonalDetailsDraft> {
  if (!step) return {};
  return {
    trustAssetAmount: asNumberString(step.TrustAssetAmount),
    settlorBankName: asString(step.SettlorBankName),
    settlorBankNameOther: asString(step.SettlorOtherBankName),
    settlorBankAccountHolder: toUppercaseInput(asString(step.SettlorBankAccountHolder)),
    settlorBankAccountNumber: asString(step.SettlorBankAccountNumber),
    settlorSwiftCode: asString(step.SettlorSwiftCode),
    settlorBankAddress: asString(step.SettlorBankAddress),
    guaranteedReturnInstruction: fromReferenceCode(asString(step.GuaranteedReturnOption)),
    paymentSource: fromReferenceCode(asString(step.PaymentSource)),
    jointAccountName: asString(step.JointAccountHolderName),
    thirdPartyName: asString(step.ThirdPartyName),
    thirdPartyIdentityNumber: toUppercaseInput(asString(step.ThirdPartyIdentityNo)),
    thirdPartyRelationship: fromReferenceCode(asString(step.ThirdPartyRelationship)),
    thirdPartyRelationshipOther: asString(step.ThirdPartyOtherRelationship),
    paymentBankName: asString(step.ThirdPartyBankName),
    paymentBankNameOther: asString(step.ThirdPartyOtherBankName),
    paymentBankAccountHolder: toUppercaseInput(asString(step.ThirdPartyBankAccountHolder)),
    paymentBankAccountNumber: asString(step.ThirdPartyBankAccountNumber)
  };
}

function mapStep3ToDraft(step?: Record<string, unknown> | null): Partial<PersonalDetailsDraft> {
  if (!step) return {};
  const caretaker = asRecord(step.CaretakerDistribution);
  const mainCaretaker = asRecord(caretaker?.Main);
  const substituteCaretaker = asRecord(caretaker?.Substitute);
  const minor = asRecord(step.MinorDistribution);
  const beneficiaries = asArray(step.Beneficiaries);

  return {
    caretakerDistributionEnabled: Boolean(caretaker?.Enabled),
    caretakerMainName: toUppercaseInput(asString(mainCaretaker?.Name)),
    caretakerMainIdentityNumber: asString(mainCaretaker?.IdentityNo),
    caretakerMainContactNumber: asString(mainCaretaker?.ContactNo),
    caretakerSubstituteName: toUppercaseInput(asString(substituteCaretaker?.Name)),
    caretakerSubstituteIdentityNumber: asString(substituteCaretaker?.IdentityNo),
    caretakerSubstituteContactNumber: asString(substituteCaretaker?.ContactNo),
    minorDistributionToGuardian: Boolean(minor?.DistributeToGuardian),
    minorDistributionByTrustee: Boolean(minor?.HoldByTrusteeCompany),
    minorDistributionReleaseAge: asNumberString(minor?.ReleaseAge),
    beneficiaries: beneficiaries.length ? beneficiaries.map(mapBeneficiaryToDraft) : emptyDraft.beneficiaries
  };
}

function mapStep4ToDraft(step?: Record<string, unknown> | null): Partial<PersonalDetailsDraft> {
  if (!step) return {};
  const main = asArray(step.MainBeneficiaries).map(mapAllocationToDraft);
  const substitute = asArray(step.SubstituteBeneficiaries).map(mapAllocationToDraft);
  return {
    beneficiaryAllocationType: allocationTypeOptions[Math.max(0, Number(step.AllocationType ?? 1) - 1)] ?? allocationTypes.type1,
    allocationMainBeneficiaryId: main[0]?.beneficiaryId ?? "",
    allocationSubstituteBeneficiaryId: substitute[0]?.beneficiaryId ?? "",
    allocationMainBeneficiaries: main.length ? main : emptyDraft.allocationMainBeneficiaries,
    allocationSubstituteBeneficiaries: substitute.length ? substitute : emptyDraft.allocationSubstituteBeneficiaries
  };
}

function mapStep5ToDraft(step?: Record<string, unknown> | null): Partial<PersonalDetailsDraft> {
  if (!step) return {};
  return {
    trustDeedSigningMethod: fromReferenceCode(asString(step.SigningMethod)),
    specialCircumstance: fromReferenceCode(asString(step.SpecialCircumstance)),
    interpreterName: asString(step.ReadOverBy),
    interpreterIdentityNumber: toUppercaseInput(asString(step.ReadOverIdentityNo)),
    interpreterLanguage: asString(step.LanguageOrDialect),
    interpreterRelationship: fromReferenceCode(asString(step.RelationshipWithSettlor)),
    interpreterRelationshipOther: asString(step.OtherRelationshipWithSettlor)
  };
}

function mapStep6ToDraft(step?: Record<string, unknown> | null): Partial<PersonalDetailsDraft> {
  if (!step) return {};
  const documents = asArray(step.SupportingDocuments);
  return {
    supportingDocuments: documents.map((document) => ({
      id: asString(document.SupportingDocumentID),
      fileName: asString(document.OriginalFileName),
      fileSize: Number(document.FileSize ?? 0),
      fileExtension: asString(document.FileExtension) || getSupportingDocumentExtension(asString(document.OriginalFileName)),
      fileUrl: asString(document.FileUrl),
      uploadedAt: asString(document.CreatedAt),
      fileError: ""
    })),
    supportingDocumentsConfirmed: true
  };
}

function mapStep7ToDraft(step?: Record<string, unknown> | null): Partial<PersonalDetailsDraft> {
  if (!step) return {};
  return {
    coBrokers: asArray(step.CoBrokers).map((coBroker) => ({
      id: `COB-${asString(coBroker.Email) || Math.random().toString(36).slice(2, 7)}`,
      email: toLowercaseInput(asString(coBroker.Email)),
      percentage: asNumberString(coBroker.AllocationPercentage)
    }))
  };
}

function getMainAllocationPayload(draft: PersonalDetailsDraft) {
  if (draft.beneficiaryAllocationType === allocationTypes.type1 || draft.beneficiaryAllocationType === allocationTypes.type2 || draft.beneficiaryAllocationType === allocationTypes.type3 || draft.beneficiaryAllocationType === allocationTypes.type4) {
    return [createAllocationPayloadEntry(draft.allocationMainBeneficiaryId, "100", false)];
  }
  if (draft.beneficiaryAllocationType === allocationTypes.type5) {
    return draft.allocationMainBeneficiaries.map((entry) => createAllocationPayloadEntry(entry.beneficiaryId, entry.percentage, false));
  }
  if (draft.beneficiaryAllocationType === allocationTypes.type6) {
    return draft.allocationMainBeneficiaries.map((entry) => createAllocationPayloadEntry(entry.beneficiaryId, entry.percentage, true));
  }
  return [];
}

function getSubstituteAllocationPayload(draft: PersonalDetailsDraft) {
  if (draft.beneficiaryAllocationType === allocationTypes.type1) {
    return [createAllocationPayloadEntry(draft.allocationSubstituteBeneficiaryId, "100", false)];
  }
  if (draft.beneficiaryAllocationType === allocationTypes.type2) {
    return draft.allocationSubstituteBeneficiaries.map((entry) => createAllocationPayloadEntry(entry.beneficiaryId, entry.percentage, false));
  }
  if (draft.beneficiaryAllocationType === allocationTypes.type3) {
    return draft.allocationSubstituteBeneficiaries.map((entry) => createAllocationPayloadEntry(entry.beneficiaryId, entry.percentage, true));
  }
  return [];
}

function createAllocationPayloadEntry(beneficiaryId: string, percentage: string, includePercentage: boolean) {
  return {
    BeneficiaryID: parseEntityId(beneficiaryId),
    BeneficiaryClientID: beneficiaryId,
    AllocationPercentage: includePercentage ? toNullableNumber(percentage) : null
  };
}

function mapBeneficiaryToDraft(beneficiary: Record<string, unknown>): BeneficiaryDraft {
  const fallback = createEmptyBeneficiary();
  return {
    ...fallback,
    id: asString(beneficiary.BeneficiaryID) || asString(beneficiary.BeneficiaryClientID) || fallback.id,
    fullName: toUppercaseInput(asString(beneficiary.FullName)),
    identityType: normalizeSelectOptionValue(asString(beneficiary.IdentityType), identityTypeSelectOptions),
    identityNumber: toUppercaseInput(asString(beneficiary.IdentityNo)),
    nationality: fromReferenceCode(asString(beneficiary.Nationality)),
    gender: fromReferenceCode(asString(beneficiary.Gender)),
    dateOfBirth: toDateInputValue(asString(beneficiary.DateOfBirth)),
    email: toLowercaseInput(asString(beneficiary.Email)),
    contactNumber: asString(beneficiary.ContactNo),
    relationship: fromReferenceCode(asString(beneficiary.RelationshipCode)),
    relationshipOther: asString(beneficiary.OtherRelationship),
    address1: toUppercaseInput(asString(beneficiary.AddressLine1)),
    address2: toUppercaseInput(asString(beneficiary.AddressLine2)),
    postcode: toUppercaseInput(asString(beneficiary.Postcode)),
    city: toUppercaseInput(asString(beneficiary.City)),
    state: toUppercaseInput(asString(beneficiary.State)),
    country: toUppercaseInput(fromReferenceCode(asString(beneficiary.Country))),
    usTaxReturn: toYesNo(beneficiary.IsUSTaxPayer),
    otherTaxResident: toYesNo(beneficiary.HasOtherTaxResidence),
    taxResidenceCountry: toUppercaseInput(fromReferenceCode(asString(beneficiary.TaxResidenceCountry))),
    tinNumber: toUppercaseInput(asString(beneficiary.TaxIdentificationNo)),
    tinUnavailableReason: fromReferenceCode(asString(beneficiary.TINUnavailableReason)),
    tinUnavailableExplanation: asString(beneficiary.TINUnavailableExplanation)
  };
}

function mapAllocationToDraft(allocation: Record<string, unknown>): AllocationEntry {
  return {
    id: `ALLOC-${asString(allocation.BeneficiaryID) || Math.random().toString(36).slice(2, 7)}`,
    beneficiaryId: asString(allocation.BeneficiaryID),
    percentage: asNumberString(allocation.AllocationPercentage)
  };
}

function getAllocationTypeNumber(type: string) {
  const index = allocationTypeOptions.findIndex((option) => option === type);
  return index >= 0 ? index + 1 : 0;
}

function parseTrustApplicationId(applicationId: string) {
  if (!applicationId || applicationId === newApplicationId) return null;
  const numericId = Number(applicationId);
  return Number.isFinite(numericId) ? numericId : null;
}

function parseEntityId(value: string) {
  const numericId = Number(value);
  return Number.isFinite(numericId) ? numericId : null;
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numericValue = Number(trimmed);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toBooleanYesNo(value: string) {
  if (value === "Yes") return true;
  if (value === "No") return false;
  return null;
}

function toYesNo(value: unknown) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => Boolean(asRecord(entry))) : [];
}

function asString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asNumberString(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? String(numericValue) : "";
}

function toNullableFiniteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toDateInputValue(value: string) {
  if (!value) return "";
  const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (dateOnly) return dateOnly;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

const referenceCodeOverrides: Record<string, string> = {
  "withdraw to bank account": "TRANSFER_TO_BANK",
  "redeposit as trust asset": "REDEPOSIT_AS_TRUST_ASSET",
  "my personal account": "PERSONAL_ACCOUNT",
  "[a] tin is not issued by the country / jurisdiction of tax residence": "TIN_NOT_ISSUED",
  "[b] unable to provide tin. please explain why you are unable to provide": "UNABLE_TO_PROVIDE",
  "[c] tin is not required by country of tax residence": "TIN_NOT_REQUIRED",
  "sales of asset(s)": "SALES_OF_ASSETS"
};

function toReferenceCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const override = referenceCodeOverrides[trimmed.toLowerCase()];
  if (override) return override;

  return trimmed
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

const reverseReferenceCodeOverrides: Record<string, string> = {
  TRANSFER_TO_BANK: "Withdraw to bank account",
  PAYOUT: "Withdraw to bank account",
  REDEPOSIT_AS_TRUST_ASSET: "Redeposit as trust asset",
  COMPANY_ID: "Company ID",
  PERSONAL_ACCOUNT: "My Personal Account",
  OWN_ACCOUNT: "My Personal Account",
  JOINT_ACCOUNT: "Joint Account",
  THIRD_PARTY: "Third Party",
  TIN_NOT_ISSUED: "[A] TIN is not issued by the country / jurisdiction of tax residence",
  UNABLE_TO_PROVIDE: "[B] Unable to provide TIN. Please explain why you are unable to provide",
  TIN_NOT_REQUIRED: "[C] TIN is not required by country of tax residence",
  SALES_OF_ASSETS: "Sales of asset(s)",
  CURRENT_INCOME: "Current Income",
  SALARY: "Current Income",
  SAVINGS: "Current Income",
  BORROWED_CAPITAL: "Borrowed Capital",
  SIGNATURE: "Signature",
  PHYSICAL: "Signature",
  THUMBPRINT: "Thumbprint",
  LESS_PROFICIENT_IN_ENGLISH: "Less proficient in English",
  NONE: "None"
};

function fromReferenceCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const upper = trimmed.toUpperCase();
  if (reverseReferenceCodeOverrides[upper]) return reverseReferenceCodeOverrides[upper];
  return upper
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatAddress(record: Pick<PersonalDetailsDraft, "address1" | "address2" | "postcode" | "city" | "state" | "country">) {
  return [record.address1, record.address2, record.postcode, record.city, record.state, record.country].filter(Boolean).join(", ");
}

function validateIcImageFile(file: File) {
  const allowedTypes = ["image/jpeg", "image/png"];
  const allowedExtensions = /\.(jpe?g|png)$/i;
  if (!allowedTypes.includes(file.type) || !allowedExtensions.test(file.name)) {
    return "Only JPG and PNG image files are allowed.";
  }

  if (file.size > 5 * 1024 * 1024) {
    return "File size cannot be more than 5MB.";
  }

  return "";
}

function canUploadIdentityDocument(identityType: string) {
  const normalized = identityType.trim().toLowerCase();
  return normalized === "nric";
}

function shouldShowBeneficiaryGenderAndDateOfBirth(identityType: string) {
  const normalized = toReferenceCode(identityType);
  return normalized === "NRIC" || normalized === "PASSPORT" || normalized === "PASSPOR";
}

function mapMalaysiaIcApiResultToExtraction(result: TrustMalaysiaIcExtractionResult, fileName: string): IcExtractionData {
  const identityNumber = getOcrFieldValue(result.ICNumber);
  return {
    fullName: getOcrFieldValue(result.Name),
    identityNumber,
    address1: getOcrFieldValue(result.Address1),
    address2: getOcrFieldValue(result.Address2),
    postcode: getOcrFieldValue(result.Postcode),
    city: getOcrFieldValue(result.City),
    state: getOcrFieldValue(result.State),
    birthday: calculateBirthdayFromIc(identityNumber),
    confidence: {
      "IC Number": getOcrFieldConfidencePercent(result.ICNumber),
      "Full Name": getOcrFieldConfidencePercent(result.Name),
      "Address Line 1": getOcrFieldConfidencePercent(result.Address1),
      "Address Line 2": getOcrFieldConfidencePercent(result.Address2),
      Postcode: getOcrFieldConfidencePercent(result.Postcode),
      City: getOcrFieldConfidencePercent(result.City),
      State: getOcrFieldConfidencePercent(result.State)
    },
    fileName
  };
}

function getOcrFieldValue(field?: TrustMalaysiaIcFieldResult | null) {
  return field?.Value?.trim() ?? "";
}

function getOcrFieldConfidencePercent(field?: TrustMalaysiaIcFieldResult | null) {
  const confidence = Number(field?.Confidence ?? 0);
  if (!Number.isFinite(confidence)) return 0;
  return Math.round(Math.max(0, Math.min(1, confidence)) * 100);
}

function createEmptyIcExtraction(fileName = ""): IcExtractionData {
  return {
    fullName: "",
    identityNumber: "",
    address1: "",
    address2: "",
    postcode: "",
    city: "",
    state: "",
    birthday: "",
    confidence: { ...defaultOcrConfidenceScores },
    fileName
  };
}

function calculateBirthdayFromIc(identityNumber: string) {
  const digits = identityNumber.replace(/\D/g, "");
  if (digits.length < 6) return "";

  const year = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  const currentYearShort = new Date().getFullYear() % 100;
  const fullYear = year <= currentYearShort ? 2000 + year : 1900 + year;
  const birthday = new Date(fullYear, month - 1, day);
  if (birthday.getFullYear() !== fullYear || birthday.getMonth() !== month - 1 || birthday.getDate() !== day) {
    return "";
  }

  return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function Section({ title, description, leadingActions, actions, children }: { title: string; description?: string; leadingActions?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="relative mb-4 border-b border-line pb-5">
        <h2 className="px-28 text-center text-lg font-semibold text-brandGold sm:px-36">{title}</h2>
        {description ? <p className="mx-auto mt-1 max-w-3xl text-center text-sm text-textSecondary">{description}</p> : null}
        {leadingActions ? <div className="absolute left-0 top-0">{leadingActions}</div> : null}
        {actions ? <div className="absolute right-0 top-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function FormSubsectionHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-line pb-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5">
        <span className="h-6 w-1 rounded-full bg-brandGold" aria-hidden="true" />
        <h3 className="text-base font-semibold tracking-[0.01em] text-textPrimary">{title}</h3>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
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

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  if (type === "date") {
    return (
      <label className={`block text-sm font-semibold text-textPrimary ${className}`}>
        <span className="mb-1 flex min-h-10 items-end text-sm font-semibold leading-5 text-textPrimary">
          {label}{required ? <span className="ml-1 text-red-600">*</span> : null}
        </span>
        <DatePickerInput value={value} onChange={onChange} required={required} disabled={disabled} buttonClassName="mt-0 h-10" />
      </label>
    );
  }

  return (
    <label className={`block text-sm font-semibold text-textPrimary ${className}`}>
      <span className="mb-1 flex min-h-10 items-end text-sm font-semibold leading-5 text-textPrimary">
        {label}{required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <input
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-textSecondary"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, className = "", required = false }: { label: string; value: string; onChange: (value: string) => void; className?: string; required?: boolean }) {
  return (
    <label className={`block text-sm font-semibold text-textPrimary ${className}`}>
      <span className="mb-1 flex min-h-10 items-end text-sm font-semibold leading-5 text-textPrimary">
        {label}{required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-textPrimary transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
    </label>
  );
}

function SelectInput({ label, value, options, onChange, className = "", required = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; className?: string; required?: boolean }) {
  return (
    <label className={`block text-sm font-semibold text-textPrimary ${className}`}>
      <span className="mb-1 flex min-h-10 items-end text-sm font-semibold leading-5 text-textPrimary">
        {label}{required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
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
  className = "",
  required = false
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`block text-sm font-semibold text-textPrimary ${className}`}>
      <span className="mb-1 flex min-h-10 items-end text-sm font-semibold leading-5 text-textPrimary">
        {label}{required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function OcrConfidenceList({ scores }: { scores: OcrConfidenceScores }) {
  const entries = Object.entries({ ...defaultOcrConfidenceScores, ...scores });

  return (
    <div className="flex min-h-40 flex-col rounded-lg border border-line bg-white px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <span className="block text-sm font-semibold text-textPrimary">Extraction Confidence</span>
          <span className="mt-0.5 block text-xs text-textSecondary">Extraction quality by field</span>
        </div>
        <span className="rounded-full bg-[#FFFBEB] px-2.5 py-1 text-xs font-semibold text-brandGold">Score</span>
      </div>
      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {entries.map(([field, score]) => (
          <div key={field} className="grid grid-cols-[minmax(110px,0.8fr)_1fr_42px] items-center gap-3 text-xs">
            <span className="truncate font-medium text-textSecondary">{field}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-soft">
              <span className="block h-full rounded-full bg-brandGold" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
            </span>
            <span className="text-right font-semibold text-textPrimary">{score}%</span>
          </div>
        ))}
      </div>
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
  const normalizedBeneficiaries = beneficiaries.map((beneficiary) => {
    const fallback = createEmptyBeneficiary();
    return {
      ...fallback,
      ...beneficiary,
      id: beneficiary.id || fallback.id,
      fullName: toUppercaseInput(beneficiary.fullName || ""),
      identityType: normalizeSelectOptionValue(beneficiary.identityType, identityTypeSelectOptions),
      identityNumber: toUppercaseInput(beneficiary.identityNumber || ""),
      email: toLowercaseInput(beneficiary.email || ""),
      address1: toUppercaseInput(beneficiary.address1 || ""),
      address2: toUppercaseInput(beneficiary.address2 || ""),
      postcode: toUppercaseInput(beneficiary.postcode || ""),
      city: toUppercaseInput(beneficiary.city || ""),
      state: toUppercaseInput(beneficiary.state || ""),
      country: toUppercaseInput(beneficiary.country || ""),
      taxResidenceCountry: toUppercaseInput(beneficiary.taxResidenceCountry || ""),
      tinNumber: toUppercaseInput(beneficiary.tinNumber || "")
    };
  });
  const hasMinorDistribution = hasMinorBeneficiaryForDistribution(normalizedBeneficiaries);
  return {
    ...draft,
    fullName: toUppercaseInput(draft.fullName || ""),
    identityType: normalizeSelectOptionValue(draft.identityType, identityTypeSelectOptions),
    identityNumber: toUppercaseInput(draft.identityNumber || ""),
    email: toLowercaseInput(draft.email || ""),
    address1: toUppercaseInput(draft.address1 || ""),
    address2: toUppercaseInput(draft.address2 || ""),
    postcode: toUppercaseInput(draft.postcode || ""),
    city: toUppercaseInput(draft.city || ""),
    state: toUppercaseInput(draft.state || ""),
    country: toUppercaseInput(draft.country || ""),
    taxResidenceCountry: toUppercaseInput(draft.taxResidenceCountry || ""),
    tinNumber: toUppercaseInput(draft.tinNumber || ""),
    settlorBankAccountHolder: toUppercaseInput(draft.settlorBankAccountHolder || ""),
    paymentBankAccountHolder: toUppercaseInput(draft.paymentBankAccountHolder || ""),
    thirdPartyIdentityNumber: toUppercaseInput(draft.thirdPartyIdentityNumber || ""),
    annualIncome: normalizeSelectOptionValue(draft.annualIncome, annualIncomeOptions),
    totalNetWorth: normalizeSelectOptionValue(draft.totalNetWorth, netWorthOptions),
    ocrConfidence: draft.ocrConfidence && typeof draft.ocrConfidence === "object" ? { ...defaultOcrConfidenceScores, ...draft.ocrConfidence } : { ...defaultOcrConfidenceScores },
    beneficiaries: normalizedBeneficiaries,
    caretakerDistributionEnabled: Boolean(draft.caretakerDistributionEnabled),
    caretakerMainName: toUppercaseInput(draft.caretakerMainName || ""),
    caretakerMainIdentityNumber: toUppercaseInput(draft.caretakerMainIdentityNumber || ""),
    caretakerMainContactNumber: draft.caretakerMainContactNumber || "",
    caretakerSubstituteName: toUppercaseInput(draft.caretakerSubstituteName || ""),
    caretakerSubstituteIdentityNumber: toUppercaseInput(draft.caretakerSubstituteIdentityNumber || ""),
    caretakerSubstituteContactNumber: draft.caretakerSubstituteContactNumber || "",
    minorDistributionToGuardian: hasMinorDistribution ? Boolean(draft.minorDistributionToGuardian) : false,
    minorDistributionByTrustee: hasMinorDistribution ? Boolean(draft.minorDistributionByTrustee) : false,
    minorDistributionReleaseAge: hasMinorDistribution ? draft.minorDistributionReleaseAge || "" : "",
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
    interpreterIdentityNumber: toUppercaseInput(draft.interpreterIdentityNumber || ""),
    interpreterLanguage: draft.interpreterLanguage || "",
    interpreterRelationship: draft.interpreterRelationship || "",
    interpreterRelationshipOther: draft.interpreterRelationshipOther || "",
    supportingDocuments: supportingDocuments
      .filter((document) => Boolean(document?.fileName))
      .map((document, index) => ({
        id: document.id || `DOC-${index + 1}`,
        fileName: document.fileName || "",
        fileSize: Number(document.fileSize || 0),
        fileExtension: document.fileExtension || getSupportingDocumentExtension(document.fileName || ""),
        fileUrl: document.fileUrl || "",
        uploadedAt: document.uploadedAt || "",
        fileError: document.fileError || ""
      })),
    supportingDocumentsConfirmed: Boolean(draft.supportingDocumentsConfirmed),
    coBrokers: coBrokers.map((coBroker) => {
      const fallback = createEmptyCoBroker();
      return { ...fallback, ...coBroker, id: coBroker.id || fallback.id, email: toLowercaseInput(coBroker.email || "") };
    })
  };
}

function formatCurrency(value?: number) {
  return `RM ${Number(value ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

