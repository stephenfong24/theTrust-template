import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, Check, ChevronDown, Clock3, Eye, IdCard, Info, MapPin, MoreVertical, Pencil, Send, Upload, UserPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type FieldErrors, type FieldPath } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { agentApi } from "../api/agentApi";
import { PasswordInput } from "../components/forms/PasswordInput";
import { Stepper } from "../components/forms/Stepper";
import { SubmitButton } from "../components/forms/SubmitButton";
import { Brand } from "../components/layout/Brand";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { notifyError, notifySuccess } from "../services/notificationService";
import { getFirstFormError } from "../utils/formErrors";

const steps = ["Referral & Account", "Identity", "Contact & Address", "Review & Submit"];
const identityTypes = ["NRIC", "Passport", "SSM"] as const;
const countries = ["Malaysia", "Singapore", "Indonesia", "Thailand", "Brunei", "Philippines"];
const mobileCodes = [
  { country: "Malaysia", code: "+60" },
  { country: "Singapore", code: "+65" },
  { country: "Indonesia", code: "+62" },
  { country: "Thailand", code: "+66" },
  { country: "Brunei", code: "+673" },
  { country: "Philippines", code: "+63" }
];
const passwordRuleMessage = "Password must be 6-30 characters and include uppercase, lowercase, one number, and one symbol.";
const otpLength = 6;
const otpCooldownSeconds = 60;
const maxKycFileSize = 5 * 1024 * 1024;
const acceptedKycMimeTypes = new Set(["image/jpeg", "image/png"]);
const acceptedKycExtensions = ".jpg,.jpeg,.png";

const schema = z
  .object({
    referralCode: z.string().min(1, "Referral code is required."),
    referralName: z.string().min(1, "Referral name is required."),
    email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
    emailOtp: z
      .string()
      .min(1, "Email OTP is required.")
      .regex(/^\d{6}$/, "Email OTP must be 6 digits.")
      .superRefine((value, context) => {
        if (value !== "666666") {
          context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid email OTP." });
        }
      }),
    loginPassword: z
      .string()
      .min(6, passwordRuleMessage)
      .max(30, passwordRuleMessage)
      .regex(/[A-Z]/, passwordRuleMessage)
      .regex(/[a-z]/, passwordRuleMessage)
      .regex(/\d/, passwordRuleMessage)
      .regex(/[^A-Za-z0-9]/, passwordRuleMessage),
    confirmLoginPassword: z.string().min(1, "Confirm login password is required."),
    identityType: z.enum(identityTypes),
    identityNo: z.string().min(1, "Identity no. is required."),
    fullName: z.string().min(1, "Full name or company name is required."),
    dateOfBirth: z
      .string()
      .min(1, "Date of birth is required.")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must use yyyy-MM-dd format.")
      .refine((value) => isAtLeast18(value), "Agent must be at least 18 years old."),
    tinNumber: z.string().min(1, "TIN number is required."),
    occupation: z.string().min(1, "Occupation is required."),
    country: z.string().min(1, "Country is required."),
    mobileCode: z.string().min(1, "Mobile code is required."),
    mobileNumber: z.string().min(1, "Mobile number is required.").regex(/^\d{7,12}$/, "Mobile number must be 7-12 digits."),
    address1: z.string().min(1, "Address Line 1 is required."),
    address2: z.string().optional(),
    city: z.string().min(1, "City is required."),
    postcode: z.string().min(1, "Postcode is required.").regex(/^\d{4,10}$/, "Postcode must be 4-10 digits."),
    state: z.string().min(1, "State is required."),
    consent: z.boolean().refine((value) => value, "Consent is required.")
  })
  .refine((values) => values.loginPassword === values.confirmLoginPassword, {
    path: ["confirmLoginPassword"],
    message: "Passwords do not match."
  });

type FormValues = z.infer<typeof schema>;

interface SignupKycDocument {
  title: string;
  file?: File;
  imageUrl?: string;
  uploadedAt?: string;
}

interface SignupKycConfig {
  description: string;
  documents: SignupKycDocument[];
}

const stepFields: Array<Array<FieldPath<FormValues>>> = [
  ["referralCode", "referralName", "email", "emailOtp", "loginPassword", "confirmLoginPassword"],
  ["identityType", "identityNo", "fullName", "dateOfBirth", "tinNumber", "occupation"],
  ["country", "mobileCode", "mobileNumber", "address1", "address2", "city", "postcode", "state"],
  ["consent"]
];

const defaultValues: FormValues = {
  referralCode: "REF-AG-0001",
  referralName: "CNB Amanah Berhad",
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
  country: "Malaysia",
  mobileCode: "+60",
  mobileNumber: "",
  postcode: "",
  state: "",
  city: "",
  address1: "",
  address2: "",
  consent: false
};

export function AgentSignupPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [mobileCodeOpen, setMobileCodeOpen] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpSecondsRemaining, setOtpSecondsRemaining] = useState(0);
  const [kycDocuments, setKycDocuments] = useState<SignupKycDocument[]>(getSignupKycConfig(defaultValues.identityType).documents);
  const [previewDocument, setPreviewDocument] = useState<SignupKycDocument | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getFieldState,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const values = watch();
  const identityLabels = useMemo(() => getIdentityLabels(values.identityType), [values.identityType]);
  const kycConfig = useMemo(() => getSignupKycConfig(values.identityType), [values.identityType]);

  useEffect(() => {
    document.title = "Agent Signup | Trust Fund Management System";
  }, []);

  useEffect(() => {
    if (otpSecondsRemaining <= 0) return undefined;
    const timer = window.setInterval(() => {
      setOtpSecondsRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpSecondsRemaining]);

  useEffect(() => {
    setKycDocuments(kycConfig.documents);
    setPreviewDocument(null);
  }, [kycConfig]);

  const requestEmailOtp = async () => {
    const valid = await trigger("email", { shouldFocus: true });
    if (!valid) {
      notifyError(getFieldState("email").error?.message ?? "Enter a valid email address before requesting OTP.", "agent-signup-email-otp-error");
      return;
    }
    await waitForProcessing();
    setOtpRequested(true);
    setOtpSecondsRemaining(otpCooldownSeconds);
  };

  const uploadKycDocument = (title: string, file: File | undefined) => {
    if (!file) return;
    const error = validateKycFile(file);
    if (error) {
      notifyError(error, "agent-signup-kyc-file-error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = String(reader.result);
      const uploadedAt = new Date().toISOString();
      setKycDocuments((documents) => documents.map((document) => (document.title === title ? { ...document, file, imageUrl, uploadedAt } : document)));
      notifySuccess(`${title} uploaded successfully.`, "agent-signup-kyc-upload-success");
    };
    reader.readAsDataURL(file);
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue("email", event.target.value, { shouldDirty: true, shouldValidate: true });
    setValue("emailOtp", "", { shouldDirty: true });
    setOtpRequested(false);
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
    if (activeStep === 0 && values.emailOtp !== "666666") {
      notifyError("Invalid email OTP.", "agent-signup-otp-required");
      return;
    }
    if (activeStep === 1) {
      const kycError = getKycUploadError(kycDocuments);
      if (kycError) {
        notifyError(kycError, "agent-signup-kyc-required");
        return;
      }
    }
    setActiveStep((step) => Math.min(steps.length - 1, step + 1));
  };

  const submit = async (data: FormValues) => {
    const kycError = getKycUploadError(kycDocuments);
    if (kycError) {
      notifyError(kycError, "agent-signup-submit-kyc-required");
      setActiveStep(1);
      return;
    }
    try {
      const formData = createSignupFormData(data, kycDocuments);
      await agentApi.signup(formData);
      notifySuccess("Agent signup submitted successfully.", "agent-signup-success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit agent signup.";
      notifyError(message, "agent-signup-submit-error");
    }
  };

  const handleInvalid = (errors: FieldErrors<FormValues>) => {
    notifyError(getFirstFormError<FormValues>(errors), "agent-signup-validation-error");
  };

  return (
    <main className="min-h-screen bg-soft px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Brand />
          <Link to="/login" className="text-sm font-semibold text-ink hover:underline">
            Back to login
          </Link>
        </div>

        <section className="rounded-lg border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-6">
            <div className="mb-5 h-[3px] w-12 rounded-full bg-brandGold" />
            <h1 className="text-2xl font-semibold text-textPrimary">Agent Signup</h1>
            <p className="mt-1 text-sm text-textSecondary">Complete the sections below to submit your agent registration.</p>
          </div>

          <Stepper steps={steps} active={activeStep} />

          <form onSubmit={handleSubmit(submit, handleInvalid)} className="mt-6">
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
                      onChange={handleEmailChange}
                      className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={requestEmailOtp}
                    disabled={isSubmitting || otpSecondsRemaining > 0}
                    className="inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-textPrimary transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    {otpSecondsRemaining > 0 ? `Resend in ${otpSecondsRemaining}s` : otpRequested ? "Resend Code" : "Send Code"}
                  </button>
                  </div>
                  {otpRequested ? (
                    <div className="mt-2 text-sm font-medium text-green-700">
                      Verification code sent to {values.email}
                    </div>
                  ) : null}
                </div>
                <OtpInput label="Email Verification Code" value={values.emailOtp} onChange={handleOtpChange} />
                <div className="rounded-lg border border-brandGold/40 bg-[#FFF8E1] px-4 py-3 text-sm leading-6 text-textPrimary md:col-span-2">
                  Password must be 6-30 characters and include uppercase, lowercase, one number, and one symbol.
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
                <TextInput label="Date of birth" type="date" registration={register("dateOfBirth")} />
                <TextInput label="TIN Number" registration={register("tinNumber")} />
                <TextInput label="Occupation" registration={register("occupation")} />
                <SignupKycUploadSection
                  config={kycConfig}
                  documents={kycDocuments}
                  onUpload={uploadKycDocument}
                  onView={(document) => setPreviewDocument(document)}
                />
              </div>
            ) : null}

            {activeStep === 2 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  Country <span className="text-red-600">*</span>
                  <select
                    {...register("country")}
                    className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    {countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Mobile <span className="text-red-600">*</span>
                  <span className="mt-1 grid grid-cols-[112px_1fr] gap-2">
                    <span className="relative">
                      <button
                        type="button"
                        onClick={() => setMobileCodeOpen((open) => !open)}
                        className="flex h-11 w-full items-center justify-between rounded-lg border border-line bg-white px-3 text-sm transition hover:bg-gray-50 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                      >
                        {values.mobileCode}
                        <ChevronDown className="h-4 w-4 text-textSecondary" />
                      </button>
                      {mobileCodeOpen ? (
                        <span className="absolute left-0 top-12 z-10 w-56 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-soft">
                          {mobileCodes.map((item) => (
                            <button
                              key={item.code}
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
                  <TextInput label="Address Line 2" registration={register("address2")} required={false} />
                </div>
                <TextInput label="City" registration={register("city")} />
                <TextInput label="Postcode" registration={register("postcode")} />
                <TextInput label="State" registration={register("state")} />
              </div>
            ) : null}

            {activeStep === 3 ? (
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
                  <ReviewField label="Date of Birth" value={formatDateOfBirth(values.dateOfBirth)} />
                  <ReviewField label="TIN Number" value={values.tinNumber} />
                  <ReviewField label="Occupation" value={values.occupation} />
                  <ReviewField label="KYC Documents" value={formatKycDocumentSummary(kycDocuments)} wide multiline />
                </ReviewSection>

                <ReviewSection title="Contact & Address" icon={MapPin} onEdit={() => setActiveStep(2)}>
                  <ReviewField label="Mobile" value={formatMobile(values.mobileCode, values.mobileNumber)} />
                  <ReviewField label="Country" value={values.country} />
                  <ReviewField label="Address" value={formatAddress(values)} wide multiline />
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
                <button type="button" onClick={goNext} className="h-11 rounded-lg bg-ink px-5 text-sm font-semibold text-white">
                  Next
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
      <KycPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />
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

function OtpInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const digits = Array.from({ length: otpLength }, (_, index) => value[index] ?? "");
  const focusDigit = (index = Math.min(value.length, otpLength - 1)) => {
    setActiveIndex(index);
    inputRef.current?.focus();
    window.setTimeout(() => inputRef.current?.setSelectionRange(index, Math.min(index + 1, value.length)), 0);
  };
  const updateValue = (nextValue: string, cursorPosition: number) => {
    setActiveIndex(Math.min(cursorPosition, otpLength - 1));
    onChange(nextValue);
    window.setTimeout(() => inputRef.current?.setSelectionRange(cursorPosition, cursorPosition), 0);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? value.length;
    const selectionEnd = input.selectionEnd ?? selectionStart;

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      const start = Math.min(selectionStart, otpLength - 1);
      const end = value.length >= otpLength && selectionStart === selectionEnd ? Math.min(start + 1, otpLength) : selectionEnd;
      const nextValue = `${value.slice(0, start)}${event.key}${value.slice(end)}`.slice(0, otpLength);
      updateValue(nextValue, Math.min(start + 1, otpLength));
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      if (selectionStart !== selectionEnd) {
        updateValue(`${value.slice(0, selectionStart)}${value.slice(selectionEnd)}`, selectionStart);
        return;
      }
      if (selectionStart === 0) {
        updateValue(value.slice(1), 0);
        return;
      }
      const start = Math.max(0, selectionStart - 1);
      updateValue(`${value.slice(0, start)}${value.slice(selectionStart)}`, start);
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      updateValue(`${value.slice(0, selectionStart)}${value.slice(selectionEnd || selectionStart + 1)}`, selectionStart);
    }
  };

  return (
    <label className="block text-sm font-medium">
      {label} <span className="text-red-600">*</span>
      <span
        className="relative mt-1 grid max-w-md grid-cols-6 gap-2"
        onClick={() => focusDigit()}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true);
            setActiveIndex(Math.min(value.length, otpLength - 1));
          }}
          onBlur={() => setFocused(false)}
          onSelect={(event) => setActiveIndex(Math.min(event.currentTarget.selectionStart ?? value.length, otpLength - 1))}
          onPaste={(event) => {
            event.preventDefault();
            onChange(event.clipboardData.getData("text"));
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={otpLength}
          aria-label={label}
          className="absolute left-0 top-0 h-px w-px opacity-0"
        />
        {digits.map((digit, index) => (
          <span
            key={index}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              focusDigit(index);
            }}
            className={
              focused && index === activeIndex
                ? "flex h-12 cursor-text items-center justify-center rounded-lg border border-brandGold bg-white text-base font-semibold text-textPrimary shadow-[0_0_0_3px_rgba(212,175,55,0.24)]"
                : digit
                  ? "flex h-12 cursor-text items-center justify-center rounded-lg border border-ink bg-white text-base font-semibold text-textPrimary"
                  : "flex h-12 cursor-text items-center justify-center rounded-lg border border-line bg-white text-base font-semibold text-textPrimary"
            }
          >
            {digit}
          </span>
        ))}
      </span>
    </label>
  );
}

function SignupKycUploadSection({
  config,
  documents,
  onUpload,
  onView
}: {
  config: SignupKycConfig;
  documents: SignupKycDocument[];
  onUpload: (title: string, file: File | undefined) => void;
  onView: (document: SignupKycDocument) => void;
}) {
  return (
    <section className="md:col-span-2 rounded-lg border border-line bg-white p-4">
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

      <div className="mb-4 flex items-start gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm leading-5 text-blue-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Upload JPG, JPEG or PNG files only. Each file must not be more than 5MB.</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {documents.map((document) => (
          <SignupKycDocumentCard
            key={document.title}
            document={document}
            onUpload={(file) => onUpload(document.title, file)}
            onView={() => onView(document)}
          />
        ))}
      </div>
    </section>
  );
}

function SignupKycDocumentCard({ document, onUpload, onView }: { document: SignupKycDocument; onUpload: (file: File | undefined) => void; onView: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const uploadedDate = document.uploadedAt ? format(parseISO(document.uploadedAt), "dd MMM yyyy, hh:mm a") : "";
  const openUploadPicker = () => {
    detailsRef.current?.removeAttribute("open");
    inputRef.current?.click();
  };
  const viewDocument = () => {
    detailsRef.current?.removeAttribute("open");
    onView();
  };

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-soft">
          {document.imageUrl ? <img src={document.imageUrl} alt={document.title} className="h-full w-full object-cover" /> : <IdCard className="h-9 w-9 text-brandGold" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-textPrimary">{document.title}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-textSecondary">
            <span>{document.file ? document.file.name : "Image not uploaded"}</span>
            {document.imageUrl ? <Check className="h-4 w-4 shrink-0 rounded-full bg-green-600 p-0.5 text-white" /> : null}
          </div>
          {uploadedDate ? <div className="mt-1 text-xs text-textSecondary">Uploaded {uploadedDate}</div> : null}
        </div>
        <details ref={detailsRef} className="relative">
          <summary className="list-none rounded-md p-1.5 text-textSecondary hover:bg-gray-100 [&::-webkit-details-marker]:hidden" aria-label={`More options for ${document.title}`}>
            <MoreVertical className="h-4 w-4" />
          </summary>
          <div className="absolute right-0 top-8 z-20 w-36 rounded-lg border border-line bg-white p-1 shadow-soft">
            {document.imageUrl ? (
              <button type="button" onClick={viewDocument} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-textPrimary hover:bg-gray-50">
                <Eye className="h-4 w-4" />
                View
              </button>
            ) : null}
            <button type="button" onClick={openUploadPicker} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-textPrimary hover:bg-gray-50">
              <Upload className="h-4 w-4" />
              Upload
            </button>
          </div>
        </details>
        <input ref={inputRef} type="file" accept={acceptedKycExtensions} className="hidden" onChange={(event) => onUpload(event.target.files?.[0])} />
      </div>
    </div>
  );
}

function KycPreviewModal({ document, onClose }: { document: SignupKycDocument | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(document)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{document?.title}</DialogTitle>
          <DialogDescription>Uploaded identity image preview.</DialogDescription>
        </DialogHeader>
        {document?.imageUrl ? (
          <div className="overflow-hidden rounded-lg border border-line bg-soft">
            <img src={document.imageUrl} alt={document.title} className="max-h-[70vh] w-full object-contain" />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
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
  if (identityType === "Passport") return { identityNo: "Passport No.", fullName: "Full Name (as per Passport)" };
  if (identityType === "SSM") return { identityNo: "SSM Registration No.", fullName: "Company Name (as per SSM)" };
  return { identityNo: "NRIC No.", fullName: "Full Name (as per NRIC)" };
}

function getSignupKycConfig(identityType: FormValues["identityType"]): SignupKycConfig {
  if (identityType === "Passport") {
    return {
      description: "Upload your passport information page for account verification.",
      documents: [{ title: "Passport - Information Page" }]
    };
  }

  if (identityType === "SSM") {
    return {
      description: "Upload your company SSM registration certificate for account verification.",
      documents: [{ title: "SSM Registration Certificate" }]
    };
  }

  return {
    description: "Upload clear front and back images of your IC for account verification.",
    documents: [{ title: "IC - Front" }, { title: "IC - Back" }]
  };
}

function validateKycFile(file: File) {
  if (!acceptedKycMimeTypes.has(file.type)) return "KYC document must be a JPG, JPEG or PNG image.";
  if (file.size > maxKycFileSize) return "KYC document must not be more than 5MB.";
  return "";
}

function getKycUploadError(documents: SignupKycDocument[]) {
  const missing = documents.find((document) => !document.file);
  return missing ? `${missing.title} is required.` : "";
}

function formatKycDocumentSummary(documents: SignupKycDocument[]) {
  return documents.map((document) => `${document.title}: ${document.file?.name ?? "Not uploaded"}`).join("\n");
}

function createSignupFormData(values: FormValues, documents: SignupKycDocument[]) {
  const formData = new FormData();
  const payload = {
    referralCode: values.referralCode.trim(),
    referralName: values.referralName.trim(),
    email: values.email.trim(),
    emailOtp: values.emailOtp.trim(),
    identityType: values.identityType,
    identityNo: values.identityNo.trim(),
    fullName: values.fullName.trim(),
    dateOfBirth: values.dateOfBirth,
    tinNumber: values.tinNumber.trim(),
    occupation: values.occupation.trim(),
    country: values.country,
    mobileCode: values.mobileCode,
    mobileNumber: values.mobileNumber.trim(),
    address1: values.address1.trim(),
    address2: values.address2?.trim() ?? "",
    city: values.city.trim(),
    postcode: values.postcode.trim(),
    state: values.state.trim(),
    consent: values.consent,
    kycDocuments: documents.map((document) => ({
      title: document.title,
      fileName: document.file?.name ?? "",
      fileSize: document.file?.size ?? 0,
      contentType: document.file?.type ?? ""
    }))
  };

  formData.append("payload", new Blob([JSON.stringify(payload)], { type: "application/json" }));
  documents.forEach((document, index) => {
    if (document.file) {
      formData.append(`kycDocuments[${index}]`, document.file, document.file.name);
    }
  });
  return formData;
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

function formatAddress(values: Pick<FormValues, "address1" | "address2" | "postcode" | "city" | "state" | "country">) {
  const lines = [
    values.address1,
    values.address2,
    values.city,
    values.postcode,
    [values.state, values.country].filter(Boolean).join(", ")
  ];
  return lines.map((line) => line?.trim() ?? "").filter(Boolean).join(",\n");
}

function getFirstStepError(fields: Array<FieldPath<FormValues>>, getFieldState: ReturnType<typeof useForm<FormValues>>["getFieldState"]) {
  for (const field of fields) {
    const message = getFieldState(field).error?.message;
    if (message) return message;
  }
  return "Please check the form and try again.";
}

const waitForProcessing = () => new Promise((resolve) => window.setTimeout(resolve, 450));
