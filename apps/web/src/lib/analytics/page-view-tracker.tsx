import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { loadGoogleAnalytics, trackGooglePageView } from "./google-analytics";

/**
 * Tracks GA4 page views on route changes without sending automatic OpenPanel events.
 */
export function PageViewTracker() {
  const href = useRouterState({ select: (state) => state.location.href });

  useEffect(() => {
    let cancelled = false;
    const track = () => {
      void loadGoogleAnalytics().then(() => {
        if (!cancelled) trackGooglePageView();
      });
    };
    const idle = window.requestIdleCallback?.(track) ?? window.setTimeout(track, 1);
    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle as number);
      else window.clearTimeout(idle as number);
    };
  }, [href]);

  return null;
}
