import { describe, expect, it } from "vitest";
import {
  calculateFieldConfidence,
  classifyMalaysiaIcTextCandidates,
  extractMalaysiaIcNumber,
  extractMalaysiaPostcode,
  extractMalaysiaState,
  normalizeAddressWithStateFromIc,
  normalizeMalaysiaIcAddress,
  normalizeMalaysiaIcName,
  parseMalaysiaIcIdentityBlock
} from "./malaysiaIcParser";
import { validateMalaysiaIc } from "./malaysiaIcValidator";

describe("Malaysia IC parsing", () => {
  it.each([
    ["810220-10-1234", "810220-10-1234"],
    ["810220 10 1234", "810220-10-1234"],
    ["810220101234", "810220-10-1234"],
    ["81O220-1O-1234", "810220-10-1234"],
    ["123456-78-910", "123456-78-910"]
  ])("normalizes %s", (input, expected) => {
    expect(extractMalaysiaIcNumber(input)).toBe(expected);
  });

  it("accepts demo-shaped IC values but marks them invalid for review", () => {
    const validation = validateMalaysiaIc("123456-78-910");

    expect(validation.normalized).toBe("123456-78-910");
    expect(validation.hasValidFormat).toBe(true);
    expect(validation.isValid).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(validateMalaysiaIc("811320-10-1234").isValid).toBe(false);
  });

  it("cleans names conservatively", () => {
    expect(normalizeMalaysiaIcName("KAD PENGENALAN\nFONG  HUANG-LIANG @ TAN\nWARGANEGARA")).toBe("FONG HUANG-LIANG @ TAN");
  });

  it("cleans addresses while preserving useful separators", () => {
    expect(normalizeMalaysiaIcAddress("NO 12 JALAN ABC 3\nTAMAN XYZ\n43300 SERI KEMBANGAN\nSELANGOR")).toBe("NO 12 JALAN ABC 3, TAMAN XYZ, 43300 SERI KEMBANGAN, SELANGOR");
  });

  it("extracts postcode and state", () => {
    const address = "NO 12 JALAN ABC 3, 43300 SERI KEMBANGAN, SELANGOR";
    expect(extractMalaysiaPostcode(address)).toBe("43300");
    expect(extractMalaysiaState(address)).toBe("SELANGOR");
  });

  it("returns low confidence for missing values", () => {
    expect(calculateFieldConfidence(92, null)).toBe(0);
  });

  it("extracts name and address from a noisy MyKad identity block", () => {
    const rawText = "ABD RAUF BIN HAMSAH\n\nKAMPUNG MASJID I\nP O BOX 42 T\n89007 KENINGAU T IS\nSCARAL\n";
    const parsed = parseMalaysiaIcIdentityBlock(rawText);

    expect(parsed.fullName).toBe("ABD RAUF BIN HAMSAH");
    expect(parsed.address).toBe("KAMPUNG MASJID, P O BOX 42, 89007 KENINGAU, SCARAL");
  });

  it("can correct a low-confidence state line using the IC place code when present", () => {
    expect(normalizeAddressWithStateFromIc("KAMPUNG MASJID, P O BOX 42, 89007 KENINGAU, SCARAL", "460619-12-5087")).toBe("KAMPUNG MASJID, P O BOX 42, 89007 KENINGAU, SABAH");
  });

  it("cleans postcode and state OCR fragments in address text", () => {
    const address = normalizeMalaysiaIcAddress("KAMPUNG MASJID\nB9007 KENINGAU F\nFKES\nSABAH OL");

    expect(normalizeAddressWithStateFromIc(address, "460619-12-5087")).toBe("KAMPUNG MASJID, 89007 KENINGAU, SABAH");
  });

  it("classifies pooled OCR text into the closest IC fields", () => {
    const result = classifyMalaysiaIcTextCandidates([
      { source: "fullName", text: "EE EFL TI\nARP DALIC DIN LIARMCALL", confidence: 37 },
      { source: "address", text: "ABD RAUF BIN HAMSAH\nKAMPUNG MASJID\nP O BOX 42\n89007 KENINGAU\nSABAH OL", confidence: 70 },
      { source: "fullImage", text: "460619- 12-5087\nABD RAUF BIN HAMSAH\nB9007 KENINGAU", confidence: 62 }
    ]);

    expect(result.icNumber).toBe("460619-12-5087");
    expect(result.fullName).toBe("ABD RAUF BIN HAMSAH");
    expect(result.address).toBe("KAMPUNG MASJID, P O BOX 42, 89007 KENINGAU, SABAH");
  });

  it("prefers line-level address OCR when paragraph OCR is noisy", () => {
    const result = classifyMalaysiaIcTextCandidates([
      { source: "address", text: "KAMPUNG MASJID, 8 1007 KENINGAU 1 5 0 PA, 9 F, SABAH", confidence: 58 },
      { source: "addressLines", text: "KAMPUNG MASJID\nP0 BOX 42\n8 1007 KENINGAU\nSABAH OL", confidence: 64 },
      { source: "fullImage", text: "460619-12-5087\nABD RAUF BIN HAMSAH", confidence: 62 }
    ]);

    expect(result.address).toBe("KAMPUNG MASJID, P O BOX 42, 89007 KENINGAU, SABAH");
  });
});
