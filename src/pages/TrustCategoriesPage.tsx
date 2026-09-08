import { Edit, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { PageHeader } from "../components/common/PageHeader";
import { Pagination } from "../components/common/Pagination";
import { StatusBadge } from "../components/common/StatusBadge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { trustPlanMockData, trustPlanStorageKey } from "../data/trustPlanMockData";
import { useAuth } from "../hooks/useAuth";
import { notifyError, notifySuccess } from "../services/notificationService";
import type { TrustPlan } from "../types/trustPlan";

type CategoryStatus = "Active" | "Inactive";

interface TrustCategory {
  id: string;
  name: string;
  status: CategoryStatus;
  updatedAt: string;
}

const storageKey = "theTrust.trustCategories";
const predefinedCategories = ["MyTrust", "Secure Trust", "Secure+", "Secure Pro", "Saving Trust", "Flexi Trust"];

export function TrustCategoriesPage() {
  const { session } = useAuth();
  const [records, setRecords] = useState<TrustCategory[]>(loadCategories);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingRecord, setEditingRecord] = useState<TrustCategory | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<TrustCategory | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const trustPlans = useMemo(loadTrustPlansForCategoryCounts, []);
  const productCountByCategory = useMemo(() => getProductCountByCategory(trustPlans), [trustPlans]);

  const filteredRecords = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? records.filter((record) => record.name.toLowerCase().includes(term) || record.status.toLowerCase().includes(term)) : records;
  }, [query, records]);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pageRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const saveCategory = (draft: TrustCategory) => {
    const normalizedName = draft.name.trim();
    if (!normalizedName) {
      notifyError("Category name is required.", "trust-category-name-required");
      return;
    }

    const duplicate = records.some((record) => record.id !== draft.id && record.name.toLowerCase() === normalizedName.toLowerCase());
    if (duplicate) {
      notifyError("Category name already exists.", "trust-category-duplicate");
      return;
    }

    const savedRecord = { ...draft, name: normalizedName, updatedAt: new Date().toISOString() };
    const nextRecords = adding ? [savedRecord, ...records] : records.map((record) => (record.id === savedRecord.id ? savedRecord : record));
    setRecords(nextRecords);
    saveCategories(nextRecords);
    setAdding(false);
    setEditingRecord(null);
    setOpenActionId(null);
    notifySuccess(adding ? "Trust category added successfully." : "Trust category updated successfully.", "trust-category-save");
  };

  const deleteCategory = () => {
    if (!deleteRecord) return;
    const nextRecords = records.filter((record) => record.id !== deleteRecord.id);
    setRecords(nextRecords);
    saveCategories(nextRecords);
    setDeleteRecord(null);
    setOpenActionId(null);
    notifySuccess("Trust category deleted successfully.", "trust-category-delete");
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
  };

  if (session?.role !== "SA" && session?.role !== "AD") {
    return <Navigate to="/access-denied" replace />;
  }

  return (
    <>
      <PageHeader
        title="Trust Categories"
        description="Manage product category names used for trust plan configuration."
        actions={
          <Button type="button" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        }
      />

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line p-4">
          <form onSubmit={submitSearch} className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_auto]">
            <label className="block text-sm font-semibold text-textPrimary">
              Search category
              <span className="relative mt-1 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by category name or status"
                  className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </span>
            </label>
            <Button type="submit" className="self-end">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-textSecondary">{filteredRecords.length} categories</div>
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
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                <th className="w-20 border-b border-line px-4 py-3 font-semibold">No.</th>
                <th className="border-b border-line px-4 py-3 font-semibold">Category Name</th>
                <th className="border-b border-line px-4 py-3 font-semibold">Total Trust Product</th>
                <th className="border-b border-line px-4 py-3 font-semibold">Status</th>
                <th className="border-b border-line px-4 py-3 font-semibold">Last Updated</th>
                <th className="border-b border-line px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record, index) => (
                <tr key={record.id} className="transition hover:bg-gray-50">
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{(page - 1) * pageSize + index + 1}</td>
                  <td className="border-b border-line px-4 py-3 font-semibold text-textPrimary">{record.name}</td>
                  <td className="border-b border-line px-4 py-3 text-textPrimary">{productCountByCategory.get(normalizeCategoryName(record.name)) ?? 0}</td>
                  <td className="border-b border-line px-4 py-3">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="border-b border-line px-4 py-3 text-textSecondary">{formatDate(record.updatedAt)}</td>
                  <td className="border-b border-line px-4 py-3">
                    <div className="relative">
                      <button type="button" onClick={() => setOpenActionId((current) => (current === record.id ? null : record.id))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-textSecondary hover:bg-gray-100" aria-label={`Actions for ${record.name}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openActionId === record.id ? (
                        <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-line bg-white p-2 shadow-soft">
                          <button type="button" onClick={() => setEditingRecord(record)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-textPrimary hover:bg-gray-50">
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button type="button" onClick={() => setDeleteRecord(record)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} pageCount={pageCount} totalRecords={filteredRecords.length} pageSize={pageSize} itemLabel="categories" onPageChange={setPage} />
      </section>

      <CategoryModal
        title={adding ? "Add Category" : "Edit Category"}
        open={adding || Boolean(editingRecord)}
        record={editingRecord ?? createEmptyCategory()}
        onClose={() => {
          setAdding(false);
          setEditingRecord(null);
          setOpenActionId(null);
        }}
        onSubmit={saveCategory}
      />

      <ConfirmDialog
        open={Boolean(deleteRecord)}
        title="Delete trust category"
        message={deleteRecord ? `Are you sure you want to delete ${deleteRecord.name}?` : "Are you sure you want to delete this category?"}
        confirmText="Delete"
        destructive
        onClose={() => setDeleteRecord(null)}
        onConfirm={deleteCategory}
      />
    </>
  );
}

function CategoryModal({
  title,
  open,
  record,
  onClose,
  onSubmit
}: {
  title: string;
  open: boolean;
  record: TrustCategory;
  onClose: () => void;
  onSubmit: (record: TrustCategory) => void;
}) {
  const [draft, setDraft] = useState(record);

  useEffect(() => {
    setDraft(record);
  }, [record]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(draft);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Update the product category name and status.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="grid gap-4 rounded-lg border border-line bg-white p-4">
            <label className="block text-sm font-medium text-textPrimary">
              Category Name <span className="text-red-600">*</span>
              <input value={draft.name} required onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
            </label>
            <label className="block text-sm font-medium text-textPrimary">
              Status <span className="text-red-600">*</span>
              <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as CategoryStatus }))} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function createEmptyCategory(): TrustCategory {
  return {
    id: `CAT-${Date.now()}`,
    name: "",
    status: "Active",
    updatedAt: new Date().toISOString()
  };
}

function createPredefinedCategories(): TrustCategory[] {
  return predefinedCategories.map((name, index) => ({
    id: `CAT-${String(index + 1).padStart(4, "0")}`,
    name,
    status: "Active",
    updatedAt: new Date().toISOString()
  }));
}

function loadCategories(): TrustCategory[] {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) {
    const initial = createPredefinedCategories();
    saveCategories(initial);
    return initial;
  }

  try {
    return JSON.parse(saved) as TrustCategory[];
  } catch {
    return createPredefinedCategories();
  }
}

function saveCategories(records: TrustCategory[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(records));
}

function loadTrustPlansForCategoryCounts(): TrustPlan[] {
  const saved = window.localStorage.getItem(trustPlanStorageKey);
  if (!saved) return trustPlanMockData;

  try {
    return JSON.parse(saved) as TrustPlan[];
  } catch {
    return trustPlanMockData;
  }
}

function getProductCountByCategory(plans: TrustPlan[]) {
  const counts = new Map<string, number>();

  for (const plan of plans) {
    const categoryKey = normalizeCategoryName(plan.basicInfo.productCategory);
    const productNameKey = normalizeCategoryName(plan.basicInfo.productName);

    if (categoryKey) {
      counts.set(categoryKey, (counts.get(categoryKey) ?? 0) + 1);
    }

    if (productNameKey && productNameKey !== categoryKey) {
      counts.set(productNameKey, (counts.get(productNameKey) ?? 0) + 1);
    }
  }

  return counts;
}

function normalizeCategoryName(value: string) {
  return value.trim().toLowerCase();
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return value;
  }
}
