import { useEffect, useRef, useState } from "react";

const turnstileScriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

type TurnstileWidgetId = string | number;

interface TurnstileWidgetProps {
  onTokenChange: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
  resetSignal?: number;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          size?: "normal" | "flexible" | "compact";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => TurnstileWidgetId;
      reset: (widgetId?: TurnstileWidgetId) => void;
      remove: (widgetId: TurnstileWidgetId) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

export function TurnstileWidget({ onTokenChange, onExpire, onError, resetSignal = 0 }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<TurnstileWidgetId | null>(null);
  const callbacksRef = useRef({ onTokenChange, onExpire, onError });
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onTokenChange, onExpire, onError };
  }, [onTokenChange, onExpire, onError]);

  useEffect(() => {
    let cancelled = false;

    if (!turnstileSiteKey) {
      setLoadError(true);
      callbacksRef.current.onError();
      return undefined;
    }

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;

        widgetIdRef.current = window.turnstile?.render(containerRef.current, {
          sitekey: turnstileSiteKey,
          action: "login",
          size: "flexible",
          callback: (token) => {
            callbacksRef.current.onTokenChange(token);
          },
          "expired-callback": () => {
            callbacksRef.current.onExpire();
          },
          "error-callback": () => {
            callbacksRef.current.onError();
          }
        }) ?? null;
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          callbacksRef.current.onError();
        }
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (resetSignal <= 0 || widgetIdRef.current === null) return;

    callbacksRef.current.onTokenChange("");
    window.turnstile?.reset(widgetIdRef.current);
  }, [resetSignal]);

  return (
    <div className="w-full space-y-2">
      <div ref={containerRef} className="w-full" />
      {loadError ? (
        <p className="text-sm font-medium text-red-700">Verification is unavailable. Please refresh the page and try again.</p>
      ) : null}
    </div>
  );
}

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${turnstileScriptUrl}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load verification.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = turnstileScriptUrl;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Unable to load verification.")), { once: true });
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}
