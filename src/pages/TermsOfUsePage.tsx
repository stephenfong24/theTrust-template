import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../components/layout/Brand";
import sections from "../content/termsOfUse.json";

export function TermsOfUsePage() {
  useEffect(() => {
    document.title = "Terms of Use | theTrust";
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.style.scrollBehavior = "smooth";
    }
    return () => { root.style.scrollBehavior = previous; };
  }, []);

  return (
    <main id="terms-top" className="min-h-screen bg-soft px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[960px] min-w-0">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Brand />
          <Link to="/login" className="text-sm font-semibold text-ink hover:underline">Back to login</Link>
        </header>

        <article aria-labelledby="terms-title" className="rounded-lg border border-line bg-white px-5 py-8 text-[15px] leading-[1.8] text-textPrimary sm:px-10 sm:py-10 lg:px-12">
          <header className="border-b border-line pb-7">
            <div className="mb-5 h-[3px] w-12 rounded-full bg-brandGold" />
            <h1 id="terms-title" className="text-2xl font-semibold tracking-wide sm:text-3xl">TERMS OF USE</h1>
            <p className="mt-2 text-lg font-semibold">TheTrust Portal</p>
            <p className="mt-1 text-sm text-textSecondary">Trust Case Submission, Administration, Commission and Client Portal</p>
            <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-textSecondary">
              <div className="flex gap-1"><dt>Version:</dt><dd>1.1</dd></div>
              <div className="flex gap-1"><dt>Date:</dt><dd><time dateTime="2026-09-09">9 September 2026</time></dd></div>
              <div className="flex gap-1"><dt>Issued by:</dt><dd>CNB Amanah Berhad</dd></div>
            </dl>
            <div className="mt-4 text-xs text-textSecondary">
              <p className="font-semibold">CNB AMANAH BERHAD</p>
              <p>[Registration No. 202101002895 (1403193-P)]</p>
              <p>(as operator of the TheTrust Portal)</p>
              <p className="mt-2">PRIVATE &amp; CONFIDENTIAL</p>
            </div>
          </header>

          <nav aria-labelledby="terms-contents" className="border-b border-line py-6">
            <h2 id="terms-contents" className="text-sm font-semibold">Table of Contents</h2>
            <ol className="mt-3 grid gap-x-6 gap-y-1 text-xs leading-6 sm:grid-cols-2">
              {sections.map((section) => (
                <li key={section.number}>
                  <a href={`#terms-section-${section.number}`} className="flex gap-2 hover:underline">
                    <span className="w-5 shrink-0 tabular-nums">{section.number}.</span>
                    <span className="capitalize">{section.title.toLowerCase()}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-9 pt-8">
            {sections.map((section) => (
              <section key={section.number} aria-labelledby={`terms-section-${section.number}`}>
                <h2 id={`terms-section-${section.number}`} tabIndex={-1} className="mb-4 flex scroll-mt-6 gap-3 text-base font-bold leading-7 sm:gap-4">
                  <span className="w-9 shrink-0 tabular-nums">{section.number}.</span>
                  <span>{section.title}</span>
                </h2>
                <div className="space-y-4">
                  {section.clauses.map((clause, index) => (
                    <div key={clause.number || index} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 sm:gap-x-4">
                      <span className="font-semibold tabular-nums">{clause.number}</span>
                      <p className="min-w-0 [overflow-wrap:anywhere]">{clause.text}</p>
                    </div>
                  ))}
                </div>
                {section.definitions ? (
                  <dl className="ml-12 mt-4 divide-y divide-line border-y border-line sm:ml-[3.25rem]">
                    {section.definitions.map((definition) => (
                      <div key={definition.term} className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-5">
                        <dt className="font-semibold">{definition.term}</dt>
                        <dd className="min-w-0 [overflow-wrap:anywhere]">{definition.text}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </section>
            ))}
          </div>
          <footer className="mt-9 border-t border-line pt-5 text-right text-sm">
            <a href="#terms-top" className="font-semibold underline underline-offset-4">Back to Top</a>
          </footer>
        </article>
      </div>
    </main>
  );
}
