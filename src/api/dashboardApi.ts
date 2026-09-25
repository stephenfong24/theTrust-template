import apiClient from "./apiClient";
import type { RoleId } from "../types";

interface ApiEnvelope<TData> {
  Status: number;
  Message: string;
  Code: string;
  Data: TData;
}

export interface DashboardResponse {
  RoleCode: RoleId;
  TrustRepresentative?: TrustRepresentativeDashboard | null;
  Admin?: AdminDashboard | null;
}

export interface TrustRepresentativeDashboard {
  Year: number;
  Summary?: TrustRepresentativeSummary | null;
  PersonalSalesTrend?: DashboardMonthlySales[] | null;
  RankProgress?: DashboardRankProgress | null;
  ApplicationStatus?: DashboardApplicationStatus | null;
  Commission?: DashboardCommissionSummary | null;
  Network?: DashboardNetworkSummary | null;
  ActionRequired?: DashboardActionRequired | null;
  RecentApplications?: DashboardRecentApplication[] | null;
}

export interface TrustRepresentativeSummary {
  PersonalSales: number;
  ActiveTrustValue: number;
  ActiveTrustCount: number;
  CompletedTrusts: number;
  Ranking: number;
  RankCode?: string | null;
  RankName?: string | null;
}

export interface DashboardMonthlySales {
  Month: number;
  MonthName?: string | null;
  Amount: number;
  CompletedTrusts: number;
}

export interface DashboardRankProgress {
  Ranking: number;
  RankCode?: string | null;
  RankName?: string | null;
  PersonalSales: number;
  PersonalSalesTarget: number;
  PersonalSalesRemaining: number;
  ProgressPercentage: number;
}

export interface DashboardApplicationStatus {
  Total: number;
  Draft: number;
  PendingPayment: number;
  Processing: number;
  Completed: number;
  Matured: number;
  EarlyWithdrawn: number;
  Rejected: number;
}

export interface DashboardCommissionSummary {
  Available: boolean;
  TotalEarned: number;
  ThisMonth: number;
  Pending: number;
}

export interface DashboardNetworkSummary {
  DirectDownline: number;
  TotalNetwork: number;
  LatestDownlines?: DashboardNetworkMember[] | null;
}

export interface DashboardNetworkMember {
  UserID: number;
  FullName?: string | null;
  Email?: string | null;
  Ranking: number;
  RankCode?: string | null;
  RankName?: string | null;
  JoinedAt?: string | null;
}

export interface DashboardActionRequired {
  Total: number;
  DraftApplications: number;
  AwaitingPayment: number;
  PaymentPendingApproval: number;
}

export interface DashboardRecentApplication {
  TrustID: number;
  SettlorName?: string | null;
  ProductCode?: string | null;
  TrustAssetAmount: number;
  ApplicationStatus?: string | null;
  CreatedAt?: string | null;
  UpdatedAt?: string | null;
}

export interface AdminDashboard {
  Year: number;
  Summary?: AdminDashboardSummary | null;
  PlacementTrend?: DashboardMonthlyPlacement[] | null;
  ApplicationPipeline?: AdminDashboardApplicationPipeline | null;
  PlacementVsCollection?: DashboardPlacementCollection[] | null;
  AgentNetwork?: AdminDashboardAgentNetwork | null;
  Lifecycle?: AdminDashboardLifecycle | null;
  RequiresAttention?: AdminDashboardAttention | null;
  AgentPerformance?: AdminDashboardAgentPerformance[] | null;
}

export interface AdminDashboardSummary {
  TotalTrustPlacement: number;
  ThisMonthPlacement: number;
  ActiveTrustValue: number;
  ActiveTrustCount: number;
  ApprovedCollection: number;
  ThisMonthApprovedCollection: number;
  TotalApplications: number;
  ThisMonthApplications: number;
  CompletedTrusts: number;
  ThisMonthCompletedTrusts: number;
  TotalAgents: number;
  NewAgentsThisMonth: number;
}

export interface DashboardMonthlyPlacement {
  Month: number;
  MonthName?: string | null;
  Amount: number;
  CompletedTrusts: number;
}

export interface AdminDashboardApplicationPipeline {
  Total: number;
  Draft: number;
  PendingPayment: number;
  PaymentApproved: number;
  PendingAdminApproval: number;
  SentOut: number;
  Stamping: number;
  Completed: number;
  Matured: number;
  EarlyWithdrawn: number;
  Rejected: number;
}

export interface DashboardPlacementCollection {
  Month: number;
  MonthName?: string | null;
  PlacementAmount: number;
  CollectionAmount: number;
}

export interface AdminDashboardAgentNetwork {
  TotalAgents: number;
  NewAgentsThisMonth: number;
  SellingAgents: number;
  AgentsWithNoSales: number;
}

export interface AdminDashboardLifecycle {
  MaturingNext30Days: number;
  MaturingNext90Days: number;
  Matured: number;
  EarlyWithdrawn: number;
}

export interface AdminDashboardAttention {
  Total: number;
  PendingPaymentApproval: number;
  PendingAdminApproval: number;
  MaturingNext30Days: number;
  RejectedThisMonth: number;
}

export interface AdminDashboardAgentPerformance {
  UserID: number;
  Username?: string | null;
  FullName?: string | null;
  Ranking: number;
  RankCode?: string | null;
  RankName?: string | null;
  PersonalSales: number;
  CompletedTrusts: number;
}

export const dashboardApi = {
  async getDashboard(year?: number) {
    const response = await apiClient.get<ApiEnvelope<DashboardResponse>>("/dashboard", {
      params: year ? { year } : undefined
    });

    return unwrapResponse(response.data, "Unable to load dashboard.");
  }
};

function unwrapResponse<TData>(response: ApiEnvelope<TData>, fallbackMessage: string): TData {
  if (response.Status !== 0) {
    throw new Error(response.Message || fallbackMessage);
  }

  return response.Data;
}
