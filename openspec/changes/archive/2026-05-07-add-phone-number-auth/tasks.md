## 1. Server - SMS Provider
- [x] 1.1 Replace the default SMS transport with Alibaba Cloud Dypns in `apps/server/src/sms/*`
- [x] 1.2 Update tracked env examples and `wrangler.jsonc` to use Alibaba Cloud AccessKey variables
- [x] 1.3 Switch app config defaults to `provider: "aliyun"` and `expiresInSeconds: 300`
- [x] 1.4 Simplify `SmsProvider` to `sendVerificationCode(phoneNumber)` — drop the unused message-body parameter
- [x] 1.5 Make `AliyunSmsError` carry `code`, `requestId`, and `httpStatus` for support diagnosis

## 2. Server - Better Auth plugin
- [x] 2.1 Keep Better Auth `phoneNumber()` routes and wire `sendOTP` to `SendSmsVerifyCode`
- [x] 2.2 Wire `verifyOTP` to `CheckSmsVerifyCode`
- [x] 2.3 Restrict phone auth to mainland China `+86` E.164 numbers via `isSupportedSmsPhoneNumber`
- [x] 2.4 Remove server-side phone password-reset integration from this change
- [x] 2.5 Configure per-IP rate limits for `/phone-number/send-otp` (3/min) and `/phone-number/verify` (10/min)
- [x] 2.6 Replace the plaintext phone-based placeholder email with an HMAC-SHA256 digest keyed by `BETTER_AUTH_SECRET`
- [x] 2.7 Make `phoneNumberVerified` non-nullable with default `false` to match Better Auth's boolean-column convention

## 3. Client
- [x] 3.1 Lock web + native phone-number input to mainland-China shape with a `+86` prefix addon
- [x] 3.2 Replace the 876-line country-aware `PhoneInput` with a simple prefix-locked input; delete unused helpers
- [x] 3.3 Share `getVisibleUserEmail` / `hasVisibleUserEmail` / `getVisibleUserIdentity` from `@repo/shared` instead of duplicating per app
- [x] 3.4 Rewrite the resend countdown as a single deadline-keyed interval (stops creating 60 intervals in 60 s)
- [x] 3.5 Replace `window.location.assign` with TanStack Router `navigate` on successful verify
- [x] 3.6 Use shared visible name/contact helpers for phone-only users in dashboard account surfaces
- [x] 3.7 Show phone-only users in the dashboard users table with a contact column and phone verification status
- [x] 3.8 Simplify the web security page phone-only state to the verified phone card only

## 4. Verification
- [x] 4.1 `pnpm check-types` passes
- [x] 4.2 `pnpm --filter server build` passes
- [x] 4.3 Unit tests cover `buildPhoneCompatibilityEmail`, `isPhoneCompatibilityEmail`, and Aliyun signing helpers (`percentEncode`, `toCanonicalQueryString`)
- [x] 4.4 Unit tests cover phone-only visible names and contact fallback helpers
- [ ] 4.5 Smoke-test `POST /api/auth/phone-number/send-otp` and `POST /api/auth/phone-number/verify` with configured Alibaba Cloud credentials
