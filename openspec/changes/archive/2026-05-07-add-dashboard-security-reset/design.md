## Context
Add a dashboard security page that lets users request a password reset email, plus a set-password flow for social-login accounts without a password. Email content must be localized and sent from the server using Better Auth.

## Goals / Non-Goals
- Goals: Provide dashboard entry points for password reset and set-password; send localized reset emails.
- Non-Goals: Redesign authentication flows outside the reset flow.

## Decisions
- Decision: Use Better Auth's reset password flow to generate and send reset emails server-side.
- Decision: Provide a set-password form at a dedicated Security sub-route.
- Decision: Use existing i18n messages for subject/body with locale derived from the request, with a default fallback locale.

## Risks / Trade-offs
- Locale mismatch between UI and email if locale resolution is inconsistent; mitigate by passing locale from the UI request.

## Migration Plan
No data migration required.

## Open Questions
- None.

## Assumptions
- Security page route is `/settings/security` with locale prefixes.
- Set-password route is `/settings/security/set-password`.
- Supported locales are `en`, `zh`, `jp`.
- Dashboard navigation includes a Security entry.
