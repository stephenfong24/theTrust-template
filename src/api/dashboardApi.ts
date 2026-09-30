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
  Finance?: FinanceDashboard | null;
  Admin?: AdminDashboard | null;
  Operation?: OperationDashboard | null;
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
  ApplicationsInProgress: number;
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

export interface FinanceDashboard {
  Year: number;
  Summary?: FinanceDashboardSummary | null;
  CollectionTrend?: FinanceCollectionTrend[] | null;
  PaymentOverview?: FinancePaymentOverview | null;
  RequiresAttention?: FinanceAttention | null;
  PaymentApprovalQueue?: FinancePaymentQueueItem[] | null;
  DividendWorkload?: FinanceDividendWorkload | null;
  DividendDueQueue?: FinanceDividendQueueItem[] | null;
}

export interface FinanceDashboardSummary {
  ApprovedCollection: number;
  CollectionThisMonth: number;
  PendingPaymentApproval: number;
  PendingPaymentAmount: number;
  DividendDue: number;
  DividendDueAmount: number;
}

export interface FinanceCollectionTrend {
  Month: number;
  MonthName?: string | null;
  Amount: number;
  ApprovedPayments: number;
}

export interface FinancePaymentOverview {
  Pending: number;
  Approved: number;
  Rejected: number;
}

export interface FinanceAttention {
  Total: number;
  PaymentPendingApproval: number;
  DividendDue: number;
  OverdueDividend: number;
}

export interface FinancePaymentQueueItem {
  PaymentID: number;
  TrustID: number;
  TrustNo?: string | null;
  SettlorName?: string | null;
  SubmittedAmount: number;
  SubmittedAt?: string | null;
  WaitingDays: number;
  OriginalFileName?: string | null;
}

export interface FinanceDividendWorkload {
  DueCount: number;
  DueAmount: number;
  Upcoming30DaysCount: number;
  Upcoming30DaysAmount: number;
  PaidThisMonthCount: number;
  PaidThisMonthAmount: number;
}

export interface FinanceDividendQueueItem {
  DividendScheduleID: number;
  TrustID: number;
  TrustNo?: string | null;
  ScheduleNo?: number | null;
  ReturnYear?: number | null;
  PeriodNo?: number | null;
  SettlorName?: string | null;
  PayoutDate?: string | null;
  Amount: number;
  Status?: string | null;
  IsOverdue: boolean;
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

export interface OperationDashboard {
  Year: number;
  Summary?: OperationDashboardSummary | null;
  WorkflowPipeline?: OperationDashboardWorkflow | null;
  RequiresAttention?: OperationDashboardAttention | null;
  UpcomingMaturities?: OperationDashboardMaturity | null;
  ProcessingTrend?: OperationDashboardMonthly[] | null;
  WorkQueue?: OperationDashboardWorkQueueItem[] | null;
}

export interface OperationDashboardSummary {
  InProcess: number;
  ReadyForProcessing: number;
  PendingAdminApproval: number;
  SentOut: number;
  Stamping: number;
  CompletedThisMonth: number;
}

export interface OperationDashboardWorkflow {
  Total: number;
  PaymentApproved: number;
  PendingAdminApproval: number;
  SentOut: number;
  Stamping: number;
}

export interface OperationDashboardAttention {
  Total: number;
  PendingAdminApproval: number;
  MaturingNext30Days: number;
}

export interface OperationDashboardMaturity {
  MaturingNext30Days: number;
  MaturingNext60Days: number;
  MaturingNext90Days: number;
}

export interface OperationDashboardMonthly {
  Month: number;
  MonthName?: string | null;
  CompletedApplications: number;
}

export interface OperationDashboardWorkQueueItem {
  TrustID: number;
  SettlorName?: string | null;
  ProductCode?: string | null;
  ApplicationStatus?: string | null;
  StageSince?: string | null;
  DaysInStage: number;
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
