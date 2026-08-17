export type MalaysiaIcField = "icNumber" | "fullName" | "address";
export type MalaysiaIcAddressLineRegion = "addressLine1" | "addressLine2" | "addressLine3" | "addressLine4";
export type MalaysiaIcOcrRegionKey = MalaysiaIcField | "identityBlock" | MalaysiaIcAddressLineRegion;

export interface MalaysiaIcConfidence {
  overall: number;
  icNumber: number;
  fullName: number;
  address: number;
}

export interface MalaysiaIcExtractedFields {
  icNumber: string | null;
  fullName: string | null;
  address: string | null;
  postcode: string | null;
  state: string | null;
}

export interface MalaysiaIcOcrResult extends MalaysiaIcExtractedFields {
  confidence: MalaysiaIcConfidence;
  diagnostics?: MalaysiaIcDiagnostics;
  warnings: string[];
}

export interface MalaysiaIcDiagnostics {
  normalizedImageUrl?: string;
  crops: Partial<Record<MalaysiaIcOcrRegionKey, string>>;
  rawText: Partial<Record<MalaysiaIcOcrRegionKey | "fullImage", string>>;
  detectedCardBoundary?: Point[];
}

export interface MalaysiaIcRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MalaysiaIcQualityReport {
  ok: boolean;
  warnings: string[];
  brightness: number;
  blurScore: number;
  width: number;
  height: number;
}

export interface ProcessedMalaysiaIcImage {
  canvas: HTMLCanvasElement;
  regions: Record<MalaysiaIcOcrRegionKey, HTMLCanvasElement>;
  regionVariants: Record<MalaysiaIcOcrRegionKey, HTMLCanvasElement[]>;
  quality: MalaysiaIcQualityReport;
  diagnostics: MalaysiaIcDiagnostics;
  usedFullImageFallback: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface MalaysiaIcOcrProgress {
  status: string;
  progress: number;
}

export interface MalaysiaIcOcrOptions {
  onProgress?: (progress: MalaysiaIcOcrProgress) => void;
  includeDiagnostics?: boolean;
}

export interface FieldConfidenceThresholds {
  high: number;
  low: number;
}
