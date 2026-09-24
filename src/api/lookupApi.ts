import apiClient from "./apiClient";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code: string;
  Data: TData;
}

export interface CountryLookupItem {
  id: number;
  CountryMobileCode: number;
  CountryDomain: string;
  CountryName: string;
  Nationality: string;
  "Nationality "?: string;
  UTCoffSet: number;
}

export interface BankLookupItem {
  id: number;
  BankName: string;
  BankNameDetail?: string;
  BankDescription: string;
}

export interface RoleLookupItem {
  RoleCode: string;
  RoleName: string;
  UserType: string;
  AdminRank: number;
}

export interface RankLookupItem {
  RankCode: string;
  RankName: string;
  Ranking: number;
  isAutoRankEligible: boolean;
}

export interface TrustCategoryLookupItem {
  CategoryID: string;
  CategoryName: string;
}

export interface RelationshipLookupItem {
  RelationshipCode: string;
  RelationshipName: string;
}

const merchantId = import.meta.env.VITE_MERCHANT_ID;

export const lookupApi = {
  async getCountryList() {
    const response = await apiClient.get<ApiEnvelope<{ CountryLists: CountryLookupItem[] }>>("/lookup/country-list", {
      params: getMerchantParams()
    });
    const data = unwrapLookupResponse(response.data);
    return data.CountryLists;
  },

  async getBankList() {
    const response = await apiClient.get<ApiEnvelope<{ BankLists: BankLookupItem[] }>>("/lookup/bank-list", {
      params: getMerchantParams()
    });
    const data = unwrapLookupResponse(response.data);
    return data.BankLists;
  },

  async getRankList() {
    const response = await apiClient.get<ApiEnvelope<RankLookupItem[]>>("/lookup/rank-list", {
      params: getAllRoleParams()
    });
    return unwrapLookupResponse(response.data);
  },

  async getAdminRoleList() {
    const response = await apiClient.get<ApiEnvelope<RoleLookupItem[]>>("/lookup/role-list", {
      params: getRoleParams(true)
    });
    return unwrapLookupResponse(response.data);
  },

  async getAllRoleList() {
    const response = await apiClient.get<ApiEnvelope<RoleLookupItem[]>>("/lookup/all-role-list", {
      params: getAllRoleParams()
    });
    return unwrapLookupResponse(response.data);
  },

  async getTrustCategoriesList() {
    const response = await apiClient.get<ApiEnvelope<TrustCategoryLookupItem[]>>("/lookup/trust-categories-list", {
      params: getAllRoleParams()
    });
    return unwrapLookupResponse(response.data);
  },

  async getRelationshipList() {
    const response = await apiClient.get<ApiEnvelope<{ RelationshipLists: RelationshipLookupItem[] }>>("/lookup/relationship-list", {
      params: getMerchantParams()
    });
    const data = unwrapLookupResponse(response.data);
    return data.RelationshipLists;
  },

  async getSignupLookupData() {
    const [countries, banks] = await Promise.all([
      lookupApi.getCountryList(),
      lookupApi.getBankList()
    ]);

    return {
      countries,
      banks,
      mobileCodes: getMobileCodeOptions(countries),
      nationalities: getNationalityOptions(countries)
    };
  }
};

function getMerchantParams() {
  if (!merchantId) {
    throw new Error("Merchant configuration is missing.");
  }

  return {
    MerchantID: merchantId
  };
}

function getRoleParams(admin: boolean) {
  if (!merchantId) {
    throw new Error("Merchant configuration is missing.");
  }

  return {
    merchantId,
    admin
  };
}

function getAllRoleParams() {
  if (!merchantId) {
    throw new Error("Merchant configuration is missing.");
  }

  return {
    merchantId
  };
}

function unwrapLookupResponse<TData>(response: ApiEnvelope<TData>) {
  if (response.Status !== 0) {
    throw new Error(response.Message || "Unable to load lookup data.");
  }

  return response.Data;
}

function getMobileCodeOptions(countries: CountryLookupItem[]) {
  const options = countries
    .map((country) => ({
      country: country.CountryName,
      code: country.CountryMobileCode > 0 ? `+${country.CountryMobileCode}` : ""
    }))
    .filter((item) => item.code);

  return Array.from(new Map(options.map((item) => [`${item.country}-${item.code}`, item])).values());
}

function getNationalityOptions(countries: CountryLookupItem[]) {
  const options = countries
    .map((country) => country.Nationality?.trim())
    .filter((nationality): nationality is string => Boolean(nationality));

  return Array.from(new Set(options)).sort((a, b) => a.localeCompare(b));
}
