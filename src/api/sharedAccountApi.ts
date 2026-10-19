import apiClient, { withJsonContentType } from "./apiClient";

interface ApiEnvelope<T> {
  Status: number;
  Message: string;
  Data: T;
}

interface SharedAccountValidation {
  TargetMerchantID: string;
  Sponsor: string;
  SponsorName: string;
}

function registrationDetails(email: string, sponsor: string) {
  const merchantId = import.meta.env.VITE_MERCHANT_ID;
  if (!merchantId) throw new Error("Merchant configuration is missing.");
  return { MerchantID: merchantId, Email: email.trim().toLowerCase(), Sponsor: sponsor.trim() };
}

function unwrap<T>(response: ApiEnvelope<T>) {
  if (response.Status !== 0) throw new Error(response.Message || "Shared account request failed.");
  return response.Data;
}

export const sharedAccountApi = {
  async validate(email: string, sponsor: string) {
    const data = registrationDetails(email, sponsor);
    const response = await apiClient.post<ApiEnvelope<SharedAccountValidation>>("/shared-account/validate", data, withJsonContentType(data));
    return unwrap(response.data);
  },

  async complete(email: string, sponsor: string, otp: string) {
    const data = { ...registrationDetails(email, sponsor), OTP: otp.trim() };
    const response = await apiClient.post<ApiEnvelope<{ Success: boolean }>>("/shared-account/complete", data, withJsonContentType(data));
    const result = unwrap(response.data);
    if (!result?.Success) throw new Error("Registration could not be completed.");
    return result;
  }
};
