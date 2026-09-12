import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
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
import { ArrowUpRight, CalendarClock, CircleDollarSign, FileText, UsersRound } from "lucide-react";
import { StatusBadge } from "../../components/common/StatusBadge";
import type {
  ActivityRow,
  ChartKind,
  ChartPoint,
  CommissionProcessingRow,
  DashboardMetric,
  DividendScheduleRow,
  PaymentProcessingRow,
  ProductPerformance,
  QuickAction,
  StatusSlice,
  TrustApplicationRow
} from "./types";

const chartColors = ["#111111", "#D4AF37", "#2563EB", "#16A34A", "#F59E0B", "#DC2626", "#6B7280"];

export function DashboardMetricGrid({ metrics, columns = "xl:grid-cols-3 2xl:grid-cols-3" }: { metrics: DashboardMetric[]; columns?: string }) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${columns}`}>
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </div>
  );
}

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{metric.label}</p>
          <p className={`mt-2 break-words text-2xl font-semibold ${toneText(metric.tone)}`}>{metric.value}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneBg(metric.tone)}`}>
          {metric.tone === "gold" ? <CircleDollarSign className="h-4 w-4" /> : metric.tone === "blue" ? <UsersRound className="h-4 w-4" /> : metric.tone === "amber" ? <CalendarClock className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
        </span>
      </div>
      {metric.helper ? <p className="mt-2 text-xs leading-5 text-textSecondary">{metric.helper}</p> : null}
    </section>
  );
}

export function DashboardSection({ title, description, action, children, className = "" }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-lg border border-line bg-white shadow-soft ${className}`}>
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-textPrimary">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-textSecondary">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="min-w-0 p-5">{children}</div>
    </section>
  );
}

export function ChartCard({ title, data, kind, dataKey = "value", secondaryKey, currency = false, height = 280 }: { title: string; data: ChartPoint[] | StatusSlice[] | ProductPerformance[]; kind: ChartKind; dataKey?: string; secondaryKey?: string; currency?: boolean; height?: number }) {
  return (
    <DashboardSection title={title}>
      {data.length === 0 ? (
        <DashboardEmptyState title="No chart data" description="Data will appear when records are available." />
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {kind === "donut" ? (
              <PieChart>
                <Pie data={data} dataKey={dataKey} nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2}>
                  {data.map((entry, index) => <Cell key={getEntryName(entry, index)} fill={chartColors[index % chartColors.length]} stroke="#FFFFFF" strokeWidth={2} />)}
                </Pie>
                <Tooltip content={<DashboardTooltip currency={currency} />} />
              </PieChart>
            ) : kind === "bar" ? (
              <BarChart data={data} margin={{ top: 8, right: 10, left: currency ? 16 : -16, bottom: 0 }}>
                <CartesianGrid stroke="#ECEFF3" vertical={false} strokeDasharray="4 6" />
                <XAxis dataKey={getXAxisKey(data)} axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} dy={8} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} tickFormatter={currency ? formatCompactCurrency : formatNumber} width={currency ? 58 : 34} />
                <Tooltip cursor={{ fill: "#F8F9FA" }} content={<DashboardTooltip currency={currency} />} />
                <Bar dataKey={dataKey} name={currency ? "Amount" : "Count"} fill="#111111" radius={[7, 7, 2, 2]} barSize={32} />
                {secondaryKey ? <Bar dataKey={secondaryKey} name="Secondary" fill="#D4AF37" radius={[7, 7, 2, 2]} barSize={32} /> : null}
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 8, right: 12, left: currency ? 16 : -16, bottom: 0 }}>
                <CartesianGrid stroke="#ECEFF3" vertical={false} strokeDasharray="4 6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} tickFormatter={currency ? formatCompactCurrency : formatNumber} width={currency ? 58 : 34} />
                <Tooltip cursor={{ stroke: "#D4AF37", strokeDasharray: "4 4" }} content={<DashboardTooltip currency={currency} />} />
                <Line type="monotone" dataKey={dataKey} name={currency ? "Amount" : "Count"} stroke="#111111" strokeWidth={3} dot={false} activeDot={{ r: 5, stroke: "#FFFFFF", strokeWidth: 2 }} />
                {secondaryKey ? <Line type="monotone" dataKey={secondaryKey} name="Secondary" stroke="#D4AF37" strokeWidth={3} dot={false} /> : null}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </DashboardSection>
  );
}

export function ApplicationTable({ rows, mode = "recent" }: { rows: TrustApplicationRow[]; mode?: "recent" | "processing" | "completed" }) {
  const headers = mode === "processing" ? ["Trust ID", "Client", "Product", "Agent", "Placement", "Status / Stage", "Updated", "Waiting", "Action"] : ["Trust ID", "Client", "Product", "Agent", "Placement", "Status", mode === "completed" ? "Completed" : "Created", "Action"];
  return (
    <DashboardTable headers={headers} emptyTitle="No applications found">
      {rows.map((row) => (
        <tr key={`${row.trustId}-${row.client}`} className="transition hover:bg-gray-50">
          <Td strong>{row.trustId}</Td>
          <Td>{row.client}</Td>
          <Td muted>{row.product}</Td>
          <Td muted>{row.agent}</Td>
          <Td muted>{formatCurrency(row.placement)}</Td>
          <Td><StatusBadge status={row.status} /></Td>
          <Td muted>{mode === "completed" ? row.completedDate : row.updatedDate ?? row.createdDate}</Td>
          {mode === "processing" ? <Td muted>{row.waitingDuration ?? "-"}</Td> : null}
          <Td>{row.actionPath ? <TableAction path={row.actionPath} /> : "-"}</Td>
        </tr>
      ))}
    </DashboardTable>
  );
}

export function PaymentTable({ rows }: { rows: PaymentProcessingRow[] }) {
  return (
    <DashboardTable headers={["Trust ID", "Client", "Product", "Payment Amount", "Payment Date", "Reference", "Status", "Action"]} emptyTitle="No pending payments">
      {rows.map((row) => (
        <tr key={row.reference} className="transition hover:bg-gray-50">
          <Td strong>{row.trustId}</Td>
          <Td>{row.client}</Td>
          <Td muted>{row.product}</Td>
          <Td muted>{formatCurrency(row.amount)}</Td>
          <Td muted>{row.paymentDate}</Td>
          <Td muted>{row.reference}</Td>
          <Td><StatusBadge status={row.status} /></Td>
          <Td>{row.actionPath ? <TableAction path={row.actionPath} /> : "-"}</Td>
        </tr>
      ))}
    </DashboardTable>
  );
}

export function DividendTable({ rows }: { rows: DividendScheduleRow[] }) {
  return (
    <DashboardTable headers={["Trust ID", "Client", "Product", "Dividend Amount", "Payout Date", "Status"]} emptyTitle="No dividend schedule">
      {rows.map((row) => (
        <tr key={`${row.trustId}-${row.payoutDate}`} className="transition hover:bg-gray-50">
          <Td strong>{row.trustId}</Td>
          <Td>{row.client}</Td>
          <Td muted>{row.product}</Td>
          <Td muted>{formatCurrency(row.amount)}</Td>
          <Td muted>{row.payoutDate}</Td>
          <Td><StatusBadge status={row.status} /></Td>
        </tr>
      ))}
    </DashboardTable>
  );
}

export function CommissionTable({ rows }: { rows: CommissionProcessingRow[] }) {
  return (
    <DashboardTable headers={["Agent", "Agent Code", "Rank at Completed", "Trust ID", "Product", "Commission", "Status", "Generated"]} emptyTitle="No commission records">
      {rows.map((row) => (
        <tr key={`${row.trustId}-${row.agentCode}-${row.amount}`} className="transition hover:bg-gray-50">
          <Td strong>{row.agent}</Td>
          <Td muted>{row.agentCode}</Td>
          <Td muted>{row.rankAtCompleted}</Td>
          <Td muted>{row.trustId}</Td>
          <Td muted>{row.product}</Td>
          <Td muted>{formatCurrency(row.amount)}</Td>
          <Td><StatusBadge status={row.status} /></Td>
          <Td muted>{row.generatedDate}</Td>
        </tr>
      ))}
    </DashboardTable>
  );
}

export function ProductList({ rows, valueMode = "amount" }: { rows: ProductPerformance[]; valueMode?: "amount" | "count" }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.productCode} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-textPrimary">{row.productName}</p>
            <p className="text-xs text-textSecondary">{row.productCode}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-textPrimary">{valueMode === "amount" ? formatCurrency(row.amount) : row.count.toLocaleString("en-MY")}</p>
            <p className="text-xs text-textSecondary">{row.count} applications</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AttentionList({ items }: { items: Array<{ label: string; value: string; status: string; path?: string }> }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-textPrimary">{item.label}</p>
            <p className="text-xs text-textSecondary">{item.value} records</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={item.status} />
            {item.path ? <TableAction path={item.path} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {actions.map((action) => (
        <Link key={action.path} to={action.path} className="inline-flex min-h-10 items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-textPrimary transition hover:border-brandGold hover:bg-[#FFFBEB]">
          <span>{action.label}</span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-textSecondary" />
        </Link>
      ))}
    </div>
  );
}

export function ActivityList({ rows }: { rows: ActivityRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={`${row.dateTime}-${row.reference}`} className="rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-textPrimary">{row.action}</p>
            <span className="text-xs text-textSecondary">{formatDate(row.dateTime)}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-textSecondary">{row.module} · {row.reference} · {row.user}</p>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-lg bg-gray-100" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-80 animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}

export function DashboardEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-soft p-6 text-center">
      <p className="text-sm font-semibold text-textPrimary">{title}</p>
      <p className="mt-1 text-sm text-textSecondary">{description}</p>
    </div>
  );
}

function DashboardTable({ headers, children, emptyTitle }: { headers: string[]; children: React.ReactNode; emptyTitle: string }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  if (rows.length === 0) return <DashboardEmptyState title={emptyTitle} description="Nothing needs attention in this section right now." />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-[13px]">
        <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
          <tr>
            {headers.map((header) => <th key={header} className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold">{header}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, muted = false, strong = false }: { children: React.ReactNode; muted?: boolean; strong?: boolean }) {
  return <td className={`whitespace-nowrap border-b border-line px-4 py-3 ${strong ? "font-semibold text-textPrimary" : muted ? "text-textSecondary" : "text-textPrimary"}`}>{children}</td>;
}

function TableAction({ path }: { path: string }) {
  return (
    <Link to={path} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-textSecondary transition hover:bg-gray-100" aria-label="Open record">
      <ArrowUpRight className="h-4 w-4" />
    </Link>
  );
}

function DashboardTooltip({ active, payload, label, currency = false }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string }>; label?: string; currency?: boolean }) {
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
          <span className="font-semibold text-textPrimary">{currency ? formatCurrency(Number(item.value)) : Number(item.value).toLocaleString("en-MY")}</span>
        </div>
      ))}
    </div>
  );
}

export function formatCurrency(value: number) {
  return `RM ${value.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `RM ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `RM ${(value / 1_000).toFixed(0)}K`;
  return `RM ${value}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-MY");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(value));
}

function toneText(tone: DashboardMetric["tone"]) {
  switch (tone) {
    case "gold":
      return "text-[#8A650F]";
    case "green":
      return "text-green-700";
    case "amber":
      return "text-amber-700";
    case "blue":
      return "text-blue-700";
    case "red":
      return "text-red-700";
    default:
      return "text-textPrimary";
  }
}

function toneBg(tone: DashboardMetric["tone"]) {
  switch (tone) {
    case "gold":
      return "bg-[#FFF8E1] text-[#8A650F]";
    case "green":
      return "bg-green-50 text-green-700";
    case "amber":
      return "bg-amber-50 text-amber-700";
    case "blue":
      return "bg-blue-50 text-blue-700";
    case "red":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-100 text-textPrimary";
  }
}

function getXAxisKey(data: Array<ChartPoint | StatusSlice | ProductPerformance>) {
  const first = data[0];
  if (!first) return "label";
  if ("label" in first) return "label";
  if ("productName" in first) return "productName";
  return "name";
}

function getEntryName(entry: ChartPoint | StatusSlice | ProductPerformance, index: number) {
  if ("name" in entry) return entry.name;
  if ("productName" in entry) return entry.productName;
  if ("label" in entry) return entry.label;
  return String(index);
}
