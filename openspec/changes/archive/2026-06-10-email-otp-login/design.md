## Context

EasyStarter runs authentication through Better Auth on Cloudflare Workers using a Drizzle adapter backed by D1. The repository already has:

- `emailAndPassword` and `emailVerification` configured in `apps/server/src/lib/auth.ts`
- React Email + Resend sender infrastructure under `apps/server/src/emails`
- a Better Auth `verification` table in `apps/server/src/db/schema/auth.ts`
- Web email/password forms and phone OTP forms under `apps/web/src/components/auth`
- Native auth provider/session handling built around the Better Auth Expo client

The installed `better-auth` package is `1.6.9` and exposes `emailOTP` / `emailOTPClient`.

## Goals / Non-Goals

- Goals:
  - Add email OTP sign-in and first-time registration without disturbing email/password, OAuth, or phone OTP flows
  - Keep all session creation inside Better Auth
  - Send localized OTP emails through the existing email provider layer
  - Avoid storing plaintext OTP values
  - Keep email addresses out of URLs and browser history during OTP verification
  - Cover Web first and keep Native support aligned with the same auth backend
- Non-Goals:
  - Replace existing email/password sign-up or email verification links
  - Add OTP-based password reset
  - Add a new database table or custom session issuer
  - Add tests unless explicitly requested

## Decisions

### 1. Use Better Auth email-otp plugin end to end

- Server imports `emailOTP` from `better-auth/plugins/email-otp`.
- Web and Native clients import `emailOTPClient` from `better-auth/client/plugins`.
- The send endpoint is Better Auth's `/email-otp/send-verification-otp`.
- The login endpoint is Better Auth's `/sign-in/email-otp`.
- No custom Hono auth route should issue sessions.

### 2. Allow passwordless email OTP registration

- Configure `disableSignUp: false`.
- When a user requests an OTP for an unknown email with `type: "sign-in"`, Better Auth sends a code.
- When the unknown email verifies the correct code through `/sign-in/email-otp`, Better Auth creates a new user, marks `emailVerified: true`, and creates a session.
- Web and Native clients pass a default display name derived from the email local-part so first-time OTP users are not created with an empty name.
- Signup credits remain lazy and idempotent through the existing credits service; the new OTP-created user qualifies because the email is verified by Better Auth.

### 3. Preserve existing email verification behavior

- Keep `overrideDefaultEmailVerification` unset or `false`.
- Continue using the current sign-up verification link email for `emailVerification.sendVerificationEmail`.
- The OTP template is only for `type: "sign-in"` in this change.

### 4. Keep OTP storage and throttling explicit

- Use `otpLength: 6`.
- Use `expiresIn: 300`.
- Use `allowedAttempts: 3`.
- Use `storeOTP: "hashed"` so D1 does not persist plaintext codes.
- Use rotate-on-resend behavior; hashed OTPs cannot safely support reuse.
- Add route-level throttles similar to phone auth:
  - `/email-otp/send-verification-otp`: 3 requests per minute per IP
  - `/sign-in/email-otp`: 10 attempts per minute per IP
  - `/email-otp/check-verification-otp` and `/email-otp/verify-email`: keep covered if enabled by plugin defaults, but do not build UI against them for sign-in

### 5. Send OTP emails through the existing email layer

- Add a React Email template for email OTP.
- Add a sender such as `sendEmailOtp` / `sendEmailOtpFromRequest`.
- Reuse `withLocale(request, sender)` so `accept-language` drives server email copy.
- Add `server.email.otp` messages for `en`, `zh`, and `jp`.
- The email should include the code, expiry window, app name, and an ignore message.

### 6. Web UX keeps password login and adds OTP mode

- Keep the existing top-level email/phone tabs.
- Inside the email tab, provide a compact password/OTP mode switch.
- The OTP flow stays inside the sign-in page component state instead of placing the email in query params.
- Step 1: enter email and request code through `authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" })`.
- Step 2: enter 6-digit code and sign in through `authClient.signIn.emailOtp({ email, otp })`.
- On success, show the existing success toast and navigate to `/dashboard`.
- Add a 60-second resend cooldown keyed by a deadline, matching the improved phone OTP countdown pattern.

### 7. Native follows the same backend contract

- Register `emailOTPClient` in the Native Better Auth client.
- Add Native screens/forms only after confirming the Web flow and shared backend behavior.
- On successful OTP sign-in, refresh the auth provider session and store cookies using the existing Expo Better Auth client behavior.

## Risks / Trade-offs

- Passwordless email registration sends OTPs to unknown emails, so route-level throttling and attempt limits are part of the abuse boundary.
- Hashed OTP storage means resending rotates the code; users may have multiple emails and must use the latest code.
- If the login page grows too dense, the email tab may need a small internal segmented control rather than another full tab.
- Native cookie/session behavior must be verified separately from Web.

## Migration Plan

- No schema migration is expected because the existing Better Auth `verification` table stores OTP records.
- Existing users, sessions, passwords, OAuth accounts, and phone users remain unchanged.

## Open Questions

- Should email OTP later replace the current password reset link flow with an OTP reset flow?
