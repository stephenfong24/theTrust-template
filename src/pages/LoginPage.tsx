import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, ShieldCheck, Workflow, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Brand } from "../components/layout/Brand";
import { useAuth } from "../hooks/useAuth";
import { AuthLayout } from "../layouts/AuthLayout";
import loginHeroBackground from "../assets/login-hero-background.png";

const schema = z.object({
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required.")
});

type FormValues = z.infer<typeof schema>;

const featureCards: Array<{ title: string; description: string; icon: LucideIcon }> = [
  {
    title: "Role-Based Security",
    description: "Controlled access based on assigned responsibilities.",
    icon: ShieldCheck
  },
  {
    title: "Secure Login",
    description: "Protected access within the authorized environment.",
    icon: LockKeyhole
  },
  {
    title: "Financial Workflow",
    description: "Structured trust, payment, and approval operations.",
    icon: Workflow
  }
];

export function LoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { username: "", password: "" } });

  useEffect(() => {
    document.title = "Trust Fund Management System";
  }, []);

  if (session) return <Navigate to="/dashboard" replace />;

  const submit = async (values: FormValues) => {
    setError("");
    try {
      await login(values.username, values.password);
      navigate((location.state as { from?: string } | null)?.from ?? "/dashboard", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to complete the action. Please try again.");
    }
  };

  return (
    <AuthLayout>
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section
          className="relative flex min-h-[520px] flex-col justify-between overflow-hidden bg-white p-8 lg:p-12"
          style={{ backgroundImage: `url(${loginHeroBackground})`, backgroundPosition: "center", backgroundSize: "cover" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-white/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-white/45" />
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative">
            <Brand />
          </div>
          <div className="relative max-w-2xl py-12">
            <div className="mb-4 h-1 w-12 rounded-full bg-brandGold" />
            <h1 className="text-4xl font-semibold tracking-normal text-textPrimary">Trust Fund Management System</h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Secure access for managing trust applications, client portfolios, payments, documents, reporting, user roles, and administrative controls.
            </p>
            <div className="mt-10 hidden gap-4 sm:grid sm:grid-cols-3">
              {featureCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-lg border border-line/80 bg-white/92 p-4 shadow-[0_10px_26px_rgba(17,17,17,0.07)]">
                    <Icon className="h-5 w-5 text-brandGold" strokeWidth={2.1} />
                    <div className="mt-3 text-sm font-semibold text-textPrimary">{item.title}</div>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative text-xs leading-5 text-slate-600">
            <p>Authorized client review environment</p>
            <p>CNB Amanah Berhad · Trust Fund Management System</p>
          </div>
        </section>
        <section className="flex items-start justify-center border-t border-line/70 bg-white p-6 pt-10 lg:border-l lg:border-t-0 lg:pt-[18vh]">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <div className="mb-5 h-[3px] w-12 rounded-full bg-brandGold" />
              <h2 className="text-xl font-semibold text-textPrimary">Sign in</h2>
              <p className="mt-1 text-sm text-textSecondary">Enter your authorized local credentials.</p>
            </div>
            <form onSubmit={handleSubmit(submit)} className="space-y-4">
              <label className="block text-sm font-medium">
                Username <span className="text-red-600">*</span>
                <input
                  {...register("username")}
                  className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
                {errors.username ? <span className="mt-1 block text-xs text-red-600">{errors.username.message}</span> : null}
              </label>
              <label className="block text-sm font-medium">
                Password <span className="text-red-600">*</span>
                <input
                  type="password"
                  {...register("password")}
                  className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
                {errors.password ? <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span> : null}
              </label>
              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              <button disabled={isSubmitting} className="h-11 w-full rounded-lg bg-ink px-4 text-sm font-semibold text-white disabled:opacity-60">
                {isSubmitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
            <div className="mt-5 rounded-lg border border-line bg-soft p-4">
              <h3 className="text-sm font-semibold text-textPrimary">Access Credentials</h3>
              <p className="mt-2 text-sm text-textSecondary">Username: superadmin</p>
              <p className="text-sm text-textSecondary">Password: Trust@123</p>
              <button
                onClick={() => {
                  setValue("username", "superadmin");
                  setValue("password", "Trust@123");
                }}
                className="mt-3 rounded-lg border border-ink bg-white px-3 py-2 text-sm font-medium text-ink"
              >
                Fill Credentials
              </button>
            </div>
          </div>
        </section>
      </div>
    </AuthLayout>
  );
}
