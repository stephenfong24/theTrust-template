import { CheckCircle2, Clock, Coins, Eye, RotateCcw, Search, UserRound, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { Pagination } from "../components/common/Pagination";
import { StatusBadge } from "../components/common/StatusBadge";
import { DatePickerInput } from "../components/forms/DatePickerInput";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { notifySuccess } from "../services/notificationService";

type CommissionStatus = "Paid" | "Pending" | "Rejected";
type CommissionTypeCode = "PERSONAL" | "OVERRIDING";
type CommissionTab = "All" | CommissionTypeCode;

interface CommissionTransaction {
  id: string;
  commissionRefNo: string;
  commissionDate: string;
  productName: string;
  trustApplicationNo: string;
  clientName: string;
  recipientAgentId: string;
  recipientAgentCode: string;
  recipientAgentName: string;
  recipientRankCode: string;
  recipientRankName: string;
  commissionType: CommissionTypeCode;
  sourceAgentId: string;
  sourceAgentCode: string;
  sourceAgentName: string;
  sourceAgentRankCode: string;
  sourceAgentRankName: string;
  relationshipToRecipient: string;
  placementAmount: number;
  commissionRate: number;
  commissionAmount: number;
  periodLabel: string;
  status: CommissionStatus;
  completedDate: string;
  statusChangedDate?: string;
  remark?: string;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  product: string;
  trustId: string;
  client: string;
  commissionType: string;
  status: string;
}

const allFilter = "all";

const initialTransactions: CommissionTransaction[] = [
  createTransaction("CM-2026-000123", "2026-09-08", "MyTrust", "TR-000123", "John Tan", "agt-000123", "AGT000123", "Alex Tan", "TR", "Trust Representative", "PERSONAL", "agt-000123", "AGT000123", "Alex Tan", "TR", "Trust Representative", "Self", 100000, 5, "One-Off", "Paid"),
  createTransaction("CM-2026-000124", "2026-09-08", "MyTrust", "TR-000123", "John Tan", "agt-000456", "AGT000456", "Brian Lee", "TM", "Trust Manager", "OVERRIDING", "agt-000123", "AGT000123", "Alex Tan", "TR", "Trust Representative", "Brian Lee > Alex Tan", 100000, 0.3, "One-Off", "Paid"),
  createTransaction("CM-2026-000125", "2026-09-08", "MyTrust", "TR-000123", "John Tan", "agt-000789", "AGT000789", "Carol Lim", "TD", "Trust Director", "OVERRIDING", "agt-000123", "AGT000123", "Alex Tan", "TR", "Trust Representative", "Carol Lim > Brian Lee > Alex Tan", 100000, 0.2, "One-Off", "Paid"),
  createTransaction("CM-2026-000126", "2026-09-08", "MyTrust", "TR-000123", "John Tan", "agt-001001", "AGT001001", "David Wong", "GTD", "Group Trust Director", "OVERRIDING", "agt-000123", "AGT000123", "Alex Tan", "TR", "Trust Representative", "David Wong > Carol Lim > Brian Lee > Alex Tan", 100000, 0.1, "One-Off", "Paid"),
  createTransaction("CM-2026-000127", "2026-09-08", "MyTrust", "TR-000123", "John Tan", "agt-001112", "AGT001112", "Eric Lim", "CTD", "Chief Trust Director", "OVERRIDING", "agt-000123", "AGT000123", "Alex Tan", "TR", "Trust Representative", "Eric Lim > David Wong > Alex Tan", 100000, 0.05, "One-Off", "Paid"),
  createTransaction("CM-2026-000128", "2026-09-15", "Flexi+", "TR-000456", "Mary Wong", "agt-001204", "AGT001204", "David Choo", "TR", "Trust Representative", "PERSONAL", "agt-001204", "AGT001204", "David Choo", "TR", "Trust Representative", "Self", 200000, 3, "Y1 One-Off", "Paid"),
  createTransaction("CM-2026-000129", "2026-09-15", "Flexi+", "TR-000456", "Mary Wong", "agt-000456", "AGT000456", "Brian Lee", "TM", "Trust Manager", "OVERRIDING", "agt-001204", "AGT001204", "David Choo", "TR", "Trust Representative", "Brian Lee > David Choo", 200000, 0.25, "Y2 Monthly", "Pending"),
  createTransaction("CM-2026-000130", "2026-09-20", "Saving Trust", "TR-000912", "Wong Kai", "agt-002012", "AGT002012", "James Ho", "Tier 2", "Tier 2", "OVERRIDING", "agt-001551", "AGT001551", "Elaine Yap", "Advisor", "Advisor", "James Ho > Elaine Yap", 50000, 0.15, "Year 1", "Paid"),
  createTransaction("CM-2026-000131", "2026-09-21", "Secure+", "TR-001025", "Tan Wei", "agt-002601", "AGT002601", "Ong Siew", "GTD", "Group Trust Director", "OVERRIDING", "agt-002440", "AGT002440", "Ken Chan", "TR", "Trust Representative", "Ong Siew > Ken Chan", 120000, 0.1, "One-Off", "Paid"),
  createTransaction("CM-2026-000132", "2026-09-22", "Exclusive Secure+", "TR-001166", "Koh Boon", "agt-002777", "AGT002777", "Lim Jia", "CTD", "Chief Trust Director", "OVERRIDING", "agt-002601", "AGT002601", "Ong Siew", "GTD", "Group Trust Director", "Lim Jia > Ong Siew", 300000, 0.05, "One-Off", "Paid")
];

export function CommissionPage() {
  const { session } = useAuth();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [filters, setFilters] = useState<Filters>({
    dateFrom: "2026-01-01",
    dateTo: "2026-09-30",
    product: allFilter,
    trustId: "",
    client: "",
    commissionType: allFilter,
    status: allFilter
  });
  const [activeTab, setActiveTab] = useState<CommissionTab>("All");
  const [selectedTransaction, setSelectedTransaction] = useState<CommissionTransaction | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredTransactions = useMemo(() => applyFilters(transactions, filters, activeTab), [transactions, filters, activeTab]);
  const pageCount = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const pageTransactions = filteredTransactions.slice((page - 1) * pageSize, page * pageSize);
  const totals = useMemo(() => getTotals(transactions), [transactions]);
  const canEditStatus = ["SA", "AD", "OP", "AC"].includes(session?.role ?? "");

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: "2026-01-01",
      dateTo: "2026-09-30",
      product: allFilter,
      trustId: "",
      client: "",
      commissionType: allFilter,
      status: allFilter
    });
    setActiveTab("All");
    setPage(1);
  };

  const updateCommissionStatus = (transactionId: string, status: CommissionStatus, remark: string) => {
    const nextTransactions = transactions.map((transaction) => (transaction.id === transactionId ? { ...transaction, status, remark, statusChangedDate: status === "Pending" ? undefined : new Date().toISOString().slice(0, 10) } : transaction));
    setTransactions(nextTransactions);
    setSelectedTransaction((current) => (current?.id === transactionId ? nextTransactions.find((transaction) => transaction.id === transactionId) ?? current : current));
    notifySuccess("Commission status updated successfully.", "commission-status-update");
  };

  return (
    <>
      <PageHeader title="Commission & Overriding Bonus Report" description="View and trace commission and overriding bonus earned from Trust applications." />

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <form onSubmit={submitSearch} className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <Field label="Date From" className="xl:col-span-2"><DatePickerInput value={filters.dateFrom} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))} buttonClassName={inputClass} dialogTitle="Date From" /></Field>
          <Field label="Date To" className="xl:col-span-2"><DatePickerInput value={filters.dateTo} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))} buttonClassName={inputClass} dialogTitle="Date To" /></Field>
          <Field label="Product" className="xl:col-span-3"><select value={filters.product} onChange={(event) => setFilters((current) => ({ ...current, product: event.target.value }))} className={inputClass}><option value={allFilter}>All Products</option>{unique(transactions.map((transaction) => transaction.productName)).map((product) => <option key={product}>{product}</option>)}</select></Field>
          <Field label="Commission Type" className="xl:col-span-3"><select value={filters.commissionType} onChange={(event) => setFilters((current) => ({ ...current, commissionType: event.target.value }))} className={inputClass}><option value={allFilter}>All Types</option><option value="PERSONAL">Personal</option><option value="OVERRIDING">Overriding</option></select></Field>
          <Field label="Status" className="xl:col-span-2"><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className={inputClass}><option value={allFilter}>All Status</option><option>Paid</option><option>Pending</option><option>Rejected</option></select></Field>
          <Field label="Trust ID" className="xl:col-span-3"><input value={filters.trustId} onChange={(event) => setFilters((current) => ({ ...current, trustId: event.target.value }))} placeholder="Search trust ID" className={inputClass} /></Field>
          <Field label="Client / Settlor" className="xl:col-span-4"><input value={filters.client} onChange={(event) => setFilters((current) => ({ ...current, client: event.target.value }))} placeholder="Search client name" className={inputClass} /></Field>
          <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:justify-end xl:col-span-5 xl:self-end">
            <Button type="button" variant="outline" onClick={resetFilters} className="min-w-[138px]"><RotateCcw className="h-4 w-4" />Reset</Button>
            <Button type="submit" className="min-w-[138px]"><Search className="h-4 w-4" />Search</Button>
          </div>
        </form>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<Coins className="h-5 w-5" />} title="Total Commission" value={formatCurrency(totals.total)} />
        <MetricCard icon={<UserRound className="h-5 w-5" />} title="Personal" value={formatCurrency(totals.personal)} />
        <MetricCard icon={<UsersRound className="h-5 w-5" />} title="Overriding" value={formatCurrency(totals.overriding)} />
        <MetricCard icon={<Clock className="h-5 w-5" />} title="Pending" value={formatCurrency(totals.pending)} />
        <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} title="Paid" value={formatCurrency(totals.paid)} />
      </div>

      <section className="mt-4 overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="flex flex-wrap gap-1 border-b border-line px-4 pt-3">
          {(["All", "PERSONAL", "OVERRIDING"] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => { setActiveTab(tab); setPage(1); }} className={activeTab === tab ? "border-b-2 border-brandGold px-3 py-3 text-sm font-semibold text-[#8A650F]" : "px-3 py-3 text-sm font-semibold text-textSecondary hover:text-textPrimary"}>
              {getTabLabel(tab, transactions)}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                {["No.", "Status", "Trust", "Date", "Recipient Agent", "Type", "Source / Selling Agent", "Placement", "Commission", "Action"].map((header) => (
                  <th key={header} className={`whitespace-nowrap border-b border-line px-4 py-3 font-semibold ${header === "Trust" ? "min-w-[130px]" : ""} ${header === "Date" ? "min-w-[170px]" : ""} ${header === "Source / Selling Agent" ? "min-w-[190px]" : ""} ${header === "Recipient Agent" ? "min-w-[160px]" : ""}`}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageTransactions.map((transaction, index) => (
                <tr key={transaction.id} className="transition hover:bg-gray-50">
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{(page - 1) * pageSize + index + 1}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3">
                    <StatusBadge status={transaction.status} />
                    <div className="mt-1.5 text-xs font-semibold text-textSecondary">{transaction.commissionRefNo}</div>
                  </td>
                  <td className="min-w-[130px] whitespace-nowrap border-b border-line px-4 py-3">
                    <div className="font-semibold text-textPrimary">{transaction.trustApplicationNo}</div>
                    <div className="mt-0.5 text-xs text-textSecondary">{transaction.productName}</div>
                  </td>
                  <td className="min-w-[170px] whitespace-nowrap border-b border-line px-4 py-3">
                    <DateCell generatedDate={transaction.commissionDate} status={transaction.status} statusChangedDate={transaction.statusChangedDate} />
                  </td>
                  <td className="min-w-[160px] border-b border-line px-4 py-3">
                    <AgentCell name={transaction.recipientAgentName} meta={transaction.recipientAgentCode} badge={transaction.recipientRankCode} />
                  </td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3"><CommissionTypeBadge type={transaction.commissionType} /></td>
                  <td className="min-w-[190px] border-b border-line px-4 py-3">
                    <AgentCell name={transaction.sourceAgentName} meta={transaction.commissionType === "PERSONAL" ? `${transaction.sourceAgentRankCode} - Self` : `${transaction.sourceAgentRankCode} - ${transaction.sourceAgentCode}`} />
                  </td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary">{formatCurrency(transaction.placementAmount)}</td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3">
                    <div className="font-semibold text-textPrimary">{formatCurrency(transaction.commissionAmount)}</div>
                    <div className="mt-0.5 text-xs text-textSecondary">{formatRate(transaction.commissionRate)}</div>
                  </td>
                  <td className="whitespace-nowrap border-b border-line px-4 py-3">
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedTransaction(transaction)}><Eye className="h-4 w-4" />View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-textSecondary">
            Rows
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-9 rounded-lg border border-line bg-white px-2 text-textPrimary">
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <Pagination currentPage={page} pageCount={pageCount} totalRecords={filteredTransactions.length} pageSize={pageSize} itemLabel="records" onPageChange={setPage} />
        </div>
      </section>

      <CommissionDetailsPanel transaction={selectedTransaction} canEditStatus={canEditStatus} onClose={() => setSelectedTransaction(null)} onSubmit={updateCommissionStatus} />
    </>
  );
}

function CommissionDetailsPanel({ transaction, canEditStatus, onClose, onSubmit }: { transaction: CommissionTransaction | null; canEditStatus: boolean; onClose: () => void; onSubmit: (id: string, status: CommissionStatus, remark: string) => void }) {
  const [status, setStatus] = useState<CommissionStatus>("Pending");
  const [remark, setRemark] = useState("");
  useBodyScrollLock(Boolean(transaction));

  useEffect(() => {
    if (transaction) {
      setStatus(transaction.status);
      setRemark(transaction.remark ?? "");
    }
  }, [transaction]);

  if (!transaction) return null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(transaction.id, status, remark);
  };

  const explanation = transaction.commissionType === "OVERRIDING"
    ? `This overriding bonus was generated from the Trust placement submitted by ${transaction.sourceAgentName}.`
    : "This personal commission was generated from the recipient agent's own Trust placement.";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close commission details" onClick={onClose} />
      <aside className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-line bg-white shadow-[0_28px_80px_rgba(17,17,17,0.25)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-textPrimary">Commission Details</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-textSecondary hover:bg-gray-100 hover:text-textPrimary" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-4 bg-soft p-5">
          <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
            <div className="border-b border-line bg-[#111111] px-4 py-3 text-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-white/70">Commission Reference</div>
                  <div className="mt-1 text-xl font-semibold">{transaction.commissionRefNo}</div>
                </div>
                <StatusBadge status={transaction.status} />
              </div>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <SummaryTile label="Generated Date" value={formatDate(transaction.commissionDate)} />
              <SummaryTile label="Status Date" value={formatStatusChangedDate(transaction)} />
              <SummaryTile label="Commission" value={formatCurrency(transaction.commissionAmount)} strong />
              <SummaryTile label="Type" value={getCommissionTypeLabel(transaction.commissionType)} />
            </div>
          </div>
          <DetailSection title="Trust Information" items={[
            ["Product", transaction.productName],
            ["Trust Application No.", transaction.trustApplicationNo],
            ["Client / Settlor", transaction.clientName],
            ["Placement", formatCurrency(transaction.placementAmount)],
            ["Completed Date", formatDate(transaction.completedDate)]
          ]} />
          <DetailSection title="Commission Recipient" items={[
            ["Recipient Agent", transaction.recipientAgentName],
            ["Agent Code", transaction.recipientAgentCode],
            ["Rank at Completed", `${transaction.recipientRankName} (${transaction.recipientRankCode})`],
            ["Commission Type", getCommissionTypeLabel(transaction.commissionType)],
            ["Rate", `${transaction.commissionRate.toFixed(2)}%`],
            ["Commission", formatCurrency(transaction.commissionAmount)]
          ]} />
          <DetailSection title="Commission Source" items={[
            ["Source / Selling Agent", transaction.sourceAgentName],
            ["Source Agent Code", transaction.sourceAgentCode],
            ["Source Agent Rank", `${transaction.sourceAgentRankName} (${transaction.sourceAgentRankCode})`],
            ["Relationship to Recipient", transaction.relationshipToRecipient]
          ]} />
          <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <h3 className="text-sm font-semibold text-textPrimary">Calculation</h3>
            <div className="mt-3 rounded-lg border border-[#E9D8A6] bg-[#FFF8E1] p-4 text-base font-semibold text-textPrimary">{formatCurrency(transaction.placementAmount)} x {transaction.commissionRate.toFixed(2)}% = {formatCurrency(transaction.commissionAmount)}</div>
            <p className="mt-3 text-sm leading-6 text-textSecondary">{explanation}</p>
          </div>
          {canEditStatus ? (
            <form onSubmit={submit} className="rounded-lg border border-line bg-white p-4 shadow-soft">
              <h3 className="text-sm font-semibold text-textPrimary">Status Update</h3>
              <div className="mt-4 grid gap-4">
                <Field label="Status">
                  <select value={status} onChange={(event) => setStatus(event.target.value as CommissionStatus)} className={inputClass}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </Field>
                <Field label="Remark">
                  <textarea value={remark} onChange={(event) => setRemark(event.target.value)} rows={3} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
                </Field>
                <div className="flex justify-end">
                  <Button type="submit">Submit</Button>
                </div>
              </div>
            </form>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function AgentCell({ name, meta, badge }: { name: string; meta: string; badge?: string }) {
  return (
    <div>
      <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap font-semibold text-textPrimary">
        <span>{name}</span>
        {badge ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-textPrimary">{badge}</span> : null}
      </div>
      <div className="mt-0.5 whitespace-nowrap text-xs text-textSecondary">{meta}</div>
    </div>
  );
}

function DateCell({ generatedDate, status, statusChangedDate }: { generatedDate: string; status: CommissionStatus; statusChangedDate?: string }) {
  const statusLabel = status === "Rejected" ? "Rejected" : "Paid";

  return (
    <div className="whitespace-nowrap">
      <div className="font-semibold text-textPrimary">{formatDate(generatedDate)}</div>
      <small className="mt-1 block text-xs text-textSecondary">{statusChangedDate ? `${statusLabel} ${formatDate(statusChangedDate)}` : `${statusLabel} -`}</small>
    </div>
  );
}

function CommissionTypeBadge({ type }: { type: CommissionTypeCode }) {
  const isOverride = type === "OVERRIDING";
  return (
    <span className={isOverride ? "inline-flex whitespace-nowrap rounded-full bg-[#FFF8E1] px-3 py-1 text-xs font-semibold text-[#8A650F]" : "inline-flex whitespace-nowrap rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-textPrimary"}>
      {getCommissionTypeLabel(type)}
    </span>
  );
}

function SummaryTile({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-soft px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</div>
      <div className={strong ? "mt-1 text-base font-semibold text-textPrimary" : "mt-1 text-sm font-semibold text-textPrimary"}>{value}</div>
    </div>
  );
}

function DetailSection({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <h3 className="border-b border-line pb-3 text-sm font-semibold text-textPrimary">{title}</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-soft px-3 py-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-textPrimary">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function MetricCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return <div className="rounded-lg border border-line bg-white p-4 shadow-soft"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF8E1] text-[#8A650F]">{icon}</span><div><div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{title}</div><div className="mt-1 text-lg font-semibold text-textPrimary">{value}</div></div></div></div>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block min-w-0 text-sm font-semibold text-textPrimary ${className}`}>{label}<span className="mt-1 block">{children}</span></label>;
}

function createTransaction(commissionRefNo: string, commissionDate: string, productName: string, trustApplicationNo: string, clientName: string, recipientAgentId: string, recipientAgentCode: string, recipientAgentName: string, recipientRankCode: string, recipientRankName: string, commissionType: CommissionTypeCode, sourceAgentId: string, sourceAgentCode: string, sourceAgentName: string, sourceAgentRankCode: string, sourceAgentRankName: string, relationshipToRecipient: string, placementAmount: number, commissionRate: number, periodLabel: string, status: CommissionStatus): CommissionTransaction {
  return {
    id: commissionRefNo,
    commissionRefNo,
    commissionDate,
    productName,
    trustApplicationNo,
    clientName,
    recipientAgentId,
    recipientAgentCode,
    recipientAgentName,
    recipientRankCode,
    recipientRankName,
    commissionType,
    sourceAgentId,
    sourceAgentCode,
    sourceAgentName,
    sourceAgentRankCode,
    sourceAgentRankName,
    relationshipToRecipient,
    placementAmount,
    commissionRate,
    commissionAmount: placementAmount * (commissionRate / 100),
    periodLabel,
    status,
    completedDate: commissionDate,
    statusChangedDate: status === "Pending" ? undefined : commissionDate
  };
}

function applyFilters(transactions: CommissionTransaction[], filters: Filters, activeTab: CommissionTab) {
  return transactions.filter((transaction) => {
    const date = Date.parse(transaction.commissionDate);
    const from = filters.dateFrom ? Date.parse(filters.dateFrom) : -Infinity;
    const to = filters.dateTo ? Date.parse(filters.dateTo) : Infinity;
    const trustId = filters.trustId.trim().toLowerCase();
    const client = filters.client.trim().toLowerCase();
    return (
      date >= from &&
      date <= to &&
      (filters.product === allFilter || transaction.productName === filters.product) &&
      (!trustId || transaction.trustApplicationNo.toLowerCase().includes(trustId)) &&
      (!client || transaction.clientName.toLowerCase().includes(client)) &&
      (filters.commissionType === allFilter || transaction.commissionType === filters.commissionType) &&
      (filters.status === allFilter || transaction.status === filters.status) &&
      (activeTab === "All" || transaction.commissionType === activeTab)
    );
  });
}

function getTotals(transactions: CommissionTransaction[]) {
  return {
    total: sum(transactions),
    personal: sum(transactions.filter((transaction) => transaction.commissionType === "PERSONAL")),
    overriding: sum(transactions.filter((transaction) => transaction.commissionType === "OVERRIDING")),
    pending: sum(transactions.filter((transaction) => transaction.status === "Pending")),
    paid: sum(transactions.filter((transaction) => transaction.status === "Paid"))
  };
}

function getTabLabel(tab: CommissionTab, transactions: CommissionTransaction[]) {
  if (tab === "All") return `All Transactions (${transactions.length})`;
  return `${getCommissionTypeLabel(tab)} (${transactions.filter((transaction) => transaction.commissionType === tab).length})`;
}

function getCommissionTypeLabel(type: CommissionTypeCode) {
  return type === "PERSONAL" ? "Personal" : "Overriding";
}

function sum(transactions: CommissionTransaction[]) {
  return transactions.reduce((total, transaction) => total + transaction.commissionAmount, 0);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function formatCurrency(value: number) {
  return `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatRate(value: number) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)}%`;
}

function formatStatusChangedDate(transaction: CommissionTransaction) {
  return transaction.statusChangedDate ? formatDate(transaction.statusChangedDate) : "-";
}

const inputClass = "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink";
