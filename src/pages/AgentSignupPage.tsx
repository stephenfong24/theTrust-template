import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown, IdCard, MapPin, Pencil, UserPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useForm, type FieldErrors, type FieldPath } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { PasswordInput } from "../components/forms/PasswordInput";
import { Stepper } from "../components/forms/Stepper";
import { SubmitButton } from "../components/forms/SubmitButton";
import { Brand } from "../components/layout/Brand";
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

const schema = z
  .object({
    referralCode: z.string().min(1, "Referral code is required."),
    referralName: z.string().min(1, "Referral name is required."),
    email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
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

const stepFields: Array<Array<FieldPath<FormValues>>> = [
  ["referralCode", "referralName", "email", "loginPassword", "confirmLoginPassword"],
  ["identityType", "identityNo", "fullName", "dateOfBirth", "tinNumber", "occupation"],
  ["country", "mobileCode", "mobileNumber", "address1", "address2", "city", "postcode", "state"],
  ["consent"]
];

const defaultValues: FormValues = {
  referralCode: "REF-AG-0001",
  referralName: "CNB Amanah Berhad",
  email: "",
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

  useEffect(() => {
    document.title = "Agent Signup | Trust Fund Management System";
  }, []);

  const goNext = async () => {
    const valid = await trigger(stepFields[activeStep], { shouldFocus: true });
    if (!valid) {
      notifyError(getFirstStepError(stepFields[activeStep], getFieldState), "agent-signup-step-error");
      return;
    }
    setActiveStep((step) => Math.min(steps.length - 1, step + 1));
  };

  const submit = async () => {
    await waitForProcessing();
    notifySuccess("Agent signup submitted successfully.", "agent-signup-success");
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
                  <TextInput label="Email" type="email" registration={register("email")} />
                </div>
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
