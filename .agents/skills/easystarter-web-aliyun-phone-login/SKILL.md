---
name: easystarter-web-aliyun-phone-login
description: Configure Alibaba Cloud phone SMS OTP login for EasyStarter Web. Use when the user mentions phone login, SMS OTP, phone verification, Aliyun SMS, Alibaba Cloud SMS, Dypnsapi, phone number sign-in, China phone login, SMS provider, ALIBABA_CLOUD_ACCESS_KEY_ID, or asks "how do I add phone login", "set up SMS auth", "configure Aliyun SMS", or "phone OTP not working".
---

# EasyStarter Web Aliyun Phone Login

Phone login uses Alibaba Cloud's Dypnsapi service which handles both OTP generation and verification server-side. The implementation uses raw `fetch` + Web Crypto (ACS3-HMAC-SHA256) instead of the official SDK because the `@alicloud/*` SDK depends on Node's `https.request` and is incompatible with the Cloudflare Workers runtime.

**Important**: The current Aliyun SMS provider only supports mainland China phone numbers (`+86`). It rejects all other country codes.

## Decision Tree

- **Enable phone login from scratch** -> Section 1 (config) + Section 2 (credentials) + Section 3 (RAM permissions)
- **Phone login enabled but OTP not arriving** -> Section 4 (common mistakes)
- **Change OTP length/expiry/cooldown** -> Section 1 (app-config OTP settings)
- **Support non-China phone numbers** -> Not supported by current Aliyun provider. Would need a new SMS provider in `apps/server/src/sms/providers/`.

## Section 1: App Config

Enable SMS auth and configure OTP settings in `packages/app-config/src/app-config.ts`:

```typescript
// packages/app-config/src/app-config.ts
common: {
  auth: {
    methods: {
      smsEnabled: true,  // Controls phone login UI tab visibility
    },
    otp: {
      sms: {
        otpLength: 6,
        expiresInSeconds: 300,
        resendCooldownSeconds: 60,
      },
    },
  },
  sms: {
    provider: "aliyun",  // Only provider currently implemented
  },
},
```

The `smsEnabled` flag flows to the Web UI via `web-config.ts` -- when `true`, the phone sign-in tab appears in the login form. When `false`, the tab disappears but the server-side provider code stays intact.

## Section 2: Environment Variables

| Variable | Where | Scope |
|----------|-------|-------|
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | `apps/server/.dev.vars` + `.env.production` | **Secret** |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | `apps/server/.dev.vars` + `.env.production` | **Secret** |

Both are server-side secrets. Never put them in `wrangler.jsonc` vars or Web env files.

The SMS provider factory reads them at runtime:

```typescript
// apps/server/src/sms/index.ts
case "aliyun":
  return createAliyunSmsProvider({
    accessKeyId: env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
  });
```

If either key is missing, the provider constructor throws immediately:

```typescript
// apps/server/src/sms/providers/aliyun.ts
if (!options.accessKeyId) {
  throw new Error("ALIBABA_CLOUD_ACCESS_KEY_ID is not configured");
}
if (!options.accessKeySecret) {
  throw new Error("ALIBABA_CLOUD_ACCESS_KEY_SECRET is not configured");
}
```

## Section 3: Alibaba Cloud RAM Permissions

The RAM user needs these managed policies:
- `AliyunDypnsReadOnlyAccess`
- `AliyunDypnsFullAccess`

Create a RAM user at [RAM Console](https://ram.console.aliyun.com/users), generate an AccessKey pair, and attach both policies.

## Section 4: Built-In Provider Parameters

These constants are hard-coded in `apps/server/src/sms/providers/aliyun.ts` and should not be changed unless explicitly asked:

```typescript
const ALIYUN_SMS_HOST = "dypnsapi.aliyuncs.com";
const ALIYUN_SMS_VERSION = "2017-05-25";
const ALIYUN_SMS_SIGN_NAME = "速通互联验证码";
const ALIYUN_SMS_TEMPLATE_CODE = "100001";
const ALIYUN_SMS_CODE_LENGTH = 6;
const ALIYUN_SMS_VALID_TIME = 300;  // 5 minutes
const ALIYUN_SMS_INTERVAL = 60;     // Resend cooldown
```

The `SIGN_NAME` and `TEMPLATE_CODE` must match what is configured in the Alibaba Cloud SMS console. If the user has a different sign name or template, these constants need updating.

## Section 5: Phone Number Validation

The provider only accepts mainland China numbers:

```typescript
// apps/server/src/sms/providers/aliyun.ts
export function isAliyunSmsSupportedPhoneNumber(phoneNumber: string) {
  return CN_PHONE_NUMBER_REGEX.test(phoneNumber);
}
```

Numbers are normalized from E.164 (`+8613812345678`) to Aliyun's format (country code `86`, phone `13812345678`):

```typescript
function normalizeMainlandChinaPhoneNumber(phoneNumber: string) {
  if (!isAliyunSmsSupportedPhoneNumber(phoneNumber)) {
    throw new Error(`Aliyun SMS only supports mainland China phone numbers: ${phoneNumber}`);
  }
  return {
    countryCode: ALIYUN_SMS_COUNTRY_CODE,
    phoneNumber: phoneNumber.slice(CN_DIAL_PREFIX.length),
  };
}
```

## Verification

1. Set both `ALIBABA_CLOUD_ACCESS_KEY_*` vars in `apps/server/.dev.vars`
2. Ensure `smsEnabled: true` in app-config
3. `pnpm dev:web+server`
4. Navigate to sign-in, select the phone tab
5. Enter a mainland China phone number and request OTP
6. Check server console for Aliyun API errors if OTP does not arrive
7. Verify the code and confirm sign-in completes

## Common Mistakes

- **Using a non-China phone number** -- The Aliyun provider rejects all non-`+86` numbers with `"Aliyun SMS only supports mainland China phone numbers"`. This is by design, not a bug.
- **Wrong `ALIYUN_SMS_SIGN_NAME` or `ALIYUN_SMS_TEMPLATE_CODE`** -- These must match exactly what is approved in the Alibaba Cloud SMS console. A mismatch produces an `isv.SMS_SIGNATURE_ILLEGAL` or template error from Aliyun.
- **Putting Aliyun keys in `wrangler.jsonc` vars** -- These are secrets. They go in `.dev.vars` and production secrets only.
- **Enabling SMS in config but forgetting the access keys** -- The phone tab appears in the UI, but clicking "send code" produces a server error. Always set both config flag AND credentials.
- **Confusing OTP settings** -- `expiresInSeconds` in app-config controls the client-side display. The actual server-side OTP validity is controlled by `ALIYUN_SMS_VALID_TIME` (300s) in the provider. Keep them aligned.
- **Rate limiting not matching** -- `resendCooldownSeconds` in app-config (60s) and `ALIYUN_SMS_INTERVAL` (60s) must match. If the client allows resend before the server interval, the Aliyun API will reject the duplicate send.
