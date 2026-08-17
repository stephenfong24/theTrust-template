# Malaysia IC OCR

Step 1 includes a browser-only Malaysian MyKad helper. Users can still complete the form manually; OCR only suggests values and never advances the wizard.

## Architecture

- `MalaysiaIcUploader.tsx` owns file selection, mobile camera capture, preview, progress, and user-facing errors.
- `malaysiaIcOcr.service.ts` owns the Tesseract worker lifecycle and field-level OCR orchestration.
- `malaysiaIcImageProcessor.ts` normalizes the image, performs lightweight quality checks, applies OpenCV/canvas preprocessing, and crops MyKad text regions.
- `malaysiaIcParser.ts` extracts and normalizes IC number, full name, address, postcode, and state.
- `malaysiaIcValidator.ts` validates `YYMMDD-##-####` format and plausible dates.

## Preprocessing

The original image is used only for preview. OCR first tries to isolate the MyKad area from larger photos, normalizes it to card aspect ratio, then creates internal canvas copies for grayscale/contrast/threshold preprocessing and text-region crops. It tries a blue-card detector first and then a monochrome edge/content detector for photostat copies or black-and-white scans. OpenCV.js is attempted first; if it cannot load, canvas-based preprocessing is used.

## Region Tuning

MyKad crop coordinates are centralized in `MYKAD_REGIONS` inside `malaysiaIcImageProcessor.ts`. Coordinates are percentages of the normalized card image, which keeps tuning independent from source image size.

## Confidence

Confidence combines Tesseract confidence with conservative validation adjustments. IC number confidence receives extra weight only when the normalized value also passes format and date checks. Thresholds used by the UI are:

- High: `>= 0.85`
- Needs review: `0.65 - 0.84`
- Low: `< 0.65`

## Privacy

OCR runs locally in the browser. The IC image is not sent to OpenAI, an external OCR API, analytics, localStorage, or sessionStorage. Preview object URLs are revoked when replaced and on unmount. Raw OCR text is only available in the development-only diagnostics panel.

## Limitations

Card boundary detection uses a lightweight MyKad-blue color heuristic plus a grayscale edge/content fallback for photocopies, then falls back to the normalized full image if a confident card area is not isolated. The configured MyKad regions are practical defaults and should be tuned with representative images in development diagnostics.

## Dependencies

- `tesseract.js`
- `@techstark/opencv-js`
- `vitest` for parser and validator tests
