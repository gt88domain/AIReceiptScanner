# Change: Add dashboard security page with password reset

## Why
Users need a self-serve way to request a password reset from the dashboard, plus a way to set a password for social-login accounts, with localized email content.

## What Changes
- Add a dashboard Security page with a reset password request flow and a set-password flow.
- Send reset password emails via Better Auth on the server.
- Localize the reset password email subject and body.

## Impact
- Affected specs: reset-password
- Affected code: apps/web, apps/server, packages/i18n
