## Context
EasyStarter runs auth on Cloudflare Workers with Better Auth and a Drizzle-backed D1 database. The phone-number plugin fits the existing stack, but this repo has a few concrete constraints that shape the design:

- the `user` table currently requires a unique non-null `email`
- `createAuth()` currently receives only `D1Database`, so Worker `waitUntil` is not wired into Better Auth background tasks
- tracked env files are `wrangler.jsonc`, `.dev.vars.example`, and `.env.production.example`
- current web and native forgot-password flows are email-based

## Goals / Non-Goals
- Goals:
  - Add phone OTP sign-in and verification on web and native without disturbing email/social flows
  - Support phone-only sign-up through Better Auth `signUpOnVerification` without requiring the user to provide an email
  - Use Alibaba Cloud Dypns as the default SMS transport in a Workers-safe way
  - Keep SMS dispatch off the request critical path on Cloudflare Workers
  - Keep internal compatibility email values out of user-facing auth/account surfaces
- Non-Goals:
  - Add a bind-phone or merge-account flow for existing users
  - Replace current email-based forgot-password UI in this change
  - Add phone password-reset flows or UI in this change
  - Redesign profile surfaces that currently display the stored email field

## Decisions

### 1. Use Better Auth phone-number plugin end to end
- Server uses `phoneNumber(...)` from `better-auth/plugins`.
- Web and native clients register `phoneNumberClient()` from `better-auth/client/plugins`.
- Existing email/password and social providers stay enabled.

### 2. Treat email as optional for the product and compatible for Better Auth internals
- Add nullable `phoneNumber` and `phoneNumberVerified` fields to `apps/server/src/db/schema/auth.ts`.
- Better Auth core user schema and route types currently require `email: string`, so this proposal keeps the persisted `email` column populated for compatibility.
- For phone-only sign-up, configure `signUpOnVerification.getTempEmail()` to generate a reserved placeholder email such as `phone-8613800138000@easystarter.invalid`.
- The user does not provide that email, and auth/account surfaces treat it as an internal value.
- Placeholder emails satisfy the schema and stay globally unique; a bind-email flow remains a follow-up capability.

### 3. Validate input as mainland-China-only E.164
- Server-side validation accepts only mainland China numbers in E.164 format: `+86` plus 11 digits.
- CN numbers keep the `+86` prefix at the API boundary and are normalized only when building the Alibaba Cloud request.
- This change does not introduce `libphonenumber` or another new parsing dependency.

### 4. Add a pluggable SMS provider with Alibaba Cloud as default
- Keep `apps/server/src/sms/types.ts` as the provider contract:

```ts
export interface SmsProvider {
  send(to: string, body: string): Promise<void>
}
```

- Create `AliyunSmsService` as the default implementation and keep `SmsProvider.send()` for the send path.
- Use `SendSmsVerifyCode` with fixed parameters:
  - `SignName = "速通互联验证码"`
  - `TemplateCode = "100001"`
  - `TemplateParam = {"code":"##code##","min":"5"}`
  - `CodeLength = 6`
  - `CodeType = 1`
  - `DuplicatePolicy = 1`
  - `Interval = 60`
  - `ValidTime = 300`
- Use `CheckSmsVerifyCode` for verification and treat `VerifyResult = PASS` as success.

### 5. Wire non-blocking SMS sending through Better Auth background tasks
- Better Auth already wraps `sendOTP` and `sendPasswordResetOTP` in `runInBackgroundOrAwait(...)`.
- To keep SMS sending off the response path, extend `createAuth()` to accept an optional background-task handler and pass it into `advanced.backgroundTasks.handler`.
- The `/api/auth/*` Hono route passes `c.executionCtx.waitUntil.bind(c.executionCtx)` when creating the auth instance for request handling.
- Middleware and other non-auth contexts can continue calling `createAuth(c.env.DB)` without a background-task handler.

### 6. Keep OTP controls explicit and internally consistent
- Better Auth plugin configuration:
  - `otpLength: 6`
  - `expiresIn: 300`
  - `signUpOnVerification` enabled
- `sendOTP` ignores Better Auth's generated code and delegates to Alibaba Cloud.
- `verifyOTP` delegates to `CheckSmsVerifyCode`, so Alibaba Cloud becomes the only source of truth for code correctness and expiry.
- Better Auth phone-number plugin still applies its built-in route rate limit for `/phone-number/*`.
- Client UI adds a 60-second resend cooldown to prevent accidental spam and match user expectations.
- Storage-backed per-phone or per-IP throttling is deferred to a follow-up change.

### 7. Keep phone password reset out of scope
- Do not configure `sendPasswordResetOTP`.
- Existing email-based forgot-password screens on web and native remain unchanged.
- Better Auth continues to expose its built-in phone password-reset routes, but this change does not integrate or use them.

### 8. Hide compatibility emails from user-facing account surfaces
- Web and native account surfaces that currently display `user.email` directly must treat phone-only placeholder emails as internal data.
- User-facing identity components should prefer a real email when present and fall back to phone number or no secondary line when the account is phone-only.
- Email-reset actions remain available only when the signed-in user has a real email-based reset path.

## Risks / Trade-offs
- Phone-only users will carry a placeholder email in storage, so this change must update account surfaces that currently print `user.email` directly.
- Alibaba Cloud verification is authoritative for OTP correctness and expiry, so support diagnosis needs provider-level request and response errors.
- Mainland-China-only delivery is transport-specific, so keeping that rule isolated inside the SMS module is important for future provider swaps.

## Migration Plan
- Add the two new user columns through a standard Drizzle migration.
- No data backfill is required.
- Existing email/social users remain valid because both new columns are nullable.

## Open Questions
- Should a future profile flow allow converting a placeholder email into a verified real email without creating a second account?
