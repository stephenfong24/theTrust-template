import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, Check, ChevronDown, Clock3, IdCard, Info, Landmark, LoaderCircle, MapPin, Pencil, Send, Upload, UserPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm, type FieldErrors, type FieldPath } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { lookupApi, type BankLookupItem, type CountryLookupItem } from "../api/lookupApi";
import { registerApi, type KycDocumentType } from "../api/registerApi";
import { serviceApi } from "../api/serviceApi";
import { DatePickerInput } from "../components/forms/DatePickerInput";
import { OtpInput } from "../components/forms/OtpInput";
import { PasswordInput } from "../components/forms/PasswordInput";
import { Stepper } from "../components/forms/Stepper";
import { SubmitButton } from "../components/forms/SubmitButton";
import { Brand } from "../components/layout/Brand";
import { notifyError, notifySuccess } from "../services/notificationService";
import { getFirstFormError } from "../utils/formErrors";
import { isValidPasswordCriteria, passwordCriteriaMessage } from "../utils/passwordValidation";

const steps = ["Referral", "Identity", "Contact", "Bank", "Review"];
const identityTypes = ["NRIC", "Passport", "SSM"] as const;
const otpLength = 6;
const otpCooldownSeconds = 60;
const maxKycFileSize = 5 * 1024 * 1024;
const acceptedKycExtensionSet = new Set(["jpg", "jpeg", "png"]);
const acceptedKycExtensions = ".jpg,.jpeg,.png";

const schema = z
  .object({
    referralCode: z.string().min(1, "Referral code is required."),
    referralName: z.string().min(1, "Referral name is required."),
    email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
    emailOtp: z
      .string()
      .min(1, "Email OTP is required.")
      .regex(/^\d{6}$/, "Email OTP must be 6 digits."),
    loginPassword: z.string().refine(isValidPasswordCriteria, passwordCriteriaMessage),
    confirmLoginPassword: z.string().min(1, "Confirm login password is required."),
    identityType: z.enum(identityTypes),
    identityNo: z.string().min(1, "Identity no. is required."),
    fullName: z.string().min(1, "Full name or company name is required."),
    dateOfBirth: z
      .string()
      .min(1, "Date is required.")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use yyyy-MM-dd format."),
    tinNumber: z.string().min(1, "TIN number is required."),
    occupation: z.string().nullable(),
    country: z.string().min(1, "Country is required."),
    mobileCode: z.string().min(1, "Mobile code is required."),
    mobileNumber: z.string().min(1, "Mobile number is required.").regex(/^\d{7,12}$/, "Mobile number must be 7-12 digits."),
    address1: z.string().min(1, "Address Line 1 is required."),
    address2: z.string().min(1, "Address Line 2 is required."),
    city: z.string().min(1, "City is required."),
    postcode: z.string().min(1, "Postcode is required.").regex(/^\d{4,10}$/, "Postcode must be 4-10 digits."),
    state: z.string().min(1, "State is required."),
    bankName: z.string().min(1, "Bank name is required."),
    bankAccountHolderName: z.string().min(1, "Bank account holder name is required."),
    bankAccountNumber: z
      .string()
      .min(1, "Bank account number is required.")
      .regex(/^\d{6,20}$/, "Bank account number must be 6-20 digits."),
    consent: z.boolean().refine((value) => value, "Consent is required.")
  })
  .superRefine((values, context) => {
    if (values.loginPassword !== values.confirmLoginPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmLoginPassword"],
        message: "Passwords do not match."
      });
    }

    if (values.identityType !== "SSM" && !isAtLeast18(values.dateOfBirth)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateOfBirth"],
        message: "Agent must be at least 18 years old."
      });
    }

    if (values.identityType !== "SSM" && !values.occupation?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occupation"],
        message: "Occupation is required."
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface SignupKycDocument {
  title: string;
  documentType: KycDocumentType;
  file?: File;
  imageUrl?: string;
  publicId?: string;
  uploadedFile?: string;
}

interface SignupKycConfig {
  description: string;
  documents: SignupKycDocument[];
}

interface KycPublicIds {
  IdentityFrontPublicID: string;
  IdentityBackPublicID: string;
  PassportPublicID: string;
  SSMPublicID: string;
}

const stepFields: Array<Array<FieldPath<FormValues>>> = [
  ["referralCode", "referralName", "email", "emailOtp", "loginPassword", "confirmLoginPassword"],
  ["identityType", "identityNo", "fullName", "dateOfBirth", "tinNumber", "occupation"],
  ["country", "mobileCode", "mobileNumber", "address1", "address2", "city", "postcode", "state"],
  ["bankName", "bankAccountHolderName", "bankAccountNumber"],
  ["consent"]
];

const defaultValues: FormValues = {
  referralCode: "",
  referralName: "",
  email: "",
  emailOtp: "",
  loginPassword: "",
  confirmLoginPassword: "",
  identityType: "NRIC",
  identityNo: "",
  fullName: "",
  dateOfBirth: "1990-01-01",
  tinNumber: "",
  occupation: "",
  country: "",
  mobileCode: "+60",
  mobileNumber: "",
  postcode: "",
  state: "",
  city: "",
  address1: "",
  address2: "",
  bankName: "",
  bankAccountHolderName: "",
  bankAccountNumber: "",
  consent: false
};

export function AgentSignupPage() {
  const navigate = useNavigate();
  const { referralCode: referralCodeParam } = useParams();
  const referralCode = (referralCodeParam ?? "").trim();
  const [activeStep, setActiveStep] = useState(0);
  const [mobileCodeOpen, setMobileCodeOpen] = useState(false);
  const mobileCodeRef = useRef<HTMLSpanElement>(null);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSentEmail, setOtpSentEmail] = useState("");
  const [otpSecondsRemaining, setOtpSecondsRemaining] = useState(0);
  const [registrationToken, setRegistrationToken] = useState("");
  const [uploadingKycTitle, setUploadingKycTitle] = useState("");
  const [serverValidatingStep, setServerValidatingStep] = useState(false);
  const [kycPublicIds, setKycPublicIds] = useState<KycPublicIds>(getEmptyKycPublicIds());
  const [countryOptions, setCountryOptions] = useState<CountryLookupItem[]>([]);
  const [mobileCodeOptions, setMobileCodeOptions] = useState<Array<{ country: string; code: string }>>([]);
  const [bankOptions, setBankOptions] = useState<BankLookupItem[]>([]);
  const [kycDocuments, setKycDocuments] = useState<SignupKycDocument[]>(getSignupKycConfig(defaultValues.identityType).documents);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    getFieldState,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const values = watch();
  const identityLabels = useMemo(() => getIdentityLabels(values.identityType), [values.identityType]);
  const kycConfig = useMemo(() => getSignupKycConfig(values.identityType), [values.identityType]);
  const selectedCountry = useMemo(
    () => countryOptions.find((country) => country.CountryDomain === values.country),
    [countryOptions, values.country]
  );
  const selectedBank = useMemo(
    () => bankOptions.find((bank) => bank.BankName === values.bankName),
    [bankOptions, values.bankName]
  );
  const emailRegistration = register("email");
  const emailOtpRegistration = register("emailOtp");

  useEffect(() => {
    document.title = "Trust Representative Signup | Trust Fund Management System";
  }, []);

  useEffect(() => {
    if (!referralCode) {
      navigate("/login", { replace: true });
      return;
    }

    let mounted = true;
    setValue("referralCode", referralCode, { shouldValidate: true });
    setValue("referralName", "", { shouldValidate: true });
    setRegistrationToken("");

    async function validateReferralCode() {
      try {
        const sponsor = await registerApi.validateSponsor(referralCode);
        if (!mounted) return;
        setValue("referralName", sponsor.Fullname, { shouldValidate: true });
        const session = await registerApi.createRegistrationSession(referralCode);
        if (!mounted) return;
        setRegistrationToken(session.RegistrationToken);
      } catch (error) {
        if (!mounted) return;
        notifyError(error instanceof Error ? error.message : "Unable to validate referral code.", "agent-signup-referral-error");
        navigate("/login", { replace: true });
      }
    }

    validateReferralCode();

    return () => {
      mounted = false;
    };
  }, [navigate, referralCode, setValue]);

  useEffect(() => {
    let mounted = true;

    async function loadLookupData() {
      try {
        const { countries, banks, mobileCodes } = await lookupApi.getSignupLookupData();

        if (!mounted) return;

        setCountryOptions(countries);
        setMobileCodeOptions(mobileCodes);
        setBankOptions(banks);

        const malaysia = countries.find(
          (country) => country.CountryName.toLowerCase() === "malaysia" || country.CountryDomain.toUpperCase() === "MY"
        );

        if (malaysia && !getValues("country")) {
          setValue("country", malaysia.CountryDomain, { shouldValidate: true });
        }

        if (!getValues("mobileCode")) {
          setValue("mobileCode", formatMobileCode(malaysia?.CountryMobileCode ?? 60), { shouldValidate: true });
        }
      } catch (error) {
        if (!mounted) return;
        notifyError(error instanceof Error ? error.message : "Unable to load signup lookup data.", "agent-signup-lookup-error");
      }
    }

    loadLookupData();

    return () => {
      mounted = false;
    };
  }, [getValues, setValue]);

  useEffect(() => {
    if (!mobileCodeOpen) return undefined;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!mobileCodeRef.current?.contains(event.target as Node)) {
        setMobileCodeOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [mobileCodeOpen]);

  useEffect(() => {
    if (!selectedCountry || values.mobileCode) return;
    setValue("mobileCode", formatMobileCode(selectedCountry.CountryMobileCode), { shouldDirty: true, shouldValidate: true });
  }, [selectedCountry, setValue, values.mobileCode]);

  useEffect(() => {
    if (otpSecondsRemaining <= 0) return undefined;
    const timer = window.setInterval(() => {
      setOtpSecondsRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpSecondsRemaining]);

  useEffect(() => {
    if (!otpSentEmail) return undefined;
    const timer = window.setTimeout(() => setOtpSentEmail(""), 5000);
    return () => window.clearTimeout(timer);
  }, [otpSentEmail]);

  useEffect(() => {
    setKycDocuments(kycConfig.documents);
    setKycPublicIds(getEmptyKycPublicIds());
  }, [kycConfig]);

  useEffect(() => {
    if (values.identityType === "SSM" && values.occupation !== null) {
      setValue("occupation", null, { shouldDirty: true, shouldValidate: true });
      return;
    }

    if (values.identityType !== "SSM" && values.occupation === null) {
      setValue("occupation", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [setValue, values.identityType, values.occupation]);

  const requestEmailOtp = async () => {
    const valid = await trigger("email", { shouldFocus: true });
    if (!valid) {
      notifyError(getFieldState("email").error?.message ?? "Enter a valid email address before requesting OTP.", "agent-signup-email-otp-error");
      return;
    }
    setOtpSending(true);
    try {
      await serviceApi.sendRegistrationOtp(values.email.trim());
      setOtpRequested(true);
      setOtpSentEmail(values.email.trim());
      setOtpSecondsRemaining(otpCooldownSeconds);
      notifySuccess(`Verification code sent to ${values.email.trim()}.`, "agent-signup-email-otp-success");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to send verification code.", "agent-signup-email-otp-error");
    } finally {
      setOtpSending(false);
    }
  };

  const uploadKycDocument = async (title: string, file: File | undefined) => {
    if (!file) return;
    const error = validateKycFile(file);
    if (error) {
      notifyError(error, "agent-signup-kyc-file-error");
      return;
    }

    const document = kycDocuments.find((item) => item.title === title);
    if (!document) return;

    setUploadingKycTitle(title);

    try {
      const token = await getOrCreateRegistrationToken();
      const upload = await registerApi.uploadKycDocument(token, document.documentType, file);
      const publicIdField = getKycPublicIdField(document.documentType);
      setKycDocuments((documents) =>
        documents.map((item) =>
          item.title === title
            ? {
                ...item,
                file,
                imageUrl: upload.FileUrl,
                publicId: upload.PublicID,
                uploadedFile: upload.UploadedFile
              }
            : item
        )
      );
      setKycPublicIds((publicIds) => ({
        ...publicIds,
        [publicIdField]: upload.PublicID
      }));
      notifySuccess(`${title} uploaded successfully.`, "agent-signup-kyc-upload-success");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to upload this image. Please try again.", "agent-signup-kyc-upload-error");
    } finally {
      setUploadingKycTitle("");
    }
  };

  const getOrCreateRegistrationToken = async () => {
    if (registrationToken) return registrationToken;

    const session = await registerApi.createRegistrationSession(values.referralCode.trim());
    setRegistrationToken(session.RegistrationToken);
    return session.RegistrationToken;
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    emailRegistration.onChange(event);
    setValue("emailOtp", "", { shouldDirty: true });
    setOtpRequested(false);
    setOtpSentEmail("");
    setOtpSecondsRemaining(0);
  };

  const handleOtpChange = (value: string) => {
    setValue("emailOtp", value.replace(/\D/g, "").slice(0, otpLength), { shouldDirty: true, shouldValidate: true });
  };

  const goNext = async () => {
    const valid = await trigger(stepFields[activeStep], { shouldFocus: true });
    if (!valid) {
      notifyError(getFirstStepError(stepFields[activeStep], getFieldState), "agent-signup-step-error");
      return;
    }
    if (activeStep === 1) {
      const kycError = getKycUploadError(kycDocuments);
      if (kycError) {
        notifyError(kycError, "agent-signup-kyc-required");
        return;
      }
    }

    setServerValidatingStep(true);
    try {
      await validateCurrentStep(activeStep, values, kycPublicIds);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to validate this step.", "agent-signup-step-server-error");
      return;
    } finally {
      setServerValidatingStep(false);
    }

    setActiveStep((step) => Math.min(steps.length - 1, step + 1));
  };

  const submit = async () => {
    const kycError = getKycUploadError(kycDocuments);
    if (kycError) {
      notifyError(kycError, "agent-signup-submit-kyc-required");
      setActiveStep(1);
      return;
    }

    try {
      await registerApi.registerAgent(buildAgentRegisterRequest(values, kycPublicIds));
      notifySuccess("Trust Representative signup submitted successfully.", "agent-signup-success");
      navigate("/login", { replace: true });
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to submit agent signup.", "agent-signup-submit-error");
    }
  };

  const handleInvalid = (errors: FieldErrors<FormValues>) => {
    notifyError(getFirstFormError<FormValues>(errors), "agent-signup-validation-error");
  };

  return (
    <main className="min-h-screen bg-soft px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl min-w-0">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Brand />
          <Link to="/login" className="text-sm font-semibold text-ink hover:underline">
            Back to login
          </Link>
        </div>

        <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-6">
            <div className="mb-5 h-[3px] w-12 rounded-full bg-brandGold" />
            <h1 className="text-2xl font-semibold text-textPrimary">Trust Representative Signup</h1>
            <p className="mt-1 text-sm text-textSecondary">Complete the sections below to submit your trust representative registration.</p>
          </div>

          <Stepper steps={steps} active={activeStep} />

          <form onSubmit={handleSubmit(submit, handleInvalid)} className="mt-6 min-w-0">
            {activeStep === 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="Referral Code" registration={register("referralCode")} readOnly />
                <TextInput label="Referral Name" registration={register("referralName")} readOnly />
                <div className="md:col-span-2">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <label className="block text-sm font-medium">
                    Email <span className="text-red-600">*</span>
                    <input
                      type="email"
                      value={values.email}
                      {...emailRegistration}
                      onChange={handleEmailChange}
                      className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={requestEmailOtp}
                    disabled={isSubmitting || otpSending || otpSecondsRemaining > 0}
                    className="inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-lg border border-brandGold bg-brandGold px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-[#B89222] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {otpSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {otpSending ? "Sending..." : otpSecondsRemaining > 0 ? `Resend in ${otpSecondsRemaining}s` : otpRequested ? "Resend Code" : "Send Code"}
                  </button>
                  </div>
                  {otpSentEmail ? (
                    <div className="mt-2 text-sm font-medium text-green-700">
                      Verification code sent to {otpSentEmail}
                    </div>
                  ) : null}
                </div>
                <OtpInput label="Email Verification Code" registration={emailOtpRegistration} value={values.emailOtp} onChange={handleOtpChange} />
                <div className="rounded-lg border border-brandGold/40 bg-[#FFF8E1] px-4 py-3 text-sm leading-6 text-textPrimary md:col-span-2">
                  {passwordCriteriaMessage}
                </div>
                <PasswordInput label="Login Password" registration={register("loginPassword")} autoComplete="new-password" />
                <PasswordInput label="Confirm Login Password" registration={register("confirmLoginPassword")} autoComplete="new-password" />
              </div>
            ) : null}

            {activeStep === 1 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  Identity Type <span className="text-red-600">*</span>
                  <select
                    {...register("identityType")}
                    className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    {identityTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <TextInput label={identityLabels.identityNo} registration={register("identityNo")} />
                <TextInput label={identityLabels.fullName} registration={register("fullName")} />
                <DatePickerInput
                  label={identityLabels.dateOfBirth}
                  value={values.dateOfBirth}
                  onChange={(value) => setValue("dateOfBirth", value, { shouldDirty: true, shouldValidate: true })}
                  required
                />
                <TextInput label="TIN Number" registration={register("tinNumber")} />
                {values.identityType !== "SSM" ? <TextInput label="Occupation" registration={register("occupation")} /> : null}
                <SignupKycUploadSection
                  config={kycConfig}
                  documents={kycDocuments}
                  onUpload={uploadKycDocument}
                  uploadingTitle={uploadingKycTitle}
                />
              </div>
            ) : null}

            {activeStep === 2 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  Country <span className="text-red-600">*</span>
                  <select
                    value={values.country}
                    onChange={(event) => {
                      const countryDomain = event.target.value;
                      const country = countryOptions.find((item) => item.CountryDomain === countryDomain);
                      setValue("country", countryDomain, { shouldDirty: true, shouldValidate: true });
                      setValue("mobileCode", country ? formatMobileCode(country.CountryMobileCode) : "", { shouldDirty: true, shouldValidate: true });
                      setMobileCodeOpen(false);
                    }}
                    className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    <option value="">Select country</option>
                    {countryOptions.map((country) => (
                      <option key={country.id} value={country.CountryDomain}>
                        {country.CountryName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Mobile <span className="text-red-600">*</span>
                  <span className="mt-1 grid grid-cols-[112px_1fr] gap-2">
                    <span ref={mobileCodeRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setMobileCodeOpen((open) => !open)}
                        className="flex h-11 w-full items-center justify-between rounded-lg border border-line bg-white px-3 text-sm transition hover:bg-gray-50 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                      >
                        {values.mobileCode}
                        <ChevronDown className="h-4 w-4 text-textSecondary" />
                      </button>
                      {mobileCodeOpen ? (
                        <span className="absolute left-0 top-12 z-10 max-h-72 w-56 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-soft">
                          {mobileCodeOptions.map((item) => (
                            <button
                              key={`${item.country}-${item.code}`}
                              type="button"
                              onClick={() => {
                                setValue("mobileCode", item.code, { shouldValidate: true });
                                setMobileCodeOpen(false);
                              }}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              {item.country} ({item.code})
                              {values.mobileCode === item.code ? <Check className="h-4 w-4 text-brandGold" /> : null}
                            </button>
                          ))}
                        </span>
                      ) : null}
                    </span>
                    <input
                      type="tel"
                      {...register("mobileNumber")}
                      className="h-11 min-w-0 rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                  </span>
                </label>
                <div className="md:col-span-2">
                  <TextInput label="Address Line 1" registration={register("address1")} />
                </div>
                <div className="md:col-span-2">
                  <TextInput label="Address Line 2" registration={register("address2")} />
                </div>
                <TextInput label="City" registration={register("city")} />
                <TextInput label="Postcode" registration={register("postcode")} />
                <TextInput label="State" registration={register("state")} />
              </div>
            ) : null}

            {activeStep === 3 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  Bank Name <span className="text-red-600">*</span>
                  <select
                    {...register("bankName")}
                    className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    <option value="">Select bank</option>
                    {bankOptions.map((bank) => (
                      <option key={bank.id} value={bank.BankName}>
                        {bank.BankDescription || bank.BankName}
                      </option>
                    ))}
                  </select>
                </label>
                <TextInput label="Bank Account Holder Name" registration={register("bankAccountHolderName")} />
                <TextInput label="Bank Account Number" registration={register("bankAccountNumber")} />
              </div>
            ) : null}

            {activeStep === 4 ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-textPrimary">Review & Submit</h2>
                  <p className="mt-1 text-sm text-textSecondary">Please review your information before creating your account.</p>
                </div>

                <ReviewSection title="Referral & Account" icon={UserPlus} onEdit={() => setActiveStep(0)}>
                  <ReviewField label="Referral Code" value={values.referralCode} />
                  <ReviewField label="Referral Name" value={values.referralName} />
                  <ReviewField label="Email" value={values.email} wide />
                </ReviewSection>

                <ReviewSection title="Identity" icon={IdCard} onEdit={() => setActiveStep(1)}>
                  <ReviewField label="Identity Type" value={formatIdentityType(values.identityType)} />
                  <ReviewField label={identityLabels.identityNo} value={values.identityNo} />
                  <ReviewField label={identityLabels.fullName} value={values.fullName} />
                  <ReviewField label={identityLabels.dateOfBirth} value={formatDateOfBirth(values.dateOfBirth)} />
                  <ReviewField label="TIN Number" value={values.tinNumber} />
                  {values.identityType !== "SSM" ? <ReviewField label="Occupation" value={values.occupation ?? ""} /> : null}
                  <ReviewField label="KYC Documents" value={formatKycDocumentSummary(kycDocuments)} wide multiline />
                </ReviewSection>

                <ReviewSection title="Contact & Address" icon={MapPin} onEdit={() => setActiveStep(2)}>
                  <ReviewField label="Mobile" value={formatMobile(values.mobileCode, values.mobileNumber)} />
                  <ReviewField label="Country" value={selectedCountry?.CountryName ?? values.country} />
                  <ReviewField label="Address" value={formatAddress(values, selectedCountry?.CountryName)} wide multiline />
                </ReviewSection>

                <ReviewSection title="Bank Information" icon={Landmark} onEdit={() => setActiveStep(3)}>
                  <ReviewField label="Bank Name" value={selectedBank?.BankDescription || selectedBank?.BankName || values.bankName} />
                  <ReviewField label="Bank Account Holder Name" value={values.bankAccountHolderName} />
                  <ReviewField label="Bank Account Number" value={values.bankAccountNumber} />
                </ReviewSection>

                <label className="flex items-start gap-3 rounded-lg border border-line bg-soft p-4 text-sm font-medium leading-6 text-textPrimary">
                  <input type="checkbox" {...register("consent")} className="mt-1 h-4 w-4 shrink-0 rounded border-line accent-[#D4AF37]" />
                  <span>I confirm the information provided is accurate and consent to CNB Amanah Berhad processing this registration.</span>
                </label>
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
                disabled={activeStep === 0 || isSubmitting}
                className="h-11 rounded-lg border border-line bg-white px-5 text-sm font-semibold text-textPrimary transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              {activeStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={serverValidatingStep || isSubmitting}
                  className="h-11 rounded-lg bg-ink px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {serverValidatingStep ? "Validating..." : "Next"}
                </button>
              ) : (
                <SubmitButton loading={isSubmitting} loadingText="Creating Account..." disabled={!values.consent} fullWidth={false}>
                  Create Account
                </SubmitButton>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function TextInput({
  label,
  registration,
  type = "text",
  readOnly = false,
  required = true
}: {
  label: string;
  registration: ReturnType<typeof useForm<FormValues>>["register"] extends (name: infer Name) => infer Return ? Return : never;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label} {required ? <span className="text-red-600">*</span> : null}
      <input
        type={type}
        readOnly={readOnly}
        {...registration}
        className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition read-only:bg-soft read-only:text-textSecondary focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
      />
    </label>
  );
}

function SignupKycUploadSection({
  config,
  documents,
  onUpload,
  uploadingTitle
}: {
  config: SignupKycConfig;
  documents: SignupKycDocument[];
  onUpload: (title: string, file: File | undefined) => void;
  uploadingTitle: string;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white p-4 md:col-span-2">
      <div className="mb-4 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF8E1] text-brandGold">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-textPrimary">KYC Upload</h3>
            <span className="rounded-full border border-brandGold/50 bg-[#FFF8E1] px-3 py-1 text-xs font-semibold uppercase text-[#8A650F]">Required</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{config.description}</p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
          <Clock3 className="h-3.5 w-3.5 shrink-0" />
          Pending Upload
        </span>
      </div>

      <div className="mb-4 flex min-w-0 items-start gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm leading-5 text-blue-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="min-w-0 break-words">Upload JPG, JPEG or PNG files only. Each file must not be more than 5MB.</span>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {documents.map((document) => (
          <SignupKycDocumentCard
            key={document.title}
            document={document}
            onUpload={(file) => onUpload(document.title, file)}
            uploading={uploadingTitle === document.title}
          />
        ))}
      </div>
    </section>
  );
}

function SignupKycDocumentCard({ document, onUpload, uploading }: { document: SignupKycDocument; onUpload: (file: File | undefined) => void; uploading: boolean }) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: false,
    noClick: true,
    noKeyboard: true,
    disabled: uploading,
    onDrop: (acceptedFiles) => onUpload(acceptedFiles[0])
  });

  return (
    <div
      {...getRootProps({
        className: isDragActive
          ? "w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-brandGold bg-[#FFF8E1] p-4 transition"
          : "w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white p-4 transition hover:border-brandGold/60"
      })}
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-3">
        <div className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-soft sm:h-20 sm:w-24 sm:rounded-md">
          {document.imageUrl ? <img src={document.imageUrl} alt={document.title} className="h-full w-full object-cover" /> : <IdCard className="h-9 w-9 text-brandGold" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="break-words text-sm font-semibold text-textPrimary">{document.title}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-textSecondary">
            <span>{uploading ? "Uploading image" : document.file ? "Image uploaded" : "Image not uploaded"}</span>
            {document.imageUrl ? <Check className="h-4 w-4 shrink-0 rounded-full bg-green-600 p-0.5 text-white" /> : null}
          </div>
          <div className="mt-2 break-words text-xs font-medium leading-5 text-textSecondary">{isDragActive ? "Drop the image here" : "Drag and drop a JPG, JPEG or PNG image here"}</div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            disabled={uploading}
            onClick={open}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading..." : document.imageUrl ? "Replace" : "Upload"}
          </button>
        </div>
        <input {...getInputProps({ accept: acceptedKycExtensions })} />
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  icon: Icon,
  onEdit,
  children
}: {
  title: string;
  icon: typeof UserPlus;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-soft text-brandGold">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="truncate text-sm font-semibold uppercase tracking-wide text-textPrimary">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary transition hover:bg-gray-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function ReviewField({ label, value, wide = false, multiline = false }: { label: string; value: string; wide?: boolean; multiline?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <div className="text-xs font-medium text-textSecondary">{label}</div>
      <div className={multiline ? "mt-1 whitespace-pre-line break-words text-sm font-semibold leading-6 text-textPrimary" : "mt-1 break-words text-sm font-semibold text-textPrimary"}>
        {value || "-"}
      </div>
    </div>
  );
}

function getIdentityLabels(identityType: FormValues["identityType"]) {
  if (identityType === "Passport") return { identityNo: "Passport No.", fullName: "Full Name (as per Passport)", dateOfBirth: "Date of Birth" };
  if (identityType === "SSM") return { identityNo: "SSM Registration No.", fullName: "Company Name (as per SSM)", dateOfBirth: "Company Incorporation Date" };
  return { identityNo: "NRIC No.", fullName: "Full Name (as per NRIC)", dateOfBirth: "Date of Birth" };
}

function getSignupKycConfig(identityType: FormValues["identityType"]): SignupKycConfig {
  if (identityType === "Passport") {
    return {
      description: "Upload your passport information page for account verification.",
      documents: [{ title: "Passport - Information Page", documentType: "PASSPORT" }]
    };
  }

  if (identityType === "SSM") {
    return {
      description: "Upload your company SSM registration certificate for account verification.",
      documents: [{ title: "SSM Registration Certificate", documentType: "SSM_CERT" }]
    };
  }

  return {
    description: "Upload clear front and back images of your IC for account verification.",
    documents: [
      { title: "IC - Front", documentType: "NRIC_FRONT" },
      { title: "IC - Back", documentType: "NRIC_BACK" }
    ]
  };
}

function validateKycFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!acceptedKycExtensionSet.has(extension)) return "KYC document must be a JPG, JPEG or PNG image.";
  if (file.size > maxKycFileSize) return "KYC document must not be more than 5MB.";
  return "";
}

function getKycUploadError(documents: SignupKycDocument[]) {
  const missing = documents.find((document) => !document.publicId);
  return missing ? `${missing.title} is required.` : "";
}

function formatKycDocumentSummary(documents: SignupKycDocument[]) {
  return documents.map((document) => `${document.title}: ${document.file ? "Uploaded" : "Not uploaded"}`).join("\n");
}

function formatIdentityType(identityType: FormValues["identityType"]) {
  return identityType;
}

function formatDateOfBirth(value: string) {
  try {
    return format(parseISO(value), "dd MMMM yyyy");
  } catch {
    return value;
  }
}

function isAtLeast18(value: string) {
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  const eighteenthBirthday = new Date(date);
  eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18);
  return eighteenthBirthday <= today;
}

function formatMobile(code: string, number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.length >= 9) return `${code} ${digits.slice(0, 2)}-${digits.slice(2, 5)} ${digits.slice(5)}`;
  if (digits.length >= 7) return `${code} ${digits.slice(0, 2)}-${digits.slice(2)}`;
  return [code, number].filter(Boolean).join(" ");
}

function formatAddress(values: Pick<FormValues, "address1" | "address2" | "postcode" | "city" | "state" | "country">, countryName?: string) {
  const lines = [
    values.address1,
    values.address2,
    values.city,
    values.postcode,
    [values.state, countryName ?? values.country].filter(Boolean).join(", ")
  ];
  return lines.map((line) => line?.trim() ?? "").filter(Boolean).join(",\n");
}

function formatMobileCode(value: number) {
  return value > 0 ? `+${value}` : "";
}

function normalizeMobileCode(value: string) {
  return value.replace(/\D/g, "");
}

async function validateCurrentStep(step: number, values: FormValues, kycPublicIds: KycPublicIds) {
  switch (step) {
    case 0:
      await registerApi.validateAccount({
        MerchantID: registerApi.getMerchantId(),
        Sponsor: values.referralCode.trim(),
        Email: values.email.trim(),
        OTP: values.emailOtp.trim(),
        LoginPassword: values.loginPassword,
        ConfirmLoginPassword: values.confirmLoginPassword
      });
      return;
    case 1:
      const identityKycPublicIds = getIdentityKycPublicIds(values.identityType, kycPublicIds);
      await registerApi.validateIdentity({
        IdentityType: values.identityType,
        IdentityId: values.identityNo.trim(),
        Fullname: values.fullName.trim(),
        DateOfBirth: values.dateOfBirth,
        TinNumber: values.tinNumber.trim(),
        Occupation: values.occupation?.trim() || null,
        IdentityFrontPublicID: identityKycPublicIds.IdentityFrontPublicID,
        IdentityBackPublicID: identityKycPublicIds.IdentityBackPublicID,
        PassportPublicID: identityKycPublicIds.PassportPublicID,
        SSMPublicID: identityKycPublicIds.SSMPublicID
      });
      return;
    case 2:
      await registerApi.validateContact({
        Country_Domain: values.country,
        CountryMobileCode: normalizeMobileCode(values.mobileCode),
        Mobile: values.mobileNumber.trim(),
        Postcode: values.postcode.trim(),
        State: values.state.trim(),
        City: values.city.trim(),
        Address_1: values.address1.trim(),
        Address_2: values.address2.trim()
      });
      return;
    case 3:
      await registerApi.validateBank({
        BankName: values.bankName,
        AccountName: values.bankAccountHolderName.trim(),
        AccountNumber: values.bankAccountNumber.trim()
      });
      return;
    default:
      return;
  }
}

function buildAgentRegisterRequest(values: FormValues, kycPublicIds: KycPublicIds) {
  const identityKycPublicIds = getIdentityKycPublicIds(values.identityType, kycPublicIds);

  return {
    MerchantID: registerApi.getMerchantId(),
    RoleCode: "AG" as const,
    Sponsor: values.referralCode.trim(),
    CountryMobileCode: normalizeMobileCode(values.mobileCode),
    Mobile: values.mobileNumber.trim(),
    Username: values.email.trim(),
    Fullname: values.fullName.trim(),
    DateOfBirth: values.dateOfBirth,
    IdentityType: values.identityType,
    IdentityID: values.identityNo.trim(),
    Address_1: values.address1.trim(),
    Address_2: values.address2.trim(),
    Postcode: values.postcode.trim(),
    State: values.state.trim(),
    City: values.city.trim(),
    Country_Domain: values.country,
    Occupation: values.occupation?.trim() || null,
    TinNumber: values.tinNumber.trim(),
    LoginPassword: values.loginPassword,
    ConfirmLoginPassword: values.confirmLoginPassword,
    BankName: values.bankName,
    AccountName: values.bankAccountHolderName.trim(),
    AccountNumber: values.bankAccountNumber.trim(),
    IdentityFrontPublicID: identityKycPublicIds.IdentityFrontPublicID,
    IdentityBackPublicID: identityKycPublicIds.IdentityBackPublicID,
    PassportPublicID: identityKycPublicIds.PassportPublicID,
    SSMPublicID: identityKycPublicIds.SSMPublicID,
    OTP: values.emailOtp.trim()
  };
}

function getEmptyKycPublicIds(): KycPublicIds {
  return {
    IdentityFrontPublicID: "",
    IdentityBackPublicID: "",
    PassportPublicID: "",
    SSMPublicID: ""
  };
}

function getIdentityKycPublicIds(identityType: FormValues["identityType"], publicIds: KycPublicIds) {
  if (identityType === "NRIC") {
    return {
      IdentityFrontPublicID: publicIds.IdentityFrontPublicID,
      IdentityBackPublicID: publicIds.IdentityBackPublicID,
      PassportPublicID: null,
      SSMPublicID: null
    };
  }

  if (identityType === "Passport") {
    return {
      IdentityFrontPublicID: null,
      IdentityBackPublicID: null,
      PassportPublicID: publicIds.PassportPublicID,
      SSMPublicID: null
    };
  }

  return {
    IdentityFrontPublicID: null,
    IdentityBackPublicID: null,
    PassportPublicID: null,
    SSMPublicID: publicIds.SSMPublicID
  };
}

function getKycPublicIdField(documentType: KycDocumentType): keyof KycPublicIds {
  switch (documentType) {
    case "NRIC_FRONT":
      return "IdentityFrontPublicID";
    case "NRIC_BACK":
      return "IdentityBackPublicID";
    case "PASSPORT":
      return "PassportPublicID";
    case "SSM_CERT":
      return "SSMPublicID";
  }
}

function getFirstStepError(fields: Array<FieldPath<FormValues>>, getFieldState: ReturnType<typeof useForm<FormValues>>["getFieldState"]) {
  for (const field of fields) {
    const message = getFieldState(field).error?.message;
    if (message) return message;
  }
  return "Please check the form and try again.";
}
