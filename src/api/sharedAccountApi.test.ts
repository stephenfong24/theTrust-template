import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "./apiClient";
import { sharedAccountApi } from "./sharedAccountApi";

vi.mock("./apiClient", () => ({
  default: { post: vi.fn() },
  withJsonContentType: () => ({ headers: { "Content-Type": "application/json" } })
}));

describe("shared account registration API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_MERCHANT_ID", "814152");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("validates the existing email against the target merchant and signup sponsor", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { Status: 0, Data: { Sponsor: "V010203" } } });
    await sharedAccountApi.validate(" Person@Example.com ", " V010203 ");
    expect(apiClient.post).toHaveBeenCalledWith("/shared-account/validate", {
      MerchantID: "814152", Email: "person@example.com", Sponsor: "V010203"
    }, expect.any(Object));
  });

  it("does not treat an HTTP 200 business validation error as success", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { Status: 4, Message: "Unable to validate shared registration details.", Data: null } });
    await expect(sharedAccountApi.validate("person@example.com", "V010203")).rejects.toThrow("Unable to validate shared registration details.");
  });

  it("completes with the same identity and sponsor plus the OTP", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { Status: 0, Data: { Success: true } } });
    await sharedAccountApi.complete("person@example.com", "V010203", "123456");
    expect(apiClient.post).toHaveBeenCalledWith("/shared-account/complete", {
      MerchantID: "814152", Email: "person@example.com", Sponsor: "V010203", OTP: "123456"
    }, expect.any(Object));
  });

  it("rejects unsuccessful completion instead of redirecting as registered", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { Status: 0, Data: { Success: false } } });
    await expect(sharedAccountApi.complete("person@example.com", "V010203", "123456")).rejects.toThrow("Registration could not be completed.");
  });

  it("sends the shared-account OTP with the controller's SendMethod field", async () => {
    const { serviceApi } = await import("./serviceApi");
    vi.mocked(apiClient.post).mockResolvedValue({ data: { Status: 0, Data: null } });
    await serviceApi.sendSharedAccountOtp("person@example.com");
    expect(apiClient.post).toHaveBeenCalledWith("/service/send-otp", {
      MerchantID: "814152", UserID: 0, ActionType: "TRUST_SHARE_ACCOUNT", SendMethod: "OTP_MAIL", ReceiverAddress: "person@example.com"
    }, expect.any(Object));
  });
});
