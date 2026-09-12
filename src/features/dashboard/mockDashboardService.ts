import applicationsJson from "../../data/applications.json";
import auditLogsJson from "../../data/audit-logs.json";
import networkJson from "../../data/network-downlines.json";
import paymentsJson from "../../data/payments.json";
import { trustPlanMockData } from "../../data/trustPlanMockData";
import type { ApplicationRecord, AuditLog, LocalSession, PaymentRecord, RoleId } from "../../types";
import type {
  ActivityRow,
  AgentPerformanceRow,
  CommissionProcessingRow,
  DashboardMetric,
  DashboardRankCode,
  DividendScheduleRow,
  PaymentProcessingRow,
  ProductPerformance,
  QuickAction,
  RoleDashboardData,
  StatusSlice,
  TrustApplicationRow
} from "./types";

interface NetworkRecord {
  id: string;
  uplineId: string | null;
  fullName: string;
  personalSales: number;
  ranking: string;
}

const applications = applicationsJson as ApplicationRecord[];
const payments = paymentsJson as PaymentRecord[];
const auditLogs = auditLogsJson as AuditLog[];
const networkRecords = networkJson as NetworkRecord[];

const completedStatuses = new Set(["Active", "Completed", "Approved"]);
const processingStatuses = new Set(["Pending Review", "Pending Approval", "Processing"]);
const attentionStatuses = new Set(["Pending Review", "Pending Approval", "Processing", "Rejected"]);
const rankNameToCode: Record<string, DashboardRankCode> = {
  "Trust Representative": "TR",
  "Trust Manager": "TM",
  "Trust Director": "TD",
  "Group Trust Director": "GTD",
  "Saving Trust Representative": "STR",
  "Chief Trust Direct": "CTD",
  "Chief Trust Director": "CTD"
};

export async function getMockDashboardData(session: LocalSession | null): Promise<RoleDashboardData> {
  await new Promise((resolve) => window.setTimeout(resolve, 180));
  return buildDashboardData(session);
}

function buildDashboardData(session: LocalSession | null): RoleDashboardData {
  const role = session?.role ?? "AG";
  const base = createBaseData(role, session);

  switch (role) {
    case "SA":
      return {
        ...base,
        metrics: [
          metric("Completed Trust Placement", money(sumCompletedPlacement()), "Approved, Active and Completed only", "gold"),
          metric("Total Trust Applications", String(applications.length), "All current workflow statuses", "ink"),
          metric("Active / Completed Trusts", String(countCompleted()), "Qualifying completed statuses", "green"),
          metric("Awaiting Processing", String(countProcessing()), "Pending review or approval", "amber"),
          metric("Total Active Agents", String(networkRecords.length), "Trust network records", "blue"),
          metric("Commission Payable", money(sumCommissionByStatus("Pending")), "Generated commission not paid", "amber")
        ],
        supportedByExistingData: [
          "Application status and placement can be calculated from Trust application records.",
          "Trust Product groupings can come from Trust Plan basic information.",
          "Network rank distribution can come from existing network/member reference records."
        ],
        futureApiNeeds: commonFutureApiNeeds()
      };
    case "AD":
      return {
        ...base,
        metrics: [
          metric("New Applications This Month", String(applications.filter((item) => item.applicationDate.startsWith("2026-07")).length), "Created in current dashboard period", "blue"),
          metric("Draft Applications", String(countByStatus("Draft")), "Wizard applications not submitted", "ink"),
          metric("Submitted / Processing", String(countProcessing()), "Pending review and approval", "amber"),
          metric("Completed This Month", String(base.recentCompletedApplications.length), "Completed, Active or Approved", "green"),
          metric("New Agents This Month", "4", "From member/reference registration", "blue"),
          metric("Requires Attention", String(base.processingQueue.length), "Oldest actionable applications", "red")
        ],
        supportedByExistingData: [
          "Application volume, status and product counts can be calculated from application records.",
          "Recent activity can use the existing audit log shape."
        ],
        futureApiNeeds: commonFutureApiNeeds()
      };
    case "OP":
      return {
        ...base,
        metrics: [
          metric("Awaiting Processing", String(countProcessing()), "Operational queue", "amber"),
          metric("Received Today", "3", "Submitted applications in current day", "blue"),
          metric("Payment Related", String(base.paymentProcessing.length), "Processing or partial payments", "amber"),
          metric("Updated Today", "6", "Applications touched today", "ink"),
          metric("Completed Today", "2", "Workflow completed today", "green"),
          metric("Requires Attention", String(base.processingQueue.filter((item) => item.status === "Rejected").length + 2), "Returned or aged items", "red")
        ],
        supportedByExistingData: [
          "Processing queue can be filtered from application statuses.",
          "Daily volume can be calculated from application dates and last updated dates."
        ],
        futureApiNeeds: commonFutureApiNeeds()
      };
    case "AC":
      return {
        ...base,
        metrics: [
          metric("Payments Received This Month", money(sumPayments("Paid")), "Actual paid records", "green"),
          metric("Pending Verification", String(payments.filter((payment) => payment.status !== "Paid").length), "Processing or partial payment records", "amber"),
          metric("Commission Payable", money(sumCommissionByStatus("Pending")), "Generated, not paid", "gold"),
          metric("Commission Paid This Month", money(sumCommissionByStatus("Paid")), "Paid commission records", "green"),
          metric("Upcoming Dividend", money(sumDividend("Scheduled")), "Scheduled payouts", "blue"),
          metric("Dividend Paid This Month", money(sumDividend("Paid")), "Paid payout records", "ink")
        ],
        supportedByExistingData: [
          "Payment received and payment status can come from payment records.",
          "Commission records exist in the Commission page mock and should become backend data."
        ],
        futureApiNeeds: commonFutureApiNeeds()
      };
    case "AG":
    default: {
      const agentData = createAgentScopedData(session);
      return {
        ...base,
        ...agentData,
        supportedByExistingData: [
          "Logged-in role and user id already come from AuthContext/session.",
          "Personal application lists can be filtered by backend MemberID/network permissions.",
          "Network summary can use the unilevel network records without assuming maximum depth."
        ],
        futureApiNeeds: [
          "Agent dashboard API must apply MemberID, MerchantID and network permissions server-side.",
          "Rank progress should be returned by backend ranking logic, not recalculated permanently in React.",
          ...commonFutureApiNeeds()
        ]
      };
    }
  }
}

function createBaseData(role: RoleId, session: LocalSession | null): RoleDashboardData {
  const recentApplications = applications.slice(-8).reverse().map(toApplicationRow);
  const processingQueue = applications.filter((item) => attentionStatuses.has(item.status)).map(toApplicationRow).sort((a, b) => (a.updatedDate ?? "").localeCompare(b.updatedDate ?? ""));
  const recentCompletedApplications = applications.filter((item) => completedStatuses.has(item.status)).slice(-6).reverse().map(toApplicationRow);
  const topAgents = createTopAgents();
  const products = getConfiguredProducts();
  const roleActivity = auditLogs.filter((item) => item.role === role).slice(0, 5).map(toActivityRow);

  return {
    role,
    metrics: [],
    applicationStatus: countSlices(applications.map((item) => item.status)),
    placementTrend: monthlyTrend([3.2, 4.1, 3.8, 5.6, 6.2, 5.9, 7.4, 8.1, 7.7, 9.2, 10.1, 11.4], "amount"),
    applicationVolumeTrend: monthlyTrend([12, 16, 15, 18, 22, 20, 24, 27, 25, 29, 33, 31], "count"),
    completionTrend: monthlyTrend([7, 9, 8, 11, 13, 14, 16, 15, 18, 19, 22, 24], "count"),
    commissionTrend: monthlyTrend([92, 110, 104, 138, 156, 149, 168, 174, 181, 196, 214, 228], "amount", 1000),
    dividendTrend: monthlyTrend([54, 58, 63, 61, 72, 76, 81, 88, 92, 96, 103, 111], "amount", 1000),
    paymentTrend: monthlyTrend([420, 465, 438, 520, 610, 585, 690, 735, 710, 790, 842, 886], "amount", 1000),
    paymentStatus: countSlices(payments.map((item) => item.status)),
    productPerformance: products.map((product, index) => ({
      productCode: product.code,
      productName: product.name,
      amount: [6200000, 4100000, 1850000, 1320000, 940000][index] ?? 650000,
      count: [8, 6, 4, 3, 2][index] ?? 1
    })),
    productApplicationCounts: products.map((product) => {
      const count = applications.filter((item) => item.trustProduct === product.name || normalizeProductName(item.trustProduct) === normalizeProductName(product.name)).length;
      return { productCode: product.code, productName: product.name, amount: 0, count: count || (product.name === "MyTrust" ? 9 : 2) };
    }),
    rankDistribution: countSlices(networkRecords.map((item) => rankNameToCode[item.ranking] ?? "TR")),
    recentApplications,
    processingQueue,
    recentCompletedApplications,
    topAgents,
    attentionItems: [
      { label: "Applications pending processing", value: String(processingQueue.length), status: "Pending Review", path: "/trust/listing" },
      { label: "Payment verification pending", value: String(payments.filter((item) => item.status !== "Paid").length), status: "Processing", path: "/trust/payment" },
      { label: "Dividend scheduled", value: String(dividendSchedule.length), status: "Pending", path: "/trust/dividend-scheduled" },
      { label: "Commission pending processing", value: String(commissionRows.filter((item) => item.status === "Pending").length), status: "Pending", path: "/income/commission" }
    ],
    paymentProcessing: payments.filter((item) => item.status !== "Paid").map(toPaymentRow),
    dividendSchedule,
    commissionProcessing: commissionRows,
    recentActivity: roleActivity.length ? roleActivity : auditLogs.slice(0, 5).map(toActivityRow),
    mockNotes: [
      "Dashboard data is served by src/features/dashboard/mockDashboardService.ts until backend dashboard APIs are available.",
      "Application statuses come from src/data/applications.json and StatusBadge.",
      "Trust Products come from Trust Plan configuration, including MyTrust, without hardcoding dashboard logic to one product."
    ],
    supportedByExistingData: [],
    futureApiNeeds: [],
    quickActions: getQuickActions(role),
    agentProfile: session ? { name: session.name, agentCode: getAgentCode(session.userId), currentRank: getAgentRank(session.userId) } : undefined
  };
}

function createAgentScopedData(session: LocalSession | null): Partial<RoleDashboardData> {
  const agentName = session?.name ?? "Agent User 01";
  const agentCode = getAgentCode(session?.userId ?? "USR-0201");
  const networkRoot = networkRecords.find((item) => item.id === session?.userId) ?? networkRecords[0];
  const permittedApplications = applications.filter((item) => item.agent === "Nur Farhana Ismail" || item.createdBy === "Nur Farhana Ismail").slice(0, 8);
  const completedPlacement = permittedApplications.filter((item) => completedStatuses.has(item.status)).reduce((total, item) => total + item.investmentAmount, 0);
  const directDownlines = networkRecords.filter((item) => item.uplineId === networkRoot?.id);
  const totalNetwork = getDescendantIds(networkRoot?.id ?? "").length;
  const rank = getAgentRank(session?.userId ?? "USR-0201");

  return {
    agentProfile: { name: agentName, agentCode, currentRank: rank },
    metrics: [
      metric("Personal Completed Sales", money(completedPlacement), "Completed Trust amount only", "gold"),
      metric("Active / Completed Trusts", String(permittedApplications.filter((item) => completedStatuses.has(item.status)).length), "Personal applications", "green"),
      metric("Applications This Month", String(permittedApplications.length), "Current dashboard period", "blue"),
      metric("Commission Earned", money(commissionRows.filter((item) => item.agentCode === agentCode || item.agent === "Alex Tan").reduce((total, item) => total + item.amount, 0)), "Personal and permitted overriding", "ink"),
      metric("Pending Commission", money(1200), "Pending payout", "amber"),
      metric("Direct Downlines", String(directDownlines.length), "Direct recruits only", "blue")
    ],
    placementTrend: monthlyTrend([120, 85, 140, 160, 130, 210, 180, 220, 240, 260, 310, 340], "amount", 1000),
    applicationStatus: countSlices(permittedApplications.map((item) => item.status)),
    productPerformance: getConfiguredProducts().slice(0, 4).map((product, index) => ({
      productCode: product.code,
      productName: product.name,
      amount: [860000, 420000, 310000, 250000][index] ?? 120000,
      count: [3, 2, 1, 1][index] ?? 1
    })),
    rankProgress: {
      currentRank: rank,
      nextRank: rank === "TR" ? "TM" : rank === "TM" ? "TD" : rank === "TD" ? "GTD" : undefined,
      personalSales: networkRoot?.personalSales ?? completedPlacement,
      personalSalesTarget: 100000,
      directRankLabel: rank === "TM" ? "TM" : rank === "TD" ? "TD" : undefined,
      directRankCount: rank === "TM" ? directDownlines.filter((item) => rankNameToCode[item.ranking] === "TM").length : rank === "TD" ? directDownlines.filter((item) => rankNameToCode[item.ranking] === "TD").length : undefined,
      directRankTarget: rank === "TM" ? 5 : rank === "TD" ? 2 : undefined,
      note: rank === "GTD" ? "Highest normal automatic progression rank achieved." : undefined
    },
    networkSummary: {
      directDownlines: directDownlines.length,
      totalNetworkMembers: totalNetwork,
      rankDistribution: countSlices(getDescendantIds(networkRoot?.id ?? "").map((id: string) => rankNameToCode[networkRecords.find((item) => item.id === id)?.ranking ?? ""] ?? "TR"))
    },
    recentApplications: permittedApplications.map(toApplicationRow),
    recentCommission: commissionRows.slice(0, 5),
    quickActions: getQuickActions("AG")
  };
}

function getConfiguredProducts() {
  return trustPlanMockData.map((plan) => ({
    code: plan.basicInfo.productCode,
    name: plan.basicInfo.productName
  }));
}

function toApplicationRow(record: ApplicationRecord): TrustApplicationRow {
  return {
    trustId: record.applicationNumber.replace("TF-APP-2026-", ""),
    client: record.clientName,
    product: record.trustProduct,
    agent: record.agent,
    placement: record.investmentAmount,
    status: record.status,
    createdDate: record.applicationDate,
    updatedDate: record.lastUpdated,
    completedDate: completedStatuses.has(record.status) ? record.lastUpdated : undefined,
    waitingDuration: processingStatuses.has(record.status) ? `${Math.max(1, 28 - Number(record.lastUpdated.slice(-2)))} days` : undefined,
    actionPath: `/trust/applications/${record.id}/personal-details`
  };
}

function toPaymentRow(record: PaymentRecord): PaymentProcessingRow {
  return {
    trustId: record.trustAccount.replace("TF-AC-2026-", ""),
    client: record.client,
    product: "MyTrust",
    amount: record.amount,
    paymentDate: record.paymentDate,
    reference: record.receiptNumber,
    status: record.status,
    actionPath: "/trust/payment"
  };
}

function toActivityRow(record: AuditLog): ActivityRow {
  return {
    dateTime: record.dateTime,
    user: record.user,
    module: record.module,
    action: record.action,
    reference: record.recordReference
  };
}

function createTopAgents(): AgentPerformanceRow[] {
  return [
    { agent: "Michelle Wong", agentCode: "AGT000789", rank: "TD", personalCompletedSales: 8750000, directDownlines: 5, completedTrustCount: 7 },
    { agent: "Nur Farhana Ismail", agentCode: "AGT000456", rank: "TD", personalCompletedSales: 5245000, directDownlines: 3, completedTrustCount: 6 },
    { agent: "Azlan Hakim", agentCode: "AGT000123", rank: "TM", personalCompletedSales: 5430000, directDownlines: 4, completedTrustCount: 5 },
    { agent: "Agent User 01", agentCode: "V0193", rank: "GTD", personalCompletedSales: 428000, directDownlines: 8, completedTrustCount: 4 }
  ];
}

const commissionRows: CommissionProcessingRow[] = [
  { trustId: "000123", client: "John Tan", product: "MyTrust", agent: "Alex Tan", agentCode: "AGT000123", rankAtCompleted: "TR", amount: 5000, status: "Paid", generatedDate: "2026-09-08" },
  { trustId: "000123", client: "John Tan", product: "MyTrust", agent: "Brian Lee", agentCode: "AGT000456", rankAtCompleted: "TM", amount: 300, status: "Paid", generatedDate: "2026-09-08" },
  { trustId: "000456", client: "Mary Wong", product: "Flexi+", agent: "David Choo", agentCode: "AGT001204", rankAtCompleted: "TR", amount: 6000, status: "Paid", generatedDate: "2026-09-15" },
  { trustId: "000456", client: "Mary Wong", product: "Flexi+", agent: "Brian Lee", agentCode: "AGT000456", rankAtCompleted: "TM", amount: 500, status: "Pending", generatedDate: "2026-09-15" },
  { trustId: "001025", client: "Tan Wei", product: "Secure Trust", agent: "Ong Siew", agentCode: "AGT002601", rankAtCompleted: "GTD", amount: 120, status: "Pending", generatedDate: "2026-09-21" }
];

const dividendSchedule: DividendScheduleRow[] = [
  { trustId: "000193", client: "Stephen Fong", product: "MyTrust", amount: 2667, payoutDate: "2026-10-01", status: "Scheduled" },
  { trustId: "000194", client: "Aisyah binti Rahman", product: "MyTrust", amount: 7083, payoutDate: "2026-10-01", status: "Scheduled" },
  { trustId: "000195", client: "Lim Wei Jian", product: "Secure Trust", amount: 3150, payoutDate: "2026-10-15", status: "Scheduled" },
  { trustId: "000196", client: "Rohana binti Salleh", product: "Flexi+", amount: 4800, payoutDate: "2026-09-30", status: "Paid" }
];

function getQuickActions(role: RoleId): QuickAction[] {
  if (role === "AG") {
    return [
      { label: "Create Trust Application", path: "/trust/applications/new/personal-details" },
      { label: "Trust Application Listing", path: "/trust/listing" },
      { label: "Draft Listing", path: "/trust/draft-listing" },
      { label: "My Network", path: "/my-network/the-trust" },
      { label: "Income", path: "/income/commission" },
      { label: "Resources", path: "/resources/memo" }
    ];
  }

  return [
    { label: "Trust Listing", path: "/trust/listing" },
    { label: "Trust Payment", path: "/trust/payment" },
    { label: "Network", path: "/network/the-trust" },
    { label: "Income", path: "/income/commission" }
  ];
}

function monthlyTrend(values: number[], key: "amount" | "count", multiplier = 1) {
  const labels = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  return values.map((value, index) => ({
    label: labels[index],
    [key]: Math.round(value * multiplier),
    value: Math.round(value * multiplier)
  }));
}

function countSlices(values: string[]): StatusSlice[] {
  const counts = values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function countByStatus(status: string) {
  return applications.filter((item) => item.status === status).length;
}

function countCompleted() {
  return applications.filter((item) => completedStatuses.has(item.status)).length;
}

function countProcessing() {
  return applications.filter((item) => processingStatuses.has(item.status)).length;
}

function sumCompletedPlacement() {
  return applications.filter((item) => completedStatuses.has(item.status)).reduce((total, item) => total + item.investmentAmount, 0);
}

function sumPayments(status: string) {
  return payments.filter((payment) => payment.status === status).reduce((total, payment) => total + payment.amount, 0);
}

function sumCommissionByStatus(status: string) {
  return commissionRows.filter((item) => item.status === status).reduce((total, item) => total + item.amount, 0);
}

function sumDividend(status: string) {
  return dividendSchedule.filter((item) => item.status === status).reduce((total, item) => total + item.amount, 0);
}

function money(value: number) {
  if (value >= 1_000_000) return `RM ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  return `RM ${value.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
}

function metric(label: string, value: string, helper?: string, tone?: DashboardMetric["tone"]): DashboardMetric {
  return { label, value, helper, tone };
}

function getAgentCode(userId: string) {
  const codeMap: Record<string, string> = {
    "USR-0201": "V0193",
    "USR-0202": "V0194",
    "USR-0203": "V0195",
    "USR-0204": "V0196"
  };
  return codeMap[userId] ?? "V0193";
}

function getAgentRank(userId: string): DashboardRankCode {
  const record = networkRecords.find((item) => item.id === userId) ?? networkRecords[0];
  return rankNameToCode[record?.ranking ?? ""] ?? "TR";
}

function getDescendantIds(rootId: string): string[] {
  const children = networkRecords.filter((item) => item.uplineId === rootId);
  return children.flatMap((child) => [child.id, ...getDescendantIds(child.id)]);
}

function normalizeProductName(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function commonFutureApiNeeds() {
  return [
    "GET /api/dashboard should identify RoleCode, MemberID and MerchantID from JWT claims.",
    "Commission totals require generated commission records with status, generated date, paid date and rank at completed.",
    "Dividend totals require payout schedule records derived from product payout frequency and calculation start.",
    "Payment queues require payment records linked to Trust IDs and product names."
  ];
}
