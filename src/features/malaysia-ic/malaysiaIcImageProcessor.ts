import type { MalaysiaIcAddressLineRegion, MalaysiaIcField, MalaysiaIcOcrRegionKey, MalaysiaIcQualityReport, MalaysiaIcRegion, Point, ProcessedMalaysiaIcImage } from "./malaysiaIc.types";

export const MYKAD_REGIONS: Record<MalaysiaIcField, MalaysiaIcRegion> = {
  icNumber: { x: 0.02, y: 0.18, width: 0.42, height: 0.16 },
  fullName: { x: 0.03, y: 0.44, width: 0.61, height: 0.16 },
  address: { x: 0.03, y: 0.56, width: 0.64, height: 0.39 }
};

export const MYKAD_FALLBACK_REGIONS: Record<"identityBlock", MalaysiaIcRegion> = {
  identityBlock: { x: 0.02, y: 0.38, width: 0.68, height: 0.57 }
};

export const MYKAD_ADDRESS_LINE_REGIONS: Record<MalaysiaIcAddressLineRegion, MalaysiaIcRegion> = {
  addressLine1: { x: 0.03, y: 0.60, width: 0.42, height: 0.08 },
  addressLine2: { x: 0.03, y: 0.67, width: 0.42, height: 0.08 },
  addressLine3: { x: 0.03, y: 0.74, width: 0.45, height: 0.08 },
  addressLine4: { x: 0.03, y: 0.81, width: 0.35, height: 0.08 }
};

const TARGET_CARD_WIDTH = 1400;
const MYKAD_ASPECT_RATIO = 85.6 / 54;

export async function processMalaysiaIcImage(file: File): Promise<ProcessedMalaysiaIcImage> {
  const source = await loadImage(file);
  const sourceCanvas = normalizeImageToCanvas(source);
  const detectedCard = detectAndNormalizeMyKad(sourceCanvas);
  const normalized = detectedCard.canvas;
  const quality = assessImageQuality(normalized);
  const enhanced = await enhanceCanvas(cloneCanvas(normalized));
  const regions = cropRegions(enhanced);
  const originalRegions = cropRegions(normalized);
  const regionVariants = createRegionVariants(originalRegions, regions);

  return {
    canvas: enhanced,
    regions,
    regionVariants,
    quality,
    diagnostics: {
      normalizedImageUrl: enhanced.toDataURL("image/jpeg", 0.88),
      crops: Object.fromEntries(Object.entries(regionVariants).map(([key, canvases]) => [key, canvases[0].toDataURL("image/jpeg", 0.88)])),
      rawText: {},
      detectedCardBoundary: detectedCard.boundary
    },
    usedFullImageFallback: detectedCard.usedFallback
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Unsupported image type."));
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to load image."));
    };
    image.src = url;
  });
}

function normalizeImageToCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const sourceAspect = image.naturalWidth / image.naturalHeight;
  const targetWidth = Math.min(Math.max(image.naturalWidth, 900), TARGET_CARD_WIDTH);
  const targetHeight = Math.round(targetWidth / (sourceAspect > 1 ? sourceAspect : MYKAD_ASPECT_RATIO));
  const canvas = document.createElement("canvas");
  const context = getContext(canvas);

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  return canvas;
}

function detectAndNormalizeMyKad(source: HTMLCanvasElement): { canvas: HTMLCanvasElement; boundary: Point[]; usedFallback: boolean } {
  const blueCardBox = detectBlueCardBox(source);
  const cardBox = blueCardBox ?? detectMonochromeCardBox(source);

  if (!cardBox) {
    return {
      canvas: source,
      boundary: getFallbackBoundary(source),
      usedFallback: true
    };
  }

  const paddedBox = padBoxToAspectRatio(cardBox, source.width, source.height);
  const canvas = document.createElement("canvas");
  const context = getContext(canvas);

  canvas.width = TARGET_CARD_WIDTH;
  canvas.height = Math.round(TARGET_CARD_WIDTH / MYKAD_ASPECT_RATIO);
  context.drawImage(source, paddedBox.x, paddedBox.y, paddedBox.width, paddedBox.height, 0, 0, canvas.width, canvas.height);

  return {
    canvas,
    boundary: [
      { x: paddedBox.x, y: paddedBox.y },
      { x: paddedBox.x + paddedBox.width, y: paddedBox.y },
      { x: paddedBox.x + paddedBox.width, y: paddedBox.y + paddedBox.height },
      { x: paddedBox.x, y: paddedBox.y + paddedBox.height }
    ],
    usedFallback: false
  };
}

function detectBlueCardBox(canvas: HTMLCanvasElement): { x: number; y: number; width: number; height: number } | null {
  const context = getContext(canvas);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const step = Math.max(2, Math.round(canvas.width / 700));
  const columns = Math.ceil(canvas.width / step);
  const rows = Math.ceil(canvas.height / step);
  const mask = new Uint8Array(columns * rows);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = Math.min(canvas.width - 1, column * step);
      const y = Math.min(canvas.height - 1, row * step);
      const index = (y * canvas.width + x) * 4;
      const r = image.data[index];
      const g = image.data[index + 1];
      const b = image.data[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max - min;
      const isMyKadBlue = b > 115 && g > 95 && b > r + 18 && saturation > 22;

      if (isMyKadBlue) {
        mask[row * columns + column] = 1;
      }
    }
  }

  return chooseBestCardComponent(findMaskComponents(mask, columns, rows, step, canvas.width, canvas.height), canvas.width, canvas.height);
}

function findMaskComponents(
  mask: Uint8Array,
  columns: number,
  rows: number,
  step: number,
  maxWidth: number,
  maxHeight: number
): Array<{ x: number; y: number; width: number; height: number; hits: number }> {
  const visited = new Uint8Array(mask.length);
  const components: Array<{ x: number; y: number; width: number; height: number; hits: number }> = [];
  const queue: number[] = [];

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] || visited[index]) {
      continue;
    }

    let minColumn = columns;
    let maxColumn = 0;
    let minRow = rows;
    let maxRow = 0;
    let hits = 0;
    queue.length = 0;
    queue.push(index);
    visited[index] = 1;

    while (queue.length) {
      const current = queue.shift()!;
      const row = Math.floor(current / columns);
      const column = current % columns;
      hits += 1;
      minColumn = Math.min(minColumn, column);
      maxColumn = Math.max(maxColumn, column);
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);

      for (const [nextColumn, nextRow] of [[column + 1, row], [column - 1, row], [column, row + 1], [column, row - 1]]) {
        if (nextColumn < 0 || nextColumn >= columns || nextRow < 0 || nextRow >= rows) {
          continue;
        }

        const nextIndex = nextRow * columns + nextColumn;
        if (mask[nextIndex] && !visited[nextIndex]) {
          visited[nextIndex] = 1;
          queue.push(nextIndex);
        }
      }
    }

    components.push({
      x: Math.max(0, minColumn * step),
      y: Math.max(0, minRow * step),
      width: Math.min(maxWidth, (maxColumn - minColumn + 1) * step),
      height: Math.min(maxHeight, (maxRow - minRow + 1) * step),
      hits
    });
  }

  return components;
}

function chooseBestCardComponent(
  components: Array<{ x: number; y: number; width: number; height: number; hits: number }>,
  sourceWidth: number,
  sourceHeight: number
): { x: number; y: number; width: number; height: number } | null {
  const sourceArea = sourceWidth * sourceHeight;
  const candidates = components
    .map((component) => {
      const area = component.width * component.height;
      const aspect = component.width / Math.max(component.height, 1);
      const aspectPenalty = Math.abs(aspect - MYKAD_ASPECT_RATIO) * 70;
      const topCardBonus = (1 - component.y / sourceHeight) * 35;

      return {
        ...component,
        area,
        score: component.hits + topCardBonus - aspectPenalty
      };
    })
    .filter((component) => component.hits >= 45)
    .filter((component) => component.area >= sourceArea * 0.008)
    .filter((component) => component.area <= sourceArea * 0.65)
    .filter((component) => component.width / Math.max(component.height, 1) >= 1.15)
    .filter((component) => component.width / Math.max(component.height, 1) <= 2.6)
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  return best ? { x: best.x, y: best.y, width: best.width, height: best.height } : null;
}

function detectMonochromeCardBox(canvas: HTMLCanvasElement): { x: number; y: number; width: number; height: number } | null {
  const context = getContext(canvas);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const step = Math.max(2, Math.round(canvas.width / 800));
  const background = estimateCornerBrightness(image.data, canvas.width, canvas.height);
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let hitCount = 0;

  for (let y = step; y < canvas.height - step; y += step) {
    for (let x = step; x < canvas.width - step; x += step) {
      const center = grayAt(image.data, canvas.width, x, y);
      const right = grayAt(image.data, canvas.width, x + step, y);
      const bottom = grayAt(image.data, canvas.width, x, y + step);
      const edgeStrength = Math.abs(center - right) + Math.abs(center - bottom);
      const foregroundContrast = Math.abs(center - background);
      const isLikelyCardContent = edgeStrength > 28 || foregroundContrast > 35;

      if (isLikelyCardContent) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        hitCount += 1;
      }
    }
  }

  if (hitCount < 160) {
    return null;
  }

  const roughBox = trimOutlierMargins({ x: minX, y: minY, width: maxX - minX, height: maxY - minY }, canvas.width, canvas.height);
  const aspect = roughBox.width / roughBox.height;
  const area = roughBox.width * roughBox.height;
  const sourceArea = canvas.width * canvas.height;

  if (area < sourceArea * 0.08 || area > sourceArea * 0.94 || aspect < 1.2 || aspect > 2.4) {
    return null;
  }

  return roughBox;
}

function estimateCornerBrightness(data: Uint8ClampedArray, width: number, height: number): number {
  const samples = [
    grayAt(data, width, Math.round(width * 0.04), Math.round(height * 0.04)),
    grayAt(data, width, Math.round(width * 0.96), Math.round(height * 0.04)),
    grayAt(data, width, Math.round(width * 0.04), Math.round(height * 0.96)),
    grayAt(data, width, Math.round(width * 0.96), Math.round(height * 0.96))
  ];

  return samples.reduce((total, value) => total + value, 0) / samples.length;
}

function trimOutlierMargins(box: { x: number; y: number; width: number; height: number }, maxWidth: number, maxHeight: number): { x: number; y: number; width: number; height: number } {
  const horizontalTrim = box.width * 0.02;
  const verticalTrim = box.height * 0.02;

  return {
    x: Math.max(0, Math.round(box.x - horizontalTrim)),
    y: Math.max(0, Math.round(box.y - verticalTrim)),
    width: Math.min(maxWidth - box.x, Math.round(box.width + horizontalTrim * 2)),
    height: Math.min(maxHeight - box.y, Math.round(box.height + verticalTrim * 2))
  };
}

function padBoxToAspectRatio(box: { x: number; y: number; width: number; height: number }, maxWidth: number, maxHeight: number): { x: number; y: number; width: number; height: number } {
  const paddingX = box.width * 0.06;
  const paddingY = box.height * 0.1;
  let x = Math.max(0, box.x - paddingX);
  let y = Math.max(0, box.y - paddingY);
  let width = Math.min(maxWidth - x, box.width + paddingX * 2);
  let height = Math.min(maxHeight - y, box.height + paddingY * 2);
  const currentAspect = width / height;

  if (currentAspect > MYKAD_ASPECT_RATIO) {
    const targetHeight = width / MYKAD_ASPECT_RATIO;
    const delta = targetHeight - height;
    y = Math.max(0, y - delta / 2);
    height = Math.min(maxHeight - y, targetHeight);
  } else {
    const targetWidth = height * MYKAD_ASPECT_RATIO;
    const delta = targetWidth - width;
    x = Math.max(0, x - delta / 2);
    width = Math.min(maxWidth - x, targetWidth);
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  };
}

async function enhanceCanvas(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  try {
    return await enhanceWithOpenCv(canvas);
  } catch {
    return enhanceWithCanvas(canvas);
  }
}

async function enhanceWithOpenCv(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const cvModule = await import("@techstark/opencv-js");
  const cv = "default" in cvModule ? cvModule.default : cvModule;
  const src = cv.imread(canvas);
  const dst = new cv.Mat();
  const blurred = new cv.Mat();

  cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(dst, blurred, new cv.Size(3, 3), 0);
  cv.adaptiveThreshold(blurred, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 31, 8);
  cv.imshow(canvas, dst);

  src.delete();
  dst.delete();
  blurred.delete();

  return canvas;
}

function enhanceWithCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const context = getContext(canvas);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;

  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.28 + 128));
    data[index] = contrasted;
    data[index + 1] = contrasted;
    data[index + 2] = contrasted;
  }

  context.putImageData(image, 0, 0);
  return canvas;
}

function cropRegions(canvas: HTMLCanvasElement): Record<MalaysiaIcOcrRegionKey, HTMLCanvasElement> {
  return {
    icNumber: cropRegion(canvas, MYKAD_REGIONS.icNumber),
    fullName: cropRegion(canvas, MYKAD_REGIONS.fullName),
    address: cropRegion(canvas, MYKAD_REGIONS.address),
    identityBlock: cropRegion(canvas, MYKAD_FALLBACK_REGIONS.identityBlock),
    addressLine1: cropRegion(canvas, MYKAD_ADDRESS_LINE_REGIONS.addressLine1),
    addressLine2: cropRegion(canvas, MYKAD_ADDRESS_LINE_REGIONS.addressLine2),
    addressLine3: cropRegion(canvas, MYKAD_ADDRESS_LINE_REGIONS.addressLine3),
    addressLine4: cropRegion(canvas, MYKAD_ADDRESS_LINE_REGIONS.addressLine4)
  };
}

function createRegionVariants(
  originalRegions: Record<MalaysiaIcOcrRegionKey, HTMLCanvasElement>,
  enhancedRegions: Record<MalaysiaIcOcrRegionKey, HTMLCanvasElement>
): Record<MalaysiaIcOcrRegionKey, HTMLCanvasElement[]> {
  return {
    icNumber: [
      makeReadableCrop(originalRegions.icNumber, 3, 1.35, false),
      makeReadableCrop(enhancedRegions.icNumber, 3, 1, true)
    ],
    fullName: [
      makeReadableCrop(originalRegions.fullName, 3, 1.25, false),
      makeReadableCrop(originalRegions.identityBlock, 2.4, 1.2, false),
      makeReadableCrop(enhancedRegions.fullName, 3, 1, true)
    ],
    address: [
      makeReadableCrop(originalRegions.address, 3, 1.3, false),
      makeReadableCrop(originalRegions.identityBlock, 2.6, 1.25, false),
      makeReadableCrop(enhancedRegions.address, 3, 1, true)
    ],
    identityBlock: [
      makeReadableCrop(originalRegions.identityBlock, 2.8, 1.25, false),
      makeReadableCrop(enhancedRegions.identityBlock, 2.8, 1, true)
    ],
    addressLine1: [
      makeReadableCrop(originalRegions.addressLine1, 5, 1.35, false),
      makeReadableCrop(enhancedRegions.addressLine1, 5, 1, true)
    ],
    addressLine2: [
      makeReadableCrop(originalRegions.addressLine2, 5, 1.35, false),
      makeReadableCrop(enhancedRegions.addressLine2, 5, 1, true)
    ],
    addressLine3: [
      makeReadableCrop(originalRegions.addressLine3, 5, 1.35, false),
      makeReadableCrop(enhancedRegions.addressLine3, 5, 1, true)
    ],
    addressLine4: [
      makeReadableCrop(originalRegions.addressLine4, 5, 1.35, false),
      makeReadableCrop(enhancedRegions.addressLine4, 5, 1, true)
    ]
  };
}

function makeReadableCrop(source: HTMLCanvasElement, scale: number, contrast: number, threshold: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const context = getContext(canvas);

  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;

  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
    const value = threshold ? (contrasted > 145 ? 255 : 0) : contrasted;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }

  context.putImageData(image, 0, 0);
  return canvas;
}

function cropRegion(source: HTMLCanvasElement, region: MalaysiaIcRegion): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const context = getContext(canvas);
  const sx = Math.round(source.width * region.x);
  const sy = Math.round(source.height * region.y);
  const sw = Math.round(source.width * region.width);
  const sh = Math.round(source.height * region.height);

  canvas.width = sw;
  canvas.height = sh;
  context.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);

  return canvas;
}

function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const context = getContext(canvas);

  canvas.width = source.width;
  canvas.height = source.height;
  context.drawImage(source, 0, 0);

  return canvas;
}

function assessImageQuality(canvas: HTMLCanvasElement): MalaysiaIcQualityReport {
  const context = getContext(canvas);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  let brightnessTotal = 0;
  let edgeTotal = 0;
  const sampleStep = 24;

  for (let y = sampleStep; y < canvas.height - sampleStep; y += sampleStep) {
    for (let x = sampleStep; x < canvas.width - sampleStep; x += sampleStep) {
      const center = grayAt(image.data, canvas.width, x, y);
      const right = grayAt(image.data, canvas.width, x + 1, y);
      const bottom = grayAt(image.data, canvas.width, x, y + 1);
      brightnessTotal += center;
      edgeTotal += Math.abs(center - right) + Math.abs(center - bottom);
    }
  }

  const sampleCount = Math.max(1, Math.floor((canvas.width / sampleStep) * (canvas.height / sampleStep)));
  const brightness = brightnessTotal / sampleCount;
  const blurScore = edgeTotal / sampleCount;
  const warnings: string[] = [];

  if (canvas.width < 800 || canvas.height < 450) {
    warnings.push("The IC image resolution may be too low for accurate extraction.");
  }
  if (blurScore < 7) {
    warnings.push("The IC image may be too blurry for accurate extraction.");
  }
  if (brightness < 55) {
    warnings.push("The IC image may be too dark for accurate extraction.");
  }
  if (brightness > 220) {
    warnings.push("The IC image may be too bright for accurate extraction.");
  }

  return {
    ok: warnings.length === 0,
    warnings,
    brightness,
    blurScore,
    width: canvas.width,
    height: canvas.height
  };
}

function grayAt(data: Uint8ClampedArray, width: number, x: number, y: number): number {
  const index = (y * width + x) * 4;
  return data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
}

function getFallbackBoundary(canvas: HTMLCanvasElement): Point[] {
  return [
    { x: 0, y: 0 },
    { x: canvas.width, y: 0 },
    { x: canvas.width, y: canvas.height },
    { x: 0, y: canvas.height }
  ];
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  return context;
}
