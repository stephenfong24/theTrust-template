import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PasswordInput } from "../components/forms/PasswordInput";
import { SubmitButton } from "../components/forms/SubmitButton";
import { PageHeader } from "../components/common/PageHeader";
import { notifyError, notifySuccess } from "../services/notificationService";
import { getFirstFormError } from "../utils/formErrors";

const passwordRuleMessage = "Password must be 6-30 characters and include uppercase, lowercase, one number, and one symbol.";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(6, passwordRuleMessage)
      .max(30, passwordRuleMessage)
      .regex(/[A-Z]/, passwordRuleMessage)
      .regex(/[a-z]/, passwordRuleMessage)
      .regex(/\d/, passwordRuleMessage)
      .regex(/[^A-Za-z0-9]/, passwordRuleMessage),
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

  const submit = async () => {
    await waitForProcessing();
    notifySuccess("Password changed successfully.", "change-password-success");
    reset();
  };

  return (
    <>
      <PageHeader title="Change Password" description="Update your login password." />
      <section className="max-w-xl rounded-lg border border-line bg-white p-5 shadow-soft">
        <form onSubmit={handleSubmit(submit, (formErrors) => notifyError(getFirstFormError<FormValues>(formErrors), "change-password-validation-error"))} className="space-y-4">
          <PasswordInput label="Current password" registration={register("currentPassword")} autoComplete="current-password" />
          <div className="rounded-lg border border-brandGold/40 bg-[#FFF8E1] px-4 py-3 text-sm leading-6 text-textPrimary">
            Password must be 6-30 characters and include uppercase, lowercase, one number, and one symbol.
          </div>
          <PasswordInput label="New login password" registration={register("newPassword")} autoComplete="new-password" />
          <PasswordInput label="Confirm new login password" registration={register("confirmPassword")} autoComplete="new-password" />
          <SubmitButton loading={isSubmitting} fullWidth={false}>Submit</SubmitButton>
        </form>
      </section>
    </>
  );
}

const waitForProcessing = () => new Promise((resolve) => window.setTimeout(resolve, 450));
