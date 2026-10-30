import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../components/layout/Brand";

export function LegalPolicyPage({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} | theTrust`;
  }, [title]);

  return (
    <main className="min-h-screen bg-soft px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl min-w-0">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Brand />
          <Link to="/login" className="text-sm font-semibold text-ink hover:underline">
            Back to login
          </Link>
        </header>

        <section aria-labelledby="policy-title" className="min-h-[60vh] min-w-0 rounded-lg border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-5 h-[3px] w-12 rounded-full bg-brandGold" />
          <h1 id="policy-title" className="text-2xl font-semibold text-textPrimary">{title}</h1>
        </section>
      </div>
    </main>
  );
}
