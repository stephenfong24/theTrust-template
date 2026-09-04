import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Network,
  ShieldAlert,
  SlidersHorizontal,
  TrendingUp,
  Users
} from "lucide-react";
import dashboard from "../data/dashboard.json";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { roles } from "../config/roles";
import type { RoleId } from "../types";

const black = "#111111";
const gold = "#D4AF37";
const gray = "#6B7280";
const blue = "#2563EB";
const green = "#16A34A";
const amber = "#F59E0B";
const chartPalette = [black, "#4B5563", gold, blue, green, amber];

interface RoleDashboardItem {
  title: string;
  metric: string;
  status: string;
  icon: typeof Users;
}

const roleDashboardItems: Record<RoleId, RoleDashboardItem[]> = {
  SA: [
    { title: "Admin Governance", metric: "12 active controls", status: "Active", icon: ShieldAlert },
    { title: "Platform Activity", metric: "284 actions today", status: "Completed", icon: TrendingUp },
    { title: "Audit Attention", metric: "7 requests flagged", status: "Pending Review", icon: FileText }
  ],
  AD: [
    { title: "Agent Oversight", metric: "48 active agents", status: "Active", icon: Users },
    { title: "Trust Payments", metric: "RM 4.8M collected", status: "Completed", icon: BadgeDollarSign },
    { title: "Dividend Schedule", metric: "9 upcoming batches", status: "Pending Approval", icon: CalendarClock }
  ],
  OP: [
    { title: "Listing Queue", metric: "31 trusts to review", status: "Pending Review", icon: FileText },
    { title: "Payment Follow-up", metric: "16 open items", status: "Active", icon: BadgeDollarSign },
    { title: "Network Activity", metric: "22 branch updates", status: "Completed", icon: Network }
  ],
  AC: [
    { title: "Collection Review", metric: "RM 1.2M pending", status: "Pending Approval", icon: BadgeDollarSign },
    { title: "Trust Payment Control", metric: "24 reconciled", status: "Completed", icon: CheckCircle2 },
    { title: "Income Snapshot", metric: "RM 380K projected", status: "Active", icon: TrendingUp }
  ],
  AG: [
    { title: "My Trust Pipeline", metric: "14 client trusts", status: "Active", icon: FileText },
    { title: "My Network", metric: "36 connected referrals", status: "Completed", icon: Network },
    { title: "Income Tracker", metric: "RM 42K earned", status: "Pending Review", icon: BadgeDollarSign }
  ]
};

export function DashboardPage() {
  const { session } = useAuth();
  const role = session?.role ?? "AG";
  const [focus, setFocus] = useState(roleDashboardItems[role][0].title);
  const [projection, setProjection] = useState(68);
  const [chartMode, setChartMode] = useState<"pipeline" | "collections">("pipeline");
  const selectedItems = roleDashboardItems[role];
  const selected = selectedItems.find((item) => item.title === focus) ?? selectedItems[0];
  const kpis = useMemo(
    () =>
      dashboard.kpis.map((kpi, index) => ({
        ...kpi,
        value: index === 1 ? `${projection}%` : kpi.value
      })),
    [projection]
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${roles[role]} command view with role-specific activity, collection movement and attention areas.`}
        actions={
          <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">
            <Download className="mr-2 inline h-4 w-4" />
            Export Snapshot
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <button
            key={kpi.label}
            onClick={() => setProjection(Math.min(96, Math.max(42, projection + (index % 2 === 0 ? 4 : -3))))}
            className="rounded-lg border border-line bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brandGold"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-textSecondary">{kpi.label}</p>
            <div className={index === 0 || index === 3 ? "mt-3 text-2xl font-semibold text-brandGold" : "mt-3 text-2xl font-semibold text-textPrimary"}>
              {kpi.value}
            </div>
            <p className="mt-2 text-xs text-textSecondary">{kpi.trend} from prior period</p>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <ChartCard
          title={chartMode === "pipeline" ? "Applications by Month" : "Payment Collection Trend"}
          eyebrow="Interactive dashboard"
          value={selected.metric}
          caption={selected.title}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={() => setChartMode("pipeline")} className={modeClass(chartMode === "pipeline")}>Pipeline</button>
            <button onClick={() => setChartMode("collections")} className={modeClass(chartMode === "collections")}>Collections</button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {chartMode === "pipeline" ? (
              <BarChart data={dashboard.monthlyApplications} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#ECEFF3" vertical={false} strokeDasharray="4 6" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: gray, fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: gray, fontSize: 12 }} width={36} />
                <Tooltip cursor={{ fill: "#F8F9FA" }} content={<PremiumTooltip />} />
                <Bar dataKey="applications" name="Applications" fill={black} radius={[8, 8, 3, 3]} barSize={34} />
              </BarChart>
            ) : (
              <AreaChart data={dashboard.collections} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="collectionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={gold} stopOpacity={0.32} />
                    <stop offset="95%" stopColor={gold} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ECEFF3" vertical={false} strokeDasharray="4 6" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: gray, fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: gray, fontSize: 12 }} tickFormatter={formatCompactCurrency} width={54} />
                <Tooltip cursor={{ stroke: gold, strokeDasharray: "4 4" }} content={<PremiumTooltip currency />} />
                <Area type="monotone" dataKey="amount" name="Collections" stroke={gold} strokeWidth={3} fill="url(#collectionGradient)" activeDot={{ r: 5, stroke: "#FFFFFF", strokeWidth: 2 }} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </ChartCard>

        <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brandGold">Role items</p>
              <h2 className="mt-1 text-base font-semibold text-textPrimary">{roles[role]}</h2>
            </div>
            <SlidersHorizontal className="h-5 w-5 text-textSecondary" />
          </div>
          <div className="mt-5 space-y-3">
            {selectedItems.map((item) => {
              const Icon = item.icon;
              const active = focus === item.title;
              return (
                <button
                  key={item.title}
                  onClick={() => setFocus(item.title)}
                  className={active ? "w-full rounded-lg border border-ink bg-ink p-4 text-left text-white" : "w-full rounded-lg border border-line bg-white p-4 text-left transition hover:border-brandGold"}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className={active ? "h-5 w-5 text-brandGold" : "h-5 w-5 text-brandGold"} />
                      <span>
                        <span className={active ? "block text-sm font-semibold text-white" : "block text-sm font-semibold text-textPrimary"}>{item.title}</span>
                        <span className={active ? "block text-xs text-gray-200" : "block text-xs text-textSecondary"}>{item.metric}</span>
                      </span>
                    </span>
                    <StatusBadge status={item.status} />
                  </span>
                </button>
              );
            })}
          </div>
          <label className="mt-5 block text-xs font-medium uppercase tracking-wide text-textSecondary" htmlFor="projection">
            Projection strength
          </label>
          <input
            id="projection"
            type="range"
            min="42"
            max="96"
            value={projection}
            onChange={(event) => setProjection(Number(event.target.value))}
            className="mt-3 w-full accent-[#D4AF37]"
          />
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Trust Assets by Product">
          <div className="relative h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboard.assetByProduct} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                  {dashboard.assetByProduct.map((entry, index) => <Cell key={entry.name} fill={chartPalette[index]} stroke="#FFFFFF" strokeWidth={2} />)}
                </Pie>
                <Tooltip content={<PremiumTooltip currency />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Selected Focus">
          <MiniRow title={selected.title} text={selected.metric} status={selected.status} />
          <MiniRow title="Current role code" text={role} status="Active" />
        </Panel>
        <Panel title="Quick Actions">
          {selectedItems.map((item) => (
            <button key={item.title} onClick={() => setFocus(item.title)} className="w-full rounded-lg border border-line px-3 py-2 text-left text-sm font-medium text-textPrimary hover:bg-gray-50">
              {item.title}
            </button>
          ))}
        </Panel>
      </div>
    </>
  );
}

export function BlankPage() {
  return <div className="min-h-[70vh]" />;
}

export function AccessDeniedPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="max-w-lg rounded-lg border border-line bg-white p-8 text-center shadow-soft">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-600" />
        <h1 className="mt-4 text-2xl font-semibold">Access Denied</h1>
        <p className="mt-2 text-sm text-textSecondary">Your current role does not include permission for this page. Contact an administrator if access is required.</p>
        <Link to="/dashboard" className="mt-5 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Return to Dashboard</Link>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return <BlankPage />;
}

function ChartCard({ title, eyebrow, value, caption, children }: { title: string; eyebrow?: string; value?: string; caption?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brandGold">{eyebrow}</p>
          <h2 className="mt-1 text-base font-semibold text-textPrimary">{title}</h2>
        </div>
        {value ? (
          <div className="text-right">
            <div className="text-lg font-semibold text-textPrimary">{value}</div>
            <div className="text-xs text-textSecondary">{caption}</div>
          </div>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function PremiumTooltip({ active, payload, label, currency = false }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string }>; label?: string; currency?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-soft">
      {label ? <div className="mb-1 font-semibold text-textPrimary">{label}</div> : null}
      {payload.map((item) => (
        <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-textSecondary">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? black }} />
            {item.name}
          </span>
          <span className="font-semibold text-textPrimary">{currency ? formatCurrency(Number(item.value)) : Number(item.value).toLocaleString("en-MY")}</span>
        </div>
      ))}
    </div>
  );
}

function formatCurrency(value: number) {
  return `RM ${value.toLocaleString("en-MY")}`;
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `RM ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `RM ${(value / 1_000).toFixed(0)}K`;
  return `RM ${value}`;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-line bg-white p-5 shadow-soft"><h2 className="mb-3 text-base font-semibold text-textPrimary">{title}</h2><div className="space-y-3">{children}</div></section>;
}

function MiniRow({ title, text, status }: { title: string; text: string; status: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-line p-3"><div className="min-w-0"><div className="truncate text-sm font-semibold text-textPrimary">{title}</div><div className="line-clamp-2 text-xs text-textSecondary">{text}</div></div><StatusBadge status={status} /></div>;
}

function modeClass(active: boolean) {
  return active ? "rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white" : "rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-textSecondary hover:bg-gray-50";
}
