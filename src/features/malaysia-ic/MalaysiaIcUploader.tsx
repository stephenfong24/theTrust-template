import { AlertTriangle, Camera, CheckCircle2, ImageUp, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MalaysiaIcOcrService } from "./malaysiaIcOcr.service";
import type { FieldConfidenceThresholds, MalaysiaIcOcrProgress, MalaysiaIcOcrResult } from "./malaysiaIc.types";

interface MalaysiaIcUploaderProps {
  onExtracted: (result: MalaysiaIcOcrResult) => void;
  confidence?: FieldConfidenceThresholds;
}

const DEFAULT_CONFIDENCE: FieldConfidenceThresholds = {
  high: 0.85,
  low: 0.65
};

export function MalaysiaIcUploader({ onExtracted, confidence = DEFAULT_CONFIDENCE }: MalaysiaIcUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<MalaysiaIcOcrProgress | null>(null);
  const [result, setResult] = useState<MalaysiaIcOcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      revokePreview();
      void MalaysiaIcOcrService.terminate();
    };
  }, []);

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    revokePreview();
    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setResult(null);
    setError(null);
    setProgress({ status: "Preparing image...", progress: 0 });

    try {
      const extracted = await MalaysiaIcOcrService.extract(file, {
        includeDiagnostics: import.meta.env.DEV,
        onProgress: setProgress
      });
      setResult(extracted);
      onExtracted(extracted);
    } catch {
      setError("We couldn't clearly read the IC. Please try again with a clearer photo or enter the details manually.");
    } finally {
      setProgress(null);
      resetInput(uploadInputRef.current);
      resetInput(cameraInputRef.current);
    }
  };

  const hasLowConfidence = result
    ? result.confidence.icNumber < confidence.low || result.confidence.fullName < confidence.low || result.confidence.address < confidence.low
    : false;

  return (
    <section className="md:col-span-2 rounded-lg border border-line bg-soft p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-textPrimary">Identity Card</p>
          <p className="mt-1 text-sm text-textSecondary">Upload your Malaysian IC to automatically fill in your information.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => uploadInputRef.current?.click()} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">
              <ImageUp className="mr-2 inline h-4 w-4" />Upload IC
            </button>
            <button type="button" onClick={() => cameraInputRef.current?.click()} className="rounded-lg border border-ink bg-white px-4 py-2 text-sm font-medium text-ink">
              <Camera className="mr-2 inline h-4 w-4" />Take Photo
            </button>
            {previewUrl ? (
              <button type="button" onClick={() => uploadInputRef.current?.click()} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-textPrimary">
                <RefreshCw className="mr-2 inline h-4 w-4" />Change Image
              </button>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-textSecondary">Supported formats: JPG, JPEG, PNG</p>
          <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
        </div>

        {previewUrl ? (
          <div className="w-full lg:w-72">
            <img src={previewUrl} alt="Selected IC preview" className="max-h-48 w-full rounded-lg border border-line object-contain" />
          </div>
        ) : null}
      </div>

      {progress ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-textSecondary">
            <span>{progress.status}</span>
            <span>{Math.round(progress.progress * 100)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-brandGold transition-all" style={{ width: `${Math.round(progress.progress * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-white p-3 text-sm">
          <div className="flex gap-2 text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">IC information extracted successfully.</p>
              <p className="mt-1 text-textSecondary">Please verify the extracted information before continuing.</p>
            </div>
          </div>
          {hasLowConfidence ? (
            <p className="mt-3 flex gap-2 text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Some values need review.
            </p>
          ) : null}
          {result.warnings.length ? <ul className="mt-3 space-y-1 text-xs text-textSecondary">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
          {import.meta.env.DEV && result.diagnostics ? (
            <details className="mt-3 text-xs text-textSecondary">
              <summary className="cursor-pointer font-medium text-textPrimary">OCR diagnostics</summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-soft p-3">{JSON.stringify({ confidence: result.confidence, rawText: result.diagnostics.rawText }, null, 2)}</pre>
            </details>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-white p-3 text-sm text-red-700">
          <p>{error}</p>
          <button type="button" onClick={() => uploadInputRef.current?.click()} className="mt-3 rounded-lg border border-ink bg-white px-3 py-2 text-sm font-medium text-ink">Try Another Image</button>
        </div>
      ) : null}
    </section>
  );

  function revokePreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }
}

function resetInput(input: HTMLInputElement | null) {
  if (input) {
    input.value = "";
  }
}
