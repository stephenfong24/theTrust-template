import { AlertCircle, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { trustApplicationApi } from "../api/trustApplicationApi";
import { Button } from "../components/ui/button";

export function TrustApplicationDocumentViewerPage() {
  const { trustId = "", documentCode = "" } = useParams();
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState("");
  const [pdfViewerUrl, setPdfViewerUrl] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const numericTrustId = Number(trustId);
  const decodedDocumentCode = decodeURIComponent(documentCode).toUpperCase();

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;

    async function loadDocument() {
      if (!Number.isFinite(numericTrustId) || numericTrustId <= 0 || !decodedDocumentCode) {
        setError("Invalid document link.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setPdfDownloadUrl("");
      setPdfViewerUrl("");
      setPdfFileName("");

      try {
        const { blob, fileName } = await trustApplicationApi.getTrustApplicationDocumentPdf(numericTrustId, decodedDocumentCode);
        if (cancelled) return;

        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setPdfDownloadUrl(objectUrl);
        setPdfViewerUrl(trustApplicationApi.getTrustApplicationDocumentPdfUrl(numericTrustId, decodedDocumentCode));
        setPdfFileName(fileName || `${decodedDocumentCode.toLowerCase()}.pdf`);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load document.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDocument();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [decodedDocumentCode, numericTrustId]);

  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-line bg-[#FFFCF4] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wide text-textSecondary">Trust Application Document</div>
          <h1 className="mt-1 truncate text-xl font-bold text-ink">{formatDocumentTitle(decodedDocumentCode)}</h1>
        </div>
        {pdfDownloadUrl ? (
          <Button asChild>
            <a href={pdfDownloadUrl} download={pdfFileName || undefined}>
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center p-8 text-sm font-semibold text-textSecondary">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-brandGold" />
          Loading document...
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-5 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
            <h2 className="mt-3 text-base font-bold text-red-700">Document unavailable</h2>
            <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>
          </div>
        </div>
      ) : (
        <iframe title={formatDocumentTitle(decodedDocumentCode)} src={pdfViewerUrl} className="min-h-[calc(100vh-15rem)] flex-1 bg-soft" />
      )}
    </section>
  );
}

function formatDocumentTitle(documentCode: string) {
  return documentCode
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
