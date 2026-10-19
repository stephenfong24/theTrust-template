import { ChevronRight, KeyRound, LogOut, Menu, PanelLeftClose, PanelLeftOpen, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, matchPath, useLocation, useNavigate } from "react-router-dom";
import { navigation } from "../../config/navigation";
import { roles } from "../../config/roles";
import { useAuth } from "../../hooks/useAuth";
import { notifySuccess } from "../../services/notificationService";
import { UserAvatar } from "../common/UserAvatar";

// Reuse the configured app title, excluding environment prefixes such as "Staging:".
const portalName = /\btheWill\b/i.test(import.meta.env.VITE_APP_TITLE ?? "") ? "theWill" : "theTrust";
const pageTitles = [
  { path: "/trust-plan/add", label: "Add Trust Plan" },
  { path: "/trust-plan/edit/:id", label: "Edit Trust Plan" },
  { path: "/resources/add", label: "Add Resource" },
  { path: "/resources/edit/:resourceId", label: "Edit Resource" },
  { path: "/trust/applications/:applicationId/:step", label: "Trust Application" },
  { path: "/trust/application-documents/:trustId/:documentCode", label: "Trust Application Document" },
  { path: "/trust/payment-receipts/:trustId/:paymentId", label: "Payment Receipt" },
  { path: "/trust/payment", label: "Trust Payment" },
  { path: "/trust/draft-listing", label: "Trust Draft Listing" },
  { path: "/trust/payment-allocations", label: "Payment Allocations" },
  { path: "/trust/dividend-scheduled", label: "Dividend Scheduled" },
  { path: "/settings/trust-categories", label: "Trust Categories" },
  { path: "/profile", label: "Profile" },
  { path: "/change-password", label: "Change Password" },
  { path: "/income", label: "Income" },
  { path: "/income/overriding-bonus", label: "Overriding Bonus" },
  { path: "/preferences", label: "Preferences" },
  { path: "/notifications", label: "Notifications" },
  { path: "/access-denied", label: "Access Denied" },
  ...navigation.flatMap((item) => [
    ...(item.path ? [{ path: item.path, label: item.label }] : []),
    ...(item.children ?? []).map((child) => ({
      path: child.path,
      label: item.label === "Network" || item.label === "My Network" ? `${item.label} (${child.label})` : child.label
    }))
  ])
];

export function Header({
  collapsed = false,
  hideDesktopToggle = false,
  onToggleSidebar,
  onToggleMobile
}: {
  collapsed?: boolean;
  hideDesktopToggle?: boolean;
  onToggleSidebar: () => void;
  onToggleMobile: () => void;
}) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDetailsElement>(null);
  const page = pageTitles.find(({ path }) => matchPath(path, location.pathname))?.label
    ?? pageTitles
      .filter(({ path }) => matchPath({ path, end: false }, location.pathname))
      .sort((a, b) => b.path.length - a.path.length)[0]?.label
    ?? "Page Not Found";

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (profileMenuRef.current?.contains(event.target as Node)) return;
      setProfileOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [profileOpen]);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    notifySuccess("Signed out successfully.", "logout-success");
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white px-4">
      <button onClick={onToggleMobile} className="shrink-0 rounded-lg p-2 text-textSecondary hover:bg-gray-100 lg:hidden" aria-label="Open navigation">
        <Menu className="h-[19px] w-[19px]" />
      </button>
      {!hideDesktopToggle ? (
        <button onClick={onToggleSidebar} className="hidden shrink-0 rounded-lg p-2 text-textSecondary hover:bg-gray-100 lg:block" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>
          {collapsed ? <PanelLeftOpen className="h-[19px] w-[19px]" /> : <PanelLeftClose className="h-[19px] w-[19px]" />}
        </button>
      ) : null}
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1 text-sm text-textSecondary">
        <ol className="flex min-w-0 items-center gap-2">
          <li className="shrink-0 rounded-md border border-ink bg-ink px-2 py-1 font-bold text-white">{portalName}</li>
          <li aria-hidden="true" className="shrink-0"><ChevronRight className="h-4 w-4" /></li>
          <li aria-current="page" className="min-w-0 truncate" title={page}>{page}</li>
        </ol>
      </nav>
      {session ? (
        <details ref={profileMenuRef} className="relative shrink-0" open={profileOpen} onToggle={(event) => setProfileOpen(event.currentTarget.open)}>
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100">
            <UserAvatar name={session.name} avatarUrl={session.avatarUrl ?? session.AvatarUrl} />
            <span className="hidden text-left lg:block">
              <span className="block text-sm font-semibold text-textPrimary">{session.name}</span>
              <span className="block text-xs text-textSecondary">{roles[session.role] ?? session.role}</span>
            </span>
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-line bg-white p-2 shadow-soft">
            <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-50"><UserRound className="h-4 w-4" />Profile</Link>
            <Link to="/change-password" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-50"><KeyRound className="h-4 w-4" />Change Password</Link>
            <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4" />Logout
            </button>
          </div>
        </details>
      ) : null}
    </header>
  );
}
