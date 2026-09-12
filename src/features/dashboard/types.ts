import type { RoleId } from "../../types";

export type DashboardPeriod = "month" | "3m" | "6m" | "12m";
export type DashboardMetricTone = "ink" | "gold" | "green" | "amber" | "blue" | "red";
export type ChartKind = "line" | "bar" | "donut";
export type DashboardRankCode = "TR" | "TM" | "TD" | "GTD" | "Angel Partner" | "STR" | "CTD";

export interface DashboardMetric {
  label: string;
  value: string;
  helper?: string;
  tone?: DashboardMetricTone;
}

export interface ChartPoint {
  label: string;
  value?: number;
  amount?: number;
  count?: number;
  secondary?: number;
}

export interface StatusSlice {
  name: string;
  value: number;
}

export interface ProductPerformance {
  productCode: string;
  productName: string;
  amount: number;
  count: number;
}

export interface TrustApplicationRow {
  trustId: string;
  client: string;
  product: string;
  agent: string;
  placement: number;
  status: string;
  createdDate?: string;
  updatedDate?: string;
  completedDate?: string;
  waitingDuration?: string;
  actionPath?: string;
}

export interface AgentPerformanceRow {
  agent: string;
  agentCode: string;
  rank: DashboardRankCode;
  personalCompletedSales: number;
  directDownlines: number;
  completedTrustCount: number;
}

export interface PaymentProcessingRow {
  trustId: string;
  client: string;
  product: string;
  amount: number;
  paymentDate: string;
  reference: string;
  status: string;
  actionPath?: string;
}

export interface DividendScheduleRow {
  trustId: string;
  client: string;
  product: string;
  amount: number;
  payoutDate: string;
  status: string;
}

export interface CommissionProcessingRow {
  trustId: string;
  client: string;
  product: string;
  agent: string;
  agentCode: string;
  rankAtCompleted: DashboardRankCode;
  amount: number;
  status: string;
  generatedDate: string;
}

export interface ActivityRow {
  dateTime: string;
  user: string;
  module: string;
  action: string;
  reference: string;
}

export interface AttentionItem {
  label: string;
  value: string;
  status: string;
  path?: string;
}

export interface RankProgress {
  currentRank: DashboardRankCode;
  nextRank?: DashboardRankCode;
  personalSales: number;
  personalSalesTarget: number;
  directRankLabel?: DashboardRankCode;
  directRankCount?: number;
  directRankTarget?: number;
  note?: string;
}

export interface NetworkSummary {
  directDownlines: number;
  totalNetworkMembers: number;
  rankDistribution: StatusSlice[];
}

export interface AgentProfileSummary {
  name: string;
  agentCode: string;
  currentRank: DashboardRankCode;
}

export interface QuickAction {
  label: string;
  path: string;
}

export interface RoleDashboardData {
  role: RoleId;
  metrics: DashboardMetric[];
  applicationStatus: StatusSlice[];
  placementTrend: ChartPoint[];
  applicationVolumeTrend: ChartPoint[];
  completionTrend: ChartPoint[];
  commissionTrend: ChartPoint[];
  dividendTrend: ChartPoint[];
  paymentTrend: ChartPoint[];
  paymentStatus: StatusSlice[];
  productPerformance: ProductPerformance[];
  productApplicationCounts: ProductPerformance[];
  rankDistribution: StatusSlice[];
  recentApplications: TrustApplicationRow[];
  processingQueue: TrustApplicationRow[];
  recentCompletedApplications: TrustApplicationRow[];
  topAgents: AgentPerformanceRow[];
  attentionItems: AttentionItem[];
  paymentProcessing: PaymentProcessingRow[];
  dividendSchedule: DividendScheduleRow[];
  commissionProcessing: CommissionProcessingRow[];
  recentActivity: ActivityRow[];
  agentProfile?: AgentProfileSummary;
  rankProgress?: RankProgress;
  networkSummary?: NetworkSummary;
  recentCommission?: CommissionProcessingRow[];
  quickActions?: QuickAction[];
  mockNotes: string[];
  supportedByExistingData: string[];
  futureApiNeeds: string[];
}
