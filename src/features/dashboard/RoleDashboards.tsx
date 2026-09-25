import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AlertTriangle, Award, BarChart3, BriefcaseBusiness, CalendarDays, CircleDollarSign, FileText, Info, Network, RefreshCcw, ShieldCheck, Target, UsersRound } from "lucide-react";
import {
  dashboardApi,
  type AdminDashboard,
  type AdminDashboardAgentNetwork,
  type AdminDashboardApplicationPipeline,
  type AdminDashboardAttention,
  type AdminDashboardLifecycle,
  type DashboardApplicationStatus,
  type DashboardNetworkMember,
  type DashboardPlacementCollection,
  type DashboardResponse,
  type TrustRepresentativeDashboard
} from "../../api/dashboardApi";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { roles } from "../../config/roles";
import { useAuth } from "../../hooks/useAuth";
import type { RoleId } from "../../types";
import { DashboardEmptyState, DashboardSection, DashboardSkeleton } from "./DashboardComponents";

interface SalesTrendPoint {
  month: number;
  label: string;
  amount: number;
  completedTrusts: number;
}

interface StatusPoint {
  name: string;
  value: number;
}

const currentYear = new Date().getFullYear();
const chartColors = ["#111111", "#D4AF37", "#2563EB", "#16A34A", "#F59E0B", "#DC2626", "#6B7280"];
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function RoleBasedDashboardPage() {
  const { session } = useAuth();
  const sessionRole = session?.role ?? null;
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(isDashboardApiRole(sessionRole));
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (year?: number) => {
    if (!isDashboardApiRole(sessionRole)) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await dashboardApi.getDashboard(year);
      setData(response);
      if (!year) {
        const responseYear = response.Admin?.Year ?? response.TrustRepresentative?.Year;
        if (responseYear) {
          setSelectedYear(responseYear);
        }
      }
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [sessionRole]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const role = data?.RoleCode ?? sessionRole ?? "AG";
  const showYearSelector = role === "AG" || role === "AD" || role === "SA";
  const dashboardYear = data?.Admin?.Year ?? data?.TrustRepresentative?.Year ?? selectedYear;
  const yearOptions = useMemo(() => buildYearOptions(dashboardYear), [dashboardYear]);

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextYear = Number(event.target.value);
    setSelectedYear(nextYear);
    loadDashboard(nextYear);
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={role === "AG" ? "Trust Representative performance, applications, commission, and network overview." : role === "AD" || role === "SA" ? "Administrative trust placement, application, collection, and agent performance overview." : `${roles[role]} dashboard structure is ready for future dashboard metrics.`}
        actions={showYearSelector ? (
          <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-textPrimary shadow-soft">
            <CalendarDays className="h-4 w-4 text-textSecondary" />
            <span>Year</span>
            <select value={selectedYear} onChange={handleYearChange} disabled={loading} className="bg-transparent text-sm font-semibold outline-none disabled:opacity-60">
              {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
        ) : null}
      />

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <DashboardError message={error} onRetry={() => loadDashboard(selectedYear)} />
      ) : role === "AG" ? (
        <TrustRepresentativeDashboardView data={data?.TrustRepresentative ?? null} />
      ) : role === "AD" || role === "SA" ? (
        <AdminDashboardView data={data?.Admin ?? null} />
      ) : (
        <RolePlaceholder role={role} />
      )}
    </>
  );
}

function TrustRepresentativeDashboardView({ data }: { data: TrustRepresentativeDashboard | null }) {
  if (!data) {
    return <DashboardEmptyState title="Dashboard unavailable" description="Trust Representative dashboard data is not available right now." />;
  }

  const summary = data.Summary;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Personal Sales" value={formatCurrency(summary?.PersonalSales)} icon={<CircleDollarSign className="h-4 w-4" />} tone="gold" />
        <SummaryCard title="Active Trust Value" value={formatCurrency(summary?.ActiveTrustValue)} helper={`${formatInteger(summary?.ActiveTrustCount)} Active Trusts`} icon={<ShieldCheck className="h-4 w-4" />} tone="blue" />
        <SummaryCard title="Completed Trusts" value={formatInteger(summary?.CompletedTrusts)} icon={<FileText className="h-4 w-4" />} tone="green" />
        <SummaryCard title="Current Rank" value={cleanText(summary?.RankName)} icon={<Award className="h-4 w-4" />} tone="ink" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PersonalSalesTrendChart data={data} />
        <RankProgressCard data={data} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)] xl:items-stretch">
        <ApplicationStatusChart status={data.ApplicationStatus ?? null} className="h-full" />
        <div className="grid h-full gap-5">
          <ActionRequiredCard data={data} className="h-full" />
          <NetworkCard data={data} className="h-full" />
        </div>
      </div>

      <div>
        <CommissionCard data={data} />
      </div>

      <RecentApplicationsTable data={data} />
    </div>
  );
}

function AdminDashboardView({ data }: { data: AdminDashboard | null }) {
  if (!data) {
    return <DashboardEmptyState title="Dashboard unavailable" description="Admin dashboard data is not available right now." />;
  }

  const summary = data.Summary;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard title="Total Trust Placement" value={formatCurrency(summary?.TotalTrustPlacement)} helper={`${formatCurrency(summary?.ThisMonthPlacement)} this month`} icon={<CircleDollarSign className="h-4 w-4" />} tone="gold" />
        <SummaryCard title="Active Trust Value" value={formatCurrency(summary?.ActiveTrustValue)} helper={`${formatInteger(summary?.ActiveTrustCount)} Active Trusts`} icon={<ShieldCheck className="h-4 w-4" />} tone="blue" />
        <SummaryCard title="Approved Collection" value={formatCurrency(summary?.ApprovedCollection)} helper={`${formatCurrency(summary?.ThisMonthApprovedCollection)} this month`} icon={<CircleDollarSign className="h-4 w-4" />} tone="green" />
        <SummaryCard title="Total Applications" value={formatInteger(summary?.TotalApplications)} helper={`${formatInteger(summary?.ThisMonthApplications)} new this month`} icon={<FileText className="h-4 w-4" />} tone="ink" />
        <SummaryCard title="Completed Trusts" value={formatInteger(summary?.CompletedTrusts)} helper={`${formatInteger(summary?.ThisMonthCompletedTrusts)} completed this month`} icon={<Award className="h-4 w-4" />} tone="green" />
        <SummaryCard title="Trust Agents" value={formatInteger(summary?.TotalAgents)} helper={`${formatInteger(summary?.NewAgentsThisMonth)} new this month`} icon={<UsersRound className="h-4 w-4" />} tone="blue" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminPlacementTrendChart data={data} />
        <AdminStatsCard title="Trust Lifecycle" rows={[
          { label: "Maturing Next 30 Days", value: data.Lifecycle?.MaturingNext30Days },
          { label: "Maturing Next 90 Days", value: data.Lifecycle?.MaturingNext90Days },
          { label: "Matured", value: data.Lifecycle?.Matured },
          { label: "Early Withdrawn", value: data.Lifecycle?.EarlyWithdrawn }
        ]} source={data.Lifecycle ?? null} variant="lifecycle" className="h-full" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ApplicationPipelineChart pipeline={data.ApplicationPipeline ?? null} />
        <RequiresAttentionCard attention={data.RequiresAttention ?? null} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PlacementVsCollectionChart rows={data.PlacementVsCollection ?? []} />
        <AdminStatsCard title="Agent Network" rows={[
          { label: "Total Agents", value: data.AgentNetwork?.TotalAgents },
          { label: "New This Month", value: data.AgentNetwork?.NewAgentsThisMonth },
          { label: "Selling Agents", value: data.AgentNetwork?.SellingAgents },
          { label: "Agents With No Sales", value: data.AgentNetwork?.AgentsWithNoSales }
        ]} source={data.AgentNetwork ?? null} variant="network" className="h-full" />
      </div>

      <AgentPerformanceTable rows={data.AgentPerformance ?? []} />
    </div>
  );
}

function AdminPlacementTrendChart({ data }: { data: AdminDashboard }) {
  const trend = normalizeAdminPlacementTrend(data.PlacementTrend);
  const hasData = Boolean(data.PlacementTrend?.length);

  return (
    <DashboardSection title="Trust Placement Trend">
      {hasData ? (
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 16, left: 18, bottom: 0 }}>
              <CartesianGrid stroke="#ECEFF3" vertical={false} strokeDasharray="4 6" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} dy={8} interval={0} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} tickFormatter={formatCompactCurrency} width={62} />
              <Tooltip cursor={{ stroke: "#D4AF37", strokeDasharray: "4 4" }} content={<AdminPlacementTooltip />} />
              <Line type="monotone" dataKey="amount" name="Trust Placement" stroke="#111111" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: "#FFFFFF" }} activeDot={{ r: 5, stroke: "#FFFFFF", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <DashboardEmptyState title="No placement trend data" description="Monthly trust placement will appear when dashboard data is available." />
      )}
    </DashboardSection>
  );
}

function ApplicationPipelineChart({ pipeline }: { pipeline: AdminDashboardApplicationPipeline | null }) {
  const rows = normalizeApplicationPipeline(pipeline);
  const hasData = Boolean(pipeline);

  return (
    <DashboardSection
      title="Application Pipeline"
      action={<span className="inline-flex min-w-10 justify-center rounded-lg bg-soft px-3 py-1 text-sm font-semibold text-textPrimary">{formatInteger(pipeline?.Total)}</span>}
    >
      {hasData ? (
        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 18, left: 42, bottom: 4 }}>
              <CartesianGrid stroke="#ECEFF3" horizontal={false} strokeDasharray="4 6" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} tickFormatter={formatInteger} allowDecimals={false} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 12 }} tickFormatter={formatSingleLineLabel} width={164} />
              <Tooltip cursor={{ fill: "#F8F9FA" }} content={<CountTooltip />} />
              <Bar dataKey="value" name="Applications" fill="#111111" radius={0} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <DashboardEmptyState title="No pipeline data" description="Application status totals will appear when records are available." />
      )}
    </DashboardSection>
  );
}

function RequiresAttentionCard({ attention }: { attention: AdminDashboardAttention | null }) {
  const rows = [
    { label: "Pending Payment Approval", value: attention?.PendingPaymentApproval },
    { label: "Pending Admin Approval", value: attention?.PendingAdminApproval },
    { label: "Maturing Next 30 Days", value: attention?.MaturingNext30Days },
    { label: "Rejected This Month", value: attention?.RejectedThisMonth }
  ];

  return (
    <DashboardSection
      title="Requires Attention"
      action={<span className="inline-flex min-w-10 justify-center rounded-lg bg-white px-3 py-1 text-sm font-semibold text-amber-700 shadow-soft">{formatInteger(attention?.Total)}</span>}
      className="border-amber-200 bg-[#FFFBEB]"
    >
      {attention ? (
        <div className="space-y-3">
          <CompactPieChart rows={rows} variant="attention" />
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-white/75 px-3 py-2">
              <span className="text-[13px] font-semibold text-textPrimary">{row.label}</span>
              <span className="text-[13px] font-semibold text-amber-700">{formatInteger(row.value)}</span>
            </div>
          ))}
        </div>
      ) : (
        <DashboardEmptyState title="No attention data" description="Attention totals will appear when dashboard data is available." />
      )}
    </DashboardSection>
  );
}

function PlacementVsCollectionChart({ rows }: { rows: DashboardPlacementCollection[] }) {
  const chartRows = normalizePlacementVsCollection(rows);

  return (
    <DashboardSection title="Placement vs Collection">
      {rows.length > 0 ? (
        <>
          <div className="mb-4 flex flex-wrap gap-3 text-xs font-semibold text-textSecondary">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#111111]" />Trust Placement</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#D4AF37]" />Approved Collection</span>
          </div>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 8, right: 16, left: 18, bottom: 0 }}>
                <CartesianGrid stroke="#ECEFF3" vertical={false} strokeDasharray="4 6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} dy={8} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} tickFormatter={formatCompactCurrency} width={62} />
                <Tooltip cursor={{ fill: "#F8F9FA" }} content={<CurrencySeriesTooltip />} />
                <Bar dataKey="placementAmount" name="Trust Placement" fill="#111111" radius={0} barSize={26} />
                <Bar dataKey="collectionAmount" name="Approved Collection" fill="#D4AF37" radius={0} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <DashboardEmptyState title="No placement and collection data" description="Monthly placement and collection values will appear when records are available." />
      )}
    </DashboardSection>
  );
}

type CompactCardVariant = "lifecycle" | "attention" | "network";
type CompactCardRow = { label: string; value?: number };

function CompactPieChart({ rows, variant }: { rows: CompactCardRow[]; variant: CompactCardVariant }) {
  const total = rows.reduce((sum, row) => sum + toNumber(row.value), 0);
  const hasValues = total > 0;
  const colors = getCompactPieColors(variant);
  const chartRows = hasValues
    ? rows.map((row) => ({ name: row.label, value: toNumber(row.value) }))
    : [{ name: "No Data", value: 1 }];

  return (
    <div className="relative mx-auto h-32 w-32">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartRows} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="86%" paddingAngle={hasValues ? 2 : 0}>
            {chartRows.map((row, index) => (
              <Cell key={row.name} fill={hasValues ? colors[index % colors.length] : "#E5E7EB"} stroke="#FFFFFF" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CompactPieTooltip hasValues={hasValues} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className={`text-base font-semibold ${getCompactValueClass(variant)}`}>{formatInteger(total)}</p>
      </div>
    </div>
  );
}

function AdminStatsCard({ title, rows, source, variant, className = "" }: { title: string; rows: Array<{ label: string; value?: number }>; source: AdminDashboardAgentNetwork | AdminDashboardLifecycle | null; variant: "lifecycle" | "network"; className?: string }) {
  return (
    <DashboardSection title={title} className={`${getCompactCardClass(variant)} ${className}`}>
      {source ? (
        <div className="space-y-3">
          <CompactPieChart rows={rows} variant={variant} />
          {rows.map((row) => (
            <div key={row.label} className={`flex items-center justify-between gap-3 rounded-lg border bg-white/75 px-3 py-2 ${getCompactRowClass(variant)}`}>
              <span className="text-[13px] font-semibold text-textPrimary">{row.label}</span>
              <span className={`text-[13px] font-semibold ${getCompactValueClass(variant)}`}>{formatInteger(row.value)}</span>
            </div>
          ))}
        </div>
      ) : (
        <DashboardEmptyState title={`No ${title.toLowerCase()} data`} description="Statistics will appear when dashboard data is available." />
      )}
    </DashboardSection>
  );
}

function AgentPerformanceTable({ rows }: { rows: NonNullable<AdminDashboard["AgentPerformance"]> }) {
  return (
    <DashboardSection title="Agent Performance">
      {rows.length === 0 ? (
        <DashboardEmptyState title="No agent performance data." description="Agent performance will appear when records are available." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                {["Email", "Agent", "Rank", "Personal Sales", "Completed Trusts"].map((header) => (
                  <th key={header} className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.UserID} className="transition hover:bg-gray-50">
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textPrimary">{cleanText(row.Username)}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold text-textPrimary">{cleanText(row.FullName)}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{cleanText(row.RankName)}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{formatCurrency(row.PersonalSales)}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{formatInteger(row.CompletedTrusts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardSection>
  );
}

function SummaryCard({ title, value, helper, icon, tone }: { title: string; value: string; helper?: string; icon: React.ReactNode; tone: "ink" | "gold" | "blue" | "green" | "amber" | "red" }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{title}</p>
          <p className="mt-2 break-words text-2xl font-semibold text-textPrimary">{value}</p>
          {helper ? <p className="mt-1 text-sm text-textSecondary">{helper}</p> : null}
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${getToneClass(tone)}`}>{icon}</span>
      </div>
    </section>
  );
}

function PersonalSalesTrendChart({ data }: { data: TrustRepresentativeDashboard }) {
  const trend = normalizeSalesTrend(data.PersonalSalesTrend);
  const mobileTrend = getLatestMobileSalesTrend(trend, data.Year);
  const hasData = Boolean(data.PersonalSalesTrend?.length);

  return (
    <DashboardSection title="Personal Sales Trend">
      {hasData ? (
        <>
        <div className="h-[320px] sm:hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mobileTrend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="#ECEFF3" vertical={false} strokeDasharray="4 6" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} dy={8} interval={0} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} tickFormatter={formatCompactCurrency} width={62} />
              <Tooltip cursor={{ stroke: "#D4AF37", strokeDasharray: "4 4" }} content={<SalesTooltip />} />
              <Line type="monotone" dataKey="amount" name="Sales Amount" stroke="#111111" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: "#FFFFFF" }} activeDot={{ r: 5, stroke: "#FFFFFF", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="hidden h-[320px] sm:block">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 16, left: 18, bottom: 0 }}>
              <CartesianGrid stroke="#ECEFF3" vertical={false} strokeDasharray="4 6" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} dy={8} interval={0} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} tickFormatter={formatCompactCurrency} width={62} />
              <Tooltip cursor={{ stroke: "#D4AF37", strokeDasharray: "4 4" }} content={<SalesTooltip />} />
              <Line type="monotone" dataKey="amount" name="Sales Amount" stroke="#111111" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: "#FFFFFF" }} activeDot={{ r: 5, stroke: "#FFFFFF", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        </>
      ) : (
        <DashboardEmptyState title="No sales trend data" description="Monthly sales will appear when completed trust records are available." />
      )}
    </DashboardSection>
  );
}

function RankProgressCard({ data }: { data: TrustRepresentativeDashboard }) {
  const progress = data.RankProgress;
  const percent = clampPercentage(progress?.ProgressPercentage);

  return (
    <section className="min-w-0 rounded-xl border border-[#F1C84B] bg-white p-5 shadow-soft">
      <h2 className="text-xl font-semibold text-[#111827] sm:text-2xl">Annual Rank Progress</h2>
      {progress ? (
        <div className="mt-4 space-y-5">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#FFF7D9] via-[#FFFDF7] to-[#FFEAA3] p-5">
            <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-28 rotate-[28deg] rounded-full bg-white/35" />
            <div className="pointer-events-none absolute -right-1 -bottom-16 h-40 w-24 rotate-[28deg] rounded-full border border-white/45" />
            <div className="relative flex items-center gap-4">
              <div className="relative flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#FFE899] to-[#D59A12] shadow-[inset_0_2px_4px_rgba(255,255,255,0.65),0_10px_18px_rgba(176,122,9,0.22)]">
                <span className="absolute -bottom-3 left-4 h-7 w-4 -rotate-12 bg-[#B67B08]" />
                <span className="absolute -bottom-3 right-4 h-7 w-4 rotate-12 bg-[#B67B08]" />
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#FFE799] bg-gradient-to-b from-[#D9A317] to-[#A66A05] text-white">
                  <Award className="h-6 w-6" />
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-[#9A6508]">Current Rank</p>
                <p className="mt-2 break-words text-2xl font-bold leading-tight text-[#111827]">{cleanText(progress.RankName)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_112px] sm:items-center">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#50627F]">
                <BarChart3 className="h-5 w-5 text-[#98A7BF]" />
                <span>Personal Sales</span>
                <Info className="h-4 w-4 text-[#335A93]" />
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-2xl font-bold leading-none text-[#111827]">{formatCurrency(progress.PersonalSales)}</span>
              </div>
              <div className="mt-1 text-sm text-[#50627F]">
                <span>Achieved</span>
              </div>
            </div>
            <div className="relative mx-auto flex h-[112px] w-[112px] items-center justify-center rounded-full bg-[#E8EDF4]" style={{ background: `conic-gradient(#D79B07 ${percent * 3.6}deg, #E9EEF5 0deg)` }}>
              <div className="flex h-[86px] w-[86px] flex-col items-center justify-center rounded-full bg-white text-center">
                <span className="text-2xl font-bold leading-none text-[#B87900]">{percent.toFixed(0)}%</span>
                <span className="mt-1 text-xs font-semibold text-[#50627F]">Completed</span>
              </div>
            </div>
          </div>

          <div>
            <div className="h-4 overflow-hidden rounded-full bg-[#E8ECF2]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#0A57FF] to-[#4F87FF]" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-3 flex justify-between gap-3 text-sm font-medium text-[#50627F]">
              <span>{formatCurrency(progress.PersonalSales)}</span>
              <span>{formatCurrency(progress.PersonalSalesTarget)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-[#EDF5FF] px-4 py-3">
            <span className="flex min-w-0 items-center gap-3 text-sm font-medium text-[#385070]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#BFD7FF] bg-white text-[#0A57FF]">
                <Target className="h-6 w-6" />
              </span>
              <span className="truncate">Remaining to target</span>
            </span>
            <span className="shrink-0 text-lg font-bold text-[#0A47D9] sm:text-xl">{formatCurrency(progress.PersonalSalesRemaining)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <DashboardEmptyState title="No rank progress" description="Rank progress will appear when ranking data is available." />
        </div>
      )}
    </section>
  );
}

function ApplicationStatusChart({ status, className = "" }: { status: DashboardApplicationStatus | null; className?: string }) {
  const slices = normalizeApplicationStatus(status);
  const visibleSlices = getVisibleStatusSlices(slices);

  return (
    <DashboardSection title="Application Status" className={className}>
      {status ? (
        <div className="grid gap-4 2xl:grid-cols-[190px_minmax(0,1fr)] 2xl:items-center">
          <div className="relative mx-auto h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={visibleSlices} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} cy="50%">
                  {visibleSlices.map((entry, index) => <Cell key={entry.name} fill={entry.name === "No Applications" ? "#ECEFF3" : chartColors[index % chartColors.length]} stroke="#FFFFFF" strokeWidth={2} />)}
                </Pie>
                <Tooltip content={<StatusTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-2xl font-semibold text-textPrimary">{formatInteger(status?.Total)}</p>
            </div>
          </div>
          <div className="space-y-2">
            {slices.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg bg-soft px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-textPrimary">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="text-sm font-semibold text-textPrimary">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DashboardEmptyState title="No application status data" description="Application status totals will appear when records are available." />
      )}
    </DashboardSection>
  );
}

function ActionRequiredCard({ data, className = "" }: { data: TrustRepresentativeDashboard; className?: string }) {
  const action = data.ActionRequired;
  const items = [
    { label: "Draft Applications", value: action?.DraftApplications ?? 0 },
    { label: "Awaiting Payment", value: action?.AwaitingPayment ?? 0 },
    { label: "Payment Under Review", value: action?.PaymentPendingApproval ?? 0 }
  ];

  return (
    <DashboardSection
      title="Action Required"
      action={<span className="inline-flex min-w-10 justify-center rounded-lg bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{formatInteger(action?.Total)}</span>}
      className={`border-amber-200 ${className}`}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg bg-soft p-3">
            <span className="text-sm font-semibold text-textPrimary">{item.label}</span>
            <span className="text-sm text-textSecondary">{formatInteger(item.value)}</span>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}

function CommissionCard({ data }: { data: TrustRepresentativeDashboard }) {
  const commission = data.Commission;

  return (
    <DashboardSection title="Commission Summary">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Total Commission Earned" value={formatCurrency(commission?.TotalEarned)} />
        <SummaryTile label="This Month" value={formatCurrency(commission?.ThisMonth)} />
        <SummaryTile label="Pending" value={formatCurrency(commission?.Pending)} />
      </div>
      {commission?.Available === false ? (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-700">
          Commission information is not currently available or finalised.
        </p>
      ) : null}
    </DashboardSection>
  );
}

function NetworkCard({ data, className = "" }: { data: TrustRepresentativeDashboard; className?: string }) {
  const network = data.Network;
  const downlines = network?.LatestDownlines ?? [];

  return (
    <DashboardSection title="My Network" className={className}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-lg bg-soft p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Network className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-textPrimary">{formatInteger(network?.DirectDownline)}</p>
              <p className="text-sm text-textSecondary">Direct Downlines</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-lg bg-soft p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-textPrimary">{formatInteger(network?.TotalNetwork)}</p>
              <p className="text-sm text-textSecondary">Total Network</p>
            </div>
          </div>
        </div>
        <NetworkDownlineTable rows={downlines} />
      </div>
    </DashboardSection>
  );
}

function NetworkDownlineTable({ rows }: { rows: DashboardNetworkMember[] }) {
  if (rows.length === 0) {
    return <DashboardEmptyState title="No latest downlines" description="Recent downlines will appear when network members are available." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-[13px]">
        <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
          <tr>
            {["Email", "Rank", "Joined Date"].map((header) => (
              <th key={header} className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.UserID}-${row.JoinedAt ?? ""}`} className="transition hover:bg-gray-50">
              <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textPrimary">{getNetworkMemberEmail(row)}</td>
              <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{formatNetworkRank(row)}</td>
              <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{formatDate(row.JoinedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentApplicationsTable({ data }: { data: TrustRepresentativeDashboard }) {
  const rows = data.RecentApplications ?? [];

  return (
    <DashboardSection title="Recent Applications">
      {rows.length === 0 ? (
        <DashboardEmptyState title="No recent applications." description="Recent trust applications will appear here once available." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                {["Trust ID", "Settlor Name", "Product", "Trust Asset Amount", "Status", "Updated Date"].map((header) => (
                  <th key={header} className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.TrustID}-${row.CreatedAt ?? ""}`} className="transition hover:bg-gray-50">
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold text-textPrimary">{row.TrustID}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textPrimary">{cleanText(row.SettlorName)}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{cleanText(row.ProductCode)}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{formatCurrency(row.TrustAssetAmount)}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3"><StatusBadge status={formatApplicationStatus(row.ApplicationStatus)} /></td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{formatDate(row.UpdatedAt ?? row.CreatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardSection>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p>
      <p className="mt-2 text-xl font-semibold text-textPrimary">{value}</p>
    </div>
  );
}

function RolePlaceholder({ role }: { role: RoleId }) {
  return (
    <DashboardSection title={`${roles[role]} Dashboard`}>
      <div className="flex flex-col gap-4 rounded-lg border border-dashed border-line bg-soft p-6 text-center sm:flex-row sm:items-center sm:text-left">
        <span className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-textSecondary sm:mx-0">
          <BriefcaseBusiness className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-textPrimary">Dashboard metrics for this role are not available yet.</p>
          <p className="mt-1 text-sm leading-6 text-textSecondary">The shared Dashboard page is ready for this role, but this task only implements the Trust Representative dashboard.</p>
        </div>
      </div>
    </DashboardSection>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
          <div>
            <p className="font-semibold text-red-800">Unable to load dashboard</p>
            <p className="mt-1 text-sm text-red-700">{message}</p>
          </div>
        </div>
        <button type="button" onClick={onRetry} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white transition hover:bg-black">
          <RefreshCcw className="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>
  );
}

function SalesTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number | string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-soft">
      <div className="mb-1 font-semibold text-textPrimary">{label}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-textSecondary">Sales Amount</span>
        <span className="font-semibold text-textPrimary">{formatCurrency(value)}</span>
      </div>
    </div>
  );
}

function StatusTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string }>; }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (item.name === "No Applications") return null;

  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-textSecondary">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? "#111111" }} />
          {item.name}
        </span>
        <span className="font-semibold text-textPrimary">{formatInteger(Number(item.value ?? 0))}</span>
      </div>
    </div>
  );
}

function AdminPlacementTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number | string; payload?: AdminPlacementTrendPoint }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;

  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-soft">
      <div className="mb-1 font-semibold text-textPrimary">{label}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-textSecondary">Trust Placement</span>
        <span className="font-semibold text-textPrimary">{formatCurrency(row?.amount)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-4">
        <span className="text-textSecondary">Completed Trusts</span>
        <span className="font-semibold text-textPrimary">{formatInteger(row?.completedTrusts)}</span>
      </div>
    </div>
  );
}

function CountTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number | string }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <span className="text-textSecondary">{label}</span>
        <span className="font-semibold text-textPrimary">{formatInteger(payload[0]?.value)}</span>
      </div>
    </div>
  );
}

function CurrencySeriesTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-soft">
      {label ? <div className="mb-1 font-semibold text-textPrimary">{label}</div> : null}
      {payload.map((item) => (
        <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-textSecondary">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? "#111111" }} />
            {item.name}
          </span>
          <span className="font-semibold text-textPrimary">{formatCurrency(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

function CompactPieTooltip({ active, payload, hasValues }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string }>; hasValues: boolean }) {
  if (!active || !payload?.length || !hasValues) return null;
  const item = payload[0];

  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-textSecondary">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? "#111111" }} />
          {item.name}
        </span>
        <span className="font-semibold text-textPrimary">{formatInteger(item.value)}</span>
      </div>
    </div>
  );
}

interface AdminPlacementTrendPoint {
  month: number;
  label: string;
  amount: number;
  completedTrusts: number;
}

interface PipelinePoint {
  name: string;
  value: number;
}

interface PlacementCollectionPoint {
  month: number;
  label: string;
  placementAmount: number;
  collectionAmount: number;
}

function normalizeAdminPlacementTrend(items: AdminDashboard["PlacementTrend"]): AdminPlacementTrendPoint[] {
  const itemByMonth = new Map((items ?? []).map((item) => [item.Month, item]));

  return monthLabels.map((label, index) => {
    const item = itemByMonth.get(index + 1);
    return {
      month: index + 1,
      label,
      amount: toNumber(item?.Amount),
      completedTrusts: toNumber(item?.CompletedTrusts)
    };
  });
}

function normalizeApplicationPipeline(pipeline: AdminDashboardApplicationPipeline | null): PipelinePoint[] {
  return [
    { name: "Draft", value: toNumber(pipeline?.Draft) },
    { name: "Pending Payment", value: toNumber(pipeline?.PendingPayment) },
    { name: "Payment Approved", value: toNumber(pipeline?.PaymentApproved) },
    { name: "Pending Admin Approval", value: toNumber(pipeline?.PendingAdminApproval) },
    { name: "Sent Out", value: toNumber(pipeline?.SentOut) },
    { name: "Stamping", value: toNumber(pipeline?.Stamping) },
    { name: "Completed", value: toNumber(pipeline?.Completed) },
    { name: "Matured", value: toNumber(pipeline?.Matured) },
    { name: "Early Withdrawn", value: toNumber(pipeline?.EarlyWithdrawn) },
    { name: "Rejected", value: toNumber(pipeline?.Rejected) }
  ];
}

function normalizePlacementVsCollection(items: DashboardPlacementCollection[]): PlacementCollectionPoint[] {
  const itemByMonth = new Map(items.map((item) => [item.Month, item]));

  return monthLabels.map((label, index) => {
    const item = itemByMonth.get(index + 1);
    return {
      month: index + 1,
      label,
      placementAmount: toNumber(item?.PlacementAmount),
      collectionAmount: toNumber(item?.CollectionAmount)
    };
  });
}

function normalizeSalesTrend(items: TrustRepresentativeDashboard["PersonalSalesTrend"]): SalesTrendPoint[] {
  const itemByMonth = new Map((items ?? []).map((item) => [item.Month, item]));

  return monthLabels.map((label, index) => {
    const item = itemByMonth.get(index + 1);
    return {
      month: index + 1,
      label,
      amount: toNumber(item?.Amount),
      completedTrusts: toNumber(item?.CompletedTrusts)
    };
  });
}

function getLatestMobileSalesTrend(trend: SalesTrendPoint[], year: number) {
  const latestMonth = year === currentYear ? new Date().getMonth() + 1 : 12;
  const earliestMonth = Math.max(1, latestMonth - 5);

  return trend
    .filter((item) => item.month >= earliestMonth && item.month <= latestMonth)
    .sort((left, right) => right.month - left.month);
}

function normalizeApplicationStatus(status: DashboardApplicationStatus | null): StatusPoint[] {
  return [
    { name: "Draft", value: toNumber(status?.Draft) },
    { name: "PendingPayment", value: toNumber(status?.PendingPayment) },
    { name: "Processing", value: toNumber(status?.Processing) },
    { name: "Completed", value: toNumber(status?.Completed) },
    { name: "Matured", value: toNumber(status?.Matured) },
    { name: "EarlyWithdrawn", value: toNumber(status?.EarlyWithdrawn) },
    { name: "Rejected", value: toNumber(status?.Rejected) }
  ];
}

function getVisibleStatusSlices(slices: StatusPoint[]) {
  if (slices.some((item) => item.value > 0)) return slices;
  return [{ name: "No Applications", value: 1 }];
}

function buildYearOptions(referenceYear: number) {
  const latest = Math.max(currentYear + 1, referenceYear);
  const earliest = Math.min(latest - 5, referenceYear);
  const options: number[] = [];

  for (let year = latest; year >= earliest; year -= 1) {
    options.push(year);
  }

  return options;
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(toNumber(value)).replace("MYR", "RM");
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `RM ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `RM ${(value / 1_000).toFixed(0)}K`;
  return `RM ${value}`;
}

function formatInteger(value: unknown) {
  return Math.trunc(toNumber(value)).toLocaleString("en-MY");
}

function formatSingleLineLabel(value: unknown) {
  return String(value ?? "").replace(/\s+/g, "\u00A0");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function getNetworkMemberEmail(member: DashboardNetworkMember) {
  return cleanText(member.Email ?? member.FullName);
}

function formatNetworkRank(member: DashboardNetworkMember) {
  const rankName = cleanText(member.RankName);
  return rankName;
}

function formatApplicationStatus(status?: string | null) {
  const value = cleanText(status);
  if (value === "-") return value;
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanText(value?: string | null) {
  const text = value?.trim();
  return text ? text : "-";
}

function toNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function clampPercentage(value: unknown) {
  return Math.min(100, Math.max(0, toNumber(value)));
}

function getCompactCardClass(variant: CompactCardVariant) {
  switch (variant) {
    case "attention":
      return "border-amber-200 bg-[#FFFBEB]";
    case "lifecycle":
      return "border-green-200 bg-[#F0FDF4]";
    case "network":
      return "border-blue-200 bg-[#EFF6FF]";
  }
}

function getCompactRowClass(variant: CompactCardVariant) {
  switch (variant) {
    case "attention":
      return "border-amber-100";
    case "lifecycle":
      return "border-green-100";
    case "network":
      return "border-blue-100";
  }
}

function getCompactValueClass(variant: CompactCardVariant) {
  switch (variant) {
    case "attention":
      return "text-amber-700";
    case "lifecycle":
      return "text-green-700";
    case "network":
      return "text-blue-700";
  }
}

function getCompactPieColors(variant: CompactCardVariant) {
  switch (variant) {
    case "attention":
      return ["#D97706", "#F59E0B", "#FBBF24", "#92400E"];
    case "lifecycle":
      return ["#15803D", "#22C55E", "#86EFAC", "#166534"];
    case "network":
      return ["#1D4ED8", "#2563EB", "#60A5FA", "#1E40AF"];
  }
}

function isDashboardApiRole(role: RoleId | null): role is "AG" | "AD" | "SA" {
  return role === "AG" || role === "AD" || role === "SA";
}

function getToneClass(tone: "ink" | "gold" | "blue" | "green" | "amber" | "red") {
  switch (tone) {
    case "gold":
      return "bg-[#FFF8E1] text-[#8A650F]";
    case "blue":
      return "bg-blue-50 text-blue-700";
    case "green":
      return "bg-green-50 text-green-700";
    case "amber":
      return "bg-amber-50 text-amber-700";
    case "red":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-100 text-textPrimary";
  }
}
