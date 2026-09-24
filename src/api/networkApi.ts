import apiClient from "./apiClient";

export type NetworkCategory = "The Trust" | "The Will";

export interface NetworkDownlineNode {
  userId: string;
  fullName: string;
  email: string;
  username: string;
  personalSales: number;
  rankName: string;
  totalDownline: number;
  downlines: NetworkDownlineNode[];
}

interface ApiNetworkDownlineNode {
  UserID: number | string;
  FullName: string;
  Email?: string;
  Username: string;
  PersonalSales: number;
  RankName: string;
  TotalDownline: number;
  Downlines?: ApiNetworkDownlineNode[];
}

interface ApiNetworkResponse {
  Data: ApiNetworkDownlineNode;
}

export const networkApi = {
  async getTrustDownlineList(email?: string, options: NetworkRequestOptions = {}) {
    return getNetworkDownlineList("/network/trust/downline-list", email, options);
  },

  async getWillDownlineList(email?: string, options: NetworkRequestOptions = {}) {
    return getNetworkDownlineList("/network/will/downline-list", email, options);
  },

  async getDownlineList(category: NetworkCategory, email?: string, options: NetworkRequestOptions = {}) {
    return category === "The Will" ? this.getWillDownlineList(email, options) : this.getTrustDownlineList(email, options);
  }
};

interface NetworkRequestOptions {
  skipGlobalLoading?: boolean;
}

async function getNetworkDownlineList(endpoint: string, email?: string, options: NetworkRequestOptions = {}) {
  const response = await apiClient.get<ApiNetworkResponse>(endpoint, {
    skipGlobalLoading: options.skipGlobalLoading,
    params: {
      email: email?.trim() || undefined
    }
  });

  return normalizeNetworkNode(response.data.Data);
}

function normalizeNetworkNode(node: ApiNetworkDownlineNode): NetworkDownlineNode {
  const email = node.Email ?? node.Username ?? "";

  return {
    userId: String(node.UserID),
    fullName: node.FullName,
    email,
    username: node.Username ?? email,
    personalSales: Number(node.PersonalSales ?? 0),
    rankName: node.RankName,
    totalDownline: Number(node.TotalDownline ?? 0),
    downlines: (node.Downlines ?? []).map(normalizeNetworkNode)
  };
}
