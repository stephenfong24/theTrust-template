import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Brand } from "./Brand";

export interface LegalSection {
  number: number;
  title: string;
  clauses: Array<{ number: string; text: string }>;
  definitions?: Array<{ term: string; text: string }>;
}

interface LegalDocumentProps {
  id: string;
  language: string;
  pageTitle: string;
  title: string;
  subtitle: string;
  description: string;
  version: string;
  date: string;
  dateTime?: string;
  issuer?: string;
  issuerDetails?: ReactNode;
  introduction?: ReactNode;
  additionalContents?: Array<{ href: string; label: string }>;
  children?: ReactNode;
  headerAction?: ReactNode;
  sections: LegalSection[];
  labels: { back: string; version: string; date: string; issuer: string; contents: string; top: string };
}

export function LegalDocument({ id, language, pageTitle, title, subtitle, description, version, date, dateTime = "2026-09-09", issuer = "CNB Amanah Berhad", issuerDetails, introduction, additionalContents = [], children, headerAction, sections, labels }: LegalDocumentProps) {
  useEffect(() => {
    document.title = pageTitle;
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) root.style.scrollBehavior = "smooth";
    return () => { root.style.scrollBehavior = previous; };
  }, [pageTitle]);

  return (
    <main id={`${id}-top`} lang={language} className="min-h-screen bg-soft px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[960px] min-w-0">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Brand />
          <Link to="/login" className="text-right text-sm font-semibold text-ink hover:underline">{labels.back}</Link>
        </header>
        <article aria-labelledby={`${id}-title`} className="rounded-lg border border-line bg-white px-5 py-8 text-[15px] leading-[1.8] text-textPrimary sm:px-10 sm:py-10 lg:px-12">
          <header className="border-b border-line pb-7">
            <div className="flex flex-col-reverse items-start justify-between gap-5 sm:flex-row">
              <div className="min-w-0">
                <div className="mb-5 h-[3px] w-12 rounded-full bg-brandGold" />
                <h1 id={`${id}-title`} className="text-2xl font-semibold tracking-wide sm:text-3xl">{title}</h1>
              </div>
              {headerAction}
            </div>
            <p className="mt-2 text-lg font-semibold">{subtitle}</p>
            <p className="mt-1 text-sm text-textSecondary">{description}</p>
            <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-textSecondary">
              <div className="flex gap-1"><dt>{labels.version}:</dt><dd>{version}</dd></div>
              <div className="flex gap-1"><dt>{labels.date}:</dt><dd><time dateTime={dateTime}>{date}</time></dd></div>
              <div className="flex gap-1"><dt className="shrink-0">{labels.issuer}:</dt><dd>{issuer}</dd></div>
            </dl>
            <div lang="en" className="mt-4 text-xs text-textSecondary">
              {issuerDetails ?? <>
                <p className="font-semibold">CNB AMANAH BERHAD</p>
                <p>[Registration No. 202101002895 (1403193-P)]</p>
                <p>(as data user)</p>
              </>}
              <p className="mt-2">PRIVATE &amp; CONFIDENTIAL</p>
            </div>
          </header>
          <nav aria-labelledby={`${id}-contents`} className="border-b border-line py-6">
            <h2 id={`${id}-contents`} className="text-sm font-semibold">{labels.contents}</h2>
            <ol className="mt-3 grid gap-x-6 gap-y-1 text-xs leading-6 sm:grid-cols-2">
              {sections.map((section) => (
                <li key={section.number}>
                  <a href={`#${id}-section-${section.number}`} className="flex gap-2 hover:underline">
                    <span className="w-5 shrink-0 tabular-nums">{section.number}.</span>
                    <span className="capitalize">{section.title.toLowerCase()}</span>
                  </a>
                </li>
              ))}
              {additionalContents.map((entry) => (
                <li key={entry.href}>
                  <a href={entry.href} className="hover:underline">{entry.label}</a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="space-y-9 pt-8">
            {introduction}
            {sections.map((section) => (
              <section key={section.number} data-legal-section={section.number} aria-labelledby={`${id}-section-${section.number}`}>
                <h2 id={`${id}-section-${section.number}`} tabIndex={-1} className="mb-4 flex scroll-mt-6 gap-3 text-base font-bold leading-7 sm:gap-4">
                  <span className="w-9 shrink-0 tabular-nums">{section.number}.</span>
                  <span>{section.title}</span>
                </h2>
                <div className="space-y-4">
                  {section.clauses.map((clause, index) => (
                    <div key={index} className={`grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 sm:gap-x-4 ${clause.number.startsWith("(") ? "ml-6 sm:ml-12" : ""}`}>
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
            {children}
          </div>
          <footer className="mt-9 border-t border-line pt-5 text-right text-sm">
            <a href={`#${id}-top`} className="font-semibold underline underline-offset-4">{labels.top}</a>
          </footer>
        </article>
      </div>
    </main>
  );
}
