import { validateMalaysiaIc } from "./malaysiaIcValidator";

const NUMERIC_OCR_REPLACEMENTS: Record<string, string> = {
  O: "0",
  I: "1",
  L: "1",
  S: "5",
  B: "8"
};

const MALAYSIA_STATES = [
  "JOHOR",
  "KEDAH",
  "KELANTAN",
  "MELAKA",
  "NEGERI SEMBILAN",
  "PAHANG",
  "PERAK",
  "PERLIS",
  "PULAU PINANG",
  "SABAH",
  "SARAWAK",
  "SELANGOR",
  "TERENGGANU",
  "WILAYAH PERSEKUTUAN"
];

const ADDRESS_HINT_PATTERN = /\b(?:NO|LOT|JALAN|LORONG|TAMAN|KAMPUNG|KG|PERSIARAN|P O BOX|PO BOX|BOX|BLOK|TINGKAT|POSKOD|\d{5})\b/;
const NOISE_PATTERN = /\b(?:KAD|PENGENALAN|IDENTITY|CARD|MYKAD|MALAYSIA|WARGANEGARA|LELAKI|PEREMPUAN|ISLAM|FAKE|TEMPLATE)\b/;

export interface MalaysiaIcTextCandidate {
  source: string;
  text: string;
  confidence: number;
}

export interface ClassifiedMalaysiaIcText {
  icNumber: string | null;
  fullName: string | null;
  address: string | null;
  confidence: {
    icNumber: number;
    fullName: number;
    address: number;
  };
}

export function extractMalaysiaIcNumber(text: string): string | null {
  const numericText = text
    .toUpperCase()
    .replace(/[OILSB]/g, (char) => NUMERIC_OCR_REPLACEMENTS[char])
    .replace(/[^\d\s-]/g, " ");

  const formattedCandidate = numericText.match(/\b\d{6}\s*[- ]\s*\d{2}\s*[- ]\s*\d{3,4}\b/);
  const compactCandidate = numericText.match(/\b\d{11,12}\b/);
  const candidate = formattedCandidate?.[0] ?? compactCandidate?.[0] ?? null;

  if (!candidate) {
    return null;
  }

  return validateMalaysiaIc(candidate).normalized;
}

export function classifyMalaysiaIcTextCandidates(candidates: MalaysiaIcTextCandidate[]): ClassifiedMalaysiaIcText {
  const icNumber = chooseBestCandidate(
    candidates.map((candidate) => {
      const value = extractMalaysiaIcNumber(candidate.text);
      const validation = validateMalaysiaIc(value);

      return {
        value,
        confidence: candidate.confidence,
        score: value ? candidate.confidence + (validation.isValid ? 80 : 25) + (candidate.source.includes("icNumber") ? 15 : 0) : 0
      };
    })
  );
  const fullName = chooseBestCandidate(
    candidates.flatMap((candidate) => {
      const block = parseMalaysiaIcIdentityBlock(candidate.text);
      const directName = normalizeMalaysiaIcName(candidate.text);

      return [block.fullName, directName].map((value) => ({
        value,
        confidence: candidate.confidence,
        score: value ? scoreNameCandidate(value, candidate.confidence, candidate.source) : 0
      }));
    })
  );
  const address = chooseBestCandidate(
    candidates.flatMap((candidate) => {
      const block = parseMalaysiaIcIdentityBlock(candidate.text);
      const directAddress = normalizeMalaysiaIcAddress(candidate.text);

      return [block.address, directAddress].map((value) => {
        const normalized = normalizeAddressWithStateFromIc(value, icNumber.value);

        return {
          value: normalized,
          confidence: candidate.confidence,
          score: normalized ? scoreAddressCandidate(normalized, candidate.confidence, candidate.source) : 0
        };
      });
    })
  );

  return {
    icNumber: icNumber.value,
    fullName: fullName.value,
    address: address.value,
    confidence: {
      icNumber: icNumber.confidence,
      fullName: fullName.confidence,
      address: address.confidence
    }
  };
}

export function normalizeMalaysiaIcName(text: string): string | null {
  const lines = getCleanIdentityLines(text)
    .filter((line) => !ADDRESS_HINT_PATTERN.test(line))
    .filter((line) => !/\d/.test(line));

  const bestLine = lines.sort((a, b) => b.length - a.length)[0];
  return bestLine && bestLine.length >= 3 ? bestLine : null;
}

export function normalizeMalaysiaIcAddress(text: string): string | null {
  const lines = getCleanIdentityLines(text);
  const firstAddressIndex = lines.findIndex((line) => ADDRESS_HINT_PATTERN.test(line));
  const addressLines = firstAddressIndex >= 0 ? lines.slice(firstAddressIndex) : lines.filter((line) => /\d/.test(line));

  if (!addressLines.length) {
    return null;
  }

  return normalizeAddressLines(addressLines).join(", ");
}

export function parseMalaysiaIcIdentityBlock(text: string): { fullName: string | null; address: string | null } {
  const lines = getCleanIdentityLines(text);
  const firstAddressIndex = lines.findIndex((line) => ADDRESS_HINT_PATTERN.test(line));
  const nameLines = firstAddressIndex > 0 ? lines.slice(0, firstAddressIndex) : lines.filter((line) => !ADDRESS_HINT_PATTERN.test(line) && !/\d/.test(line));
  const addressLines = firstAddressIndex >= 0 ? lines.slice(firstAddressIndex) : lines.filter((line) => ADDRESS_HINT_PATTERN.test(line) || /\d/.test(line));

  return {
    fullName: nameLines.length ? normalizeMalaysiaIcName(nameLines.join("\n")) : null,
    address: addressLines.length ? normalizeAddressLines(addressLines).join(", ") : null
  };
}

export function extractMalaysiaPostcode(text: string): string | null {
  return text.match(/\b\d{5}\b/)?.[0] ?? null;
}

export function extractMalaysiaState(text: string): string | null {
  const normalized = text.toUpperCase().replace(/[^A-Z\s]/g, " ").replace(/\s+/g, " ");
  const exact = MALAYSIA_STATES.find((state) => normalized.includes(state));

  if (exact) {
    return exact;
  }

  const words = normalized.trim().split(" ");
  for (const state of MALAYSIA_STATES) {
    if (levenshtein(words.slice(-3).join(" "), state) <= 2) {
      return state;
    }
  }

  return null;
}

export function normalizeAddressWithStateFromIc(address: string | null, icNumber: string | null): string | null {
  if (!address || !icNumber) {
    return address;
  }

  const birthState = getMalaysiaBirthStateFromIc(icNumber);
  if (!birthState) {
    return address;
  }

  const lines = address.split(",").map((line) => line.trim()).filter(Boolean);
  const stateLineIndex = lines.findIndex((line) => line.includes(birthState) || (!/\d/.test(line) && levenshtein(line.replace(/[^A-Z]/g, ""), birthState) <= 4));

  if (stateLineIndex >= 0) {
    lines[stateLineIndex] = birthState;
    return lines.slice(0, stateLineIndex + 1).join(", ");
  }

  const lastLine = lines[lines.length - 1];
  if (lastLine && /^[A-Z]{3,8}$/.test(lastLine) && levenshtein(lastLine, birthState) <= 5) {
    lines[lines.length - 1] = birthState;
    return lines.join(", ");
  }

  return address;
}

export function calculateFieldConfidence(ocrConfidence: number, value: string | null, validationAdjustment = 0): number {
  if (!value) {
    return 0;
  }

  const normalizedConfidence = Math.max(0, Math.min(1, ocrConfidence / 100));
  return roundConfidence(Math.max(0, Math.min(1, normalizedConfidence + validationAdjustment)));
}

export function roundConfidence(value: number): number {
  return Math.round(value * 100) / 100;
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, (_, index) => [index]);

  for (let column = 0; column <= a.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= b.length; row += 1) {
    for (let column = 1; column <= a.length; column += 1) {
      matrix[row][column] = b[row - 1] === a[column - 1]
        ? matrix[row - 1][column - 1]
        : Math.min(matrix[row - 1][column - 1] + 1, matrix[row][column - 1] + 1, matrix[row - 1][column] + 1);
    }
  }

  return matrix[b.length][a.length];
}

function getCleanIdentityLines(text: string): string[] {
  return text
    .toUpperCase()
    .replace(/\bP\s*O\s*BOX\b/g, "P O BOX")
    .split(/\r?\n/)
    .map((line) => line.replace(/[^A-Z0-9 '\-@,./]/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2)
    .filter((line) => !NOISE_PATTERN.test(line))
    .filter((line) => !extractMalaysiaIcNumber(line));
}

function chooseBestCandidate(candidates: Array<{ value: string | null; confidence: number; score: number }>): { value: string | null; confidence: number } {
  const best = candidates
    .filter((candidate) => candidate.value)
    .sort((a, b) => b.score - a.score)[0];

  return {
    value: best?.value ?? null,
    confidence: best?.confidence ?? 0
  };
}

function scoreNameCandidate(value: string, confidence: number, source: string): number {
  const words = value.split(/\s+/).filter(Boolean);
  const hasAddressNoise = ADDRESS_HINT_PATTERN.test(value) || /\d/.test(value);
  const shortWordPenalty = words.filter((word) => word.length <= 2 && !["A/L", "A/P", "AL", "AP", "BIN", "BINTI"].includes(word)).length * 5;
  const sourceBonus = source.includes("fullName") || source.includes("identityBlock") ? 15 : 0;

  return confidence + words.length * 8 + Math.min(value.length, 40) + sourceBonus - shortWordPenalty - (hasAddressNoise ? 80 : 0);
}

function scoreAddressCandidate(value: string, confidence: number, source: string): number {
  const hasPostcode = Boolean(extractMalaysiaPostcode(value));
  const hasState = Boolean(extractMalaysiaState(value));
  const addressHints = (value.match(ADDRESS_HINT_PATTERN) ?? []).length;
  const lineCount = value.split(",").filter(Boolean).length;
  const sourceBonus = source.includes("addressLines") ? 45 : source.includes("address") || source.includes("identityBlock") ? 15 : 0;
  const nameLikePenalty = !hasPostcode && !hasState && !ADDRESS_HINT_PATTERN.test(value) ? 70 : 0;

  return confidence + addressHints * 14 + lineCount * 5 + sourceBonus + (hasPostcode ? 30 : 0) + (hasState ? 25 : 0) - nameLikePenalty;
}

function normalizeAddressLines(lines: string[]): string[] {
  const normalized = lines
    .map((line) => line
      .replace(/\bKAMPUNG\s+MASJID\s+[I1]\b/g, "KAMPUNG MASJID")
      .replace(/\bP\s*O\s*BOX\b/g, "P O BOX")
      .replace(/\bP\s+0\s+BOX\b/g, "P O BOX")
      .replace(/\bP\s*[0O]\s*B[0O]X\s*(\d{1,4})\b/g, "P O BOX $1")
      .replace(/\bP0\s*B[0O]X\s*(\d{1,4})\b/g, "P O BOX $1")
      .replace(/\bB(?=\d{4}\b)/g, "8")
      .replace(/\b8\s*[19]\s*007\b/g, "89007")
      .replace(/\b(SABAH|SARAWAK|SELANGOR|JOHOR|KEDAH|KELANTAN|MELAKA|PAHANG|PERAK|PERLIS)\b.*$/g, "$1")
      .replace(/\s+[TI1]\s+IS$/g, "")
      .replace(/(?<=\d{5}\s+[A-Z ]+)\s+[A-Z]$/g, "")
      .replace(/\s+[TI1]$/g, "")
      .replace(/\s+/g, " ")
      .trim())
    .filter(Boolean);

  return normalized.filter((line, index) => {
    const previousLine = normalized[index - 1];
    const isShortFragment = /^[A-Z]{2,4}$/.test(line) && !MALAYSIA_STATES.includes(line);

    return !(isShortFragment && previousLine && /\b\d{5}\b/.test(previousLine));
  });
}

function getMalaysiaBirthStateFromIc(icNumber: string): string | null {
  const placeCode = icNumber.replace(/\D/g, "").slice(6, 8);
  const placeMap: Record<string, string> = {
    "01": "JOHOR",
    "21": "JOHOR",
    "22": "JOHOR",
    "23": "JOHOR",
    "24": "JOHOR",
    "02": "KEDAH",
    "25": "KEDAH",
    "26": "KEDAH",
    "27": "KEDAH",
    "03": "KELANTAN",
    "28": "KELANTAN",
    "29": "KELANTAN",
    "04": "MELAKA",
    "30": "MELAKA",
    "05": "NEGERI SEMBILAN",
    "31": "NEGERI SEMBILAN",
    "59": "NEGERI SEMBILAN",
    "06": "PAHANG",
    "32": "PAHANG",
    "33": "PAHANG",
    "07": "PULAU PINANG",
    "34": "PULAU PINANG",
    "35": "PULAU PINANG",
    "08": "PERAK",
    "36": "PERAK",
    "37": "PERAK",
    "38": "PERAK",
    "39": "PERAK",
    "09": "PERLIS",
    "40": "PERLIS",
    "10": "SELANGOR",
    "41": "SELANGOR",
    "42": "SELANGOR",
    "43": "SELANGOR",
    "44": "SELANGOR",
    "11": "TERENGGANU",
    "45": "TERENGGANU",
    "46": "TERENGGANU",
    "12": "SABAH",
    "47": "SABAH",
    "48": "SABAH",
    "49": "SABAH",
    "13": "SARAWAK",
    "50": "SARAWAK",
    "51": "SARAWAK",
    "52": "SARAWAK",
    "53": "SARAWAK",
    "14": "WILAYAH PERSEKUTUAN",
    "54": "WILAYAH PERSEKUTUAN",
    "55": "WILAYAH PERSEKUTUAN",
    "56": "WILAYAH PERSEKUTUAN",
    "57": "WILAYAH PERSEKUTUAN"
  };

  return placeMap[placeCode] ?? null;
}
