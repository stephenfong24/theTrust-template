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
import { getSessionToken } from "../services/authService";
import { notifyError, notifySuccess } from "../services/notificationService";
import { getFirstFormError } from "../utils/formErrors";

const schema = z.object({
  username: z.string().min(1, "Email is required."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean()
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { session, status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { username: "", password: "", rememberMe: true } });

  useEffect(() => {
    document.title = "Trust System";
  }, []);

  if (status === "authenticated" && getSessionToken(session)) return <Navigate to="/dashboard" replace />;

  const submit = async (values: FormValues) => {
    try {
      await login(values.username, values.password, true);
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
              <p className="mt-1 text-sm text-textSecondary">Enter your authorized account credentials.</p>
            </div>
            <form onSubmit={handleSubmit(submit, (formErrors) => notifyError(getFirstFormError<FormValues>(formErrors), "login-validation-error"))} className="space-y-4">
              <label className="block text-sm font-medium">
                Email <span className="text-red-600">*</span>
                <input
                  type="email"
                  autoComplete="email"
                  {...register("username")}
                  className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </label>
              <PasswordInput label="Password" registration={register("password")} autoComplete="current-password" />
              <div className="flex justify-end">
                <input type="checkbox" {...register("rememberMe")} defaultChecked className="sr-only" tabIndex={-1} aria-hidden="true" />
                <Link to="/forgot-password" className="text-sm font-semibold text-ink hover:underline">
                  Forgot password?
                </Link>
              </div>
              <SubmitButton loading={isSubmitting} loadingText="Signing in...">Sign in</SubmitButton>
            </form>
      </AuthFeatureLayout>
    </AuthLayout>
  );
}

function getFriendlyLoginError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("inactive")) return "Your account is currently inactive. Please contact the administrator.";
  if (message.includes("locked")) return "Your account has been locked. Please contact the administrator.";
  if (message.includes("invalid credentials") || message.includes("check your username and password")) return "Invalid email or password.";
  if (message.includes("network") || message.includes("fetch")) return "Unable to sign in at the moment. Please try again.";
  return "Something went wrong. Please try again.";
}
