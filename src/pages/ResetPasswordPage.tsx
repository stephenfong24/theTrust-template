import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { authApi } from "../api/authApi";
import { PasswordInput } from "../components/forms/PasswordInput";
import { SubmitButton } from "../components/forms/SubmitButton";
import { AuthFeatureLayout } from "../layouts/AuthFeatureLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { notifyError, notifySuccess } from "../services/notificationService";
import { getFirstFormError } from "../utils/formErrors";
import { isValidPasswordCriteria, passwordCriteriaMessage } from "../utils/passwordValidation";

const schema = z
  .object({
    newPassword: z.string().refine(isValidPasswordCriteria, passwordCriteriaMessage),
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
    document.title = "Reset Password | Trust System";
  }, []);

  const submit = async (values: FormValues) => {
    if (!resetToken) {
      notifyError("Invalid or expired reset token.", "reset-password-invalid-token");
      return;
    }

    try {
      await authApi.resetPassword(resetToken, values.newPassword, values.confirmPassword);
      notifySuccess("Your password has been reset successfully. Please sign in with your new password.", "reset-password-success");
      navigate("/login", { replace: true });
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to reset password. Please try again.", "reset-password-error");
    }
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
          <div className="rounded-lg border border-brandGold/40 bg-[#FFF8E1] px-4 py-3 text-sm leading-6 text-textPrimary">
            {passwordCriteriaMessage}
          </div>
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
