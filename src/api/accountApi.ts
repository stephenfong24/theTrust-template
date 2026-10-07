import apiClient, { withJsonContentType } from "./apiClient";

interface ApiEnvelope<TData> {
  Status?: number;
  status?: number;
  Message?: string;
  message?: string;
  Code?: string;
  code?: string;
  Data?: TData;
  data?: TData;
}

export interface AccountProfileDocument {
  FileUrl?: string;
}

export interface AccountProfileActivity {
  RequestID?: string;
  requestID?: string;
  requestid?: string;
  Description?: string;
  description?: string;
  ActionName?: string;
  actionName?: string;
  actionname?: string;
  ActivityTitle?: string;
  activityTitle?: string;
  activitytitle?: string;
  ActivityDate?: string;
  activityDate?: string;
  activitydate?: string;
  IsSuccess?: boolean;
  isSuccess?: boolean;
  issuccess?: boolean;
}

export interface AccountProfileIntroducer {
  UserID?: number;
  Username?: string;
  Fullname?: string;
}

export interface AccountProfileData {
  ReferralID?: string;
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
  IcFront?: AccountProfileDocument | null;
  IcBack?: AccountProfileDocument | null;
  Passport?: AccountProfileDocument | null;
  SsmCertificate?: AccountProfileDocument | null;
  Introducer?: AccountProfileIntroducer | null;
  Activities?: AccountProfileActivity[];
  activities?: AccountProfileActivity[];
}

export interface ChangeLoginPasswordRequest {
  OldPassword: string;
  Password: string;
  ConfirmPassword: string;
}

export interface ChangeProfileRequest {
  Displayname: string;
}

export interface ChangeEmailRequest {
  Username: string;
  OTP: string;
}

export interface ChangeBankRequest {
  BankName: string;
  AccountName: string;
  AccountNumber: string;
}

export interface UploadAvatarResponse {
  FileUrl?: string;
  UploadedFile?: string;
}

export const accountApi = {
  async getProfile() {
    const response = await apiClient.get<ApiEnvelope<AccountProfileData>>("/account/get-profile");
    return normalizeProfileData(unwrapResponse(response.data, true));
  },

  async changeLoginPassword(data: ChangeLoginPasswordRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/account/change-login-password", data, withJsonContentType(data));
    unwrapResponse(response.data);
  },

  async changeProfile(data: ChangeProfileRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/account/change-profile", data, withJsonContentType(data));
    unwrapResponse(response.data);
  },

  async changeEmail(data: ChangeEmailRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/account/change-email", data, withJsonContentType(data));
    unwrapResponse(response.data);
  },

  async changeBank(data: ChangeBankRequest) {
    const response = await apiClient.post<ApiEnvelope<null>>("/account/change-bank", data, withJsonContentType(data));
    unwrapResponse(response.data);
  },

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<ApiEnvelope<UploadAvatarResponse>>("/account/upload-avatar", formData);
    return unwrapResponse(response.data, true);
  }
};

function unwrapResponse<TData>(response: ApiEnvelope<TData>, requireData: true): TData;
function unwrapResponse<TData>(response: ApiEnvelope<TData>, requireData?: false): TData | undefined;
function unwrapResponse<TData>(response: ApiEnvelope<TData>, requireData = false) {
  const status = response.Status ?? response.status;

  if (status !== 0) {
    throw new Error(response.Message ?? response.message ?? "Unable to load profile.");
  }

  const data = response.Data ?? response.data;
  if (requireData && data === undefined) {
    throw new Error(response.Message ?? response.message ?? "Unable to load profile.");
  }

  return data;
}

function normalizeProfileData(profile: AccountProfileData): AccountProfileData {
  const activities = profile.Activities ?? profile.activities;

  return {
    ...profile,
    Activities: Array.isArray(activities) ? activities.map(normalizeProfileActivity) : undefined
  };
}

function normalizeProfileActivity(activity: AccountProfileActivity): AccountProfileActivity {
  return {
    ...activity,
    RequestID: activity.RequestID ?? activity.requestID ?? activity.requestid,
    Description: activity.Description ?? activity.description,
    ActionName: activity.ActionName ?? activity.actionName ?? activity.actionname,
    ActivityTitle: activity.ActivityTitle ?? activity.activityTitle ?? activity.activitytitle,
    ActivityDate: activity.ActivityDate ?? activity.activityDate ?? activity.activitydate,
    IsSuccess: activity.IsSuccess ?? activity.isSuccess ?? activity.issuccess
  };
}
