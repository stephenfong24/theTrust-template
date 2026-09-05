import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { PasswordInput } from "../components/forms/PasswordInput";
import { SubmitButton } from "../components/forms/SubmitButton";
import { AuthFeatureLayout } from "../layouts/AuthFeatureLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { notifyError, notifySuccess } from "../services/notificationService";
import { getFirstFormError } from "../utils/formErrors";

const schema = z
  .object({
    newPassword: z.string().min(8, "New login password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm new login password is required.")
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match."
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { resetToken } = useParams();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { newPassword: "", confirmPassword: "" } });

  useEffect(() => {
    document.title = "Reset Password | Trust Fund Management System";
  }, []);

  const submit = async () => {
    await waitForProcessing();
    if (resetToken !== "sample-reset-token") {
      notifyError("Invalid or expired reset token.", "reset-password-invalid-token");
      return;
    }
    notifySuccess("Password reset successfully.", "reset-password-success");
    navigate("/login", { replace: true });
  };

  return (
    <AuthLayout>
      <AuthFeatureLayout>
        <div className="mb-6">
          <div className="mb-5 h-[3px] w-12 rounded-full bg-brandGold" />
          <h2 className="text-xl font-semibold text-textPrimary">Reset password</h2>
          <p className="mt-1 text-sm text-textSecondary">Create a new login password from your reset instruction.</p>
        </div>
        <form onSubmit={handleSubmit(submit, (formErrors) => notifyError(getFirstFormError<FormValues>(formErrors), "reset-password-validation-error"))} className="space-y-4">
          <PasswordInput label="New login password" registration={register("newPassword")} autoComplete="new-password" />
          <PasswordInput label="Confirm new login password" registration={register("confirmPassword")} autoComplete="new-password" />
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
