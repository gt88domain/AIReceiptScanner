export const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

type GoogleAnalyticsEventParams = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (command: string, eventName: unknown, eventParams?: GoogleAnalyticsEventParams) => void;
    googleAnalyticsLoading?: Promise<void>;
  }
}

/** Load configured analytics after hydration rather than from the document head. */
export function loadGoogleAnalytics(): Promise<void> {
  if (!gaMeasurementId || typeof window === "undefined" || window.gtag) {
    return Promise.resolve();
  }
  if (window.googleAnalyticsLoading) return window.googleAnalyticsLoading;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = (command, eventName, eventParams) => {
    window.dataLayer?.push([command, eventName, eventParams]);
  };
  window.gtag("js", new Date().toISOString());
  window.gtag("config", gaMeasurementId, { send_page_view: false });

  window.googleAnalyticsLoading = new Promise((resolve) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => resolve(), { once: true });
    document.head.append(script);
  });
  return window.googleAnalyticsLoading;
}

/**
 * Tracks a GA4 page view for the current browser location.
 */
export function trackGooglePageView() {
  if (typeof window === "undefined") {
    return;
  }

  trackGoogleEvent("page_view", {
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search + window.location.hash,
    page_title: document.title,
  });
}

/**
 * Tracks a custom GA4 event when Google Analytics is configured.
 *
 * @param eventName - GA4 event name to send.
 * @param eventParams - Optional GA4 event parameters.
 */
export function trackGoogleEvent(eventName: string, eventParams?: GoogleAnalyticsEventParams) {
  if (!gaMeasurementId || typeof window === "undefined" || !window.gtag) {
    return;
  }

  window.gtag("event", eventName, eventParams);
}
