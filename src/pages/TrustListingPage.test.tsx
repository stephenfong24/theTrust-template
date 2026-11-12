import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { canRevokeTrustApplicationRejection, ComplimentaryBenefitCard, getEnabledDecisionStatuses, mapComplimentaryBenefit, RevokeRejectionModal, validateRevocationRemark } from "./TrustListingPage";
import type { TrustApplicationListItem } from "../api/trustApplicationApi";

describe("Decision status availability", () => {
  it("allows rejection only while payment approval is pending", () => {
    expect(getEnabledDecisionStatuses("PENDING_PAYMENT_APPROVAL")).toEqual(["REJECTED"]);
    expect(getEnabledDecisionStatuses(" pending_payment_approval ")).toEqual(["REJECTED"]);
    for (const status of ["DRAFT", "PAYMENT_APPROVED", "PENDING_ADMIN_APPROVAL", "SENT_OUT", "STAMPING", "COMPLETED", "EARLY_WITHDRAWN", "MATURED", "REJECTED", "", "UNKNOWN"]) {
      expect(getEnabledDecisionStatuses(status)).not.toContain("REJECTED");
    }
  });

  it.each([
    ["PAYMENT_APPROVED", "PENDING_ADMIN_APPROVAL"],
    ["PENDING_ADMIN_APPROVAL", "SENT_OUT"],
    ["SENT_OUT", "STAMPING"],
    ["STAMPING", "COMPLETED"],
    ["COMPLETED", "EARLY_WITHDRAWN"]
  ])("preserves the existing transition from %s to %s", (currentStatus, nextStatus) => {
    expect(getEnabledDecisionStatuses(currentStatus)).toEqual([nextStatus]);
  });
});

const pendingBenefit = {
  RowID: 83,
  TrustPlanBenefitID: 15,
  BenefitName: "Free Insurance Trust",
  BenefitValue: 1800,
  RedemptionStatus: 0,
  RedemptionStatusName: "Redeemed" // Display strings must never control eligibility.
};

function renderBenefit(overrides: Record<string, unknown> = {}, role: string | null = "SA", status = "COMPLETED") {
  const benefit = mapComplimentaryBenefit({ ...pendingBenefit, ...overrides })!;
  return renderToStaticMarkup(<ComplimentaryBenefitCard benefit={benefit} userRole={role} applicationStatus={status} onRefreshDetail={vi.fn()} />);
}

describe("complimentary benefit overview", () => {
  it.each(["SA", "AD"])("allows %s to redeem a completed pending benefit", (role) => {
    const html = renderBenefit({}, role);
    expect(html).toContain("Mark as Redeemed");
    expect(html).toContain("Benefit not yet redeemed.");
    expect(html).toContain("Pending");
    expect(html).toContain("Eligible");
  });

  it.each(["AG", "AC", "OP", null])("shows a read-only status for role %s", (role) => {
    expect(renderBenefit({}, role)).not.toContain("Mark as Redeemed");
  });

  it.each(["DRAFT", "PENDING_PAYMENT_APPROVAL", "PAYMENT_APPROVED", "PENDING_ADMIN_APPROVAL", "SENT_OUT", "STAMPING", "EARLY_WITHDRAWN", "MATURED", "REJECTED"])("prevents redemption in %s", (status) => {
    expect(renderBenefit({}, "SA", status)).not.toContain("Mark as Redeemed");
  });

  it.each([null, undefined, 0, -1, 1.5, "83"])("prevents writes with invalid RowID %s", (rowId) => {
    expect(renderBenefit({ RowID: rowId })).not.toContain("Mark as Redeemed");
  });

  it("shows a final redeemed status, timestamp and the API-provided full name", () => {
    const html = renderBenefit({ RedemptionStatus: 1, RedeemedAt: "2026-11-10T14:30:00", RedeemedBy: 117, RedeemedByFullName: "Jane Tan" });
    expect(html).toContain("Complimentary benefit redeemed.");
    expect(html).toContain("Redeemed At:");
    expect(html).toContain("2026");
    expect(html).toContain("Redeemed By: Jane Tan");
    expect(html).not.toContain("Member ID");
    expect(html).not.toContain("Mark as Redeemed");
  });

  it("omits missing redemption metadata", () => {
    const html = renderBenefit({ RedemptionStatus: 1, RedeemedAt: null, RedeemedBy: 117, RedeemedByFullName: null });
    expect(html).not.toContain("Redeemed At:");
    expect(html).not.toContain("Redeemed By");
  });

  it.each([null, undefined, "0", 2])("does not treat status %s as pending", (status) => {
    const html = renderBenefit({ RedemptionStatus: status });
    expect(html).toContain("Redemption status unavailable.");
    expect(html).not.toContain("Mark as Redeemed");
  });

  it("preserves the no-benefit state", () => {
    expect(mapComplimentaryBenefit(null)).toBeNull();
    expect(mapComplimentaryBenefit({})).toBeNull();
  });
});

describe("revoke rejection listing action", () => {
  it.each(["SA", "AD"])("allows %s only on rejected applications with API permission or a missing flag", (role) => {
    expect(canRevokeTrustApplicationRejection(role, { ApplicationStatus: "REJECTED", CanRevokeRejection: true })).toBe(true);
    expect(canRevokeTrustApplicationRejection(role, { ApplicationStatus: "REJECTED" })).toBe(true);
    expect(canRevokeTrustApplicationRejection(role, { ApplicationStatus: "REJECTED", CanRevokeRejection: false })).toBe(false);
    for (const status of ["DRAFT", "PENDING_PAYMENT_APPROVAL", "PAYMENT_APPROVED", "PENDING_ADMIN_APPROVAL", "SENT_OUT", "STAMPING", "COMPLETED", "EARLY_WITHDRAWN", "MATURED", null]) {
      expect(canRevokeTrustApplicationRejection(role, { ApplicationStatus: status, CanRevokeRejection: true })).toBe(false);
    }
  });

  it.each(["AG", "OP", "AC", null, undefined])("hides the action for %s even when the API flag is true", (role) => {
    expect(canRevokeTrustApplicationRejection(role, { ApplicationStatus: "REJECTED", CanRevokeRejection: true })).toBe(false);
  });

  it("hides the action after the application returns to its previous status", () => {
    const record = { ApplicationStatus: "REJECTED", CanRevokeRejection: true };
    expect(canRevokeTrustApplicationRejection("SA", record)).toBe(true);
    expect(canRevokeTrustApplicationRejection("SA", { ...record, ApplicationStatus: "STAMPING" })).toBe(false);
  });

  it("requires a non-whitespace reason and enforces the 500 character boundary", () => {
    expect(validateRevocationRemark("")).toContain("required");
    expect(validateRevocationRemark(" \n\t ")).toContain("required");
    expect(validateRevocationRemark("Correction made")).toBe("");
    expect(validateRevocationRemark("a".repeat(500))).toBe("");
    expect(validateRevocationRemark("a".repeat(501))).toContain("500");
  });

  it("renders the existing modal with a required limited textarea and disabled initial confirmation", () => {
    const record = { TrustID: 42, TrustApplicationID: 999, ApplicationStatus: "REJECTED" } as TrustApplicationListItem;
    const html = renderToStaticMarkup(<RevokeRejectionModal record={record} onClose={vi.fn()} onRevoked={vi.fn()} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain("Revoke Rejection");
    expect(html).toContain("The application will be restored to its previous status.");
    expect(html).toContain("Reason for Revocation");
    expect(html).toMatch(/<textarea[^>]*required=""[^>]*maxLength="500"/);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""[^>]*>Confirm<\/button>/);
    expect(html).toContain("Cancel");
  });
});
