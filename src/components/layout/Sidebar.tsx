import clsx from "clsx";
import { ChevronDown, ChevronsLeft, LockKeyhole, LogOut, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { navigation } from "../../config/navigation";
import type { NavigationItem } from "../../config/navigation";
import { useAuth } from "../../hooks/useAuth";
import { usePermission } from "../../hooks/usePermission";
import { notifySuccess } from "../../services/notificationService";
import { Brand } from "./Brand";

export function Sidebar({ collapsed, mobileOpen, onCloseMobile, onToggleSidebar }: { collapsed: boolean; mobileOpen: boolean; onCloseMobile: () => void; onToggleSidebar: () => void }) {
  const { can } = usePermission();
  const { logout, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
  const trustItems = visibleNavigation.filter((item) => ["Admin Listing", "Agents Listing", "Trust Management", "My Network", "Network", "Income"].includes(item.label));
  const resourceItems = visibleNavigation.filter((item) => item.label === "Resources");

  const handleLogout = () => {
    logout();
    notifySuccess("Signed out successfully.", "logout-success");
    navigate("/login", { replace: true });
  };

  const content = (
    <aside className={clsx("flex h-screen flex-col border-r border-black bg-ink shadow-[10px_0_30px_rgba(17,17,17,0.16)] transition-all", collapsed ? "w-[72px]" : "w-[292px]")}>
      <div className="flex h-24 items-center justify-between px-5">
        <Brand collapsed={collapsed} />
        {!collapsed ? (
          <button type="button" onClick={onToggleSidebar} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Collapse navigation">
            <ChevronsLeft className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
        {dashboardItem ? <NavigationEntry item={dashboardItem} collapsed={collapsed} expanded={expanded} setExpanded={setExpanded} pathname={location.pathname} onCloseMobile={onCloseMobile} /> : null}
        <NavigationSection title="Trust Operations" collapsed={collapsed}>
          {trustItems.map((item) => (
            <NavigationEntry key={item.label} item={item} collapsed={collapsed} expanded={expanded} setExpanded={setExpanded} pathname={location.pathname} onCloseMobile={onCloseMobile} />
          ))}
        </NavigationSection>
        <NavigationSection collapsed={collapsed}>
          {resourceItems.map((item) => (
            <NavigationEntry key={item.label} item={item} collapsed={collapsed} expanded={expanded} setExpanded={setExpanded} pathname={location.pathname} onCloseMobile={onCloseMobile} />
          ))}
        </NavigationSection>
        <NavigationSection title="Account" collapsed={collapsed}>
          {accountNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} title={collapsed ? item.label : undefined} className={({ isActive }) => itemClass(isActive, collapsed)} onClick={onCloseMobile}>
                <Icon className="h-[19px] w-[19px]" />
                {!collapsed ? <span>{item.label}</span> : null}
              </NavLink>
            );
          })}
        </NavigationSection>
      </nav>
      <div className="border-t border-white/15 p-4">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white" title={collapsed ? "Logout" : undefined}>
          <LogOut className="h-[19px] w-[19px]" />
          {!collapsed ? <span>Logout</span> : null}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden shrink-0 lg:sticky lg:top-0 lg:block lg:h-screen">{content}</div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/30" aria-label="Close navigation" onClick={onCloseMobile} />
          <div className="relative h-full w-[260px]">{content}</div>
        </div>
      ) : null}
    </>
  );
}

function NavigationSection({ title, collapsed, children }: { title?: string; collapsed: boolean; children: React.ReactNode }) {
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
        {!collapsed ? <span>{item.label}</span> : null}
      </NavLink>
    );
  }

  const open = expanded === item.label && !collapsed;
  return (
    <div key={item.label}>
      <button onClick={() => setExpanded(open ? undefined : item.label)} title={collapsed ? item.label : undefined} className={groupClass(Boolean(isGroupActive), collapsed)}>
        <Icon className="h-[19px] w-[19px]" />
        {!collapsed ? <span className="flex-1 text-left">{item.label}</span> : null}
        {!collapsed ? <ChevronDown className={clsx("h-4 w-4 transition", open && "rotate-180")} /> : null}
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
