import { ChevronRight, Loader2, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import downlines from "../data/network-downlines.json";
import { useAuth } from "../hooks/useAuth";

type Ranking =
  | "Trust Representative"
  | "Saving Trust Representative"
  | "Trust Manager"
  | "Trust Director"
  | "Group Trust Director"
  | "Chief Trust Direct";

interface NetworkRecord {
  id: string;
  uplineId: string | null;
  fullName: string;
  personalSales: number;
  ranking: Ranking;
}

interface NetworkNode extends NetworkRecord {
  children: NetworkNode[];
}

const networkRecords = downlines as NetworkRecord[];
const loadingDelayMs = 450;

export function NetworkPage({ scope = "all" }: { scope?: "all" | "mine" }) {
  const { session } = useAuth();
  const { nodesById, rootNodes, childCountById } = useNetworkTree(networkRecords);
  const defaultRoot = scope === "mine" ? nodesById.get(session?.userId ?? "") ?? rootNodes[0] : undefined;
  const firstLevelNodes = defaultRoot ? defaultRoot.children : rootNodes;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  useEffect(() => {
    setExpandedIds(new Set());
    setLoadingNodeId(null);
  }, [scope, defaultRoot?.id]);

  const searchTerm = submittedSearch.trim().toLowerCase();
  const visibleNodes = useMemo(
    () => (searchTerm ? filterTree(firstLevelNodes, searchTerm) : firstLevelNodes),
    [firstLevelNodes, searchTerm]
  );

  const toggleNode = (node: NetworkNode) => {
    if (loadingNodeId || node.children.length === 0) return;

    if (expandedIds.has(node.id)) {
      setExpandedIds((current) => {
        const next = new Set(current);
        next.delete(node.id);
        return next;
      });
      return;
    }

    setLoadingNodeId(node.id);
    window.setTimeout(() => {
      setExpandedIds((current) => new Set(current).add(node.id));
      setLoadingNodeId(null);
    }, loadingDelayMs);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedSearch(searchInput);
    setExpandedIds(new Set());
  };

  return (
    <>
      <PageHeader
        title={scope === "mine" ? "My Network" : "Network"}
        description="View downline hierarchy from local network data without token-based browser requests."
      />

      <section className="rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brandGold" />
                <h2 className="text-base font-semibold text-textPrimary">Tree Menu</h2>
              </div>
              <p className="mt-1 text-xs text-textSecondary">Use the arrow to load and display the next downline level.</p>
            </div>
            <form onSubmit={submitSearch} className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search name or ranking"
                className="h-10 min-w-0 rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink sm:w-80"
              />
              <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-black">
                <Search className="h-4 w-4" />
                Search
              </button>
            </form>
          </div>
        </div>

        <div className="p-4">
          {visibleNodes.length === 0 ? (
            <EmptyState
              title={submittedSearch ? "No matching downline" : "No downline data"}
              description={submittedSearch ? "Try another name or ranking." : "There are no downline records in the local data."}
            />
          ) : (
            <div className="space-y-1">
              {visibleNodes.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  childCountById={childCountById}
                  expandedIds={expandedIds}
                  loadingNodeId={loadingNodeId}
                  searchActive={Boolean(searchTerm)}
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
  childCountById,
  expandedIds,
  loadingNodeId,
  searchActive,
  onToggle
}: {
  node: NetworkNode;
  depth: number;
  childCountById: Map<string, number>;
  expandedIds: Set<string>;
  loadingNodeId: string | null;
  searchActive: boolean;
  onToggle: (node: NetworkNode) => void;
}) {
  const hasChildren = node.children.length > 0;
  const loading = loadingNodeId === node.id;
  const open = searchActive || expandedIds.has(node.id);
  const levelOffset = depth * 72;
  const rowIndent = `${levelOffset}px`;
  const connectorLeft = `${levelOffset - 42}px`;

  return (
    <div className="relative">
      {depth > 0 ? (
        <>
          <span className="absolute top-0 h-full w-px bg-line" style={{ left: connectorLeft }} aria-hidden="true" />
          <span className="absolute top-8 h-px w-8 bg-line" style={{ left: connectorLeft }} aria-hidden="true" />
        </>
      ) : null}
      <div className="flex items-start gap-2 rounded-lg bg-white px-2 py-3 transition hover:bg-gray-50" style={{ marginLeft: rowIndent }}>
        <button
          type="button"
          onClick={() => onToggle(node)}
          disabled={!hasChildren || Boolean(loadingNodeId)}
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-textSecondary transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={open ? "Collapse downline" : "Expand downline"}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-brandGold" /> : <ChevronRight className={open ? "h-4 w-4 rotate-90 transition" : "h-4 w-4 transition"} />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-textPrimary">{node.fullName}</p>
          <p className="mt-0.5 text-xs text-textSecondary">{node.ranking}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-textSecondary">
            <span className="whitespace-nowrap rounded-md border border-brandGold/20 bg-[#FFF8E1] px-3 py-1.5 text-[#6F5A12]">
              Personal Sales: <strong className="font-semibold text-textPrimary">{formatCurrency(node.personalSales)}</strong>
            </span>
            <span className="whitespace-nowrap rounded-md border border-brandGold/20 bg-[#FFF8E1] px-3 py-1.5 text-[#6F5A12]">
              Direct Downline: <strong className="font-semibold text-textPrimary">{childCountById.get(node.id) ?? 0}</strong>
            </span>
          </div>
        </div>
      </div>
      {open && hasChildren ? (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              childCountById={childCountById}
              expandedIds={expandedIds}
              loadingNodeId={loadingNodeId}
              searchActive={searchActive}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function useNetworkTree(records: NetworkRecord[]) {
  return useMemo(() => {
    const nodesById = new Map<string, NetworkNode>();
    records.forEach((record) => nodesById.set(record.id, { ...record, children: [] }));

    const rootNodes: NetworkNode[] = [];
    records.forEach((record) => {
      const node = nodesById.get(record.id);
      if (!node) return;
      const parent = record.uplineId ? nodesById.get(record.uplineId) : undefined;
      if (parent) {
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    const childCountById = new Map<string, number>();
    nodesById.forEach((node) => childCountById.set(node.id, node.children.length));

    return { nodesById, rootNodes, childCountById };
  }, [records]);
}

function filterTree(nodes: NetworkNode[], term: string): NetworkNode[] {
  return nodes
    .map((node) => {
      const children = filterTree(node.children, term);
      const matches = `${node.fullName} ${node.ranking}`.toLowerCase().includes(term);
      return matches || children.length > 0 ? { ...node, children } : null;
    })
    .filter((node): node is NetworkNode => Boolean(node));
}

function formatCurrency(value: number) {
  return `RM ${value.toLocaleString("en-MY")}`;
}
