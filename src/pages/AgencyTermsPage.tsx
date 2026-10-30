import { LegalDocument } from "../components/layout/LegalDocument";
import { LegalScheduleTable } from "../components/layout/LegalScheduleTable";
import agreement from "../content/agencyTerms.json";

export function AgencyTermsPage() {
  const { schedule } = agreement;

  return (
    <LegalDocument
      id="agency"
      language="en"
      pageTitle="Agency Terms | theTrust"
      title="TRUST REPRESENTATIVE AGREEMENT"
      subtitle="Agency Terms"
      description="Lee & Partners Tech Holdings Sdn Bhd"
      version="1.0"
      date="1 January 2026"
      dateTime="2026-01-01"
      issuer="Lee & Partners Tech Holdings Sdn Bhd and the Representative"
      labels={{ back: "Back to login", version: "Version", date: "Effective Date", issuer: "Agreement Between", contents: "Table of Contents", top: "Back to Top" }}
      sections={agreement.sections}
      issuerDetails={
        <>
          <p>BETWEEN</p>
          <p className="mt-1 font-semibold">LEE &amp; PARTNERS TECH HOLDINGS SDN BHD</p>
          <p>[Registration No. 1329170-K]</p>
          <p className="mt-2">AND</p>
          <p className="font-semibold">THE REPRESENTATIVE</p>
          <p>(each individual registered as a representative in the Portal)</p>
          <p className="mt-3">Terms binding on representatives who register, log in to or submit cases through the Portal</p>
          <p>incorporating the Entitlement and Payment Schedule</p>
        </>
      }
      introduction={
        <div data-agreement-introduction className="space-y-4">
          {agreement.introduction.map((paragraph, index) => (
            <p key={index} className={index === 2 ? "font-semibold" : undefined}>{paragraph}</p>
          ))}
        </div>
      }
      additionalContents={[
        { href: "#agency-schedule", label: "Schedule — Entitlement and Payment Schedule" },
        ...schedule.parts.map((part) => ({ href: `#agency-part-${part.letter.toLowerCase()}`, label: part.title }))
      ]}
    >
      <section aria-labelledby="agency-schedule" className="border-t border-line pt-8">
        <header className="mb-7">
          <h2 id="agency-schedule" tabIndex={-1} className="scroll-mt-6 text-lg font-bold">SCHEDULE</h2>
          <p className="mt-1 text-base font-semibold">{schedule.title}</p>
          <p className="mt-2 text-sm">{schedule.note}</p>
          <p className="mt-2 text-sm text-textSecondary">{schedule.version}</p>
        </header>
        <div className="space-y-9">
          {schedule.parts.map((part) => (
            <section key={part.letter} aria-labelledby={`agency-part-${part.letter.toLowerCase()}`}>
              <h3 id={`agency-part-${part.letter.toLowerCase()}`} tabIndex={-1} className="mb-4 scroll-mt-6 text-base font-bold leading-7">{part.title}</h3>
              <div className="space-y-5">
                {part.blocks.map((block, index) => block.kind === "table" && block.headers && block.rows ? (
                  <LegalScheduleTable key={index} label={`${part.title} — ${block.headers[0]}`} headers={block.headers} rows={block.rows} />
                ) : (
                  <p key={index} className="[overflow-wrap:anywhere]">{block.text}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </LegalDocument>
  );
}
