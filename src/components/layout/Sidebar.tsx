import clsx from "clsx";
import { ChevronDown, ChevronsRight, LockKeyhole, LogOut, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { navigation } from "../../config/navigation";
import type { NavigationItem } from "../../config/navigation";
import { useAuth } from "../../hooks/useAuth";
import { usePermission } from "../../hooks/usePermission";
import { notifySuccess } from "../../services/notificationService";
import { Brand } from "./Brand";

const collapsedWidth = 72;
const expandedWidth = 292;
const hoverAnimationMs = 300;

export function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onHoverExpandedChange,
  onToggleSidebar
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onHoverExpandedChange?: (expanded: boolean) => void;
  onToggleSidebar: () => void;
}) {
  const { can } = usePermission();
  const { logout, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hovered, setHovered] = useState(false);
  const [hoverPanelMounted, setHoverPanelMounted] = useState(false);

  const visibleNavigation = useMemo(
    () =>
      navigation
        .filter((item) => can(item.permission) && !item.hiddenForRoles?.includes(session?.role ?? "AG"))
        .map((item) => ({ ...item, children: item.children?.filter((child) => can(child.permission)) })),
    [can, session?.role]
  );
  const activeGroup = visibleNavigation.find((item) => item.children?.some((child) => location.pathname === child.path))?.label;
  const [expanded, setExpanded] = useState<string | undefined>(activeGroup);
  const accountNavigation = [
    { label: "Profile", path: "/profile", icon: UserRound },
    { label: "Change Password", path: "/change-password", icon: LockKeyhole }
  ];
  const dashboardItem = visibleNavigation.find((item) => item.label === "Dashboard");
  const trustItems = visibleNavigation.filter((item) => ["Admin Listing", "Agents Listing", "Trust Management", "My Network", "Network", "Income", "Resources", "Audit", "Settings"].includes(item.label));

  const handleLogout = () => {
    logout();
    notifySuccess("Signed out successfully.", "logout-success");
    navigate("/login", { replace: true });
  };

  const openHoverPanel = () => {
    if (!collapsed) return;
    setHoverPanelMounted(true);
    window.requestAnimationFrame(() => setHovered(true));
  };

  const closeHoverPanel = () => {
    if (!collapsed) return;
    setHovered(false);
  };

  useEffect(() => {
    if (activeGroup) setExpanded(activeGroup);
  }, [activeGroup]);

  useEffect(() => {
    if (!collapsed) {
      setHovered(false);
      setHoverPanelMounted(false);
    }
  }, [collapsed]);

  useEffect(() => {
    if (hovered || !hoverPanelMounted) return;
    const timer = window.setTimeout(() => setHoverPanelMounted(false), hoverAnimationMs);
    return () => window.clearTimeout(timer);
  }, [hoverPanelMounted, hovered]);

  useEffect(() => {
    onHoverExpandedChange?.(collapsed && hoverPanelMounted);
    return () => onHoverExpandedChange?.(false);
  }, [collapsed, hoverPanelMounted, onHoverExpandedChange]);

  const sharedProps = {
    accountNavigation,
    dashboardItem,
    expanded,
    handleLogout,
    onCloseMobile,
    pathname: location.pathname,
    setExpanded,
    trustItems
  };

  return (
    <>
      <div
        onMouseEnter={openHoverPanel}
        onMouseLeave={closeHoverPanel}
        className={clsx("hidden shrink-0 lg:sticky lg:top-0 lg:block lg:h-screen", collapsed ? "lg:w-[72px]" : "lg:w-[292px]", hoverPanelMounted && "lg:z-[70]")}
        style={{ width: collapsed ? collapsedWidth : expandedWidth }}
      >
        {collapsed ? <SidebarPanel {...sharedProps} collapsedView widthClass="w-[72px]" /> : <SidebarPanel {...sharedProps} collapsedView={false} widthClass="w-[292px]" />}
        {collapsed && hoverPanelMounted ? (
          <div
            className={clsx(
              "absolute left-0 top-0 z-[70] h-screen overflow-hidden transition-[transform,opacity] duration-300 ease-out",
              hovered ? "translate-x-0 opacity-100" : "-translate-x-[220px] opacity-0"
            )}
          >
            <SidebarPanel {...sharedProps} collapsedView={false} widthClass="w-[292px]" showPersistToggle onToggleSidebar={onToggleSidebar} />
          </div>
        ) : null}
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/30" aria-label="Close navigation" onClick={onCloseMobile} />
          <div className="relative h-full w-[260px]">
            <SidebarPanel {...sharedProps} collapsedView={false} widthClass="w-[260px]" />
          </div>
        </div>
      ) : null}
    </>
  );
}

function SidebarPanel({
  accountNavigation,
  collapsedView,
  dashboardItem,
  expanded,
  handleLogout,
  onCloseMobile,
  onToggleSidebar,
  pathname,
  setExpanded,
  showPersistToggle = false,
  trustItems,
  widthClass
}: {
  accountNavigation: Array<{ label: string; path: string; icon: typeof UserRound }>;
  collapsedView: boolean;
  dashboardItem?: NavigationItem;
  expanded?: string;
  handleLogout: () => void;
  onCloseMobile: () => void;
  onToggleSidebar?: () => void;
  pathname: string;
  setExpanded: (value?: string) => void;
  showPersistToggle?: boolean;
  trustItems: NavigationItem[];
  widthClass: string;
}) {
  return (
    <aside className={clsx("flex h-screen flex-col overflow-hidden border-r border-black bg-ink shadow-[10px_0_30px_rgba(17,17,17,0.16)]", widthClass)}>
      <div className="flex h-24 shrink-0 items-center justify-between px-5">
        <Brand collapsed={collapsedView} />
        {showPersistToggle && onToggleSidebar ? (
          <button type="button" onClick={onToggleSidebar} className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Expand navigation">
            <ChevronsRight className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="sidebar-scroll flex-1 space-y-6 overflow-y-auto px-4 pb-4">
        {dashboardItem ? <NavigationEntry item={dashboardItem} collapsed={collapsedView} expanded={expanded} setExpanded={setExpanded} pathname={pathname} onCloseMobile={onCloseMobile} /> : null}
        <NavigationSection title="Trust Operations" collapsed={collapsedView}>
          {trustItems.map((item) => (
            <NavigationEntry key={item.label} item={item} collapsed={collapsedView} expanded={expanded} setExpanded={setExpanded} pathname={pathname} onCloseMobile={onCloseMobile} />
          ))}
        </NavigationSection>
        <NavigationSection title="Account" collapsed={collapsedView}>
          {accountNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} title={collapsedView ? item.label : undefined} className={({ isActive }) => itemClass(isActive, collapsedView)} onClick={onCloseMobile}>
                <Icon className="h-[19px] w-[19px]" />
                {!collapsedView ? <span className={labelClass}>{item.label}</span> : null}
              </NavLink>
            );
          })}
        </NavigationSection>
      </nav>

      <div className="shrink-0 border-t border-white/15 p-4">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white" title={collapsedView ? "Logout" : undefined}>
          <LogOut className="h-[19px] w-[19px]" />
          {!collapsedView ? <span className={labelClass}>Logout</span> : null}
        </button>
      </div>
    </aside>
  );
}

function NavigationSection({ title, collapsed, children }: { title?: string; collapsed: boolean; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      {!collapsed && title ? <h2 className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</h2> : null}
      {children}
    </section>
  );
}

function NavigationEntry({
  item,
  collapsed,
  expanded,
  setExpanded,
  pathname,
  onCloseMobile
}: {
  item: NavigationItem;
  collapsed: boolean;
  expanded?: string;
  setExpanded: (value?: string) => void;
  pathname: string;
  onCloseMobile: () => void;
}) {
  const Icon = item.icon;
  const isGroupActive = item.children?.some((child) => pathname === child.path) || pathname === item.path;
  if (!item.children) {
    return (
      <NavLink key={item.label} to={item.path ?? "/dashboard"} title={collapsed ? item.label : undefined} className={({ isActive }) => itemClass(isActive, collapsed)} onClick={onCloseMobile}>
        <Icon className="h-[19px] w-[19px]" />
        {!collapsed ? <span className={labelClass}>{item.label}</span> : null}
      </NavLink>
    );
  }

  const open = expanded === item.label && !collapsed;
  return (
    <div key={item.label}>
      <button onClick={() => setExpanded(open ? undefined : item.label)} title={collapsed ? item.label : undefined} className={groupClass(Boolean(isGroupActive), collapsed)}>
        <Icon className="h-[19px] w-[19px]" />
        {!collapsed ? <span className={clsx("flex-1 text-left", labelClass)}>{item.label}</span> : null}
        {!collapsed ? <ChevronDown className={clsx("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} /> : null}
      </button>
      {open ? (
        <div className="ml-4 mt-1 space-y-1 border-l border-white/35 pl-3">
          {item.children.map((child) => (
            <NavLink key={child.path} to={child.path} end onClick={onCloseMobile} className={({ isActive }) => childClass(isActive)}>
              {child.label}
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const labelClass = "min-w-0 whitespace-nowrap";

function itemClass(active: boolean, collapsed: boolean) {
  return clsx(
    "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
    collapsed && "justify-center",
    active
      ? "bg-gradient-to-r from-[#A57B12] to-[#8A650F] text-white shadow-[0_10px_24px_rgba(212,175,55,0.22)] before:absolute before:left-0 before:h-7 before:w-1 before:rounded-r before:bg-brandGold [&_svg]:text-white"
      : "text-slate-200 hover:bg-white/10 hover:text-white"
  );
}

function groupClass(active: boolean, collapsed: boolean) {
  if (collapsed) {
    return itemClass(active, collapsed);
  }

  return clsx(
    "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
    active ? "bg-white/8 text-white before:absolute before:left-0 before:h-7 before:w-1 before:rounded-r before:bg-brandGold [&_svg]:text-white" : "text-slate-200 hover:bg-white/10 hover:text-white"
  );
}

function childClass(active: boolean) {
  return clsx("block rounded-lg px-3 py-2 text-sm font-semibold", active ? "bg-gradient-to-r from-[#FFF8E1]/95 to-[#F7E7A4]/85 text-[#8A650F] shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white");
}
