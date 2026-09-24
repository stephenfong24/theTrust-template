import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { authApi } from "../api/authApi";
import { SubmitButton } from "../components/forms/SubmitButton";
import { AuthFeatureLayout } from "../layouts/AuthFeatureLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { notifyError, notifySuccess } from "../services/notificationService";
import { getFirstFormError } from "../utils/formErrors";

const schema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email address.")
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  useEffect(() => {
    document.title = "Forgot Password | Trust System";
  }, []);

  const submit = async (values: FormValues) => {
    try {
      const email = values.email.trim();
      await authApi.forgotPassword(email);
      notifySuccess(`Password reset instructions have been sent. Please check ${email} for the reset link and next steps.`, "forgot-password-success");
      reset();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to request password reset. Please try again.", "forgot-password-error");
    }
  };

  return (
    <AuthLayout>
      <AuthFeatureLayout>
        <div className="mb-6">
          <div className="mb-5 h-[3px] w-12 rounded-full bg-brandGold" />
          <h2 className="text-xl font-semibold text-textPrimary">Forgot password</h2>
          <p className="mt-1 text-sm text-textSecondary">Enter your account email to continue with password reset.</p>
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
          <SubmitButton loading={isSubmitting}>Submit</SubmitButton>
        </form>
        <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-ink hover:underline">
          Back to login
        </Link>
      </AuthFeatureLayout>
    </AuthLayout>
  );
}
