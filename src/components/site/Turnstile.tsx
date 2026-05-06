import { useEffect, useRef } from "react";

// Cloudflare Turnstile test site key (always passes). Replace with real key in production.
export const TURNSTILE_SITE_KEY = "1x00000000000000000000AA";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.turnstile) return resolve();
    if (document.getElementById(SCRIPT_ID)) {
      const check = setInterval(() => {
        if (window.turnstile) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      return;
    }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

type Props = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
};

export function Turnstile({ onVerify, onExpire, theme = "light" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme,
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onExpire?.(),
      });
    });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className="cf-turnstile" />;
}
