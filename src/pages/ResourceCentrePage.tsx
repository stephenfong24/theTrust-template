import {
  ExternalLink,
  Eye,
  FilePenLine,
  FileSpreadsheet,
  FileText,
  Grid2X2,
  Link as LinkIcon,
  List,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Video
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { resourceApi, type ManagedResourceItem, type ResourceCategoryCode } from "../api/resourceApi";
import { useAuth } from "../hooks/useAuth";
import { notifyError, notifySuccess } from "../services/notificationService";

type ResourceTab = "memo" | "forms-documents" | "internal-training";
type ResourceType = "document" | "video" | "link" | "content";
type ResourceStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  category: string;
  meta: string;
  date: string;
  status: "ACTIVE" | "INACTIVE";
  href?: string;
  fileUrl?: string;
  fileName?: string;
  fileKind?: "PDF" | "DOC" | "DOCX" | "XLS" | "XLSX" | "PPT" | "PPTX" | "JPG" | "JPEG" | "PNG";
}

const tabs: Array<{ label: string; value: ResourceTab; path: string; categoryCode: ResourceCategoryCode }> = [
  { label: "Memo", value: "memo", path: "/resources/memo", categoryCode: "MEMO" },
  { label: "Form & Document", value: "forms-documents", path: "/resources/forms-documents", categoryCode: "FORM_DOCUMENT" },
  { label: "Internal Training", value: "internal-training", path: "/resources/internal-training", categoryCode: "INTERNAL_TRAINING" }
];

export function ResourceCentrePage() {
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getRouteTab(location.pathname);
  const activeCategoryCode = getRouteCategoryCode(activeTab);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResourceStatusFilter>("ALL");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [viewingResource, setViewingResource] = useState<ResourceItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResourceItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const canAddResource = session?.role === "SA" || session?.role === "AD";
  const canManageResource = session?.role === "SA" || session?.role === "AD";
  const useAvailableResourceList = session?.role === "AG" || session?.role === "OP" || session?.role === "AC";
  const showStatusFilter = session?.role === "SA" || session?.role === "AD";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);

    const loadResources = useAvailableResourceList ? resourceApi.getAvailableResources : resourceApi.getManagedResources;

    loadResources(activeCategoryCode)
      .then((items) => {
        if (!active) return;
        setResources(items.map(toResourceItem));
      })
      .catch((error) => {
        if (!active) return;
        setResources([]);
        setFailed(true);
        notifyError(error instanceof Error ? error.message : "Unable to load resources.", "resource-list-load");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeCategoryCode, useAvailableResourceList]);

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return resources
      .filter((item) => !normalizedQuery || `${item.title} ${item.description} ${item.category} ${item.meta}`.toLowerCase().includes(normalizedQuery))
      .filter((item) => statusFilter === "ALL" || item.status === statusFilter)
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }, [query, resources, statusFilter]);

  const handleAddResource = () => {
    if (!canAddResource) {
      notifyError("Only Super Admin and Admin can add resources.", "add-resource-denied");
      return;
    }

    navigate(`/resources/add?categoryCode=${encodeURIComponent(activeCategoryCode)}`);
  };

  const deleteResource = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await resourceApi.deleteResource(deleteTarget.id);
      setResources((current) => current.filter((resource) => resource.id !== deleteTarget.id));
      notifySuccess("Resource deleted successfully.", "resource-delete");
      setDeleteTarget(null);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to delete resource.", "resource-delete-error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 h-1 w-12 rounded-full bg-brandGold" />
          <h1 className="text-[28px] font-semibold tracking-normal text-textPrimary">Resource Centre</h1>
          <p className="mt-1 max-w-3xl text-sm text-textSecondary">Find documents, training materials and useful resources.</p>
        </div>
        {canAddResource ? (
          <button
            type="button"
            onClick={handleAddResource}
            className="inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-black"
          >
            <Plus className="h-4 w-4" />
            Add Resource
          </button>
        ) : null}
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <Link
              key={tab.value}
              to={tab.path}
              className={active ? "rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-soft" : "rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-textSecondary transition hover:border-brandGold hover:text-textPrimary"}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <section className="rounded-lg border border-line bg-white p-3 shadow-soft">
        <div className={showStatusFilter ? "grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]" : "grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]"}>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-textSecondary" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search resources..."
              className="h-12 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </label>
          {showStatusFilter ? (
            <label className="block">
              <span className="sr-only">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ResourceStatusFilter)}
                className="h-12 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
          ) : null}
          <div className="flex rounded-lg border border-line bg-soft p-1">
            <button type="button" onClick={() => setView("grid")} className={view === "grid" ? "flex h-10 w-10 items-center justify-center rounded-md bg-white text-brandGold shadow-sm" : "flex h-10 w-10 items-center justify-center rounded-md text-textSecondary hover:text-textPrimary"} aria-label="Grid view">
              <Grid2X2 className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setView("list")} className={view === "list" ? "flex h-10 w-10 items-center justify-center rounded-md bg-white text-brandGold shadow-sm" : "flex h-10 w-10 items-center justify-center rounded-md text-textSecondary hover:text-textPrimary"} aria-label="List view">
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <div className="text-sm font-medium text-textSecondary">{filteredResources.length} resources</div>

      {failed ? (
        <section className="rounded-lg border border-line bg-white p-6 shadow-soft">
          <EmptyState title="Unable to load resources" description="Please try again later or confirm your account has access to resource management." />
        </section>
      ) : loading ? (
        <LoadingSkeleton />
      ) : filteredResources.length === 0 ? (
        <section className="rounded-lg border border-line bg-white p-6 shadow-soft">
          <EmptyState title="No resources found" description="Try another search term or add a resource for this category." />
        </section>
      ) : (
        <section className={view === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
          {filteredResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} compact={view === "list"} canManage={canManageResource} showStatusBadge={showStatusFilter} onViewResource={setViewingResource} onDeleteResource={setDeleteTarget} />
          ))}
        </section>
      )}

      <ResourceModal resource={viewingResource} onClose={() => setViewingResource(null)} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete resource"
        message={deleteTarget ? `Are you sure you want to delete ${deleteTarget.title}?` : "Are you sure you want to delete this resource?"}
        confirmText={deleting ? "Deleting..." : "Delete"}
        destructive
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleting) void deleteResource();
        }}
      />
    </div>
  );
}

function ResourceCard({
  resource,
  compact,
  canManage,
  showStatusBadge,
  onViewResource,
  onDeleteResource
}: {
  resource: ResourceItem;
  compact: boolean;
  canManage: boolean;
  showStatusBadge: boolean;
  onViewResource: (resource: ResourceItem) => void;
  onDeleteResource: (resource: ResourceItem) => void;
}) {
  const Icon = getResourceIcon(resource);
  const tone = getResourceTone(resource.type);
  const actions = <ResourceActions resource={resource} onViewResource={onViewResource} />;

  if (compact) {
    return (
      <article className="grid gap-4 rounded-lg border border-line bg-white p-4 shadow-soft lg:grid-cols-[140px_144px_minmax(0,1fr)_minmax(180px,auto)] lg:items-center">
        <div className="flex items-start justify-between gap-3 lg:self-start">
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-semibold uppercase ${tone.badge}`}>{resource.type}</span>
            {showStatusBadge ? <ResourceStatusBadge status={resource.status} /> : null}
          </div>
          {canManage ? <ResourceMenu resource={resource} onDeleteResource={onDeleteResource} /> : null}
        </div>

        <ResourceMedia resource={resource} icon={Icon} tone={tone.media} />

        <div className="min-w-0">
          <h2 className="break-words text-base font-semibold text-textPrimary">{resource.title}</h2>
          {resource.type !== "content" ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-textSecondary">{resource.description}</p> : null}
          <p className="mt-2 break-words text-sm text-slate-500">
            {resource.type === "link" ? resource.meta : `${resource.meta} • ${resource.date}`}
          </p>
        </div>

        <div className="flex gap-2 lg:justify-end">{actions}</div>
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col rounded-lg border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-brandGold">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-semibold uppercase ${tone.badge}`}>{resource.type}</span>
          {showStatusBadge ? <ResourceStatusBadge status={resource.status} /> : null}
        </div>
        {canManage ? <ResourceMenu resource={resource} onDeleteResource={onDeleteResource} /> : null}
      </div>

      <div className="mt-3 flex flex-1 gap-4">
        <ResourceMedia resource={resource} icon={Icon} tone={tone.media} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div>
            <h2 className="break-words text-base font-semibold text-textPrimary">{resource.title}</h2>
            {resource.type !== "content" ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-textSecondary">{resource.description}</p> : null}
            <p className="mt-2 break-words text-sm text-slate-500">
              {resource.type === "link" ? resource.meta : `${resource.meta} • ${resource.date}`}
            </p>
          </div>
          <div className="mt-auto flex gap-2 pt-5">{actions}</div>
        </div>
      </div>
    </article>
  );
}

function ResourceStatusBadge({ status }: { status: ResourceItem["status"] }) {
  const active = status === "ACTIVE";
  return (
    <span className={active ? "inline-flex rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700" : "inline-flex rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function ResourceMedia({ resource, icon: Icon, tone }: { resource: ResourceItem; icon: typeof FileText; tone: string }) {
  if (resource.type === "video") {
    return (
      <div className={`relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg lg:h-24 lg:w-32 ${tone}`}>
        <VideoPreview resource={resource} />
        <span className="absolute inset-0 bg-black/20" />
        <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink/85 text-white shadow-sm">
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </span>
      </div>
    );
  }

  return (
    <div className={`relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg lg:h-24 lg:w-32 ${tone}`}>
      <Icon className="h-9 w-9" />
    </div>
  );
}

function VideoPreview({ resource }: { resource: ResourceItem }) {
  const [vimeoThumbnailUrl, setVimeoThumbnailUrl] = useState<string | null>(null);
  const preview = getVideoPreview(resource.href);

  useEffect(() => {
    let active = true;
    setVimeoThumbnailUrl(null);

    if (!isVimeoUrl(resource.href)) return;

    getVimeoThumbnailUrl(resource.href)
      .then((thumbnailUrl) => {
        if (active) setVimeoThumbnailUrl(thumbnailUrl);
      })
      .catch(() => {
        if (active) setVimeoThumbnailUrl(null);
      });

    return () => {
      active = false;
    };
  }, [resource.href]);

  if (vimeoThumbnailUrl) {
    return <img src={vimeoThumbnailUrl} alt="" className="h-full w-full object-cover" />;
  }

  if (!preview) {
    return <Video className="h-9 w-9 text-brandGold" />;
  }

  if (preview.kind === "image") {
    return <img src={preview.url} alt="" className="h-full w-full object-cover" />;
  }

  return <video src={preview.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
}

function ResourceMenu({ resource, onDeleteResource }: { resource: ResourceItem; onDeleteResource: (resource: ResourceItem) => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className="rounded-md p-1.5 text-textSecondary hover:bg-gray-100" aria-label={`More options for ${resource.title}`} aria-expanded={open}>
        <MoreVertical className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-8 z-20 w-32 rounded-lg border border-line bg-white p-1 shadow-soft">
          <Link to={`/resources/edit/${resource.id}`} onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-textPrimary hover:bg-gray-50">
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDeleteResource(resource);
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ResourceActions({ resource, onViewResource }: { resource: ResourceItem; onViewResource: (resource: ResourceItem) => void }) {
  if (resource.type === "document") {
    if (!resource.fileUrl) {
      return (
        <button type="button" disabled className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 text-sm font-semibold text-textSecondary">
          <ExternalLink className="h-4 w-4" />
          Open
        </button>
      );
    }

    return (
      <a href={resource.fileUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white transition hover:bg-black">
        <ExternalLink className="h-4 w-4" />
        Open
      </a>
    );
  }

  if (resource.type === "video") {
    return (
      <button type="button" onClick={() => onViewResource(resource)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#FFF8E1] px-4 text-sm font-semibold text-ink transition hover:bg-[#F8E8AF]">
        <Play className="h-4 w-4 fill-current text-brandGold" />
        View
      </button>
    );
  }

  if (resource.type === "link") {
    if (!resource.href) {
      return (
        <button type="button" disabled className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-100 px-4 text-sm font-semibold text-textSecondary">
          <ExternalLink className="h-4 w-4" />
          Open Link
        </button>
      );
    }

    return (
      <a href={resource.href} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#EEF9F3] px-4 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100">
        <ExternalLink className="h-4 w-4" />
        Open Link
      </a>
    );
  }

  return (
    <button type="button" onClick={() => onViewResource(resource)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-soft px-4 text-sm font-semibold text-textPrimary transition hover:bg-gray-100">
      <Eye className="h-4 w-4" />
      View
    </button>
  );
}

function ResourceModal({ resource, onClose }: { resource: ResourceItem | null; onClose: () => void }) {
  const video = resource?.type === "video" ? getVideoEmbed(resource.href) : null;

  return (
    <Dialog open={Boolean(resource)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={resource?.type === "video" ? "max-w-5xl" : "max-h-[90vh] max-w-2xl overflow-hidden"}>
        <DialogHeader className="shrink-0">
          <DialogTitle>{resource?.title}</DialogTitle>
          <DialogDescription>{resource ? `${resource.category} • ${resource.date}` : ""}</DialogDescription>
        </DialogHeader>
        {resource?.type === "video" && video ? (
          <div className="overflow-hidden rounded-lg border border-line bg-black">
            {video.kind === "custom" ? (
              <video src={video.url} controls className="aspect-video w-full bg-black" />
            ) : (
              <iframe title={resource.title} src={video.url} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full border-0" />
            )}
          </div>
        ) : resource ? (
          <div className="max-h-[calc(90vh-150px)] overflow-y-auto rounded-lg border border-line bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Content</div>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-textPrimary">{resource.description || "-"}</p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function toResourceItem(record: ManagedResourceItem): ResourceItem {
  const type = normalizeResourceType(record.Type);
  const fileKind = getFileKind(record.FileExtension || record.OriginalFileName || record.FileUrl || record.UploadedFile || "");
  const fileUrl = record.FileUrl || record.UploadedFile || undefined;
  const href = type === "video" || type === "link" ? record.Url || undefined : undefined;
  const fileName = record.OriginalFileName || record.StoredFileName || record.UploadedFile || undefined;

  return {
    id: String(record.RowID),
    title: record.Name || "-",
    description: record.Description || "",
    type,
    category: record.CategoryName || getCategoryLabel(record.CategoryCode),
    meta: getResourceMeta(record, type, fileKind),
    date: formatResourceDate(record.CreatedAt),
    status: record.Status === 4 ? "INACTIVE" : "ACTIVE",
    href,
    fileUrl,
    fileName,
    fileKind
  };
}

function normalizeResourceType(type?: string | null): ResourceType {
  const normalized = type?.toUpperCase();
  if (normalized === "EMBED_VIDEO" || normalized === "VIDEO") return "video";
  if (normalized === "HYPERLINK" || normalized === "LINK") return "link";
  if (normalized === "CONTENT") return "content";
  return "document";
}

function getResourceMeta(record: ManagedResourceItem, type: ResourceType, fileKind?: ResourceItem["fileKind"]) {
  if (type === "link") return getHostName(record.Url) || "Link";
  if (type === "video") return getVideoProvider(record.Url);
  if (type === "content") return "Content";
  return [fileKind, formatFileSize(record.FileSize)].filter(Boolean).join(" • ") || "File";
}

function getCategoryLabel(categoryCode?: string) {
  const match = tabs.find((tab) => tab.categoryCode === categoryCode);
  return match?.label ?? categoryCode ?? "-";
}

function getRouteTab(pathname: string): ResourceTab {
  if (pathname.includes("forms-documents")) return "forms-documents";
  if (pathname.includes("internal-training")) return "internal-training";
  return "memo";
}

function getRouteCategoryCode(tab: ResourceTab) {
  return tabs.find((item) => item.value === tab)?.categoryCode ?? "MEMO";
}

function getResourceIcon(resource: ResourceItem) {
  if (resource.type === "video") return Video;
  if (resource.type === "link") return LinkIcon;
  if (resource.type === "content") return FilePenLine;
  if (resource.fileKind === "XLS" || resource.fileKind === "XLSX") return FileSpreadsheet;
  return FileText;
}

function getResourceTone(type: ResourceType) {
  if (type === "video") return { badge: "bg-[#FFF8E1] text-ink", media: "bg-slate-100 text-brandGold" };
  if (type === "link") return { badge: "bg-emerald-50 text-emerald-700", media: "bg-emerald-50 text-emerald-700" };
  if (type === "content") return { badge: "bg-blue-50 text-blue-700", media: "bg-blue-50 text-blue-700" };
  return { badge: "bg-red-50 text-red-700", media: "bg-red-50 text-red-700" };
}

function getFileKind(value: string): ResourceItem["fileKind"] | undefined {
  const extension = value.split("?")[0].split(".").pop()?.toUpperCase();
  const supported = new Set(["PDF", "DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX", "JPG", "JPEG", "PNG"]);
  return extension && supported.has(extension) ? (extension as ResourceItem["fileKind"]) : undefined;
}

function formatResourceDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || !Number.isFinite(bytes)) return "";
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getHostName(value?: string | null) {
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function getVideoProvider(value?: string | null) {
  const host = getHostName(value).toLowerCase();
  if (host.includes("youtube") || host.includes("youtu.be")) return "YouTube";
  if (host.includes("vimeo")) return "Vimeo";
  if (host.includes("bilibili")) return "Bilibili";
  return "Custom video";
}

function isVimeoUrl(value?: string) {
  if (!value) return false;
  try {
    return new URL(value).hostname.toLowerCase().includes("vimeo.com");
  } catch {
    return false;
  }
}

async function getVimeoThumbnailUrl(value?: string) {
  if (!value) throw new Error("Missing Vimeo URL.");
  const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(value)}`);
  if (!response.ok) throw new Error("Unable to load Vimeo thumbnail.");
  const data = (await response.json()) as { thumbnail_url?: string };
  if (!data.thumbnail_url) throw new Error("Vimeo thumbnail unavailable.");
  return data.thumbnail_url;
}

function getVideoPreview(value?: string) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    if (host.includes("youtube.com")) {
      const videoId = getYoutubeVideoId(url);
      return videoId ? { kind: "image" as const, url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` } : null;
    }

    if (host.includes("youtu.be")) {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? { kind: "image" as const, url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` } : null;
    }

    if (host.includes("vimeo.com") || host.includes("bilibili.com")) return null;
  } catch {
    return { kind: "custom" as const, url: value };
  }

  return { kind: "custom" as const, url: value };
}

function getVideoEmbed(value?: string) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    if (host.includes("youtube.com")) {
      const videoId = getYoutubeVideoId(url);
      return videoId ? { kind: "embed" as const, url: `https://www.youtube.com/embed/${videoId}` } : { kind: "custom" as const, url: value };
    }

    if (host.includes("youtu.be")) {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? { kind: "embed" as const, url: `https://www.youtube.com/embed/${videoId}` } : { kind: "custom" as const, url: value };
    }

    if (host.includes("vimeo.com")) {
      const videoId = url.pathname.split("/").filter(Boolean).pop();
      return videoId ? { kind: "embed" as const, url: `https://player.vimeo.com/video/${videoId}` } : { kind: "custom" as const, url: value };
    }

    if (host.includes("bilibili.com")) {
      const bvid = url.pathname.split("/").find((part) => part.startsWith("BV"));
      const query = bvid ? `bvid=${encodeURIComponent(bvid)}` : url.searchParams.toString();
      return { kind: "embed" as const, url: `https://player.bilibili.com/player.html?${query}` };
    }
  } catch {
    return { kind: "custom" as const, url: value };
  }

  return { kind: "custom" as const, url: value };
}

function getYoutubeVideoId(url: URL) {
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts[0] === "embed" || pathParts[0] === "shorts") return pathParts[1];
  return url.searchParams.get("v") || pathParts.pop();
}
