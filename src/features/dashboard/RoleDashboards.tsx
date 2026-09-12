import { useEffect, useState } from "react";
import { Award, ShieldCheck } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { roles } from "../../config/roles";
import { useAuth } from "../../hooks/useAuth";
import { getMockDashboardData } from "./mockDashboardService";
import type { DashboardPeriod, RoleDashboardData } from "./types";
import {
  ActivityList,
  ApplicationTable,
  AttentionList,
  ChartCard,
  CommissionTable,
  DashboardMetricGrid,
  DashboardSection,
  DashboardSkeleton,
  DividendTable,
  formatCurrency,
  PaymentTable,
  ProductList,
  QuickActions
} from "./DashboardComponents";

export function RoleBasedDashboardPage() {
  const { session } = useAuth();
  const [data, setData] = useState<RoleDashboardData | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    getMockDashboardData(session).then((nextData) => {
      if (active) setData(nextData);
    });
    return () => {
      active = false;
    };
  }, [session]);

  const role = data?.role ?? session?.role ?? "AG";

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${roles[role]} dashboard for The Trust workflows, product configuration, network, commission, dividend and payment operations.`}
      />

      {!data ? (
        <DashboardSkeleton />
      ) : role === "SA" ? (
        <SuperAdminDashboard data={data} />
      ) : role === "AD" ? (
        <AdminDashboard data={data} />
      ) : role === "OP" ? (
        <OperationDashboard data={data} />
      ) : role === "AC" ? (
        <AccountDashboard data={data} />
      ) : (
        <AgentDashboard data={data} />
      )}
    </>
  );
}

function SuperAdminDashboard({ data }: { data: RoleDashboardData }) {
  return (
    <div className="space-y-5">
      <DashboardMetricGrid metrics={data.metrics} />
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <ChartCard title="Completed Trust Placement Trend" data={data.placementTrend} kind="line" dataKey="amount" currency height={320} />
        <ChartCard title="Application Workflow Distribution" data={data.applicationStatus} kind="donut" dataKey="value" height={320} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Trust Product Performance" data={data.productPerformance} kind="bar" dataKey="amount" currency />
        <ChartCard title="Commission Trend" data={data.commissionTrend} kind="line" dataKey="amount" currency />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Dividend Trend" data={data.dividendTrend} kind="bar" dataKey="amount" currency height={340} />
        <ChartCard title="Agent Rank Distribution" data={data.rankDistribution} kind="donut" dataKey="value" height={340} />
      </div>
      <div>
        <DashboardSection title="Management Attention" description="Only categories currently represented by The Trust data model or dashboard mock service.">
          <AttentionList items={data.attentionItems} />
        </DashboardSection>
      </div>
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardSection title="Top Performing Agents" description="Completed Trust placement only, excluding draft and incomplete applications.">
          <TopAgentsTable data={data} />
        </DashboardSection>
        <DashboardSection title="Recent Trust Applications">
          <ApplicationTable rows={data.recentApplications} />
        </DashboardSection>
      </div>
    </div>
  );
}

function AdminDashboard({ data }: { data: RoleDashboardData }) {
  return (
    <div className="space-y-5">
      <DashboardMetricGrid metrics={data.metrics} />
      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <ChartCard title="Application Volume Trend" data={data.applicationVolumeTrend} kind="line" dataKey="count" />
        <ChartCard title="Application Status Distribution" data={data.applicationStatus} kind="donut" dataKey="value" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Applications by Trust Product" data={data.productApplicationCounts} kind="bar" dataKey="count" />
        <ChartCard title="Completion Trend" data={data.completionTrend} kind="line" dataKey="count" />
      </div>
      <DashboardSection title="Applications Requiring Action" description="Administration queue built from real workflow statuses in the application list.">
        <ApplicationTable rows={data.processingQueue} mode="processing" />
      </DashboardSection>
      <div className="grid gap-5 xl:grid-cols-2">
        <DashboardSection title="Recent Agent Registration">
          <TopAgentsTable data={data} compact />
        </DashboardSection>
        <DashboardSection title="Recent Activity" description="Sourced from the existing audit log model.">
          <ActivityList rows={data.recentActivity} />
        </DashboardSection>
      </div>
    </div>
  );
}

function OperationDashboard({ data }: { data: RoleDashboardData }) {
  return (
    <div className="space-y-5">
      <DashboardMetricGrid metrics={data.metrics} />
      <DashboardSection title="Applications Requiring Processing" description="Oldest pending review, pending approval, processing, and returned applications are surfaced first." className="border-amber-200">
        <ApplicationTable rows={data.processingQueue} mode="processing" />
      </DashboardSection>
      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Processing Queue by Status" data={data.applicationStatus.filter((item) => ["Pending Review", "Pending Approval", "Processing", "Rejected"].includes(item.name))} kind="bar" dataKey="value" />
        <ChartCard title="Daily Application Volume" data={data.applicationVolumeTrend.slice(-7)} kind="line" dataKey="count" />
        <ChartCard title="Completed Applications Trend" data={data.completionTrend.slice(-7)} kind="line" dataKey="count" />
      </div>
      <DashboardSection title="Recently Completed Trust Applications">
        <ApplicationTable rows={data.recentCompletedApplications} mode="completed" />
      </DashboardSection>
    </div>
  );
}

function AccountDashboard({ data }: { data: RoleDashboardData }) {
  return (
    <div className="space-y-5">
      <DashboardMetricGrid metrics={data.metrics} />
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <ChartCard title="Payment Collection Trend" data={data.paymentTrend} kind="line" dataKey="amount" currency />
        <ChartCard title="Commission Trend" data={data.commissionTrend} kind="bar" dataKey="amount" currency />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.72fr]">
        <ChartCard title="Dividend Payout Trend" data={data.dividendTrend} kind="line" dataKey="amount" currency />
        <ChartCard title="Payment Status Distribution" data={data.paymentStatus} kind="donut" dataKey="value" />
      </div>
      <DashboardSection title="Pending Payment Processing">
        <PaymentTable rows={data.paymentProcessing} />
      </DashboardSection>
      <div className="grid gap-5 xl:grid-cols-2">
        <DashboardSection title="Upcoming Dividend Schedule">
          <DividendTable rows={data.dividendSchedule} />
        </DashboardSection>
        <DashboardSection title="Commission Processing">
          <CommissionTable rows={data.commissionProcessing} />
        </DashboardSection>
      </div>
    </div>
  );
}

function AgentDashboard({ data }: { data: RoleDashboardData }) {
  const profile = data.agentProfile;
  const personalSales = data.metrics.find((metric) => metric.label === "Personal Completed Sales")?.value ?? "-";
  const pendingCommission = data.metrics.find((metric) => metric.label === "Pending Commission")?.value ?? "-";
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-lg border border-[#2C2C2C] bg-[#0D0D0D] p-5 text-white shadow-[0_18px_45px_rgba(17,17,17,0.16)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F7E7A4] to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[#D4AF37]/12 blur-3xl" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_560px] lg:items-stretch">
          <div className="flex min-w-0 flex-col justify-between gap-7">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#F7E7A4]">
                <span className="h-1.5 w-1.5 rounded-full bg-brandGold" />
                Private Agent View
              </div>
              <p className="mt-5 text-sm font-medium text-white/60">Welcome back</p>
              <h1 className="mt-1 break-words text-3xl font-semibold leading-tight text-white">{profile?.name ?? "Agent"}</h1>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/[0.08] px-4 font-semibold text-white">Agent Code: {profile?.agentCode}</span>
              <span className="inline-flex min-h-10 items-center rounded-full border border-[#F7E7A4]/60 bg-[#FFF8E1] px-4 font-semibold text-[#8A650F]">Rank: {profile?.currentRank}</span>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Access Scope</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/78">
                  Personal sales, network and commission figures are scoped to this logged-in agent, with MemberID and MerchantID enforced by the dashboard API.
                </p>
              </div>
              <ShieldCheck className="h-8 w-8 shrink-0 text-brandGold" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Completed Sales</p>
                <p className="mt-1 text-xl font-semibold text-white">{personalSales}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Pending Commission</p>
                <p className="mt-1 text-xl font-semibold text-[#F7E7A4]">{pendingCommission}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DashboardMetricGrid metrics={data.metrics} />
      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <ChartCard title="Personal Completed Sales Trend" data={data.placementTrend} kind="line" dataKey="amount" currency />
        <ChartCard title="My Application Status" data={data.applicationStatus} kind="donut" dataKey="value" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <ChartCard title="My Commission Trend" data={data.commissionTrend} kind="bar" dataKey="amount" currency />
        <DashboardSection title="My Trust Product Sales">
          <ProductList rows={data.productPerformance} />
        </DashboardSection>
      </div>
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <RankProgressPanel data={data} />
        <NetworkSummaryPanel data={data} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardSection title="My Recent Applications">
          <ApplicationTable rows={data.recentApplications} />
        </DashboardSection>
        <DashboardSection title="My Recent Commission">
          <CommissionTable rows={data.recentCommission ?? []} />
        </DashboardSection>
      </div>
      <DashboardSection title="Quick Actions">
        <QuickActions actions={data.quickActions ?? []} />
      </DashboardSection>
    </div>
  );
}

function TopAgentsTable({ data, compact = false }: { data: RoleDashboardData; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-[13px]">
        <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
          <tr>
            {(compact ? ["Agent", "Code", "Rank", "Direct"] : ["Agent", "Agent Code", "Rank", "Personal Completed Sales", "Direct Downlines", "Completed Trusts"]).map((header) => (
              <th key={header} className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.topAgents.map((agent) => (
            <tr key={agent.agentCode} className="transition hover:bg-gray-50">
              <td className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold text-textPrimary">{agent.agent}</td>
              <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{agent.agentCode}</td>
              <td className="whitespace-nowrap border-b border-line px-4 py-3"><StatusBadge status={agent.rank} /></td>
              {compact ? (
                <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{agent.directDownlines}</td>
              ) : (
                <>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{formatCurrency(agent.personalCompletedSales)}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{agent.directDownlines}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{agent.completedTrustCount}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankProgressPanel({ data }: { data: RoleDashboardData }) {
  const progress = data.rankProgress;
  if (!progress) return null;
  const personalPercent = Math.min(100, (progress.personalSales / progress.personalSalesTarget) * 100);
  const directPercent = progress.directRankTarget ? Math.min(100, ((progress.directRankCount ?? 0) / progress.directRankTarget) * 100) : 0;

  return (
    <DashboardSection title="Rank Progress" description="Normal automatic progression is TR -> TM -> TD -> GTD. Angel Partner is not part of this path.">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Current Rank</p>
            <p className="mt-1 text-lg font-semibold text-textPrimary">{progress.currentRank}</p>
          </div>
          {progress.nextRank ? (
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Next Rank</p>
              <p className="mt-1 text-lg font-semibold text-[#8A650F]">{progress.nextRank}</p>
            </div>
          ) : <Award className="h-8 w-8 text-brandGold" />}
        </div>
        <ProgressLine label="Personal Sales" value={progress.personalSales} target={progress.personalSalesTarget} percent={personalPercent} />
        {progress.directRankTarget ? (
          <ProgressLine label={`Direct ${progress.directRankLabel}`} count={progress.directRankCount ?? 0} targetCount={progress.directRankTarget} percent={directPercent} />
        ) : null}
        {progress.note ? <p className="rounded-lg bg-[#FFF8E1] p-3 text-sm font-medium text-[#8A650F]">{progress.note}</p> : null}
      </div>
    </DashboardSection>
  );
}

function NetworkSummaryPanel({ data }: { data: RoleDashboardData }) {
  const summary = data.networkSummary;
  if (!summary) return null;

  return (
    <DashboardSection title="Network Summary" description="Unilevel network summary without assuming a maximum depth.">
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryTile label="Direct Downlines" value={summary.directDownlines.toLocaleString("en-MY")} />
        <SummaryTile label="Total Network Members" value={summary.totalNetworkMembers.toLocaleString("en-MY")} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {summary.rankDistribution.map((item) => (
          <div key={item.name} className="flex items-center justify-between rounded-lg border border-line p-3">
            <span className="text-sm font-semibold text-textPrimary">{item.name}</span>
            <span className="text-sm text-textSecondary">{item.value}</span>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-soft p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p>
      <p className="mt-1 text-xl font-semibold text-textPrimary">{value}</p>
    </div>
  );
}

function ProgressLine({ label, value, target, count, targetCount, percent }: { label: string; value?: number; target?: number; count?: number; targetCount?: number; percent: number }) {
  const achieved = percent >= 100;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-textPrimary">{label}</span>
        <span className={achieved ? "font-semibold text-green-700" : "text-textSecondary"}>
          {typeof value === "number" && typeof target === "number" ? `${formatCurrency(value)} / ${formatCurrency(target)}` : `${count} / ${targetCount}`}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={achieved ? "h-full rounded-full bg-green-600" : "h-full rounded-full bg-brandGold"} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
