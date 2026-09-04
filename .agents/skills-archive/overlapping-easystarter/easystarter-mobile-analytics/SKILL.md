---
name: easystarter-mobile-analytics
description: Configure OpenPanel analytics for the EasyStarter native app. Use when the user says "set up analytics", "track events", "add screen tracking", "OpenPanel not working", "analytics credentials", "OPENPANEL_CLIENT_ID", "no events showing up", "configure native tracking", "add custom event", or wants to enable, debug, or extend mobile analytics.
---

# EasyStarter Mobile Analytics

Native analytics uses OpenPanel's React Native SDK with AsyncStorage for persistence. The wrapper in `apps/native/lib/analytics/openpanel.ts` initializes the client only when both credentials are present -- when missing, every tracking call silently no-ops (no crash, no console error). This means the app always runs fine without analytics configured; you just won't see data.

## Decision Tree

- **Enable analytics for the first time** -> Section 1 (OpenPanel Dashboard) + Section 2 (eas.json env)
- **Track a custom event in a screen or action** -> Section 3 (using the tracking functions)
- **Track a screen view** -> Section 3 (screen view tracking)
- **Events not appearing in the dashboard** -> Section 5 (common mistakes)
- **Check where analytics is already used** -> Section 4 (existing usage)

## Section 1: OpenPanel Dashboard Setup

1. Log in at [openpanel.dev](https://openpanel.dev)
2. Create a new project (or use an existing one)
3. Go to project Settings -> API Keys
4. Copy the **Client ID** and **Client Secret**
5. These go into `eas.json` -- never hardcode them in source files

## Section 2: Environment Variables

| Variable | File | Purpose |
|----------|------|---------|
| `EXPO_PUBLIC_OPENPANEL_CLIENT_ID` | `apps/native/eas.json` (all build profiles) | OpenPanel project client ID |
| `EXPO_PUBLIC_OPENPANEL_CLIENT_SECRET` | `apps/native/eas.json` (all build profiles) | OpenPanel project client secret |

The credentials must be set in **every** `eas.json` build profile that should report analytics:

```json
// apps/native/eas.json — build.development.env, build.preview.env, build.production.env
{
  "EXPO_PUBLIC_OPENPANEL_CLIENT_ID": "your-openpanel-client-id",
  "EXPO_PUBLIC_OPENPANEL_CLIENT_SECRET": "your-openpanel-client-secret"
}
```

For local simulator development, you can also set these in `apps/native/.env.development.local` (not committed). EAS cloud builds use the `eas.json` env blocks exclusively.

## Section 3: Tracking Events and Screen Views

The wrapper lives at `apps/native/lib/analytics/openpanel.ts`:

```typescript
// apps/native/lib/analytics/openpanel.ts
import { OpenPanel } from "@openpanel/react-native";
import type { TrackProperties } from "@openpanel/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const clientId = process.env.EXPO_PUBLIC_OPENPANEL_CLIENT_ID;
const clientSecret = process.env.EXPO_PUBLIC_OPENPANEL_CLIENT_SECRET;

const openPanel =
  clientId && clientSecret
    ? new OpenPanel({ clientId, clientSecret, storage: AsyncStorage })
    : undefined;

export function trackOpenPanelEvent(name: string, properties?: TrackProperties) {
  return openPanel?.track(name, properties);
}

export function trackOpenPanelScreenView(path: string, properties?: TrackProperties) {
  openPanel?.screenView(path, properties);
}
```

**To track a custom event:**

```typescript
import { trackOpenPanelEvent } from "@/lib/analytics/openpanel";

// In a button handler, after a purchase, etc.
trackOpenPanelEvent("credits_purchased", { packageId: "starter", amount: 100 });
```

**To track a screen view:**

```typescript
import { trackOpenPanelScreenView } from "@/lib/analytics/openpanel";

// In a useEffect or useFocusEffect
trackOpenPanelScreenView("/settings/theme");
```

Both functions are safe to call even when analytics is not configured -- they return `undefined` and do nothing.

## Section 4: Existing Analytics Usage

The tracking functions are exported from `apps/native/lib/analytics/openpanel.ts` but not yet called from any screen. To find current usage, grep:

```bash
grep -rn "trackOpenPanel" apps/native/ --include="*.ts" --include="*.tsx"
```

When adding new events, keep them intentional -- track product-meaningful actions (sign-up completed, credits purchased, theme changed) not noisy automatic page loads.

**Privacy rule**: never send raw email, phone number, auth tokens, or provider customer IDs as event properties. Use anonymized identifiers if you need user association.

## Section 5: Common Mistakes

- **Credentials set in `development` profile but not `preview` or `production`** -- each `eas.json` build profile has its own `env` block. If you only set the credentials in `development`, preview and production builds silently skip all analytics because the OpenPanel client never initializes.

- **Hardcoding credentials in `openpanel.ts`** -- the wrapper reads from `process.env.EXPO_PUBLIC_*`. Putting real values in the source file commits secrets to git. Always use `eas.json` env blocks or EAS Secrets for cloud builds.

- **Expecting events in dev without a rebuild** -- `EXPO_PUBLIC_*` env vars are baked into the JavaScript bundle at build time. Changing `eas.json` or `.env.development.local` requires restarting Expo (`pnpm dev:native`) to pick up the new values.

- **Using a different OpenPanel project per profile without realizing** -- if development and production point to different OpenPanel projects, events from dev builds won't appear in the production dashboard. This is sometimes intentional but often confusing.

## Verification

1. Set real credentials in `eas.json` `development` profile (or `.env.development.local`)
2. Restart Expo: `pnpm dev:native`
3. Add a test event call somewhere reachable (e.g., a button press)
4. Trigger the event on simulator or device
5. Check the OpenPanel dashboard -- events should appear within a few seconds
6. For production: `eas build --profile production` and verify events land in the production OpenPanel project
7. `pnpm check-types` after any code edits
