import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { PasswordInput } from "../components/forms/PasswordInput";
import { SubmitButton } from "../components/forms/SubmitButton";
import { useAuth } from "../hooks/useAuth";
import { AuthFeatureLayout } from "../layouts/AuthFeatureLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import users from "../data/users.json";
import { roles } from "../config/roles";
import type { User } from "../types";
import { notifyError, notifySuccess } from "../services/notificationService";
import { getFirstFormError } from "../utils/formErrors";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const availableAccounts = users as User[];
  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  useEffect(() => {
    document.title = "Trust System";
  }, []);

  if (session) return <Navigate to="/dashboard" replace />;

  const submit = async (values: FormValues) => {
    try {
      await login(values.email, values.password);
      notifySuccess("Signed in successfully.", "login-success");
      navigate((location.state as { from?: string } | null)?.from ?? "/dashboard", { replace: true });
    } catch (caught) {
      notifyError(getFriendlyLoginError(caught), "login-error");
    }
  };

  return (
    <AuthLayout>
      <AuthFeatureLayout>
            <div className="mb-6">
              <div className="mb-5 h-[3px] w-12 rounded-full bg-brandGold" />
              <h2 className="text-xl font-semibold text-textPrimary">Sign in</h2>
              <p className="mt-1 text-sm text-textSecondary">Enter your authorized local credentials.</p>
            </div>
            <form onSubmit={handleSubmit(submit, (formErrors) => notifyError(getFirstFormError<FormValues>(formErrors), "login-validation-error"))} className="space-y-4">
              <label className="block text-sm font-medium">
                Email <span className="text-red-600">*</span>
                <input
                  type="email"
                  {...register("email")}
                  className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </label>
              <PasswordInput label="Password" registration={register("password")} autoComplete="current-password" />
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm font-semibold text-ink hover:underline">
                  Forgot password?
                </Link>
              </div>
              <SubmitButton loading={isSubmitting} loadingText="Signing in...">Sign in</SubmitButton>
            </form>
            <div className="mt-5 rounded-lg border border-line bg-soft p-4">
              <h3 className="text-sm font-semibold text-textPrimary">Access Credentials</h3>
              <label className="mt-3 block text-sm font-medium text-textPrimary">
                Select account
                <select
                  defaultValue=""
                  onChange={(event) => {
                    const account = availableAccounts.find((item) => item.email === event.target.value);
                    setValue("email", account?.email ?? "", { shouldValidate: true });
                    setValue("password", account?.password ?? "", { shouldValidate: true });
                  }}
                  className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                >
                  <option value="" disabled>Choose an account</option>
                  {availableAccounts.map((account) => (
                    <option key={account.id} value={account.email}>
                      {account.name} - {roles[account.role]} - {account.email}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-sm text-textSecondary">Password: Trust@123</p>
            </div>
      </AuthFeatureLayout>
    </AuthLayout>
  );
}

function getFriendlyLoginError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("inactive")) return "Your account is currently inactive. Please contact the administrator.";
  if (message.includes("locked")) return "Your account has been locked. Please contact the administrator.";
  if (message.includes("invalid credentials")) return "Invalid email or password.";
  if (message.includes("network") || message.includes("fetch")) return "Unable to sign in at the moment. Please try again.";
  return "Something went wrong. Please try again.";
}
