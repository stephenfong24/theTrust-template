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
import { Download, FilePlus2, Filter, Plus, Save, Settings, ShieldAlert, UserPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import applicationsSeed from "../data/applications.json";
import clientsSeed from "../data/clients.json";
import agentsSeed from "../data/agents.json";
import productsSeed from "../data/trust-products.json";
import accountsSeed from "../data/trust-accounts.json";
import paymentsSeed from "../data/payments.json";
import receiptsSeed from "../data/receipts.json";
import tasksSeed from "../data/tasks.json";
import documentsSeed from "../data/documents.json";
import notificationsSeed from "../data/notifications.json";
import auditSeed from "../data/audit-logs.json";
import dashboard from "../data/dashboard.json";
import usersSeed from "../data/users.json";
import { CurrencyDisplay } from "../components/common/CurrencyDisplay";
import { DateDisplay } from "../components/common/DateDisplay";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { Modal } from "../components/common/Modal";
import { DataTable, type Column } from "../components/tables/DataTable";
import { PermissionGuard } from "../components/security/PermissionGuard";
import { permissions } from "../config/permissions";
import { roles } from "../config/roles";
import { createRecord, listRecords } from "../services/dataService";
import { readStorage, writeStorage } from "../services/storageService";
import { MalaysiaIcUploader } from "../features/malaysia-ic/MalaysiaIcUploader";
import type { MalaysiaIcConfidence, MalaysiaIcOcrResult } from "../features/malaysia-ic/malaysiaIc.types";
import type {
  AgentRecord,
  ApplicationRecord,
  AuditLog,
  ClientRecord,
  NotificationRecord,
  PaymentRecord,
  TaskRecord,
  TrustAccount,
  TrustProduct,
  User
} from "../types";

const black = "#111111";
const gold = "#D4AF37";
const gray = "#6B7280";
const blue = "#2563EB";
const green = "#16A34A";
const amber = "#F59E0B";
const chartPalette = [black, "#4B5563", gold, blue, green, amber];

interface NewApplicationForm {
  clientName: string;
  identificationNumber: string;
  address: string;
  email: string;
  phone: string;
  product: string;
  amount: string;
  beneficiary: string;
  agent: string;
}

export function DashboardPage() {
  const kpis = dashboard.kpis;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Portfolio health, application movement, payment collections and operational attention areas."
        actions={<button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"><Download className="mr-2 inline h-4 w-4" />Export Snapshot</button>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <div key={kpi.label} className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <p className="text-xs font-medium uppercase tracking-wide text-textSecondary">{kpi.label}</p>
            <div className={index === 0 || index === 3 ? "mt-3 text-2xl font-semibold text-brandGold" : "mt-3 text-2xl font-semibold text-textPrimary"}>{kpi.value}</div>
            <p className="mt-2 text-xs text-textSecondary">{kpi.trend} from prior period</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard title="Applications by Month" eyebrow="Pipeline intake" value="43" caption="July applications">
          <ResponsiveContainer width="100%" height={255}>
            <BarChart data={dashboard.monthlyApplications} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#ECEFF3" vertical={false} strokeDasharray="4 6" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: gray, fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: gray, fontSize: 12 }} width={36} />
              <Tooltip cursor={{ fill: "#F8F9FA" }} content={<PremiumTooltip />} />
              <Bar dataKey="applications" name="Applications" fill={black} radius={[8, 8, 3, 3]} barSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Payment Collection Trend" eyebrow="Collections" value="RM 4.8M" caption="Current month">
          <ResponsiveContainer width="100%" height={255}>
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
              <Tooltip cursor={{ stroke: "#D4AF37", strokeDasharray: "4 4" }} content={<PremiumTooltip currency />} />
              <Area type="monotone" dataKey="amount" name="Collections" stroke={gold} strokeWidth={3} fill="url(#collectionGradient)" activeDot={{ r: 5, stroke: "#FFFFFF", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Trust Assets by Product" eyebrow="Asset mix" value="RM 128.5M" caption="Total trust assets">
          <div className="grid min-h-[255px] items-center gap-4 md:grid-cols-[1fr_170px] xl:grid-cols-1 2xl:grid-cols-[1fr_170px]">
            <div className="relative h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dashboard.assetByProduct} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                    {dashboard.assetByProduct.map((entry, index) => <Cell key={entry.name} fill={chartPalette[index]} stroke="#FFFFFF" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip content={<PremiumTooltip currency />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-medium uppercase text-textSecondary">Total</span>
                <span className="text-lg font-semibold text-textPrimary">RM 128.5M</span>
              </div>
            </div>
            <div className="space-y-2">
              {dashboard.assetByProduct.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-textSecondary">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartPalette[index] }} />
                    <span className="truncate">{entry.name}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-textPrimary">{formatCompactCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Applications Requiring Review">{(applicationsSeed as ApplicationRecord[]).slice(0, 5).map((item) => <MiniRow key={item.id} title={item.applicationNumber} text={`${item.clientName} · ${item.trustProduct}`} status={item.status} />)}</Panel>
        <Panel title="Pending Tasks">{(tasksSeed as TaskRecord[]).slice(0, 5).map((item) => <MiniRow key={item.id} title={item.title} text={`${item.assignedTo} · due ${item.dueDate}`} status={item.priority} />)}</Panel>
        <Panel title="Recent Payments">{(paymentsSeed as PaymentRecord[]).slice(0, 5).map((item) => <MiniRow key={item.id} title={item.receiptNumber} text={`${item.client} · RM ${item.amount.toLocaleString("en-MY")}`} status={item.status} />)}</Panel>
      </div>
    </>
  );
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

export function ApplicationsPage({ status }: { status?: string }) {
  const [records, setRecords] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    listRecords<ApplicationRecord>("trust-fund-applications", applicationsSeed as ApplicationRecord[]).then((value) => {
      setRecords(value);
      setLoading(false);
    });
  }, []);
  const visible = status ? records.filter((record) => record.status === status) : records;
  return (
    <>
      <PageHeader
        title={status ? `${status} Applications` : "Application List"}
        description="Review trust application progress, ownership, product selection and officer assignment."
        actions={<PermissionGuard permission="applications.create"><Link to="/applications/new" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"><Plus className="mr-2 inline h-4 w-4" />New Application</Link></PermissionGuard>}
      />
      <DataTable records={visible} columns={applicationColumns} searchFields={["applicationNumber", "clientName", "trustProduct", "agent", "assignedOfficer"]} detailPath={(record) => `/applications/${record.id}`} loading={loading} bulk />
    </>
  );
}

const applicationColumns: Column<ApplicationRecord>[] = [
  { key: "applicationNumber", header: "Application Number", sortable: true },
  { key: "clientName", header: "Client", sortable: true },
  { key: "trustProduct", header: "Trust Product", sortable: true },
  { key: "agent", header: "Agent" },
  { key: "applicationDate", header: "Application Date", render: (record) => <DateDisplay value={record.applicationDate} />, sortable: true },
  { key: "investmentAmount", header: "Investment Amount", render: (record) => <CurrencyDisplay value={record.investmentAmount} />, sortable: true },
  { key: "status", header: "Status", render: (record) => <StatusBadge status={record.status} /> },
  { key: "assignedOfficer", header: "Assigned Officer" },
  { key: "lastUpdated", header: "Last Updated", render: (record) => <DateDisplay value={record.lastUpdated} /> }
];

export function ApplicationDetailsPage() {
  const { id } = useParams();
  const records = readStorage<ApplicationRecord[]>("trust-fund-applications", applicationsSeed as ApplicationRecord[]);
  const record = records.find((item) => item.id === id) ?? records[0];
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageHeader title={record.applicationNumber} description={`${record.clientName} · ${record.trustProduct}`} actions={<button onClick={() => setConfirm(true)} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Approve</button>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <h2 className="text-base font-semibold">Application Summary</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {Object.entries({
              Client: record.clientName,
              Product: record.trustProduct,
              Agent: record.agent,
              Officer: record.assignedOfficer,
              "Application Date": record.applicationDate,
              "Investment Amount": `RM ${record.investmentAmount.toLocaleString("en-MY")}`,
              Progress: `${record.progress}%`,
              "Created By": record.createdBy
            }).map(([label, value]) => <Detail key={label} label={label} value={value} />)}
          </div>
        </section>
        <Panel title="Review Activity">
          <MiniRow title="KYC package checked" text="Daniel Tan · 24 Jul 2026" status="Completed" />
          <MiniRow title="Source of funds review" text="Priya Nair · 25 Jul 2026" status="Pending Approval" />
          <MiniRow title="Client declaration" text="System Super Administrator" status={record.status} />
        </Panel>
      </div>
      <ConfirmDialog open={confirm} title="Approve Application" message="This will update the local record state for client review." onClose={() => setConfirm(false)} onConfirm={() => { setConfirm(false); toast.success("Record updated successfully."); }} />
    </>
  );
}

export function NewApplicationPage() {
  const navigate = useNavigate();
  const steps = ["Applicant Information", "Contact Information", "Trust Product Selection", "Investment Details", "Beneficiary Information", "Agent Information", "Document Checklist", "Review and Declaration"];
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<NewApplicationForm>({ clientName: "", identificationNumber: "", address: "", email: "", phone: "", product: "Legacy Growth Trust", amount: "500000", beneficiary: "", agent: "Nur Farhana Ismail" });
  const [icConfidence, setIcConfidence] = useState<Partial<MalaysiaIcConfidence>>({});
  const lastOcrValuesRef = useRef<Partial<Pick<NewApplicationForm, "identificationNumber" | "clientName" | "address">>>({});
  const handleIcExtracted = (result: MalaysiaIcOcrResult) => {
    const mappings: Array<[keyof NewApplicationForm, string | null]> = [
      ["identificationNumber", result.icNumber],
      ["clientName", result.fullName],
      ["address", result.address]
    ];
    const previousOcrValues = lastOcrValuesRef.current;
    const preservedValueCount = mappings.filter(([field, value]) => Boolean(value && form[field] && form[field] !== previousOcrValues[field as keyof typeof previousOcrValues])).length;

    setForm((current) => {
      const next = { ...current };

      for (const [field, value] of mappings) {
        const previousOcrValue = previousOcrValues[field as keyof typeof previousOcrValues];
        const fieldIsEmpty = !current[field];
        const fieldStillHasPreviousOcrValue = Boolean(previousOcrValue && current[field] === previousOcrValue);

        if (value && (fieldIsEmpty || fieldStillHasPreviousOcrValue)) {
          next[field] = value;
        } else if (!value && fieldStillHasPreviousOcrValue) {
          next[field] = "";
        }
      }

      return next;
    });

    setIcConfidence(result.confidence);
    lastOcrValuesRef.current = {
      identificationNumber: result.icNumber ?? undefined,
      clientName: result.fullName ?? undefined,
      address: result.address ?? undefined
    };

    if (preservedValueCount > 0) {
      toast.info("Existing applicant values were preserved. Review the extracted IC result before continuing.");
    }
  };
  const submit = async () => {
    if (!form.clientName || !form.email || Number(form.amount) < 150000) {
      toast.error("Unable to complete the action. Please try again.");
      return;
    }
    const record: ApplicationRecord = {
      id: `APP-${Date.now()}`,
      applicationNumber: `TF-APP-2026-${Math.floor(2000 + Math.random() * 7000)}`,
      clientId: `C-${Date.now().toString().slice(-4)}`,
      clientName: form.clientName,
      trustProduct: form.product,
      agent: form.agent,
      applicationDate: new Date().toISOString().slice(0, 10),
      investmentAmount: Number(form.amount),
      status: "Pending Review",
      assignedOfficer: "Daniel Tan",
      progress: 60,
      lastUpdated: new Date().toISOString().slice(0, 10),
      createdBy: "System Super Administrator"
    };
    await createRecord("trust-fund-applications", applicationsSeed as ApplicationRecord[], record);
    toast.success("Application submitted successfully.");
    navigate(`/applications/${record.id}`);
  };
  return (
    <>
      <PageHeader title="New Application" description="Capture applicant, trust product, investment and declaration information in a guided flow." />
      <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="mb-6 grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          {steps.map((item, index) => <button key={item} onClick={() => setStep(index)} className={index === step ? "rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white" : "rounded-lg border border-line px-3 py-2 text-xs text-textSecondary"}>{index + 1}. {item}</button>)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {step === 0 ? <MalaysiaIcUploader onExtracted={handleIcExtracted} /> : null}
          <FormInput label="Client Name" value={form.clientName} onChange={(value) => setForm({ ...form, clientName: value })} required warning={getConfidenceWarning(icConfidence.fullName)} />
          <FormInput label="Identification Number" value={form.identificationNumber} onChange={(value) => setForm({ ...form, identificationNumber: value })} warning={getConfidenceWarning(icConfidence.icNumber)} />
          <FormInput label="Address" value={form.address} onChange={(value) => setForm({ ...form, address: value })} warning={getConfidenceWarning(icConfidence.address)} />
          <FormInput label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
          <FormInput label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
          <label className="block text-sm font-medium">Trust Product<select value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3">{(productsSeed as TrustProduct[]).map((product) => <option key={product.id}>{product.name}</option>)}</select></label>
          <FormInput label="Investment Amount (RM)" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} required />
          <FormInput label="Beneficiary Name" value={form.beneficiary} onChange={(value) => setForm({ ...form, beneficiary: value })} />
          <label className="block text-sm font-medium">Agent<select value={form.agent} onChange={(event) => setForm({ ...form, agent: event.target.value })} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3">{(agentsSeed as AgentRecord[]).map((agent) => <option key={agent.id}>{agent.name}</option>)}</select></label>
        </div>
        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <button onClick={() => setStep((value) => Math.max(0, value - 1))} className="rounded-lg border border-ink bg-white px-4 py-2 text-sm font-medium text-ink">Previous</button>
          <div className="flex gap-2">
            <button onClick={() => toast.success("Application saved successfully.")} className="rounded-lg border border-ink bg-white px-4 py-2 text-sm font-medium text-ink">Save as Draft</button>
            {step < steps.length - 1 ? <button onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Next</button> : <button onClick={submit} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Submit Application</button>}
          </div>
        </div>
      </div>
    </>
  );
}

function FormInput({ label, value, onChange, required = false, warning }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; warning?: string }) {
  return <label className="block text-sm font-medium">{label} {required ? <span className="text-red-600">*</span> : null}<input value={value} onChange={(event) => onChange(event.target.value)} className={warning ? "mt-1 h-11 w-full rounded-lg border border-amber-400 bg-white px-3" : "mt-1 h-11 w-full rounded-lg border border-line bg-white px-3"} /><span className={warning ? "mt-1 block text-xs text-amber-700" : "mt-1 block text-xs text-textSecondary"}>{warning ?? "Use clear information for review and verification."}</span></label>;
}

function getConfidenceWarning(confidence?: number): string | undefined {
  if (confidence === undefined || confidence >= 0.65) {
    return undefined;
  }

  return "Please verify this value.";
}

export function TrustAccountsPage() {
  return <TablePage title="Trust Account List" description="Monitor account status, assigned officers, products and balances." records={accountsSeed as TrustAccount[]} storageKey="trust-fund-trust-accounts" columns={accountColumns} searchFields={["accountNumber", "clientName", "productName", "officer"]} detailPath={(record) => `/trust/accounts/${record.id}`} />;
}

const accountColumns: Column<TrustAccount>[] = [
  { key: "accountNumber", header: "Account Number", sortable: true },
  { key: "clientName", header: "Client" },
  { key: "productName", header: "Product" },
  { key: "balance", header: "Balance", render: (record) => <CurrencyDisplay value={record.balance} />, sortable: true },
  { key: "openedDate", header: "Opened Date", render: (record) => <DateDisplay value={record.openedDate} /> },
  { key: "status", header: "Status", render: (record) => <StatusBadge status={record.status} /> },
  { key: "officer", header: "Officer" }
];

export function TrustAccountDetailsPage() {
  const { id } = useParams();
  const record = (accountsSeed as TrustAccount[]).find((item) => item.id === id) ?? (accountsSeed as TrustAccount[])[0];
  return <DetailPage title={record.accountNumber} subtitle={`${record.clientName} · ${record.productName}`} details={{ Client: record.clientName, Product: record.productName, Balance: `RM ${record.balance.toLocaleString("en-MY")}`, "Opened Date": record.openedDate, Status: record.status, Officer: record.officer }} />;
}

export function TrustProductsPage() {
  return <TablePage title="Trust Product List" description="Review product catalog, indicative ranges, tenure and account counts." records={productsSeed as TrustProduct[]} storageKey="trust-fund-trust-products" columns={productColumns} searchFields={["code", "name", "category", "riskLevel"]} detailPath={(record) => `/trust/products/${record.id}`} actions={<Link to="/trust/products/new" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"><Plus className="mr-2 inline h-4 w-4" />New Product</Link>} />;
}

const productColumns: Column<TrustProduct>[] = [
  { key: "code", header: "Code" },
  { key: "name", header: "Product Name", sortable: true },
  { key: "category", header: "Category" },
  { key: "minimumInvestment", header: "Minimum Investment", render: (record) => <CurrencyDisplay value={record.minimumInvestment} /> },
  { key: "indicativeReturn", header: "Indicative Return" },
  { key: "tenure", header: "Tenure" },
  { key: "riskLevel", header: "Risk Level" },
  { key: "status", header: "Status", render: (record) => <StatusBadge status={record.status} /> }
];

export function TrustProductFormPage() {
  return <EditorPage title="Trust Product Form" description="Maintain visual product information and operational metadata." fields={["Product Code", "Product Name", "Category", "Minimum Investment", "Indicative Return", "Tenure", "Risk Level"]} />;
}

export function ClientDirectoryPage() {
  return <TablePage title="Client Directory" description="Search individuals and corporate clients with KYC status, contact and risk information." records={clientsSeed as ClientRecord[]} storageKey="trust-fund-clients" columns={clientColumns} searchFields={["id", "name", "identificationNumber", "email", "phone", "type"]} detailPath={(record) => `/clients/${record.id}`} actions={<button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"><UserPlus className="mr-2 inline h-4 w-4" />Add Client</button>} />;
}

const clientColumns: Column<ClientRecord>[] = [
  { key: "id", header: "Client ID", sortable: true },
  { key: "name", header: "Client Name", sortable: true },
  { key: "identificationNumber", header: "Identification Number" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "type", header: "Client Type" },
  { key: "riskLevel", header: "Risk Level" },
  { key: "status", header: "Status", render: (record) => <StatusBadge status={record.status} /> },
  { key: "createdDate", header: "Created Date", render: (record) => <DateDisplay value={record.createdDate} /> }
];

export function ClientProfilePage() {
  const { id } = useParams();
  const record = (clientsSeed as ClientRecord[]).find((item) => item.id === id) ?? (clientsSeed as ClientRecord[])[0];
  return <DetailPage title={record.name} subtitle={`${record.type} client · ${record.riskLevel} risk`} details={{ "Client ID": record.id, "Identification Number": record.identificationNumber, Email: record.email, Phone: record.phone, Address: record.address, Status: record.status }} />;
}

export function AgentDirectoryPage() {
  return <TablePage title="Agent Directory" description="View agent activity, branches, pipeline volume and assets under advisory." records={agentsSeed as AgentRecord[]} storageKey="trust-fund-agents" columns={agentColumns} searchFields={["id", "name", "email", "branch"]} detailPath={(record) => `/agents/${record.id}`} />;
}

const agentColumns: Column<AgentRecord>[] = [
  { key: "id", header: "Agent ID" },
  { key: "name", header: "Agent Name", sortable: true },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "branch", header: "Branch" },
  { key: "applications", header: "Applications" },
  { key: "assets", header: "Assets", render: (record) => <CurrencyDisplay value={record.assets} /> },
  { key: "status", header: "Status", render: (record) => <StatusBadge status={record.status} /> }
];

export function AgentProfilePage() {
  const { id } = useParams();
  const record = (agentsSeed as AgentRecord[]).find((item) => item.id === id) ?? (agentsSeed as AgentRecord[])[0];
  return <DetailPage title={record.name} subtitle={`${record.branch} branch`} details={{ Email: record.email, Phone: record.phone, Applications: String(record.applications), Assets: `RM ${record.assets.toLocaleString("en-MY")}`, Status: record.status }} />;
}

export function PaymentsPage({ receipts = false }: { receipts?: boolean }) {
  const records = receipts ? (receiptsSeed as PaymentRecord[]) : (paymentsSeed as PaymentRecord[]);
  return <TablePage title={receipts ? "Receipt Records" : "Payment Records"} description="Review collection details, receipt references, payment methods and processing status." records={records} storageKey={receipts ? "trust-fund-receipts" : "trust-fund-payments"} columns={paymentColumns} searchFields={["receiptNumber", "client", "trustAccount", "paymentMethod", "recordedBy"]} actions={<button onClick={() => toast.success(receipts ? "Receipt record added successfully." : "Payment record added successfully.")} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"><Plus className="mr-2 inline h-4 w-4" />Record Entry</button>} />;
}

const paymentColumns: Column<PaymentRecord>[] = [
  { key: "receiptNumber", header: "Receipt Number", sortable: true },
  { key: "client", header: "Client" },
  { key: "trustAccount", header: "Trust Account" },
  { key: "paymentDate", header: "Payment Date", render: (record) => <DateDisplay value={record.paymentDate} /> },
  { key: "paymentMethod", header: "Payment Method" },
  { key: "amount", header: "Amount", render: (record) => <CurrencyDisplay value={record.amount} /> },
  { key: "recordedBy", header: "Recorded By" },
  { key: "status", header: "Status", render: (record) => <StatusBadge status={record.status} /> }
];

export function TaskListPage({ filter }: { filter?: string }) {
  const [records, setRecords] = useState<TaskRecord[]>(() => readStorage("trust-fund-tasks", tasksSeed as TaskRecord[]));
  const visible = filter ? records.filter((record) => record.status === filter || record.priority === filter) : records;
  const markComplete = () => {
    const next = records.map((record, index) => (index === 0 ? { ...record, status: "Completed" } : record));
    setRecords(next);
    writeStorage("trust-fund-tasks", next);
    toast.success("Record updated successfully.");
  };
  return (
    <>
      <PageHeader title={filter ? `${filter} Tasks` : "Task List"} description="Manage local assignments, due dates, priorities and approvals." actions={<button onClick={markComplete} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Mark Complete</button>} />
      <DataTable records={visible} columns={taskColumns} searchFields={["title", "module", "relatedRecord", "assignedTo", "priority", "status"]} />
    </>
  );
}

const taskColumns: Column<TaskRecord>[] = [
  { key: "id", header: "Task ID" },
  { key: "title", header: "Title", sortable: true },
  { key: "module", header: "Module" },
  { key: "relatedRecord", header: "Related Record" },
  { key: "assignedTo", header: "Assigned To" },
  { key: "priority", header: "Priority" },
  { key: "dueDate", header: "Due Date", render: (record) => <DateDisplay value={record.dueDate} /> },
  { key: "status", header: "Status", render: (record) => <StatusBadge status={record.status} /> }
];

export function DocumentLibraryPage() {
  return <GenericRecordsPage title="Document Library" description="Browse deeds, corporate resolutions, declarations and expiring files." records={documentsSeed as Array<{ id: string; [key: string]: string }>} />;
}

export function ReportDashboardPage() {
  const exportCsv = () => {
    const csv = "Report,Status,Prepared Date\nManagement Summary,Ready,2026-07-26\nApplication Pipeline,Ready,2026-07-25";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "trust-fund-report.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Report export prepared successfully.");
  };
  return (
    <>
      <PageHeader title="Report Dashboard" description="Generate operational views by product, date range, application status and agent portfolio." actions={<button onClick={exportCsv} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"><Download className="mr-2 inline h-4 w-4" />Export CSV</button>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {["Management Reports", "Financial Reports", "Application Reports", "Agent Reports"].map((title) => <section key={title} className="rounded-lg border border-line bg-white p-5 shadow-soft"><FilePlus2 className="h-5 w-5 text-brandGold" /><h2 className="mt-3 text-base font-semibold">{title}</h2><p className="mt-2 text-sm text-textSecondary">Apply date, product and status filters before preparing a local export.</p></section>)}
      </div>
      <div className="mt-6"><ChartCard title="Recent Transaction Trend"><ResponsiveContainer width="100%" height={280}><LineChart data={dashboard.collections}><CartesianGrid stroke="#ECEFF3" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line type="monotone" dataKey="amount" stroke={black} strokeWidth={2} /></LineChart></ResponsiveContainer></ChartCard></div>
    </>
  );
}

export function UserManagementPage() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader title="User Management" description="Manage users, roles, local account status and access review activity." actions={<button onClick={() => setOpen(true)} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"><UserPlus className="mr-2 inline h-4 w-4" />Add User</button>} />
      <DataTable records={usersSeed as User[]} columns={userColumns} searchFields={["id", "name", "email", "username", "role", "status"]} />
      <Modal open={open} title="Add User" onClose={() => setOpen(false)}><EditorFields fields={["Full Name", "Email", "Username", "Role", "Status"]} onSave={() => { setOpen(false); toast.success("User account updated successfully."); }} /></Modal>
    </>
  );
}

const userColumns: Column<User>[] = [
  { key: "id", header: "User ID" },
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "username", header: "Username" },
  { key: "role", header: "Role", render: (record) => roles[record.role] },
  { key: "status", header: "Status", render: (record) => <StatusBadge status={record.status === "ACTIVE" ? "Active" : "Inactive"} /> }
];

export function RoleMatrixPage() {
  const initial = permissions.map((permission) => ({ permission, SUPER_ADMIN: true, ADMIN: !permission.includes("security"), TRUST_OFFICER: permission.includes("applications") || permission.includes("clients") || permission.includes("trust"), ACCOUNTS: permission.includes("payments") || permission.includes("accounts"), AGENT: permission.includes("applications") || permission.includes("clients"), CLIENT: permission.includes("documents") }));
  const [rows, setRows] = useState(() => readStorage("trust-fund-permissions", initial));
  return (
    <>
      <PageHeader title="Role and Permission Matrix" description="Review module permissions by role and save local access settings." actions={<button onClick={() => { writeStorage("trust-fund-permissions", rows); toast.success("Permissions saved successfully."); }} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"><Save className="mr-2 inline h-4 w-4" />Save Permissions</button>} />
      <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-soft">
        <table className="min-w-full text-left text-[13px]">
          <thead className="bg-soft"><tr><th className="border-b border-line px-4 py-3">Permission</th>{Object.values(roles).map((role) => <th key={role} className="border-b border-line px-4 py-3">{role}</th>)}</tr></thead>
          <tbody>{rows.map((row, rowIndex) => <tr key={row.permission} className="hover:bg-gray-50"><td className="border-b border-line px-4 py-3 font-medium">{row.permission}</td>{Object.keys(roles).map((role) => <td key={role} className="border-b border-line px-4 py-3"><input type="checkbox" checked={Boolean((row as Record<string, unknown>)[role])} onChange={() => setRows(rows.map((entry, index) => index === rowIndex ? { ...entry, [role]: !Boolean((entry as Record<string, unknown>)[role]) } : entry))} /></td>)}</tr>)}</tbody>
        </table>
      </div>
    </>
  );
}

export function AuditLogsPage() {
  return <TablePage title="Audit Logs" description="Review local audit presentation records across users, modules, actions and outcomes." records={auditSeed as AuditLog[]} storageKey="trust-fund-audit-logs" columns={auditColumns} searchFields={["user", "action", "module", "recordReference", "result"]} />;
}

const auditColumns: Column<AuditLog>[] = [
  { key: "dateTime", header: "Date and Time", render: (record) => new Date(record.dateTime).toLocaleString("en-MY") },
  { key: "user", header: "User" },
  { key: "role", header: "Role" },
  { key: "action", header: "Action" },
  { key: "module", header: "Module" },
  { key: "recordReference", header: "Record Reference" },
  { key: "ipAddress", header: "IP Address" },
  { key: "result", header: "Result" }
];

export function SystemSettingsPage() {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageHeader title="System Settings" description="Configure company profile, numbering formats, notifications, lookup data and session preferences." actions={<button onClick={() => toast.success("Settings updated successfully.")} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"><Settings className="mr-2 inline h-4 w-4" />Save Settings</button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        {["General", "Company Profile", "Branding", "Numbering Formats", "Notification Preferences", "Lookup Data", "Security Preferences", "Session Preferences"].map((section) => <section key={section} className="rounded-lg border border-line bg-white p-5 shadow-soft"><h2 className="text-base font-semibold">{section}</h2><EditorFields fields={["Name", "Code", "Description"]} /></section>)}
      </div>
      <button onClick={() => setConfirm(true)} className="mt-5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700">Reset Changes</button>
      <ConfirmDialog open={confirm} title="Reset Settings" message="This will restore unsaved local settings to their prior values." onClose={() => setConfirm(false)} onConfirm={() => { setConfirm(false); toast.success("Settings updated successfully."); }} />
    </>
  );
}

export function NotificationsPage() {
  const [records, setRecords] = useState<NotificationRecord[]>(() => readStorage("trust-fund-notifications", notificationsSeed as NotificationRecord[]));
  const markAll = () => {
    const next = records.map((record) => ({ ...record, read: true }));
    setRecords(next);
    writeStorage("trust-fund-notifications", next);
    toast.success("Notification marked as read.");
  };
  return (
    <>
      <PageHeader title="Notifications" description="Review application, payment, document, report and task updates." actions={<button onClick={markAll} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Mark All as Read</button>} />
      <div className="space-y-3">{records.map((record) => <MiniRow key={record.id} title={record.title} text={record.message} status={record.read ? "Completed" : "Pending Review"} />)}</div>
    </>
  );
}

export function ProfilePage({ preferences = false }: { preferences?: boolean }) {
  return <DetailPage title={preferences ? "Preferences" : "User Profile"} subtitle="System Super Administrator" details={{ Name: "System Super Administrator", Role: "Super Administrator", Email: "superadmin@trustfund.local", "Login Preference": preferences ? "Compact navigation enabled when selected" : "Local session active" }} />;
}

export function AccessDeniedPage() {
  return <div className="flex min-h-[70vh] items-center justify-center"><div className="max-w-lg rounded-lg border border-line bg-white p-8 text-center shadow-soft"><ShieldAlert className="mx-auto h-12 w-12 text-red-600" /><h1 className="mt-4 text-2xl font-semibold">Access Denied</h1><p className="mt-2 text-sm text-textSecondary">Your current role does not include permission for this page. Contact an administrator if access is required.</p><Link to="/dashboard" className="mt-5 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Return to Dashboard</Link></div></div>;
}

export function NotFoundPage() {
  return <div className="flex min-h-[70vh] items-center justify-center"><div className="max-w-lg rounded-lg border border-line bg-white p-8 text-center shadow-soft"><h1 className="text-2xl font-semibold">Page Not Found</h1><p className="mt-2 text-sm text-textSecondary">The requested page is not available in the current route structure.</p><Link to="/dashboard" className="mt-5 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Return to Dashboard</Link></div></div>;
}

export function SecondaryPage({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} actions={<button onClick={() => toast.success("Record updated successfully.")} className="rounded-lg border border-ink bg-white px-4 py-2 text-sm font-medium text-ink"><Filter className="mr-2 inline h-4 w-4" />Filter</button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Operational Summary"><MiniRow title="Open items" text="Records awaiting review" status="Pending Review" /><MiniRow title="Recent completion" text="Updated within the last 7 days" status="Completed" /></Panel>
        <Panel title="Work Queue"><MiniRow title="Assigned review" text="Daniel Tan" status="Active" /><MiniRow title="Supervisor attention" text="Priya Nair" status="Pending Approval" /></Panel>
        <Panel title="Local Actions"><button onClick={() => toast.success("Record updated successfully.")} className="w-full rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Update View</button></Panel>
      </div>
    </>
  );
}

function TablePage<T extends { id: string }>({ title, description, records, storageKey, columns, searchFields, detailPath, actions }: { title: string; description: string; records: T[]; storageKey: string; columns: Column<T>[]; searchFields: (keyof T)[]; detailPath?: (record: T) => string; actions?: React.ReactNode }) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    listRecords(storageKey, records).then((value) => {
      setData(value);
      setLoading(false);
    });
  }, [records, storageKey]);
  return <><PageHeader title={title} description={description} actions={actions} /><DataTable records={data} columns={columns} searchFields={searchFields} detailPath={detailPath} loading={loading} bulk /></>;
}

function GenericRecordsPage({ title, description, records }: { title: string; description: string; records: Array<{ id: string; [key: string]: string }> }) {
  const columns = useMemo<Column<{ id: string; [key: string]: string }>[]>(() => Object.keys(records[0] ?? { id: "" }).map((key) => ({ key, header: key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()) })), [records]);
  return <><PageHeader title={title} description={description} /><DataTable records={records} columns={columns} searchFields={Object.keys(records[0] ?? { id: "" })} /></>;
}

function DetailPage({ title, subtitle, details }: { title: string; subtitle: string; details: Record<string, string> }) {
  return <><PageHeader title={title} description={subtitle} /><section className="rounded-lg border border-line bg-white p-5 shadow-soft"><h2 className="text-base font-semibold">Details</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{Object.entries(details).map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div></section></>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-line bg-soft p-4"><dt className="text-xs font-medium uppercase tracking-wide text-textSecondary">{label}</dt><dd className="mt-1 text-sm font-semibold text-textPrimary">{value}</dd></div>;
}

function EditorPage({ title, description, fields }: { title: string; description: string; fields: string[] }) {
  return <><PageHeader title={title} description={description} /><section className="rounded-lg border border-line bg-white p-5 shadow-soft"><EditorFields fields={fields} onSave={() => toast.success("Record updated successfully.")} /></section></>;
}

function EditorFields({ fields, onSave }: { fields: string[]; onSave?: () => void }) {
  return <div className="grid gap-4 md:grid-cols-2">{fields.map((field) => <FormInput key={field} label={field} value="" onChange={() => undefined} />)}<div className="md:col-span-2"><button onClick={onSave} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Save</button></div></div>;
}
