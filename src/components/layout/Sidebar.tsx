import clsx from "clsx";
import { ChevronDown, LogOut } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { navigation } from "../../config/navigation";
import { useAuth } from "../../hooks/useAuth";
import { usePermission } from "../../hooks/usePermission";
import { notifySuccess } from "../../services/notificationService";
import { Brand } from "./Brand";

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: { collapsed: boolean; mobileOpen: boolean; onCloseMobile: () => void }) {
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

  const handleLogout = () => {
    logout();
    notifySuccess("Signed out successfully.", "logout-success");
    navigate("/login", { replace: true });
  };

  const content = (
    <aside className={clsx("flex h-screen flex-col border-r border-line bg-white transition-all", collapsed ? "w-[72px]" : "w-[260px]")}>
      <div className="flex h-16 items-center px-4">
        <Brand collapsed={collapsed} />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const isGroupActive = item.children?.some((child) => location.pathname === child.path) || location.pathname === item.path;
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
              <button
                onClick={() => setExpanded(open ? undefined : item.label)}
                title={collapsed ? item.label : undefined}
                className={groupClass(Boolean(isGroupActive), collapsed)}
              >
                <Icon className="h-[19px] w-[19px]" />
                {!collapsed ? <span className="flex-1 text-left">{item.label}</span> : null}
                {!collapsed ? <ChevronDown className={clsx("h-4 w-4 transition", open && "rotate-180")} /> : null}
              </button>
              {open ? (
                <div className="ml-4 mt-1 space-y-1 border-l border-line pl-3">
                  {item.children.map((child) => (
                    <NavLink key={child.path} to={child.path} end onClick={onCloseMobile} className={({ isActive }) => childClass(isActive)}>
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-textSecondary hover:bg-gray-100" title={collapsed ? "Logout" : undefined}>
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

function itemClass(active: boolean, collapsed: boolean) {
  return clsx(
    "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
    collapsed && "justify-center",
    active ? "bg-ink text-white before:absolute before:left-0 before:h-5 before:w-1 before:rounded-r before:bg-brandGold" : "text-textSecondary hover:bg-gray-100"
  );
}

function groupClass(active: boolean, collapsed: boolean) {
  if (collapsed) {
    return itemClass(active, collapsed);
  }

  return clsx(
    "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
    active ? "bg-gray-100 text-ink before:absolute before:left-0 before:h-5 before:w-1 before:rounded-r before:bg-brandGold" : "text-textSecondary hover:bg-gray-100"
  );
}

function childClass(active: boolean) {
  return clsx("block rounded-lg px-3 py-2 text-sm font-medium", active ? "bg-ink text-white shadow-sm" : "text-textSecondary hover:bg-gray-100");
}
