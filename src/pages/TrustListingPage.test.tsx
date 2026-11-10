import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ComplimentaryBenefitCard, mapComplimentaryBenefit } from "./TrustListingPage";

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
