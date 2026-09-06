import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
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
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  useEffect(() => {
    document.title = "Forgot Password | Trust Fund Management System";
  }, []);

  const submit = async () => {
    await waitForProcessing();
    notifySuccess("Continue with password reset.", "forgot-password-success");
    navigate("/reset-password/sample-reset-token");
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

const waitForProcessing = () => new Promise((resolve) => window.setTimeout(resolve, 450));
