## 1. Server - Better Auth Email OTP

- [x] 1.1 Confirm `better-auth@1.6.9` `emailOTP` and `emailOTPClient` method names from local type files before implementation.
- [x] 1.2 Add `emailOTP()` to `apps/server/src/lib/auth.ts` with `disableSignUp: false`, `otpLength: 6`, `expiresIn: 300`, `allowedAttempts: 3`, and `storeOTP: "hashed"`.
- [x] 1.3 Wire `sendVerificationOTP` to a project email sender for `type: "sign-in"`.
- [x] 1.4 Keep existing `emailVerification.sendVerificationEmail` link behavior unchanged.
- [x] 1.5 Add auth route limits for `/email-otp/send-verification-otp` and `/sign-in/email-otp`.

## 2. Server - Email Template And i18n

- [x] 2.1 Add a React Email OTP template under `apps/server/src/emails/templates`.
- [x] 2.2 Add an email OTP sender under `apps/server/src/emails/senders` and export it from `apps/server/src/emails/index.ts`.
- [x] 2.3 Add `server.email.otp` i18n messages for `en`, `zh`, and `jp`.
- [x] 2.4 Manually request an OTP in local dev and verify the email provider receives the expected subject, code, expiry, and app name.

## 3. Web Client

- [x] 3.1 Register `emailOTPClient()` in `apps/web/src/lib/auth/auth-client.ts` alongside `phoneNumberClient()`.
- [x] 3.2 Update the email sign-in area to preserve password login and add an OTP mode.
- [x] 3.3 Implement the email OTP request step using `authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" })`.
- [x] 3.4 Implement the email OTP verification step using `authClient.signIn.emailOtp({ email, otp })`.
- [x] 3.5 Keep the email address in component state rather than route search params.
- [x] 3.6 Add resend cooldown behavior matching the phone OTP deadline-based countdown.
- [x] 3.7 Add Web i18n messages for OTP mode, code sent, resend, change email, and validation copy in `packages/i18n/src/messages/web/{en,zh,jp}.json`.

## 4. Native Client

- [x] 4.1 Register `emailOTPClient()` in `apps/native/lib/auth/auth.client.ts`.
- [x] 4.2 Add Native email OTP request and verification screens/forms using existing auth styling and routing patterns.
- [x] 4.3 Refresh the Native auth session after successful email OTP sign-in.
- [x] 4.4 Add Native i18n messages if Native auth messages are separate from Web messages.

## 5. Verification

- [x] 5.1 Run `pnpm check-types` because this change touches shared auth types, server, Web, Native, and i18n.
- [x] 5.2 Run `pnpm dev:web+server` and complete a Web email OTP sign-in for an existing account.
- [x] 5.3 Verify an unknown email OTP request sends a code, creates a verified user after correct OTP verification, and receives signup credits after the first credit balance read.
- [x] 5.4 Verify wrong, expired, and over-attempted OTPs show errors and do not create sessions.
- [x] 5.5 Smoke-test existing email/password login, phone OTP login, and social login entry points for regressions.
- [x] 5.6 If the OpenSpec CLI is available later, run `openspec validate email-otp-login --strict --no-interactive`.
