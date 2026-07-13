# Change: Add phone number authentication

## Why
EasyStarter currently depends on email/password and OAuth for sign-in. Phone number plus SMS OTP is a first-class login path for mobile users and China-based deployments, and it also covers users who do not want to provide an email address at sign-in time.

## What Changes
- Enable Better Auth `phoneNumber()` on the server and `phoneNumberClient()` on web and native auth clients.
- Add `phoneNumber` and `phoneNumberVerified` columns to the `user` table with a Drizzle migration.
- Introduce a pluggable `SmsProvider` abstraction with Alibaba Cloud Dypns as the default implementation.
- Treat email as optional at the product level for phone-only sign-up, while keeping an internal compatibility email for Better Auth persistence.
- Add phone sign-in and OTP verification UI on web and native, including a 60-second resend cooldown in the client.
- Update auth-related account surfaces so phone-only users do not see an internal compatibility email or email-reset action.
- Add Alibaba Cloud AccessKey env vars in tracked example/config files.

## Impact
- Affected specs: `server-auth`, `web-authentication`, `native-authentication`
- Affected code:
  - `apps/server/src/lib/auth.ts`
  - `apps/server/src/index.ts`
  - `apps/server/src/db/schema/auth.ts`
  - `apps/server/src/sms/*`
  - `apps/server/src/db/migrations/*`
  - `apps/server/wrangler.jsonc`
  - `apps/server/.dev.vars.example`
  - `apps/server/.env.production.example`
  - `apps/web/src/lib/auth/auth-client.ts`
  - `apps/web/src/components/auth/sign-in-form.tsx`
  - `apps/web/src/components/auth/phone-sign-in-form.tsx`
  - `apps/web/src/components/auth/phone-otp-form.tsx`
  - `apps/web/src/components/shared/user-info.tsx`
  - `apps/web/src/routes/_authed/(dashboard)/settings/security.tsx`
  - `apps/native/lib/auth/auth.client.ts`
  - `apps/native/components/auth/sign-in-form.tsx`
  - `apps/native/components/auth/phone-sign-in-form.tsx`
  - `apps/native/components/auth/phone-otp-form.tsx`
  - `apps/native/app/(tabs)/(profile)/index.tsx`
  - `apps/native/app/(tabs)/(profile)/security.tsx`
  - `packages/i18n/src/messages/web/{en,zh,jp}.json`
  - `packages/i18n/src/messages/native/{en,zh,jp}.json`
  - `packages/i18n/src/messages/common/{en,zh,jp}.json`
