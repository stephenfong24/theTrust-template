import apiClient, { withJsonContentType } from "./apiClient";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code: string;
  Data: TData;
}

export type KycDocumentType = "NRIC_FRONT" | "NRIC_BACK" | "PASSPORT" | "SSM_CERT";

export interface RegistrationSessionData {
  SessionID: string;
  RegistrationToken: string;
  ExpiresAt: string;
  ReferralCode: string;
}

export interface CreateRegistrationSessionRequest {
  MerchantID: string;
  ReferralCode: string;
}

export interface SponsorValidationData {
  Fullname: string;
}

export interface KycUploadData {
  PublicID: string;
  FileUrl: string;
  UploadedFile: string;
}

export interface AgentAccountValidationRequest {
  MerchantID: string;
  Sponsor: string;
  Email: string;
  OTP: string;
  LoginPassword: string;
  ConfirmLoginPassword: string;
}

export interface AgentIdentityValidationRequest {
  IdentityType: string;
  IdentityId: string;
  Fullname: string;
  DateOfBirth: string;
  TinNumber: string;
  Occupation: string | null;
  IdentityFrontPublicID: string | null;
  IdentityBackPublicID: string | null;
  PassportPublicID: string | null;
  SSMPublicID: string | null;
}

export interface AgentContactValidationRequest {
  Country_Domain: string;
  CountryMobileCode: string;
  Mobile: string;
  Postcode: string;
  State: string;
  City: string;
  Address_1: string;
  Address_2: string;
}

export interface AgentBankValidationRequest {
  BankName: string;
  AccountName: string;
  AccountNumber: string;
}

export interface AgentRegisterRequest extends AgentContactValidationRequest {
  MerchantID: string;
  RoleCode: "AG";
  Sponsor: string;
  Username: string;
  Fullname: string;
  DateOfBirth: string;
  IdentityType: string;
  IdentityID: string;
  Occupation: string | null;
  TinNumber: string;
  LoginPassword: string;
  ConfirmLoginPassword: string;
  BankName: string;
  AccountName: string;
  AccountNumber: string;
  IdentityFrontPublicID: string | null;
  IdentityBackPublicID: string | null;
  PassportPublicID: string | null;
  SSMPublicID: string | null;
  OTP: string;
}

const merchantId = import.meta.env.VITE_MERCHANT_ID;

export const registerApi = {
  getMerchantId() {
    if (!merchantId) {
      throw new Error("Merchant configuration is missing.");
    }

    return merchantId;
  },

  async validateSponsor(referralCode: string) {
    const response = await apiClient.get<ApiEnvelope<SponsorValidationData>>("/register/validate-sponsor", {
      params: {
        merchantId: this.getMerchantId(),
        sponsor: referralCode
      }
    });
    return unwrapRegisterResponse(response.data).Data;
  },

  async validateAccount(data: AgentAccountValidationRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/register/validate-account", data, withJsonContentType(data));
    return unwrapRegisterResponse(response.data);
  },

  async validateIdentity(data: AgentIdentityValidationRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/register/validate-identity", data, withJsonContentType(data));
    return unwrapRegisterResponse(response.data);
  },

  async validateContact(data: AgentContactValidationRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/register/validate-contact", data, withJsonContentType(data));
    return unwrapRegisterResponse(response.data);
  },

  async validateBank(data: AgentBankValidationRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/register/validate-bank", data, withJsonContentType(data));
    return unwrapRegisterResponse(response.data);
  },

  async registerAgent(data: AgentRegisterRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/register/agent-register", data, withJsonContentType(data));
    return unwrapRegisterResponse(response.data);
  },

  async createRegistrationSession(referralCode: string) {
    const data: CreateRegistrationSessionRequest = {
      MerchantID: this.getMerchantId(),
      ReferralCode: referralCode
    };

    const response = await apiClient.post<ApiEnvelope<RegistrationSessionData>>(
      "/register/registration/session",
      data,
      withJsonContentType(data)
    );
    return unwrapRegisterResponse(response.data).Data;
  },

  async uploadKycDocument(token: string, documentType: KycDocumentType, file: File) {
    const data = new FormData();
    data.append("file", file);

    const response = await apiClient.post<ApiEnvelope<KycUploadData>>("/register/upload-kyc", data, {
      params: {
        merchantId: this.getMerchantId(),
        documentType
      },
      headers: {
        "X-Registration-Token": token
      }
    });

    return unwrapRegisterResponse(response.data).Data;
  }
};

function unwrapRegisterResponse<TData>(response: ApiEnvelope<TData>) {
  if (response.Status !== 0) {
    throw new Error(response.Message || "API request failed.");
  }

  return response;
}
