---
name: easystarter-mobile-real-device-server
description: "Start EasyStarter Mobile physical device development with Server. Use whenever the user wants to test on a real phone, needs ngrok for mobile dev, has device-can't-reach-server issues, wants to test email verification links on device, or says 'real device', 'test on my phone', 'ngrok setup', 'device can't connect', 'pnpm dev:ios-device'."
---

# EasyStarter Mobile Real Device + Server

A physical phone cannot reach `localhost:3001`. You need either a LAN IP or a tunnel (ngrok) to expose the Server. Ngrok is required if you need email verification links to work from the device's email client, because those links must contain a publicly reachable URL.

## Decision Tree

- **Just testing API calls from device (no email links)** --> LAN IP approach (Section 1)
- **Need email verification / password reset links to open on device** --> Ngrok approach (Section 2)
- **Already have ngrok running, app won't connect** --> Section 3 (env sync) + Common Mistakes
- **Auth callback redirect fails on device** --> Section 4 (scheme check)

## Section 1: LAN IP Approach (No Email Links)

If you only need API calls (no clickable email links), use your Mac's LAN IP:

```bash
# Find your LAN IP
ifconfig | grep "inet " | grep -v 127.0.0.1
# e.g. 192.168.1.42
```

Set in `apps/native/.env.development.local`:
```
EXPO_PUBLIC_SERVER_API_URL=http://192.168.1.42:3001
```

Then start both:
```bash
# iOS device
pnpm dev:ios-device+server

# Android device
pnpm dev:android-device+server
```

These root scripts run:
```jsonc
// package.json
"dev:ios-device+server": "turbo run dev:ios-device --filter=native --filter=server --parallel"
"dev:android-device+server": "turbo run dev:android-device --filter=native --filter=server --parallel"
```

Which maps to:
```jsonc
// apps/native/package.json
"dev:ios-device": "expo run:ios --device"
"dev:android-device": "expo run:android --device"
```

Limitation: email verification links sent by the server will contain `http://192.168.1.42:3001/...` which only works if the device opens the link on the same WiFi network.

## Section 2: Ngrok Approach (Email Links Work)

Ngrok gives you a public HTTPS URL that the device can reach from anywhere, and email verification links will contain a clickable public URL.

**Step 1 -- Start the Server:**
```bash
pnpm dev:server
# Server starts on http://localhost:3001
```

**Step 2 -- Start ngrok:**
```bash
ngrok http 3001
# Outputs: https://abc123.ngrok-free.app
```

**Step 3 -- Update native env:**

Write the ngrok HTTPS URL to `apps/native/.env.development.local`:
```
EXPO_PUBLIC_SERVER_API_URL=https://abc123.ngrok-free.app
```

**Step 4 -- Update Server env:**

The server needs to know its own public URL for email links and auth callbacks. In `apps/server/.dev.vars`:
```
SERVER_URL=https://abc123.ngrok-free.app
```

**Step 5 -- Restart both processes** (env changes require restart):
```bash
# Terminal 1
pnpm dev:server

# Terminal 2
pnpm -F native dev:ios-device  # or dev:android-device
```

The server constructs email verification links using `SERVER_URL`:
```typescript
// apps/server/src/lib/auth.ts
baseURL: env.SERVER_URL || "",  // This appears in email links
```

And the native email bridge handler redirects verified users back to the app:
```typescript
// apps/server/src/handlers/native-verify-email-bridge.ts
// Redirects to the native app scheme after email verification
// e.g. easystarter-native:///callback
```

## Section 3: Environment Variable Sync

When using ngrok, three things must agree:

| What | Where | Value |
|------|-------|-------|
| Native API URL | `apps/native/.env.development.local` `EXPO_PUBLIC_SERVER_API_URL` | `https://abc123.ngrok-free.app` |
| Server self-URL | `apps/server/.dev.vars` `SERVER_URL` | `https://abc123.ngrok-free.app` |
| Server trusted origins | `apps/server/src/lib/auth.ts` trustedOrigins | Auto-includes `exp://` in dev mode |

The trusted origins already include Expo dev URLs in development mode:
```typescript
// apps/server/src/lib/auth.ts — trustedOrigins
...(process.env.NODE_ENV === "development"
  ? [
      "exp://",
      "exp://**",
      "exp://192.168.*.*:*/**",
    ]
  : []),
```

## Section 4: Auth Callback on Device

The auth callback uses the app's custom scheme. This must be consistent across:

```json
// apps/native/app.json
{ "expo": { "scheme": "easystarter-native" } }
```

```typescript
// packages/app-config/src/app-config.ts — native.app
app: {
  name: "easystarter-native",
  nativeScheme: "easystarter-native",
}
```

```typescript
// apps/native/configs/app-config.ts — getAuthConfig()
callbackURL: createDeepLinkURL(scheme, nativeRoutes.authSignIn)
// produces: easystarter-native:///callback
```

The device must have a **development build** installed (not Expo Go) for the custom scheme to be registered with the OS.

## Section 5: Development Build for Device

Real device testing requires a development build for native modules:

```bash
# Build for connected iOS device
pnpm -F native dev:ios-device

# Or create an EAS development build
pnpm -F native eas:build:ios:development
```

The `eas.json` development profile:
```jsonc
{
  "development": {
    "developmentClient": true,
    "distribution": "internal"  // installable via QR code
  }
}
```

## Verification

1. Start server: `pnpm dev:server`
2. Start ngrok: `ngrok http 3001` (if email links needed)
3. Update `EXPO_PUBLIC_SERVER_API_URL` in `.env.development.local`
4. Update `SERVER_URL` in `.dev.vars` (if using ngrok)
5. Start native: `pnpm -F native dev:ios-device`
6. On device: sign in with email/password
7. Check email client on device -- verification link should open the app via scheme redirect

## Common Mistakes

- **Forgetting to update `SERVER_URL` in `.dev.vars` when using ngrok** -- The native app can reach the server fine, but email verification links still contain `http://localhost:3001` because the server builds links from `SERVER_URL`, not from the incoming request host. Both must be the ngrok URL.
- **Ngrok URL changes on restart** -- Free ngrok generates a new URL each session. After restarting ngrok, update both `.env.development.local` and `.dev.vars`, then restart both processes.
- **Testing Apple Sign-In on device without a dev build** -- Expo Go doesn't support `expo-apple-authentication`. The Apple Sign-In button will crash. Use `pnpm -F native dev:ios-device` which triggers a local build with native modules.
- **Android device can't resolve ngrok URL** -- Some corporate networks block ngrok domains. Try the LAN IP approach instead, or use a different tunnel service.
- **Changing `eas.json` env for local device testing** -- `eas.json` env is for EAS cloud builds only. Local device dev reads `.env.development.local`. Changing `eas.json` will affect your next cloud build.
