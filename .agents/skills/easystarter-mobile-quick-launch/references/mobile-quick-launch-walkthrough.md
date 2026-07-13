# Mobile Quick Launch Walkthrough

Step-by-step guide from fresh clone to working native build.

## Prerequisites

Before starting, confirm you have:

- [ ] Xcode installed (latest stable) with iOS simulator
- [ ] Node.js 18+ and pnpm installed
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Expo account: sign up at expo.dev and run `eas login`
- [ ] Apple Developer account (for iOS builds and App Store submission)
- [ ] Cloudflare account with Workers and D1 enabled (for server deployment)
- [ ] Server already deployed (or ready to deploy with `pnpm deploy:server`)

## Step 1: Install Dependencies

From the repository root:

```bash
pnpm install
```

## Step 2: Configure App Identity

Edit `apps/native/app.json` with your app's identity:

```json
{
  "expo": {
    "name": "YourAppName",
    "slug": "your-app-slug",
    "scheme": "your-app-scheme",
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "appleTeamId": "YOUR_TEAM_ID"
    },
    "android": {
      "package": "com.yourcompany.yourapp"
    }
  }
}
```

Then update `packages/app-config/src/app-config.ts` to match:

```typescript
native: {
  app: {
    name: "your-app-scheme",           // MUST match app.json scheme
    nativeScheme: "your-app-scheme",   // MUST match app.json scheme
  },
},
```

And on the server side, ensure `APPLE_APP_BUNDLE_IDENTIFIER` matches `app.json` `ios.bundleIdentifier`.

## Step 3: Link EAS Project

```bash
cd apps/native
npx eas init
```

This writes `extra.eas.projectId` into `app.json`. Verify it was added.

## Step 4: Configure Environment Variables

Edit `apps/native/eas.json` and update env blocks for each build profile:

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_SERVER_API_URL": "https://your-server.example.com",
        "EXPO_PUBLIC_WEB_APP_URL": "https://your-web-app.example.com",
        "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY": "appl_YOUR_KEY",
        "EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID": "pro",
        "EXPO_PUBLIC_OPENPANEL_CLIENT_ID": "your-openpanel-client-id",
        "EXPO_PUBLIC_OPENPANEL_CLIENT_SECRET": "your-openpanel-client-secret"
      }
    },
    "preview": {
      "env": { "..." : "same as development or your staging URLs" }
    },
    "production": {
      "env": { "..." : "your production URLs and keys" }
    }
  }
}
```

For local simulator development, create `apps/native/.env.development.local`:

```
EXPO_PUBLIC_SERVER_API_URL=http://localhost:3001
EXPO_PUBLIC_WEB_APP_URL=http://localhost:3000
```

## Step 5: Deploy the Server

The native app needs a running server. For production:

```bash
pnpm deploy:server
```

For local development, the dev command starts both:

```bash
pnpm dev:native+server
```

## Step 6: Create a Development Build

Development builds include the Expo dev client for hot reloading:

```bash
# iOS simulator
pnpm dev:native+server

# Or build a dev client for physical device
cd apps/native
npx eas build --profile development --platform ios
```

## Step 7: Test on Physical Device

Physical devices cannot reach `localhost`. Options:

**Option A: Use deployed server**
Set `EXPO_PUBLIC_SERVER_API_URL` in `.env.development.local` to your deployed server URL.

**Option B: Use ngrok**
```bash
# Terminal 1: start server
pnpm dev:server

# Terminal 2: expose with ngrok
ngrok http 3001

# Terminal 3: update .env.development.local with ngrok URL, then start native
pnpm dev:native
```

Then run:
```bash
pnpm dev:ios-device+server
```

## Step 8: Production Build

When ready for App Store:

```bash
# Build
pnpm -F native eas:build:ios:production

# Submit
pnpm -F native eas:submit:ios:production
```

## Step 9: OTA Updates

After the initial binary is on the App Store, push JS-only changes without a new build:

```bash
pnpm -F native eas:update:production
```

## Post-Launch Checklist

- [ ] App identity in `app.json` matches your Apple Developer account
- [ ] `app-config.ts` `nativeScheme` matches `app.json` `scheme`
- [ ] `APPLE_APP_BUNDLE_IDENTIFIER` on server matches `app.json` `ios.bundleIdentifier`
- [ ] All `eas.json` env blocks have correct production URLs
- [ ] Server is deployed and reachable at `EXPO_PUBLIC_SERVER_API_URL`
- [ ] At least one auth method works end-to-end
- [ ] RevenueCat key set if payments are enabled
- [ ] `pnpm check-types` passes
