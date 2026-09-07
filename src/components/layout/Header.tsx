import { KeyRound, LogOut, Menu, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { roles } from "../../config/roles";
import { useAuth } from "../../hooks/useAuth";
import { notifySuccess } from "../../services/notificationService";
import { UserAvatar } from "../common/UserAvatar";
import { NotificationDropdown } from "./NotificationDropdown";

export function Header({
  hideDesktopToggle = false,
  onToggleSidebar,
  onToggleMobile
}: {
  hideDesktopToggle?: boolean;
  onToggleSidebar: () => void;
  onToggleMobile: () => void;
}) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const page = location.pathname.split("/").filter(Boolean).slice(-1)[0]?.replace(/-/g, " ") ?? "dashboard";

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    notifySuccess("Signed out successfully.", "logout-success");
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white px-4">
      <button onClick={onToggleMobile} className="rounded-lg p-2 text-textSecondary hover:bg-gray-100 lg:hidden" aria-label="Open navigation">
        <Menu className="h-[19px] w-[19px]" />
      </button>
      {!hideDesktopToggle ? (
        <button onClick={onToggleSidebar} className="hidden rounded-lg p-2 text-textSecondary hover:bg-gray-100 lg:block" aria-label="Collapse navigation">
          <Menu className="h-[19px] w-[19px]" />
        </button>
      ) : null}
      <div className="hidden min-w-44 text-sm capitalize text-textSecondary sm:block">{page}</div>
      <div className="ml-auto" />
      <NotificationDropdown />
      {session ? (
        <details className="relative" open={profileOpen} onToggle={(event) => setProfileOpen(event.currentTarget.open)}>
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100">
            <UserAvatar name={session.name} />
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
