import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "./apiClient";
import { trustApplicationApi } from "./trustApplicationApi";

vi.mock("./apiClient", () => ({ default: { put: vi.fn(), post: vi.fn() } }));

describe("complimentary benefit redemption API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates the benefit RowID with the final numeric status", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { Status: 0, Data: null } });
    await trustApplicationApi.redeemComplimentaryBenefit(83);
    expect(apiClient.put).toHaveBeenCalledExactlyOnceWith(
      "/trust-application/complimentary-benefit/83/redemption-status",
      { RedemptionStatus: 1 }
    );
  });

  it.each([1, undefined, "0"])("rejects an envelope whose Status is %s", async (status) => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { Status: status, Message: "Benefit is inactive." } });
    await expect(trustApplicationApi.redeemComplimentaryBenefit(83)).rejects.toThrow("Benefit is inactive.");
  });

  it("preserves transport error messages", async () => {
    vi.mocked(apiClient.put).mockRejectedValue(new Error("Application must be COMPLETED."));
    await expect(trustApplicationApi.redeemComplimentaryBenefit(83)).rejects.toThrow("Application must be COMPLETED.");
  });
});

describe("revoke rejection API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses TrustID and sends only the trimmed remark, returning the restored status", async () => {
    const result = { TrustID: 42, PreviousStatus: "REJECTED", ApplicationStatus: "STAMPING" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: { Status: 0, Data: result } });
    await expect(trustApplicationApi.revokeRejection(42, { Remark: "  Documents corrected. \n" })).resolves.toEqual(result);
    expect(apiClient.post).toHaveBeenCalledExactlyOnceWith(
      "/trust-application/42/revoke-rejection", { Remark: "Documents corrected." }
    );
  });

  it("surfaces API business errors instead of treating them as success", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { Status: 1, Message: "Application is no longer rejected." } });
    await expect(trustApplicationApi.revokeRejection(42, { Remark: "Corrected" })).rejects.toThrow("Application is no longer rejected.");
  });

  it("preserves transport errors for display and permits retry", async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("Connection failed."))
      .mockResolvedValueOnce({ data: { Status: 0, Data: { TrustID: 42, ApplicationStatus: "SENT_OUT" } } });
    await expect(trustApplicationApi.revokeRejection(42, { Remark: "Corrected" })).rejects.toThrow("Connection failed.");
    await expect(trustApplicationApi.revokeRejection(42, { Remark: "Corrected" })).resolves.toMatchObject({ ApplicationStatus: "SENT_OUT" });
  });
});
