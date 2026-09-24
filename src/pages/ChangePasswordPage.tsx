import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { accountApi } from "../api/accountApi";
import { PasswordInput } from "../components/forms/PasswordInput";
import { SubmitButton } from "../components/forms/SubmitButton";
import { PageHeader } from "../components/common/PageHeader";
import { notifyError, notifySuccess } from "../services/notificationService";
import { getFirstFormError } from "../utils/formErrors";
import { isValidPasswordCriteria, passwordCriteriaMessage } from "../utils/passwordValidation";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().refine(isValidPasswordCriteria, passwordCriteriaMessage),
    confirmPassword: z.string().min(1, "Confirm new login password is required.")
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    path: ["newPassword"],
    message: "New login password must be different from current password."
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match."
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });

  useEffect(() => {
    document.title = "Change Password | Trust Fund Management System";
  }, []);

  const submit = async (values: FormValues) => {
    try {
      await accountApi.changeLoginPassword({
        OldPassword: values.currentPassword,
        Password: values.newPassword,
        ConfirmPassword: values.confirmPassword
      });
      notifySuccess("Password changed successfully.", "change-password-success");
      reset();
    } catch (error) {
      notifyError(getErrorMessage(error, "Unable to change password."), "change-password-error");
    }
  };

  return (
    <>
      <PageHeader title="Change Password" description="Update your login password." />
      <section className="max-w-xl rounded-lg border border-line bg-white p-5 shadow-soft">
        <form onSubmit={handleSubmit(submit, (formErrors) => notifyError(getFirstFormError<FormValues>(formErrors), "change-password-validation-error"))} className="space-y-4">
          <PasswordInput label="Current password" registration={register("currentPassword")} autoComplete="current-password" />
          <div className="rounded-lg border border-brandGold/40 bg-[#FFF8E1] px-4 py-3 text-sm leading-6 text-textPrimary">
            {passwordCriteriaMessage}
          </div>
          <PasswordInput label="New login password" registration={register("newPassword")} autoComplete="new-password" />
          <PasswordInput label="Confirm new login password" registration={register("confirmPassword")} autoComplete="new-password" />
          <SubmitButton loading={isSubmitting} fullWidth={false}>Submit</SubmitButton>
        </form>
      </section>
    </>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
