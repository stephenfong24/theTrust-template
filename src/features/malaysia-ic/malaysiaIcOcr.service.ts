import Tesseract from "tesseract.js";
import { processMalaysiaIcImage } from "./malaysiaIcImageProcessor";
import {
  calculateFieldConfidence,
  classifyMalaysiaIcTextCandidates,
  extractMalaysiaIcNumber,
  extractMalaysiaPostcode,
  extractMalaysiaState,
  normalizeMalaysiaIcName,
  roundConfidence
} from "./malaysiaIcParser";
import type { MalaysiaIcOcrOptions, MalaysiaIcOcrProgress, MalaysiaIcOcrRegionKey, MalaysiaIcOcrResult } from "./malaysiaIc.types";
import { validateMalaysiaIc } from "./malaysiaIcValidator";

type Worker = Tesseract.Worker;

interface RegionOcrResult {
  text: string;
  confidence: number;
}

class MalaysiaIcOcrServiceImpl {
  private workerPromise: Promise<Worker> | null = null;
  private latestProgress?: (progress: MalaysiaIcOcrProgress) => void;

  async extract(image: File, options: MalaysiaIcOcrOptions = {}): Promise<MalaysiaIcOcrResult> {
    this.latestProgress = options.onProgress;
    this.emit("Preparing image...", 0.04);

    const processed = await processMalaysiaIcImage(image);
    const warnings = [...processed.quality.warnings];

    this.emit("Detecting IC...", 0.16);
    if (processed.usedFullImageFallback) {
      warnings.push("The IC boundary was not isolated confidently, so OCR used the full image layout.");
    }

    const worker = await this.getWorker();
    const rawText: Partial<Record<MalaysiaIcOcrRegionKey | "fullImage", string>> = {};

    this.emit("Reading IC number...", 0.32);
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789- OILSB",
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE
    });
    const icNumberOcr = await this.recognizeBest(processed.regionVariants.icNumber, (text) => extractMalaysiaIcNumber(text) ? 100 : 0);
    rawText.icNumber = icNumberOcr.text;
    let fullImageOcr: RegionOcrResult | null = null;

    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '-@,./",
      tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT
    });
    fullImageOcr = await this.recognize(processed.canvas);
    rawText.fullImage = fullImageOcr.text;

    this.emit("Reading name...", 0.52);
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ '-@",
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
    });
    const nameOcr = await this.recognizeBest(processed.regionVariants.fullName, (text) => normalizeMalaysiaIcName(text) ? scoreTextQuality(text) : 0);
    rawText.fullName = nameOcr.text;

    this.emit("Reading address...", 0.72);
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '-@,./",
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
    });
    const addressOcr = await this.recognizeBest(processed.regionVariants.address, scoreTextQuality);
    rawText.address = addressOcr.text;

    this.emit("Reading identity block...", 0.8);
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '-@,./",
      tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT
    });
    const identityBlockOcr = await this.recognizeBest(processed.regionVariants.identityBlock, scoreTextQuality);
    rawText.identityBlock = identityBlockOcr.text;

    this.emit("Reading address lines...", 0.84);
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '-@,./",
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE
    });
    const addressLineOcrs = [
      await this.recognizeBest(processed.regionVariants.addressLine1, scoreTextQuality),
      await this.recognizeBest(processed.regionVariants.addressLine2, scoreTextQuality),
      await this.recognizeBest(processed.regionVariants.addressLine3, scoreTextQuality),
      await this.recognizeBest(processed.regionVariants.addressLine4, scoreTextQuality)
    ];
    rawText.addressLine1 = addressLineOcrs[0].text;
    rawText.addressLine2 = addressLineOcrs[1].text;
    rawText.addressLine3 = addressLineOcrs[2].text;
    rawText.addressLine4 = addressLineOcrs[3].text;
    const addressLinesText = addressLineOcrs.map((ocr) => ocr.text.trim()).filter(Boolean).join("\n");
    const addressLinesConfidence = addressLineOcrs.reduce((total, ocr) => total + ocr.confidence, 0) / Math.max(addressLineOcrs.length, 1);

    this.emit("Validating information...", 0.88);
    const classified = classifyMalaysiaIcTextCandidates([
      { source: "icNumber", text: icNumberOcr.text, confidence: icNumberOcr.confidence },
      { source: "fullName", text: nameOcr.text, confidence: nameOcr.confidence },
      { source: "address", text: addressOcr.text, confidence: addressOcr.confidence },
      { source: "addressLines", text: addressLinesText, confidence: addressLinesConfidence },
      { source: "identityBlock", text: identityBlockOcr.text, confidence: identityBlockOcr.confidence },
      { source: "fullImage", text: fullImageOcr.text, confidence: fullImageOcr.confidence }
    ]);
    const icNumber = classified.icNumber;
    const fullName = classified.fullName;
    const address = classified.address;
    const icValidation = validateMalaysiaIc(icNumber);
    const postcode = address ? extractMalaysiaPostcode(address) : null;
    const state = address ? extractMalaysiaState(address) : null;

    if (!icNumber) {
      warnings.push("We couldn't clearly read the IC number. Please verify or enter it manually.");
    }
    if (!fullName) {
      warnings.push("We couldn't clearly read the full name. Please verify or enter it manually.");
    }
    if (!address) {
      warnings.push("We couldn't clearly read the address. Please verify or enter it manually.");
    }
    if (icValidation.reason) {
      warnings.push(icValidation.reason);
    }

    const confidence = {
      icNumber: calculateFieldConfidence(classified.confidence.icNumber, icNumber, icValidation.confidenceAdjustment),
      fullName: calculateFieldConfidence(classified.confidence.fullName, fullName, fullName ? 0.03 : 0),
      address: calculateFieldConfidence(classified.confidence.address, address, address ? 0.02 : 0),
      overall: 0
    };
    confidence.overall = roundConfidence((confidence.icNumber * 0.45) + (confidence.fullName * 0.3) + (confidence.address * 0.25));

    this.emit("Finalizing...", 1);

    return {
      icNumber,
      fullName,
      address,
      postcode,
      state,
      confidence,
      warnings,
      diagnostics: options.includeDiagnostics
        ? {
            ...processed.diagnostics,
            rawText
          }
        : undefined
    };
  }

  async terminate(): Promise<void> {
    if (!this.workerPromise) {
      return;
    }

    const worker = await this.workerPromise;
    await worker.terminate();
    this.workerPromise = null;
  }

  private async getWorker(): Promise<Worker> {
    if (!this.workerPromise) {
      this.workerPromise = Tesseract.createWorker("eng", Tesseract.OEM.LSTM_ONLY, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            this.latestProgress?.({ status: "Reading text...", progress: Math.min(0.86, 0.2 + message.progress * 0.6) });
          }
        }
      });
    }

    return this.workerPromise;
  }

  private async recognize(canvas: HTMLCanvasElement): Promise<RegionOcrResult> {
    const worker = await this.getWorker();
    const result = await worker.recognize(canvas);

    return {
      text: result.data.text,
      confidence: result.data.confidence
    };
  }

  private async recognizeBest(canvases: HTMLCanvasElement[], score: (text: string) => number): Promise<RegionOcrResult> {
    const results: RegionOcrResult[] = [];

    for (const canvas of canvases) {
      results.push(await this.recognize(canvas));
    }

    return results.sort((a, b) => (score(b.text) + b.confidence * 0.2) - (score(a.text) + a.confidence * 0.2))[0];
  }

  private emit(status: string, progress: number): void {
    this.latestProgress?.({ status, progress });
  }
}

function scoreTextQuality(value: string): number {
  const letterCount = (value.match(/[A-Z]/g) ?? []).length;
  const digitCount = (value.match(/\d/g) ?? []).length;
  const wordCount = value.split(/\s+/).filter(Boolean).length;
  const suspiciousShortWords = value.split(/\s+/).filter((word) => /^[A-Z]{1,2}$/.test(word)).length;
  const addressBonus = /\b(?:JALAN|KAMPUNG|P O BOX|TAMAN|\d{5})\b/.test(value) ? 8 : 0;

  return letterCount + digitCount * 0.7 + wordCount * 2 + addressBonus - suspiciousShortWords * 3;
}

export const MalaysiaIcOcrService = new MalaysiaIcOcrServiceImpl();
