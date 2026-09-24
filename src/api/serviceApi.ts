import apiClient, { withJsonContentType } from "./apiClient";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code: string;
  Data: TData;
}

export interface SendOtpRequest {
  MerchantID: string;
  UserID: number;
  ActionType: "TRUST_MEMBER_REGISTRATION" | "TRUST_RESET_PASSWORD" | "TRUST_SHARED_PROFILE" | "TRUST_CHANGE_EMAIL";
  SendMethod: "OTP_MAIL";
  ReceiverAddress: string;
}

const merchantId = import.meta.env.VITE_MERCHANT_ID;

export const serviceApi = {
  async sendRegistrationOtp(receiverAddress: string) {
    if (!merchantId) {
      throw new Error("Merchant configuration is missing.");
    }

    const data: SendOtpRequest = {
      MerchantID: merchantId,
      UserID: 0,
      ActionType: "TRUST_MEMBER_REGISTRATION",
      SendMethod: "OTP_MAIL",
      ReceiverAddress: receiverAddress
    };

    const response = await apiClient.post<ApiEnvelope<null>>("/service/send-otp", data, withJsonContentType(data));
    return unwrapServiceResponse(response.data);
  },

  async sendChangeEmailOtp(receiverAddress: string, userId: number) {
    if (!merchantId) {
      throw new Error("Merchant configuration is missing.");
    }

    const data: SendOtpRequest = {
      MerchantID: merchantId,
      UserID: userId,
      ActionType: "TRUST_CHANGE_EMAIL",
      SendMethod: "OTP_MAIL",
      ReceiverAddress: receiverAddress
    };

    const response = await apiClient.post<ApiEnvelope<null>>("/service/send-otp", data, withJsonContentType(data));
    return unwrapServiceResponse(response.data);
  }
};

function unwrapServiceResponse<TData>(response: ApiEnvelope<TData>) {
  if (response.Status !== 0) {
    throw new Error(response.Message || "API request failed.");
  }

  return response;
}
