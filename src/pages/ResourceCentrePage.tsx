import {
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Grid2X2,
  Link as LinkIcon,
  List,
  MoreVertical,
  Play,
  Plus,
  Search,
  Video
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { notifyError, notifyInfo } from "../services/notificationService";

type ResourceTab = "all" | "memo" | "forms-documents" | "internal-training";
type ResourceType = "document" | "video" | "link";

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  tab: Exclude<ResourceTab, "all">;
  type: ResourceType;
  category: string;
  meta: string;
  date: string;
  href?: string;
  duration?: string;
  fileKind?: "PDF" | "DOCX" | "XLSX";
}

const tabs: Array<{ label: string; value: ResourceTab; path: string }> = [
  { label: "All Resources", value: "all", path: "/resources/memo" },
  { label: "Memo", value: "memo", path: "/resources/memo" },
  { label: "Form & Document", value: "forms-documents", path: "/resources/forms-documents" },
  { label: "Internal Training", value: "internal-training", path: "/resources/internal-training" }
];

const resources: ResourceItem[] = [
  {
    id: "RES-001",
    title: "Trust Application Form",
    description: "Official application form for trust registration.",
    tab: "forms-documents",
    type: "document",
    category: "Application",
    meta: "PDF • 2.4 MB",
    date: "5 Sep 2024",
    fileKind: "PDF"
  },
  {
    id: "RES-002",
    title: "Trust Training Video",
    description: "Learn how to complete a trust registration from start to finish.",
    tab: "internal-training",
    type: "video",
    category: "Training",
    meta: "Vimeo",
    date: "3 Sep 2024",
    duration: "12:34"
  },
  {
    id: "RES-003",
    title: "Trustee Guidelines",
    description: "Latest trustee guidelines from the official website.",
    tab: "memo",
    type: "link",
    category: "Guideline",
    meta: "www.trustee.com.my",
    date: "1 Sep 2024",
    href: "https://www.trustee.com.my"
  },
  {
    id: "RES-004",
    title: "Declaration Form",
    description: "Template for trustee declaration.",
    tab: "forms-documents",
    type: "document",
    category: "Declaration",
    meta: "DOCX • 1.1 MB",
    date: "28 Aug 2024",
    fileKind: "DOCX"
  },
  {
    id: "RES-005",
    title: "FAQ - Trust Registration",
    description: "Frequently asked questions on trust registration.",
    tab: "memo",
    type: "link",
    category: "FAQ",
    meta: "www.example.com/faq",
    date: "24 Aug 2024",
    href: "https://www.example.com/faq"
  },
  {
    id: "RES-006",
    title: "Introduction to Trusts",
    description: "An overview of trusts and their benefits.",
    tab: "internal-training",
    type: "video",
    category: "Onboarding",
    meta: "YouTube",
    date: "21 Aug 2024",
    duration: "08:45"
  },
  {
    id: "RES-007",
    title: "Trust Fee Schedule",
    description: "Schedule of fees for trust services.",
    tab: "forms-documents",
    type: "document",
    category: "Finance",
    meta: "XLSX • 320 KB",
    date: "15 Aug 2024",
    fileKind: "XLSX"
  },
  {
    id: "RES-008",
    title: "Compliance Memo",
    description: "Internal reminder for compliance documentation checks.",
    tab: "memo",
    type: "document",
    category: "Compliance",
    meta: "PDF • 940 KB",
    date: "12 Aug 2024",
    fileKind: "PDF"
  },
  {
    id: "RES-009",
    title: "Program Training Session",
    description: "Recording of the latest program training.",
    tab: "internal-training",
    type: "video",
    category: "Program",
    meta: "Vimeo",
    date: "10 Aug 2024",
    duration: "15:20"
  }
];

export function ResourceCentrePage() {
  const { session } = useAuth();
  const location = useLocation();
  const routeTab = getRouteTab(location.pathname);
  const [activeTab, setActiveTab] = useState<ResourceTab>(routeTab);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ResourceType | "all">("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("latest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const canAddResource = session?.role === "SA" || session?.role === "AD";

  const categories = useMemo(() => ["all", ...Array.from(new Set(resources.map((item) => item.category)))], []);
  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return resources
      .filter((item) => activeTab === "all" || item.tab === activeTab)
      .filter((item) => type === "all" || item.type === type)
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => !normalizedQuery || `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => (sort === "title" ? a.title.localeCompare(b.title) : Date.parse(b.date) - Date.parse(a.date)));
  }, [activeTab, category, query, sort, type]);

  const handleAddResource = () => {
    if (!canAddResource) {
      notifyError("Only Super Admin and Admin can add resources.", "add-resource-denied");
      return;
    }

    notifyInfo("Add Resource is available in the full administration workflow.", "add-resource-info");
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
              onClick={() => setActiveTab(tab.value)}
              className={active ? "rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-soft" : "rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-textSecondary transition hover:border-brandGold hover:text-textPrimary"}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <section className="rounded-lg border border-line bg-white p-3 shadow-soft">
        <div className="grid gap-3 lg:grid-cols-[1fr_210px_210px_210px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-textSecondary" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search resources..."
              className="h-12 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </label>
          <FilterSelect label="Type" value={type} onChange={(value) => setType(value as ResourceType | "all")} options={["all", "document", "video", "link"]} />
          <FilterSelect label="Category" value={category} onChange={setCategory} options={categories} />
          <FilterSelect label="Sort" value={sort} onChange={setSort} options={["latest", "title"]} />
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

      <section className={view === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
        {filteredResources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} compact={view === "list"} />
        ))}
      </section>
    </div>
  );
}

function ResourceCard({ resource, compact }: { resource: ResourceItem; compact: boolean }) {
  const Icon = getResourceIcon(resource);
  const tone = getResourceTone(resource.type);

  return (
    <article className={compact ? "flex flex-col gap-4 rounded-lg border border-line bg-white p-4 shadow-soft sm:flex-row sm:items-center" : "flex h-full flex-col rounded-lg border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-brandGold"}>
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-semibold uppercase ${tone.badge}`}>{resource.type}</span>
        <button type="button" className="rounded-md p-1.5 text-textSecondary hover:bg-gray-100" aria-label="More options">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      <div className={compact ? "flex flex-1 flex-col gap-4 sm:flex-row sm:items-center" : "mt-3 flex flex-1 gap-4"}>
        <div className={`relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg ${tone.media}`}>
          <Icon className="h-9 w-9" />
          {resource.type === "video" ? (
            <>
              <span className="absolute inset-0 bg-black/10" />
              <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink/80 text-white">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
              <span className="absolute bottom-1.5 right-1.5 rounded bg-ink/85 px-1.5 py-0.5 text-[11px] font-semibold text-white">{resource.duration}</span>
            </>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div>
            <h2 className="break-words text-base font-semibold text-textPrimary">{resource.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-textSecondary">{resource.description}</p>
            <p className="mt-2 break-words text-sm text-slate-500">
              {resource.type === "link" ? resource.meta : `${resource.meta} • ${resource.date}`}
            </p>
          </div>
          <div className={compact ? "mt-4 flex gap-2" : "mt-auto flex gap-2 pt-5"}>
            {resource.type === "document" ? (
              <>
                <button type="button" className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-soft px-4 text-sm font-semibold text-textPrimary transition hover:bg-gray-100">
                  <Eye className="h-4 w-4" />
                  {resource.fileKind === "PDF" ? "View" : "Preview"}
                </button>
                <button type="button" className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white transition hover:bg-black">
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </>
            ) : null}
            {resource.type === "video" ? (
              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#FFF8E1] px-4 text-sm font-semibold text-ink transition hover:bg-[#F8E8AF]">
                <Play className="h-4 w-4 fill-current text-brandGold" />
                Watch Video
              </button>
            ) : null}
            {resource.type === "link" ? (
              <a href={resource.href} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#EEF9F3] px-4 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100">
                <ExternalLink className="h-4 w-4" />
                Open Link
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        {options.map((option) => (
          <option key={option} value={option}>
            {label}: {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function getRouteTab(pathname: string): ResourceTab {
  if (pathname.includes("forms-documents")) return "forms-documents";
  if (pathname.includes("internal-training")) return "internal-training";
  if (pathname.includes("memo")) return "memo";
  return "all";
}

function getResourceIcon(resource: ResourceItem) {
  if (resource.type === "video") return Video;
  if (resource.type === "link") return LinkIcon;
  if (resource.fileKind === "XLSX") return FileSpreadsheet;
  return FileText;
}

function getResourceTone(type: ResourceType) {
  if (type === "video") return { badge: "bg-[#FFF8E1] text-ink", media: "bg-slate-100 text-brandGold" };
  if (type === "link") return { badge: "bg-emerald-50 text-emerald-700", media: "bg-emerald-50 text-emerald-700" };
  return { badge: "bg-red-50 text-red-700", media: "bg-red-50 text-red-700" };
}

function formatOption(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
