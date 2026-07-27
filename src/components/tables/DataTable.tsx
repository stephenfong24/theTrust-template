import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Eye, MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../common/EmptyState";
import { LoadingSkeleton } from "../common/LoadingSkeleton";
import { SearchInput } from "../common/SearchInput";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (record: T) => React.ReactNode;
  sortable?: boolean;
}

export function DataTable<T extends { id: string }>({
  records,
  columns,
  searchFields,
  detailPath,
  loading = false,
  bulk = false
}: {
  records: T[];
  columns: Column<T>[];
  searchFields: (keyof T)[];
  detailPath?: (record: T) => string;
  loading?: boolean;
  bulk?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hidden, setHidden] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    const visible = term
      ? records.filter((record) => searchFields.some((field) => String(record[field] ?? "").toLowerCase().includes(term)))
      : records;
    if (!sortKey) return visible;
    return [...visible].sort((first, second) => {
      const a = String((first as Record<string, unknown>)[sortKey] ?? "");
      const b = String((second as Record<string, unknown>)[sortKey] ?? "");
      return sortDirection === "asc" ? a.localeCompare(b) : b.localeCompare(a);
    });
  }, [records, search, searchFields, sortDirection, sortKey]);

  const visibleColumns = columns.filter((column) => !hidden.includes(String(column.key)));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRecords = filtered.slice((page - 1) * pageSize, page * pageSize);

  const sortBy = (column: Column<T>) => {
    if (!column.sortable) return;
    const key = String(column.key);
    setSortKey(key);
    setSortDirection(sortKey === key && sortDirection === "asc" ? "desc" : "asc");
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="rounded-lg border border-line bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-textSecondary">{filtered.length} records</span>
          <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-9 rounded-lg border border-line bg-white px-2">
            {[5, 10, 20].map((size) => <option key={size}>{size}</option>)}
          </select>
          <details className="relative">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-line px-3">
              Columns <ChevronDown className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-line bg-white p-2 shadow-soft">
              {columns.map((column) => (
                <label key={String(column.key)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={!hidden.includes(String(column.key))}
                    onChange={() =>
                      setHidden((value) =>
                        value.includes(String(column.key)) ? value.filter((entry) => entry !== String(column.key)) : [...value, String(column.key)]
                      )
                    }
                  />
                  {column.header}
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>
      {pageRecords.length === 0 ? (
        <div className="p-6">
          <EmptyState title={search ? "No matching records" : "No records available"} description="Review the search term or clear active filters." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-soft text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                {bulk ? <th className="w-10 border-b border-line px-4 py-3"><input type="checkbox" aria-label="Select all records" /></th> : null}
                {visibleColumns.map((column) => (
                  <th key={String(column.key)} className="border-b border-line px-4 py-3 font-semibold">
                    <button onClick={() => sortBy(column)} className="inline-flex items-center gap-1">
                      {column.header}
                      {column.sortable ? <ChevronsUpDown className="h-3.5 w-3.5" /> : null}
                    </button>
                  </th>
                ))}
                <th className="border-b border-line px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  {bulk ? <td className="border-b border-line px-4 py-3"><input type="checkbox" aria-label={`Select ${record.id}`} /></td> : null}
                  {visibleColumns.map((column) => (
                    <td key={String(column.key)} className="border-b border-line px-4 py-3 text-textPrimary">
                      {column.render ? column.render(record) : String((record as Record<string, unknown>)[String(column.key)] ?? "")}
                    </td>
                  ))}
                  <td className="border-b border-line px-4 py-3">
                    <div className="flex items-center gap-2">
                      {detailPath ? (
                        <Link to={detailPath(record)} className="rounded-lg border border-line p-2 text-textSecondary hover:bg-gray-100" aria-label="View record">
                          <Eye className="h-4 w-4" />
                        </Link>
                      ) : null}
                      <button className="rounded-lg border border-line p-2 text-textSecondary hover:bg-gray-100" aria-label="More actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-col gap-3 border-t border-line p-4 text-sm text-textSecondary sm:flex-row sm:items-center sm:justify-between">
        <span>
          Page {page} of {pageCount}
        </span>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-line px-3 py-2 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border border-line px-3 py-2 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
