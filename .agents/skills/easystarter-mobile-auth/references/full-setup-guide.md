# Mobile Auth Full Setup Guide

Complete walkthrough for configuring native authentication from scratch. Read this when setting up mobile auth for the first time.

## Prerequisites

- `apps/server/.dev.vars` created from `.dev.vars.example`
- `apps/native/.env.development.local` created from `.env.development.local.example`
- Server running locally or via ngrok for physical devices

## Step 1: Generate BETTER_AUTH_SECRET

```bash
openssl rand -base64 32
# Write output to BETTER_AUTH_SECRET in apps/server/.dev.vars
```

## Step 2: Choose Auth Methods

Edit `packages/app-config/src/app-config.ts`:

```typescript
auth: {
  methods: {
    emailPasswordEnabled: true,   // needs RESEND_API_KEY for verification emails
    emailOtpEnabled: false,       // needs RESEND_API_KEY
    smsEnabled: false,            // needs ALIBABA_CLOUD_ACCESS_KEY_*
    githubEnabled: false,         // not shown on mobile
    googleEnabled: true,          // needs GOOGLE_CLIENT_ID + SECRET
    appleEnabled: true,           // needs APPLE_APP_BUNDLE_IDENTIFIER
  },
},
```

## Step 3: Set App Scheme

Verify these three locations match:

1. `apps/native/app.json` -> `expo.scheme`: `"easystarter-native"` (or your custom scheme)
2. `packages/app-config/src/app-config.ts` -> `native.app.nativeScheme`: same value
3. `packages/app-config/src/app-config.ts` -> `native.app.name`: same value

The server builds `trustedOrigins` from `nativeConfig.app.name + "://"` automatically.

## Step 4: Configure Native Server URL

In `apps/native/.env.development.local`:

```
EXPO_PUBLIC_SERVER_API_URL=http://localhost:3001
EXPO_PUBLIC_WEB_APP_URL=http://localhost:3000
```

For physical device testing, use ngrok:

```bash
ngrok http 3001
# Then set EXPO_PUBLIC_SERVER_API_URL to the https://xxx.ngrok-free.app URL
```

## Step 5: Configure Google OAuth (Optional)

1. Go to https://console.cloud.google.com/apis/credentials
2. Create or edit OAuth 2.0 Client ID -> Web application
3. Authorized redirect URI: `{SERVER_URL}/api/auth/callback/google`
   - Local: `http://localhost:3001/api/auth/callback/google`
   - Production: `https://server.yourdomain.com/api/auth/callback/google`
4. Set server env vars:
   - `GOOGLE_CLIENT_ID` in `apps/server/wrangler.jsonc` vars
   - `GOOGLE_CLIENT_SECRET` in `apps/server/.dev.vars`

## Step 6: Configure Apple Sign-In (iOS)

1. In Apple Developer portal, enable "Sign in with Apple" for your App ID
2. Verify `apps/native/app.json` has:
   ```json
   "ios": {
     "bundleIdentifier": "native.easystarter.dev",
     "usesAppleSignIn": true
   }
   ```
3. Set `APPLE_APP_BUNDLE_IDENTIFIER` in `.dev.vars` and `wrangler.jsonc` vars to match the bundleIdentifier exactly

No client secret or redirect URI is needed for native Apple Sign-In -- it uses the idToken flow.

## Step 7: Configure Resend Email (for email-based auth)

If `emailPasswordEnabled` or `emailOtpEnabled` is true, verification/OTP emails need Resend:

1. Get API key from https://resend.com/api-keys
2. Set `RESEND_API_KEY` in `apps/server/.dev.vars`
3. Configure from address in `packages/app-config/src/app-config.ts`:
   ```typescript
   email: {
     provider: "resend",
     from: {
       localPart: "noreply",
       domain: "yourdomain.com",  // must be verified in Resend
     },
   },
   ```

## Step 8: Set EAS Build Variables

For cloud builds, set production values in `apps/native/eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SERVER_API_URL": "https://server.yourdomain.com",
        "EXPO_PUBLIC_WEB_APP_URL": "https://yourdomain.com"
      }
    }
  }
}
```

## Step 9: Test

```bash
pnpm dev:native+server
```

1. Open the app on simulator or device
2. Test each enabled method: sign up, sign in, sign out, session restore
3. For Apple: test on physical iOS device
4. For Google: complete the full redirect flow
5. Verify callback screen processes the auth cookie and navigates home
