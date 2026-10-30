import { useLayoutEffect, useRef, useState } from "react";
import { LegalDocument } from "../components/layout/LegalDocument";
import englishSections from "../content/privacyPolicy.en.json";
import malaySections from "../content/privacyPolicy.ms.json";

type PolicyLanguage = "en" | "ms";

const documents = {
  en: {
    title: "PRIVACY POLICY",
    subtitle: "Personal Data Protection Notice",
    description: "(issued under section 7 of the Personal Data Protection Act 2010)",
    sections: englishSections,
    labels: { back: "Back to login", version: "Version", date: "Date", issuer: "Issued by", contents: "Table of Contents", top: "Back to Top" }
  },
  ms: {
    title: "DASAR PRIVASI",
    subtitle: "Notis Perlindungan Data Peribadi",
    description: "(dikeluarkan di bawah seksyen 7 Akta Perlindungan Data Peribadi 2010)",
    sections: malaySections,
    labels: { back: "Kembali ke log masuk", version: "Versi", date: "Tarikh", issuer: "Dikeluarkan oleh", contents: "Isi Kandungan", top: "Kembali ke Atas" }
  }
};

export function PrivacyPolicyPage() {
  const [language, setLanguage] = useState<PolicyLanguage>("en");
  const pendingScroll = useRef<{ section?: string; offset: number; top: number } | null>(null);

  const changeLanguage = (next: PolicyLanguage) => {
    if (next === language) return;
    const currentSection = [...document.querySelectorAll<HTMLElement>("[data-legal-section]")]
      .reverse().find((section) => section.getBoundingClientRect().top <= 120);
    pendingScroll.current = {
      section: currentSection?.dataset.legalSection,
      offset: currentSection?.getBoundingClientRect().top ?? 0,
      top: window.scrollY
    };
    setLanguage(next);
  };

  useLayoutEffect(() => {
    const position = pendingScroll.current;
    if (!position) return;
    pendingScroll.current = null;
    const section = position.section ? document.querySelector<HTMLElement>(`[data-legal-section="${position.section}"]`) : null;
    const top = section ? window.scrollY + section.getBoundingClientRect().top - position.offset : position.top;
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo({ top, behavior: "auto" });
    root.style.scrollBehavior = previous;
  }, [language]);

  return (
    <LegalDocument
      id="privacy"
      language={language}
      pageTitle="Privacy Policy | theTrust"
      version="1.0"
      date="9 September 2026"
      {...documents[language]}
      headerAction={
        <div role="group" aria-label="Document language" lang="en" className="flex shrink-0 self-end rounded-lg border border-line bg-soft p-1 text-xs sm:self-start">
          {([['en', 'English'], ['ms', 'Bahasa Malaysia']] as const).map(([code, label]) => (
            <button
              key={code}
              type="button"
              lang={code}
              aria-pressed={language === code}
              onClick={() => changeLanguage(code)}
              className={`min-h-9 rounded-md px-3 font-semibold ${language === code ? "bg-ink text-white" : "text-textSecondary hover:bg-white hover:text-textPrimary"}`}
            >
              {label}
            </button>
          ))}
        </div>
      }
    />
  );
}
