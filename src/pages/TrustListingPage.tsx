import { Link, useNavigate } from "react-router-dom";
import { FilePlus2, MoreHorizontal, Plus, Search } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import applications from "../data/applications.json";
import { PageHeader } from "../components/common/PageHeader";
import { Pagination } from "../components/common/Pagination";
import { StatusBadge } from "../components/common/StatusBadge";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import type { ApplicationRecord } from "../types";

const allFilter = "all";

interface ListingFilters {
  query: string;
  status: string;
  product: string;
}

export function TrustListingPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [draftFilters, setDraftFilters] = useState<ListingFilters>({ query: "", status: allFilter, product: allFilter });
  const [filters, setFilters] = useState<ListingFilters>({ query: "", status: allFilter, product: allFilter });

  const records = applications as ApplicationRecord[];
  const products = Array.from(new Set(records.map((record) => record.trustProduct))).sort();
  const statuses = Array.from(new Set(records.map((record) => record.status))).sort();
  const statusCounts = useMemo(
    () =>
      statuses.map((status) => ({
        status,
        count: records.filter((record) => record.status === status).length
      })),
    [records, statuses]
  );

  const filteredRecords = useMemo(() => {
    const query = filters.query.toLowerCase();
    return records.filter((record) => {
      const searchable = `${record.applicationNumber} ${record.clientName} ${record.agent} ${record.trustProduct}`.toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesStatus = filters.status === allFilter || record.status === filters.status;
      const matchesProduct = filters.product === allFilter || record.trustProduct === filters.product;
      return matchesQuery && matchesStatus && matchesProduct;
    });
  }, [filters, records]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pageRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);
  const canCreateApplication = session?.role === "AG";

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({ ...draftFilters, query: draftFilters.query.trim() });
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Trust Listing"
        description="Review submitted and draft trust applications, track progress, and continue in-progress client onboarding."
        actions={
          canCreateApplication ? (
            <Button type="button" onClick={() => navigate("/trust/applications/new/personal-details")}>
              <Plus className="h-4 w-4" />
              New Trust Application
            </Button>
          ) : null
        }
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statusCounts.map((item) => {
          const selected = filters.status === item.status;
          return (
            <button
              key={item.status}
              type="button"
              onClick={() => {
                setDraftFilters((current) => ({ ...current, status: item.status }));
                setFilters((current) => ({ ...current, status: item.status }));
                setPage(1);
              }}
              className={selected ? "rounded-lg border border-ink bg-ink p-4 text-left text-white shadow-soft" : "rounded-lg border border-line bg-white p-4 text-left shadow-soft transition hover:border-brandGold hover:bg-[#FFFBEB]"}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={selected ? "text-xs font-semibold uppercase tracking-wide text-gray-200" : "text-xs font-semibold uppercase tracking-wide text-textSecondary"}>Trust Count</div>
                  <div className={selected ? "mt-2 text-3xl font-semibold text-white" : "mt-2 text-3xl font-semibold text-textPrimary"}>{item.count}</div>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className={selected ? "mt-3 text-sm font-semibold text-gray-100" : "mt-3 text-sm font-semibold text-textPrimary"}>{item.status}</div>
            </button>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line p-4">
          <form onSubmit={submitFilters} className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_190px_auto]">
            <label className="block text-sm font-semibold text-textPrimary">
              Search
              <span className="relative mt-1 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
                <input
                  value={draftFilters.query}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
                  placeholder="Application, client, agent or plan"
                  className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </span>
            </label>
            <FilterSelect label="Trust Product" value={draftFilters.product} options={products} onChange={(value) => setDraftFilters((current) => ({ ...current, product: value }))} />
            <FilterSelect label="Status" value={draftFilters.status} options={statuses} onChange={(value) => setDraftFilters((current) => ({ ...current, status: value }))} />
            <Button type="submit" className="self-end">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-textSecondary">{filteredRecords.length} applications</div>
          <label className="flex items-center gap-2 text-sm text-textSecondary">
            Rows
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-9 rounded-lg border border-line bg-white px-2 text-textPrimary"
            >
              {[5, 10, 20].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                {["Application No.", "Client", "Trust Product", "Agent", "Amount", "Progress", "Status", "Last Updated", "Action"].map((header) => (
                  <th key={header} className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record) => (
                <tr key={record.id} className="transition hover:bg-gray-50">
                  <td className="border-b border-line px-4 py-3 font-semibold text-textPrimary">{record.applicationNumber}</td>
                  <td className="min-w-48 border-b border-line px-4 py-3 text-textPrimary">{record.clientName}</td>
                  <td className="min-w-44 border-b border-line px-4 py-3 text-textSecondary">{record.trustProduct}</td>
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{record.agent}</td>
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{formatCurrency(record.investmentAmount)}</td>
                  <td className="min-w-36 border-b border-line px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-brandGold" style={{ width: `${record.progress}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-textSecondary">{record.progress}%</span>
                    </div>
                  </td>
                  <td className="border-b border-line px-4 py-3"><StatusBadge status={record.status} /></td>
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{record.lastUpdated}</td>
                  <td className="border-b border-line px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/trust/applications/${record.id}/personal-details`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-textSecondary hover:bg-gray-100" aria-label={`Open ${record.applicationNumber}`}>
                        <FilePlus2 className="h-4 w-4" />
                      </Link>
                      <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-textSecondary hover:bg-gray-100" aria-label={`More actions for ${record.applicationNumber}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} pageCount={pageCount} totalRecords={filteredRecords.length} pageSize={pageSize} itemLabel="applications" onPageChange={setPage} />
      </section>
    </>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-textPrimary">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        <option value={allFilter}>All</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function formatCurrency(value: number) {
  return `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
