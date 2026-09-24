import apiClient, { withJsonContentType } from "./apiClient";
import type { AccountProfileActivity } from "./accountApi";
import { readStorage, writeStorage } from "../services/storageService";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code: string;
  Data: TData;
}

interface LocalAgentSignup {
  id: string;
  submittedAt: string;
  payload: unknown;
}

export interface AgentPagination {
  Page: number;
  PageSize: number;
  TotalRecords: number;
  TotalPages: number;
}

export interface AgentListItem {
  Id: number;
  UserID: number;
  Email?: string;
  Fullname?: string;
  Displayname?: string | null;
  Ranking?: number | null;
  RankName?: string | null;
  IdentityType?: string | null;
  IdentityID?: string | null;
  IntroducerName?: string | null;
  IntroducerEmail?: string | null;
  TotalDownline?: number;
  PersonalSales?: number;
  CreatedAt?: string | null;
  LastLogin?: string | null;
}

export interface AgentListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  introducerKeyword?: string;
  ranking?: number;
}

export interface AgentProfile {
  ReferralID?: string;
  ReferralCode?: {
    TheTrust?: string | null;
    TheWill?: string | null;
  } | null;
  AvatarUrl?: string;
  CountryMobileCode?: string;
  Mobile?: string;
  Email?: string;
  Fullname?: string;
  Displayname?: string;
  DateOfBirth?: string;
  IdentityType?: string;
  IdentityID?: string;
  Country?: string;
  Country_Domain?: string;
  Postcode?: string;
  City?: string;
  State?: string;
  Address_1?: string;
  Address_2?: string;
  Occupation?: string | null;
  TinNumber?: string;
  LastChangePasswordDate?: string;
  TotalReferrals?: number;
  BankName?: string;
  BankNameDetail?: string;
  AccountName?: string;
  AccountNumber?: string;
  SwiftCode?: string;
  IcFront?: { FileUrl?: string } | null;
  IcBack?: { FileUrl?: string } | null;
  Passport?: { FileUrl?: string } | null;
  SsmCertificate?: { FileUrl?: string } | null;
  Introducer?: {
    UserID?: number;
    Username?: string;
    Fullname?: string;
  } | null;
  Activities?: AccountProfileActivity[];
  activities?: AccountProfileActivity[];
}

export interface AdminChangeAgentProfileRequest {
  UserID: number;
  Username: string;
  Displayname: string;
  CountryMobileCode: string;
  Mobile: string;
  Country_Domain: string;
  Postcode: string;
  State: string;
  City: string;
  Address_1: string;
  Address_2: string;
  LoginStatus: boolean;
  CreatedBy: number;
}

export interface AdminChangeAgentIdentityRequest {
  UserID: number;
  Fullname: string;
  DateOfBirth: string;
  IdentityType: string;
  IdentityID: string;
  Occupation?: string | null;
  TinNumber: string;
  IdentityFrontPublicID?: string;
  IdentityBackPublicID?: string;
  PassportPublicID?: string;
  SSMPublicID?: string;
  CreatedBy: number;
}

export interface AdminChangeAgentBankRequest {
  UserID: number;
  BankName: string;
  AccountName: string;
  AccountNumber: string;
  CreatedBy: number;
}

export interface AdminChangeAgentPasswordRequest {
  UserID: number;
  Password: string;
  ConfirmPassword: string;
  CreatedBy: number;
}

export interface ManualRankingPreviewRequest {
  MemberID: number;
  AdvanceRanking: number;
}

export interface ManualRankingResult {
  NetworkLevel: number;
  MemberID: number;
  Username: string;
  Fullname: string;
  ChangeSource: string;
  ChangeType: string;
  PreviousRanking: number;
  PreviousRankingCode: string;
  PreviousRankingName: string;
  NewRanking: number;
  NewRankingCode: string;
  NewRankingName: string;
  PreviousAdvanceRanking: number;
  PreviousAdvanceRankingCode: string;
  PreviousAdvanceRankingName: string;
  NewAdvanceRanking: number;
  NewAdvanceRankingCode: string;
  NewAdvanceRankingName: string;
  PreviousEffectiveRanking: number;
  PreviousEffectiveRankingCode: string;
  PreviousEffectiveRankingName: string;
  NewEffectiveRanking: number;
  NewEffectiveRankingCode: string;
  NewEffectiveRankingName: string;
  PersonalSales?: number | null;
  DirectTMOrAbove?: number | null;
  DirectTDOrAbove?: number | null;
  DirectGTDOrAbove?: number | null;
  PreviousAllowOverriding?: boolean | null;
  NewAllowOverriding?: boolean | null;
}

export interface ManualRankingPreviewData {
  MemberID: number;
  AdvanceRanking: number;
  TotalAffected: number;
  TotalAffectedUplines: number;
  AffectedAgents: ManualRankingResult[];
}

export type AgentKycDocumentType = "NRIC_FRONT" | "NRIC_BACK" | "PASSPORT" | "SSM_CERT";

export interface AgentKycUploadResult {
  PublicID: string;
  FileUrl: string;
  UploadedFile: string;
}

const localSignupStorageKey = "trust-fund-agent-signups";
const waitForLocalSignup = () => new Promise((resolve) => window.setTimeout(resolve, 450));
const merchantId = import.meta.env.VITE_MERCHANT_ID;

export const agentApi = {
  async signup(formData: FormData) {
    if (!import.meta.env.VITE_API_URL) {
      return createLocalAgentSignup(formData);
    }

    const response = await apiClient.post("/agent/signup", formData);
    return response.data;
  },

  async getProfile() {
    const response = await apiClient.get("/agent/profile");
    return response.data;
  },

  async updateProfile(data: unknown) {
    const response = await apiClient.put("/agent/profile", data, withJsonContentType(data));
    return response.data;
  },

  async uploadProfilePhoto(formData: FormData) {
    const response = await apiClient.post("/agent/profile/photo", formData);
    return response.data;
  },

  async getAgentList(params: AgentListParams) {
    const response = await apiClient.get<
      ApiEnvelope<{
        AgentLists: AgentListItem[];
        Pagination: AgentPagination;
      }>
    >("/agent-management/agent-list", {
      params: removeEmptyParams(params)
    });

    const data = unwrapResponse(response.data, "Unable to load agent list.");
    return {
      records: data.AgentLists,
      pagination: data.Pagination
    };
  },

  async getAdminAgentProfile(userId: number) {
    const response = await apiClient.get<ApiEnvelope<AgentProfile>>("/agent-management/get-profile", {
      params: { userId }
    });
    return normalizeAgentProfile(unwrapResponse(response.data, "Unable to load agent profile."));
  },

  async changeAgentProfile(data: AdminChangeAgentProfileRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/agent-management/change-profile", data, withJsonContentType(data));
    unwrapResponse(response.data, "Unable to update agent profile.");
  },

  async changeAgentIdentity(data: AdminChangeAgentIdentityRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/agent-management/change-identity", data, withJsonContentType(data));
    unwrapResponse(response.data, "Unable to update agent identity.");
  },

  async changeAgentBank(data: AdminChangeAgentBankRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/agent-management/change-bank", data, withJsonContentType(data));
    unwrapResponse(response.data, "Unable to update agent bank information.");
  },

  async changeAgentLoginPassword(data: AdminChangeAgentPasswordRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/agent-management/change-login-password", data, withJsonContentType(data));
    unwrapResponse(response.data, "Unable to change agent password.");
  },

  async previewManualRanking(data: ManualRankingPreviewRequest) {
    const response = await apiClient.post<ApiEnvelope<ManualRankingPreviewData>>("/agent-management/manual-ranking-preview", data, withJsonContentType(data));
    return unwrapResponse(response.data, "Unable to preview manual ranking.");
  },

  async updateManualRanking(data: ManualRankingPreviewRequest) {
    const response = await apiClient.post<ApiEnvelope<ManualRankingPreviewData | null>>("/agent-management/manual-ranking-update", data, withJsonContentType(data));
    return unwrapResponse(response.data, "Unable to update manual ranking.");
  },

  async uploadAgentKycDocument({ documentType, userId, file }: { documentType: AgentKycDocumentType; userId: number; file: File }) {
    if (!merchantId) {
      throw new Error("Merchant configuration is missing.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<ApiEnvelope<AgentKycUploadResult>>("/agent-management/upload-kyc", formData, {
      params: {
        merchantId,
        documentType,
        userId
      }
    });

    return unwrapResponse(response.data, "Unable to upload KYC document.");
  }
};

async function createLocalAgentSignup(formData: FormData) {
  await waitForLocalSignup();
  const payload = await getSignupPayload(formData);
  const submissions = readStorage<LocalAgentSignup[]>(localSignupStorageKey, []);
  const submission = {
    id: `AS-${String(submissions.length + 1).padStart(5, "0")}`,
    submittedAt: new Date().toISOString(),
    payload
  };

  writeStorage(localSignupStorageKey, [submission, ...submissions]);
  return submission;
}

async function getSignupPayload(formData: FormData) {
  const payload = formData.get("payload");
  if (payload instanceof Blob) {
    return JSON.parse(await payload.text());
  }
  if (typeof payload === "string") {
    return JSON.parse(payload);
  }
  return {};
}

function unwrapResponse<TData>(response: ApiEnvelope<TData>, fallbackMessage: string) {
  if (response.Status !== 0) {
    throw new Error(response.Message || fallbackMessage);
  }

  return response.Data;
}

function removeEmptyParams(params: AgentListParams) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function normalizeAgentProfile(profile: AgentProfile): AgentProfile {
  const activities = profile.Activities ?? profile.activities;

  return {
    ...profile,
    Activities: Array.isArray(activities) ? activities : undefined
  };
}
