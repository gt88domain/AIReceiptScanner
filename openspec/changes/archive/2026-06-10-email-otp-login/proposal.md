# Change: Add email OTP login

## Why

EasyStarter currently supports email/password, OAuth, and phone OTP sign-in. Email OTP gives email users a passwordless login and registration path without requiring SMS delivery, and it fits the existing Better Auth, React Email, Resend, and D1-backed verification stack.

## What Changes

- Enable Better Auth `emailOTP()` on the server and `emailOTPClient()` on web and native auth clients.
- Add a localized transactional email template and sender for one-time sign-in codes.
- Configure email OTP for sign-in and first-time registration: 6 digits, 5-minute expiry, hashed storage, limited attempts, and route-level throttling.
- Keep current email/password sign-up verification link flow unchanged.
- Add Web sign-in UI for requesting and verifying an email OTP while preserving the existing password form.
- Add Native auth client support and matching Native email OTP screens if this change is implemented cross-platform.
- Reuse the existing Better Auth `verification` table; no new database table or migration is expected.

## Capabilities

- `server-auth`
- `web-authentication`
- `native-authentication`

## Impact

- Affected specs: `server-auth`, `web-authentication`, `native-authentication`
- Affected code:
  - `apps/server/src/lib/auth.ts`
  - `apps/server/src/emails/index.ts`
  - `apps/server/src/emails/senders/*`
  - `apps/server/src/emails/templates/*`
  - `packages/i18n/src/messages/server/{en,zh,jp}.json`
  - `apps/web/src/lib/auth/auth-client.ts`
  - `apps/web/src/components/auth/sign-in-form.tsx`
  - `apps/web/src/components/auth/email/*`
  - `packages/i18n/src/messages/web/{en,zh,jp}.json`
  - `apps/native/lib/auth/auth.client.ts`
  - `apps/native/app/(auth)/*`
  - `apps/native/components/auth/*`
  - `packages/i18n/src/messages/native/{en,zh,jp}.json`
