import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { subscribeToLoading } from "../../services/loadingService";

const routeLoadingDelayMs = 350;

export function PageLoadingOverlay() {
  const location = useLocation();
  const [apiLoading, setApiLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => subscribeToLoading(setApiLoading), []);

  useEffect(() => {
    setRouteLoading(true);
    const timer = window.setTimeout(() => setRouteLoading(false), routeLoadingDelayMs);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  if (!apiLoading && !routeLoading) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-white px-6 py-5 shadow-[0_24px_70px_rgba(17,17,17,0.18)]">
        <Loader2 className="h-8 w-8 animate-spin text-brandGold" />
        <div className="text-sm font-semibold text-textPrimary">Loading...</div>
      </div>
    </div>
  );
}
