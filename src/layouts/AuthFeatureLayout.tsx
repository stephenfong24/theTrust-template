import { LockKeyhole, ShieldCheck, Workflow, type LucideIcon } from "lucide-react";
import { Brand } from "../components/layout/Brand";
import loginHeroBackground from "../assets/login-hero-background.png";

const featureCards: Array<{ title: string; description: string; icon: LucideIcon }> = [
  {
    title: "AI-Assisted Management",
    description: "Simplify tasks with AI-powered automation.",
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

export function AuthFeatureLayout({ children }: { children: React.ReactNode }) {
  return (
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
          <h1 className="text-4xl font-semibold tracking-normal text-textPrimary">Trust System</h1>
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
          <p>CNB Amanah Berhad · Trust System</p>
        </div>
      </section>
      <section className="flex items-start justify-center border-t border-line/70 bg-white p-6 pt-10 lg:border-l lg:border-t-0 lg:pt-[18vh]">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}
