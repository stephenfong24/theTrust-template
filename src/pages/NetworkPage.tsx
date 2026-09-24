import { ChevronRight, Loader2, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { networkApi, type NetworkCategory, type NetworkDownlineNode } from "../api/networkApi";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";

type NetworkPageProps = {
  scope?: "all" | "mine";
  category?: NetworkCategory;
};

const defaultCategory: NetworkCategory = "The Trust";

function getUrlEmail(routeEmail?: string, queryEmail?: string | null) {
  const rawEmail = routeEmail || queryEmail || "";

  try {
    return decodeURIComponent(rawEmail).replace(/\\@/g, "@").trim();
  } catch {
    return rawEmail.replace(/\\@/g, "@").trim();
  }
}

export function NetworkPage({ scope = "all", category = defaultCategory }: NetworkPageProps) {
  const { email: routeEmail } = useParams<{ email?: string }>();
  const [searchParams] = useSearchParams();
  const urlEmail = getUrlEmail(routeEmail, searchParams.get("email"));
  const [rootNode, setRootNode] = useState<NetworkDownlineNode | null>(null);
  const [childrenById, setChildrenById] = useState<Map<string, NetworkDownlineNode[]>>(new Map());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [nodeErrorMessage, setNodeErrorMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  useEffect(() => {
    setSearchInput(urlEmail);
    setSubmittedSearch(urlEmail);
    void loadNetwork(urlEmail || undefined);
  }, [category, urlEmail]);

  const isSearchResult = Boolean(submittedSearch.trim());
  const visibleNodes = useMemo(
    () => (rootNode ? (isSearchResult ? [rootNode] : rootNode.downlines) : []),
    [isSearchResult, rootNode]
  );

  const loadNetwork = async (email?: string) => {
    setLoadingInitial(true);
    setErrorMessage("");
    setNodeErrorMessage("");
    setExpandedIds(new Set());
    setLoadingNodeId(null);
    setChildrenById(new Map());

    try {
      const node = await networkApi.getDownlineList(category, email);
      setRootNode(node);
      setChildrenById(new Map([[node.userId, node.downlines]]));
      setExpandedIds(email?.trim() && node.downlines.length > 0 ? new Set([node.userId]) : new Set());
    } catch (error) {
      setRootNode(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load network downlines.");
    } finally {
      setLoadingInitial(false);
    }
  };

  const toggleNode = async (node: NetworkDownlineNode) => {
    if (loadingNodeId || node.totalDownline === 0) return;
    const selectedEmail = node.email || node.username;

    if (!selectedEmail) {
      setNodeErrorMessage("Unable to load this downline because the selected agent has no email.");
      return;
    }

    if (expandedIds.has(node.userId)) {
      setExpandedIds((current) => {
        const next = new Set(current);
        next.delete(node.userId);
        return next;
      });
      return;
    }

    if (childrenById.has(node.userId)) {
      setExpandedIds((current) => new Set(current).add(node.userId));
      return;
    }

    setLoadingNodeId(node.userId);
    setNodeErrorMessage("");

    try {
      const childRoot = await networkApi.getDownlineList(category, selectedEmail, {
        skipGlobalLoading: true
      });
      setChildrenById((current) => {
        const next = new Map(current);
        next.set(node.userId, childRoot.downlines);
        return next;
      });
      setExpandedIds((current) => new Set(current).add(node.userId));
    } catch (error) {
      setNodeErrorMessage(error instanceof Error ? error.message : "Unable to load this downline.");
    } finally {
      setLoadingNodeId(null);
    }
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    setSubmittedSearch(nextSearch);
    void loadNetwork(nextSearch || undefined);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSubmittedSearch("");
    void loadNetwork();
  };

  return (
    <>
      <PageHeader
        title={[scope === "mine" ? "My Network" : "Network", category].filter(Boolean).join(" - ")}
        description="View direct network downlines and expand agents to load the next level."
      />

      <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brandGold" />
                <h2 className="text-base font-semibold text-textPrimary">Tree Menu</h2>
              </div>
              <p className="mt-0.5 text-xs text-textSecondary">
                {rootNode ? `${rootNode.fullName} has ${rootNode.totalDownline} direct downline${rootNode.totalDownline === 1 ? "" : "s"}.` : "Load direct network downlines."}
              </p>
            </div>
            <form onSubmit={submitSearch} className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search agent email"
                className="h-9 min-w-0 rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink sm:w-72"
              />
              <div className="flex gap-2">
                <button type="submit" className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-black sm:flex-none">
                  <Search className="h-4 w-4" />
                  Search
                </button>
                {submittedSearch ? (
                  <button type="button" onClick={clearSearch} className="inline-flex h-9 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold text-textPrimary hover:bg-gray-50">
                    Clear
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>

        <div className="min-w-0 overflow-x-hidden p-3">
          {loadingInitial ? (
            <LoadingNetworkState />
          ) : errorMessage ? (
            <EmptyState title="Unable to load network" description={errorMessage} />
          ) : visibleNodes.length === 0 ? (
            <EmptyState
              title={isSearchResult ? "No matching agent" : "No downline data"}
              description={isSearchResult ? "Try another agent email." : "There are no downline records available."}
            />
          ) : (
            <div className="min-w-0 space-y-0.5">
              {nodeErrorMessage ? (
                <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {nodeErrorMessage}
                </div>
              ) : null}
              {visibleNodes.map((node) => (
                <TreeNode
                  key={node.userId}
                  node={node}
                  depth={0}
                  childrenById={childrenById}
                  expandedIds={expandedIds}
                  loadingNodeId={loadingNodeId}
                  onToggle={toggleNode}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function TreeNode({
  node,
  depth,
  childrenById,
  expandedIds,
  loadingNodeId,
  onToggle
}: {
  node: NetworkDownlineNode;
  depth: number;
  childrenById: Map<string, NetworkDownlineNode[]>;
  expandedIds: Set<string>;
  loadingNodeId: string | null;
  onToggle: (node: NetworkDownlineNode) => void;
}) {
  const children = childrenById.get(node.userId) ?? [];
  const hasChildren = node.totalDownline > 0;
  const loading = loadingNodeId === node.userId;
  const open = expandedIds.has(node.userId);
  const levelOffset = Math.min(depth * 20, 120);
  const connectorLeft = Math.max(levelOffset - 12, 0);

  return (
    <div className="relative min-w-0">
      {depth > 0 ? (
        <>
          <span className="absolute top-0 h-full w-px bg-line" style={{ left: connectorLeft }} aria-hidden="true" />
          <span className="absolute top-6 h-px w-4 bg-line" style={{ left: connectorLeft }} aria-hidden="true" />
        </>
      ) : null}
      <div className="flex min-w-0 items-start gap-2 rounded-lg bg-white px-2 py-2 transition hover:bg-gray-50" style={{ paddingLeft: `${levelOffset + 8}px` }}>
        <button
          type="button"
          onClick={() => onToggle(node)}
          disabled={!hasChildren || Boolean(loadingNodeId)}
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-textSecondary transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={open ? "Collapse downline" : "Expand downline"}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-brandGold" /> : <ChevronRight className={open ? "h-4 w-4 rotate-90 transition" : "h-4 w-4 transition"} />}
        </button>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="min-w-0 max-w-full break-words font-semibold text-textPrimary sm:max-w-56 sm:truncate">{node.fullName}</span>
          <RankingBadge rankName={node.rankName} />
          <InlineSeparator />
          <span className="min-w-0 break-all text-xs text-textSecondary">{node.email || node.username}</span>
          <InlineSeparator />
          <span className="min-w-0 text-xs text-textSecondary">
            Personal Sales: <strong className="font-semibold text-textPrimary">{formatCurrency(node.personalSales)}</strong>
          </span>
          <InlineSeparator />
          <span className="min-w-0 text-xs text-textSecondary">
            Direct Downlines: <strong className="font-semibold text-textPrimary">{node.totalDownline}</strong>
          </span>
        </div>
      </div>
      {open && children.length > 0 ? (
        <div className="mt-0.5 min-w-0 space-y-0.5">
          {children.map((child) => (
            <TreeNode
              key={child.userId}
              node={child}
              depth={depth + 1}
              childrenById={childrenById}
              expandedIds={expandedIds}
              loadingNodeId={loadingNodeId}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RankingBadge({ rankName }: { rankName: string }) {
  const shortForm = getRankingShortForm(rankName);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className="inline-flex h-6 min-w-9 items-center justify-center rounded-md border border-brandGold/25 bg-[#FFF8E1] px-2 text-xs font-bold text-[#8A650F]">
            {shortForm}
          </span>
        </TooltipTrigger>
        <TooltipContent>{rankName || "Unranked"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function LoadingNetworkState() {
  return (
    <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-textSecondary">
      <Loader2 className="h-4 w-4 animate-spin text-brandGold" />
      Loading network downlines
    </div>
  );
}

function InlineSeparator() {
  return <span className="text-xs font-semibold text-textSecondary/70">•</span>;
}

function getRankingShortForm(rankName: string) {
  const normalized = rankName?.trim();
  const shortForms: Record<string, string> = {
    "Chief Trust Direct": "CTD",
    "Chief Trust Director": "CTD",
    "Group Trust Director": "GTD",
    "Saving Trust Representative": "SR",
    "Trust Director": "TD",
    "Trust Manager": "TM",
    "Trust Representative": "TR"
  };

  return shortForms[normalized] ?? normalized?.slice(0, 3).toUpperCase() ?? "N/A";
}

function formatCurrency(value: number) {
  return `RM ${value.toLocaleString("en-MY")}`;
}
