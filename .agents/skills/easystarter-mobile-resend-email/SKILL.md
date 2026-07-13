---
name: easystarter-mobile-resend-email
description: Configure Resend email for EasyStarter native auth flows. Use when the user says "email not sending", "verification email", "password reset email", "Resend API key", "email links broken on device", "configure email", "RESEND_API_KEY", "email OTP", "ngrok email testing", "domain verification", "email from address", "email delivery", "reset password not working", "verification link not opening app", or needs to fix email delivery for mobile auth.
---

# EasyStarter Mobile Resend Email

Email in EasyStarter is entirely server-side. The native app never sends email directly -- it calls the Better Auth server API, which uses Resend to deliver verification, password reset, and OTP emails. The native-specific concern is that **email links must be reachable from a phone** and must **redirect back into the app** via the deep-link scheme.

## Decision Tree

- **Configure email delivery for the first time** -> Section 1 (Resend setup) + Section 2 (domain verification)
- **Verification/reset emails not arriving** -> Section 3 (env vars) + Section 5 (common mistakes)
- **Email arrives but link doesn't work on device** -> Section 4 (link reachability and scheme)
- **Test email locally on physical device** -> Section 4 (ngrok requirement)
- **Change the sender address or display name** -> Section 2 (sender config)
- **Email OTP codes not sending** -> Section 3 (env vars) + Section 6 (OTP email flow)

## Section 1: Resend Setup

1. Create an account at [resend.com](https://resend.com)
2. Go to API Keys -> Create API Key
3. Copy the key -- it goes into the server env as `RESEND_API_KEY`

The email provider is initialized in `apps/server/src/emails/index.ts`:

```typescript
// apps/server/src/emails/index.ts
export function getEmailProvider(): EmailProvider {
  const commonConfig = resolveCommonConfig();
  const providerKey: EmailProviderKey = commonConfig.email.provider ?? "resend";

  const providers: Record<EmailProviderKey, EmailProvider> = {
    resend: createResendEmailProvider({
      defaultFrom: `${commonConfig.app.name} <${commonConfig.email.from.localPart}@${commonConfig.email.from.domain}>`,
    }),
  };
  // ...
}
```

This reads the sender address from `packages/app-config/src/app-config.ts`.

## Section 2: Sender Address and Domain Verification

The sender address is configured in `packages/app-config/src/app-config.ts`:

```typescript
// packages/app-config/src/app-config.ts — common.email
email: {
  provider: "resend",
  from: {
    localPart: "noreply",    // left side of @
    domain: "easystarter.dev", // right side of @
  },
},
```

This produces `EasyStarter <noreply@easystarter.dev>` as the From address.

**Domain verification in Resend:**

1. Go to Resend Dashboard -> Domains -> Add Domain
2. Enter your domain (e.g., `easystarter.dev`)
3. Resend shows DNS records to add (MX, SPF, DKIM)
4. Add these records in your DNS provider (Cloudflare, Namecheap, etc.)
5. Click Verify in Resend -- verification can take a few minutes to hours
6. Until verified, Resend will reject sends from that domain

**Without domain verification**, you can only send to the email address associated with your Resend account (useful for initial testing but not production).

## Section 3: Environment Variables

| Variable | File | Purpose |
|----------|------|---------|
| `RESEND_API_KEY` | `apps/server/.dev.vars` (local) | Resend API key for sending emails |
| `RESEND_API_KEY` | `apps/server/.env.production` / Wrangler secrets | Resend API key for production |
| `SERVER_URL` | `apps/server/.dev.vars` | Base URL embedded in email links |
| `EXPO_PUBLIC_SERVER_API_URL` | `apps/native/eas.json` / `.env.development.local` | Server URL the native app calls |

The `RESEND_API_KEY` in `.dev.vars`:

```
# apps/server/.dev.vars
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

For production, set via Wrangler secrets: `pnpm -F server secrets:bulk:production`

## Section 4: Email Links and Native Callback Flow

Email links work differently for web vs native. The server detects which platform triggered the email and builds the appropriate link.

**Email verification (native):**

The verification email sender detects native callbacks and routes through a server bridge:

```typescript
// apps/server/src/emails/senders/sign-up-verify-email.ts
const nativeCallbackScheme = `${resolveNativeCommonConfig().app.name}://`;

function resolveNativeEmailVerificationLink(verificationUrl: string, callbackURL: string): string {
  const url = new URL(verificationUrl);
  const token = url.searchParams.get("token");
  const bridgeUrl = new URL("/api/auth/verify-email/native", url.origin);
  bridgeUrl.searchParams.set("token", token);
  bridgeUrl.searchParams.set("callbackURL", callbackURL);
  return bridgeUrl.toString();
}
```

The flow: user taps email link on phone -> opens `SERVER_URL/api/auth/verify-email/native?token=...&callbackURL=easystarter-native://callback` -> server verifies token, sets cookie -> redirects to `easystarter-native://callback` -> app opens and picks up the session.

**Password reset:**

Password reset emails contain a link to the server which redirects to the app's reset-password route:

```typescript
// apps/native/configs/app-config.ts
resetPasswordURL: createDeepLinkURL(scheme, nativeRoutes.resetPassword),
// Result: "easystarter-native://reset-password"
```

**Local development on physical device (ngrok):**

On a physical device, email links point to `SERVER_URL`. If that's `http://localhost:3001`, the phone can't reach it.

1. Start server: `pnpm dev:server`
2. Start ngrok: `ngrok http 3001`
3. Set `SERVER_URL` in `apps/server/.dev.vars` to the ngrok HTTPS URL
4. Set `EXPO_PUBLIC_SERVER_API_URL` in `apps/native/.env.development.local` to the same ngrok URL
5. Restart both: `pnpm dev:native+server`

Now email links point to an HTTPS URL the phone can open.

## Section 5: Common Mistakes

- **`SERVER_URL` is `localhost` -- email links don't work on device** -- the email contains a link like `http://localhost:3001/api/auth/verify-email?token=...`. A phone cannot reach `localhost`. Use ngrok for local dev or a deployed server URL. On simulator, `localhost` works because the simulator shares the host network.

- **Domain not verified in Resend** -- Resend silently drops emails from unverified domains (the API returns success but email never arrives). Check Resend Dashboard -> Domains for verification status. Until verified, test with the account email only.

- **Missing `RESEND_API_KEY`** -- the server throws on email send. Better Auth catches this and returns a 400 to the native app. Check the server Wrangler console for error logs.

- **App scheme mismatch** -- the native callback URL uses the scheme from `app-config.ts` (`nativeScheme`). If this doesn't match `app.json` `scheme` (currently both `"easystarter-native"`), the redirect after email verification opens nothing. See the mobile-auth skill for the full scheme alignment checklist.

- **Changing `email.from.domain` without Resend domain verification** -- updating the domain in `app-config.ts` without adding and verifying it in Resend means all emails fail silently.

- **Forgetting to restart the server after changing `.dev.vars`** -- Wrangler reads `.dev.vars` at startup. Changes to `RESEND_API_KEY` or `SERVER_URL` require restarting `pnpm dev:server`.

## Section 6: Email OTP Flow

When `emailOtpEnabled` is `true`, Better Auth's `emailOTP` plugin sends a one-time code via email:

```typescript
// apps/server/src/lib/auth.ts — emailOTP plugin
emailOTP({
  otpLength: emailOtpConfig.otpLength,     // 6
  expiresIn: emailOtpConfig.expiresInSeconds, // 300
  allowedAttempts: emailOtpConfig.allowedAttempts, // 3
  sendVerificationOTP: async ({ email, otp, type }, ctx) => {
    await sendSignInOtpEmailFromRequest(ctx?.request)({
      to: email,
      otp,
    });
  },
}),
```

The email template lives at `apps/server/src/emails/templates/email-otp-email.tsx` and the sender at `apps/server/src/emails/senders/email-otp-email.ts`.

OTP config is in `packages/app-config/src/app-config.ts`:

```typescript
// packages/app-config/src/app-config.ts — common.auth.otp.email
otp: {
  email: {
    otpLength: 6,
    expiresInSeconds: 300,
    allowedAttempts: 3,
    resendCooldownSeconds: 60,
  },
},
```

## Verification

1. Set `RESEND_API_KEY` in `apps/server/.dev.vars`
2. Verify your domain in Resend Dashboard (or use account email for testing)
3. Start server and native: `pnpm dev:native+server`
4. Sign up with a real email on the native app
5. Check that the verification email arrives
6. Tap the link on the device -- confirm it opens the app and completes verification
7. Test password reset: trigger "Forgot Password", check email, tap link, confirm app opens to reset screen
8. For email OTP: trigger email OTP sign-in, check the code arrives, enter it in the app
9. Preview email templates: `pnpm -F server email-preview` (opens at port 4000)
