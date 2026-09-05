import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { SubmitButton } from "../components/forms/SubmitButton";
import { AuthFeatureLayout } from "../layouts/AuthFeatureLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { notifyError, notifySuccess } from "../services/notificationService";
import { getFirstFormError } from "../utils/formErrors";

const sampleOtp = "666666";

const schema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  otp: z.string().min(1, "OTP is required.").regex(/^\d{6}$/, "Enter the 6-digit OTP.")
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [counter, setCounter] = useState(0);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", otp: "" } });

  useEffect(() => {
    document.title = "Forgot Password | Trust Fund Management System";
  }, []);

  useEffect(() => {
    if (counter <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCounter((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [counter]);

  const requestOtp = async () => {
    const emailResult = schema.shape.email.safeParse(getValues("email"));
    if (!emailResult.success) {
      notifyError(emailResult.error.issues[0]?.message ?? "Enter a valid email address.", "forgot-password-email-validation");
      return;
    }
    setValue("otp", sampleOtp, { shouldValidate: true });
    setCounter(60);
    notifySuccess("OTP requested successfully. Use 666666 for this demo.", "forgot-password-otp");
  };

  const submit = async (values: FormValues) => {
    await waitForProcessing();
    if (values.otp !== sampleOtp) {
      notifyError("Invalid OTP.", "forgot-password-invalid-otp");
      return;
    }
    notifySuccess("OTP verified. Continue with password reset.", "forgot-password-success");
    navigate("/reset-password/sample-reset-token");
  };

  return (
    <AuthLayout>
      <AuthFeatureLayout>
        <div className="mb-6">
          <div className="mb-5 h-[3px] w-12 rounded-full bg-brandGold" />
          <h2 className="text-xl font-semibold text-textPrimary">Forgot password</h2>
          <p className="mt-1 text-sm text-textSecondary">Request an OTP to verify your account email.</p>
        </div>
        <form onSubmit={handleSubmit(submit, (formErrors) => notifyError(getFirstFormError<FormValues>(formErrors), "forgot-password-validation-error"))} className="space-y-4">
          <label className="block text-sm font-medium">
            Email <span className="text-red-600">*</span>
            <input
              type="email"
              {...register("email")}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </label>
          <label className="block text-sm font-medium">
            OTP <span className="text-red-600">*</span>
            <span className="mt-1 grid grid-cols-[1fr_auto] gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                {...register("otp")}
                className="h-11 min-w-0 rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
              <button
                type="button"
                onClick={requestOtp}
                disabled={counter > 0}
                className="h-11 rounded-lg border border-brandGold bg-white px-4 text-sm font-semibold text-textPrimary transition hover:bg-[#FFF8E1] disabled:cursor-not-allowed disabled:border-line disabled:bg-soft disabled:text-textSecondary"
              >
                {counter > 0 ? `${counter}s` : "Request OTP"}
              </button>
            </span>
          </label>
          <SubmitButton loading={isSubmitting}>Submit</SubmitButton>
        </form>
        <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-ink hover:underline">
          Back to login
        </Link>
      </AuthFeatureLayout>
    </AuthLayout>
  );
}

const waitForProcessing = () => new Promise((resolve) => window.setTimeout(resolve, 450));
