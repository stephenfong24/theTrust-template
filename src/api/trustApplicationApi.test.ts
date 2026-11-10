import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "./apiClient";
import { trustApplicationApi } from "./trustApplicationApi";

vi.mock("./apiClient", () => ({ default: { put: vi.fn() } }));

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
