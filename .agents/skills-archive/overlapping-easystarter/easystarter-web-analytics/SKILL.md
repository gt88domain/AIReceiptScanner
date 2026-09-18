---
name: easystarter-web-analytics
description: Configure Web analytics with GA4 and OpenPanel for EasyStarter. Use when the user mentions Google Analytics, GA4, measurement ID, OpenPanel, page views, event tracking, analytics setup, VITE_GA_MEASUREMENT_ID, VITE_OPENPANEL_CLIENT_ID, funnel tracking, web analytics, tracking events, or asks "how do I add analytics" or "set up GA4" or "track user events".
---

# EasyStarter Web Analytics

Web analytics uses two providers that serve different purposes: **GA4** handles automatic route-level page views, while **OpenPanel** handles explicit product funnel events. Both are lazy-initialized and do nothing when their IDs are blank. Mixing their responsibilities (e.g. adding OpenPanel auto-tracking) will produce double-counted data.

## Decision Tree

- **Add GA4 or OpenPanel from scratch** -> Section 1 (env vars) + Section 2 (how each provider initializes)
- **Track a custom event** -> Section 3 (which function to call and when)
- **Analytics not firing locally** -> Section 4 (common mistakes)
- **Deploy analytics to production** -> Section 1 (wrangler.jsonc vars)

## Section 1: Environment Variables

Both analytics IDs are **public VITE_ vars** -- they are embedded in the client bundle at build time.

| Variable | Where to set | Example |
|----------|-------------|---------|
| `VITE_GA_MEASUREMENT_ID` | `apps/web/.env.development`, `apps/web/.env.production`, `apps/web/wrangler.jsonc` vars | `G-SRZ5KLY3P9` |
| `VITE_OPENPANEL_CLIENT_ID` | `apps/web/.env.development`, `apps/web/.env.production`, `apps/web/wrangler.jsonc` vars | `affbe40d-1e4d-4f75-a01f-0887995a43b3` |

These go in **three** places for full coverage:
1. `apps/web/.env.development` -- local dev
2. `apps/web/.env.production` -- local prod builds
3. `apps/web/wrangler.jsonc` `vars` -- Cloudflare production deploy

```jsonc
// apps/web/wrangler.jsonc
"vars": {
  "VITE_SERVER_URL": "https://server.easystarter.dev",
  "VITE_APP_URL": "https://cf.easystarter.dev",
  "VITE_GA_MEASUREMENT_ID": "G-SRZ5KLY3P9",
  "VITE_OPENPANEL_CLIENT_ID": "affbe40d-1e4d-4f75-a01f-0887995a43b3"
}
```

**These are NOT server secrets.** Do not put them in `.dev.vars` or use `secrets:bulk`. They must be VITE_ prefixed to be available in the client bundle.

## Section 2: How Each Provider Initializes

**GA4** -- script tags injected into the document head, sends `page_view` on every route change via `PageViewTracker`:

```typescript
// apps/web/src/lib/analytics/google-analytics.tsx
export const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

export function getGoogleAnalyticsScripts() {
  if (!gaMeasurementId) {
    return [];  // No-op when ID is blank
  }
  return [
    { src: `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`, async: true },
    { children: `...gtag('config', ${JSON.stringify(gaMeasurementId)}, { send_page_view: false });` },
  ];
}
```

Note `send_page_view: false` -- GA does NOT auto-track page views. Instead, the `PageViewTracker` component fires them on route changes:

```typescript
// apps/web/src/lib/analytics/page-view-tracker.tsx
export function PageViewTracker() {
  const href = useRouterState({ select: (state) => state.location.href });
  useEffect(() => {
    const id = requestAnimationFrame(() => trackGooglePageView());
    return () => cancelAnimationFrame(id);
  }, [href]);
  return null;
}
```

**OpenPanel** -- lazy dynamic import, only initializes when `VITE_OPENPANEL_CLIENT_ID` is present:

```typescript
// apps/web/src/lib/analytics/openpanel.ts
const clientId = import.meta.env.VITE_OPENPANEL_CLIENT_ID;

export const openPanel =
  typeof window !== "undefined" && clientId
    ? new (await import("@openpanel/web")).OpenPanel({ clientId })
    : undefined;
```

OpenPanel does NOT auto-track routes. This is intentional -- use explicit calls only.

## Section 3: Tracking Events

**GA4 page views** -- already handled by `PageViewTracker`. Do not add another auto page-view tracker.

**GA4 custom events:**
```typescript
import { trackGoogleEvent } from "@/lib/analytics/google-analytics";
trackGoogleEvent("sign_up", { method: "email" });
```

**OpenPanel explicit events** -- use for key funnel steps (sign up, purchase, feature use):
```typescript
import { trackOpenPanelEvent, trackOpenPanelScreenView } from "@/lib/analytics/openpanel";

// Track a product event
trackOpenPanelEvent("purchase_completed", { plan: "pro", amount: 1000 });

// Track a screen view for a specific route you want to measure
trackOpenPanelScreenView("/dashboard/credits");
```

Both functions are safe to call when the provider is not configured -- they silently no-op.

## Verification

1. `pnpm dev:web` -- start the web app
2. Open browser DevTools -> Network tab
3. With GA ID set: look for requests to `googletagmanager.com` after page load
4. Navigate between routes -- each navigation should fire a `page_view` event
5. With OpenPanel ID set: explicit `trackOpenPanelEvent` calls should produce network requests to OpenPanel
6. With IDs blank: no analytics scripts should load at all

## Common Mistakes

- **Putting analytics IDs in `.dev.vars` or server env** -- These are VITE_ client-side vars. They must go in `apps/web/.env.*` files and `apps/web/wrangler.jsonc` vars. The server never reads them.
- **Forgetting `wrangler.jsonc` vars for production** -- Setting `.env.production` alone is not enough for Cloudflare Workers deploys. The vars must also be in `apps/web/wrangler.jsonc`.
- **Adding OpenPanel auto page-view tracking** -- OpenPanel is for explicit product events only. GA4 already tracks all route changes via `PageViewTracker`. Adding OpenPanel auto-tracking will double-count page views.
- **Adding a second GA4 page-view tracker** -- `PageViewTracker` already fires `trackGooglePageView()` on every route change. Adding another tracker duplicates every page view in GA4 reports.
- **Expecting analytics in SSR** -- Both providers check `typeof window !== "undefined"` before initializing. They only run in the browser.
