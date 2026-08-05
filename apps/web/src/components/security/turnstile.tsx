import { useEffect, useRef } from "react";

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const scriptId = "cloudflare-turnstile-script";

type TurnstileWidget = {
  render: (
    container: HTMLElement,
    options: {
      action: string;
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      sitekey: string;
      theme: "auto";
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileWidget;
  }
}

type TurnstileProps = {
  action: "contact" | "newsletter";
  onError?: () => void;
  onToken: (token: string) => void;
  resetNonce?: number;
};

/** Loads the official Turnstile script only for forms that have a configured public site key. */
export function Turnstile({ action, onError, onToken, resetNonce = 0 }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const onErrorRef = useRef(onError);
  const onTokenRef = useRef(onToken);
  onErrorRef.current = onError;
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let active = true;
    let script: HTMLScriptElement | null = document.getElementById(scriptId) as HTMLScriptElement;

    const render = () => {
      if (!active || !containerRef.current || widgetIdRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        action,
        callback: (token) => onTokenRef.current(token),
        "error-callback": () => onErrorRef.current?.(),
        "expired-callback": () => onTokenRef.current(""),
        sitekey: siteKey,
        theme: "auto",
      });
    };

    if (window.turnstile) {
      render();
    } else {
      if (!script) {
        script = document.createElement("script");
        script.async = true;
        script.defer = true;
        script.id = scriptId;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        document.head.append(script);
      }
      script.addEventListener("load", render);
    }

    return () => {
      active = false;
      script?.removeEventListener("load", render);
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = undefined;
    };
  }, [action]);

  useEffect(() => {
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
  }, [resetNonce]);

  return siteKey ? <div className="pt-1" ref={containerRef} /> : null;
}

export const turnstileEnabled = Boolean(siteKey);
