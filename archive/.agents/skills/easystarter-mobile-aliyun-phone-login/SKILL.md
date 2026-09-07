---
name: easystarter-mobile-aliyun-phone-login
description: Configure Alibaba Cloud phone SMS OTP login for EasyStarter Mobile. Use whenever the user mentions phone login, SMS OTP, Aliyun SMS, China phone number login, phone verification, mobile phone auth, or says "set up phone login", "enable SMS auth", "configure Aliyun phone", "phone number not working".
---

# EasyStarter Mobile Aliyun Phone Login

Phone SMS OTP login uses Alibaba Cloud (Aliyun) Dypnsapi to send verification codes. It is restricted to mainland China E.164 numbers (`+86` prefix). The server handles all SMS delivery and OTP verification -- the native app only collects the phone number and code, then sends them to Better Auth endpoints.

## Decision Tree

- **Enable phone login** -> Section 1 (config switch) + Section 2 (server env)
- **OTP not arriving** -> Section 3 (Aliyun console setup)
- **Phone number validation failing** -> Section 4 (E.164 format)
- **Customize OTP length/expiry** -> Section 5 (OTP config)

## Section 1: Config Switch

Enable SMS auth in `packages/app-config/src/app-config.ts`:

```typescript
// packages/app-config/src/app-config.ts — common.auth.methods
auth: {
  methods: {
    smsEnabled: true,  // enables phone tab in sign-in form
  },
},
sms: {
  provider: "aliyun",  // only supported provider
},
```

The native sign-in form reads this to show/hide the phone tab. The phone form component is at `apps/native/components/auth/phone/phone-sign-in-form.tsx`.

## Section 2: Server Environment Variables

| Variable | Where | Scope |
|----------|-------|-------|
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | `apps/server/.dev.vars` + `.env.production` | Secret |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | `apps/server/.dev.vars` + `.env.production` | Secret |

The SMS provider is created lazily in `apps/server/src/sms/index.ts`:

```typescript
// apps/server/src/sms/index.ts
case "aliyun":
  return createAliyunSmsProvider({
    accessKeyId: env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
  });
```

## Section 3: Aliyun Console Setup

1. Go to https://ram.console.aliyun.com/ -- create a RAM user with `AliyunDysmsFullAccess` permission
2. Generate an AccessKey pair for the RAM user
3. Go to https://dysms.console.aliyun.com/ -- enable the SMS service
4. Create an SMS signature and template for verification codes
5. Set the AccessKey pair in `.dev.vars`

## Section 4: Phone Number Format

The native phone form enforces mainland China format:

```typescript
// apps/native/components/auth/phone/phone-sign-in-form.tsx
import {
  CN_DIAL_PREFIX,          // "+86"
  CN_LOCAL_PHONE_DIGITS,   // 11
  CN_PHONE_NUMBER_REGEX,   // validates E.164 +86XXXXXXXXXXX
  toCnE164PhoneNumber,     // prepends +86 to local digits
} from "@repo/shared";
```

The server-side validator also enforces this in the Better Auth phone plugin:

```typescript
// apps/server/src/lib/auth.ts — phoneNumber plugin
phoneNumberValidator: async (phoneNumber) => isSupportedSmsPhoneNumber(phoneNumber),
```

`isSupportedSmsPhoneNumber` checks the `+86` prefix and 11-digit local number format.

## Section 5: OTP Configuration

```typescript
// packages/app-config/src/app-config.ts — common.auth.otp.sms
sms: {
  otpLength: 6,              // digits in the OTP
  expiresInSeconds: 300,     // 5 minutes
  resendCooldownSeconds: 60, // client-side cooldown
},
```

The server passes `otpLength` and `expiresInSeconds` to the Better Auth phone plugin. The client enforces `resendCooldownSeconds` to prevent spam.

Rate limits on the server protect against abuse:

```typescript
// apps/server/src/lib/auth.ts — rateLimit.customRules
"/phone-number/send-otp": { window: 60, max: 3 },
"/phone-number/verify": { window: 60, max: 10 },
```

## Section 6: Native Auth Flow

1. User enters local phone digits in `PhoneSignInForm`
2. Form calls `authClient.phoneNumber.sendOtp({ phoneNumber })` -- Aliyun sends the code
3. On success, navigates to `apps/native/app/(auth)/phone-otp.tsx`
4. User enters the OTP code
5. Client calls `authClient.phoneNumber.verify({ phoneNumber, code })`
6. Server verifies via `verifySmsCode()` which delegates to Aliyun's API
7. If first-time, auto-creates account with random username and placeholder email

The phone-to-email mapping uses an HMAC digest so the raw phone number is never stored in the email column:

```typescript
// apps/server/src/lib/auth.ts — phoneNumber plugin
signUpOnVerification: {
  getTempEmail: (phoneNumber) =>
    buildPhoneCompatibilityEmail(phoneNumber, env.BETTER_AUTH_SECRET),
  getTempName: () => buildRandomPhoneUserName(),
},
```

## Verification

1. `pnpm dev:native+server`
2. Open the app, navigate to sign-in, select the phone tab
3. Enter a valid mainland China number (11 digits after +86)
4. Verify OTP arrives via Aliyun and the code screen appears
5. Enter the code, confirm sign-in completes and navigates home

## Common Mistakes

- **Missing `ALIBABA_CLOUD_ACCESS_KEY_SECRET` in `.dev.vars`** -- the SMS provider is created lazily, so no startup error occurs. The error only appears when you try to send an OTP.
- **Using a non-China phone number** -- only `+86` numbers are supported. The validator rejects everything else silently.
- **Aliyun SMS template not approved** -- new templates need manual approval in the Aliyun console, which can take hours. Test with an already-approved template first.
- **Rate limit hit during development** -- the server allows only 3 send-otp requests per minute per IP. Wait 60 seconds between retries.
