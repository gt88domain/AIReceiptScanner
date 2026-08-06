# v0.4.10 identity-boundary rollout

## Scope and migration decision

v0.4.10 upgrades Better Auth from `1.6.23` to exact `1.6.26`. The official
generator outputs were compared using the current server auth factory and were
identical. The repository's custom fields (`phoneNumber`, `deletedAt`) and
`rateLimit` mapping remain deliberate. No schema difference requires a
migration, so this release intentionally adds no `0021` migration.

The automated migration fixture creates a database at the v0.4.9 `0020` state,
seeds user, session, Google account, and rate-limit records, and proves that
the v0.4.10 schema adds no implicit migration before it reads those records.

## Deployment order

1. Run the local verification matrix, including `pnpm test` and
   `pnpm -F server test:production-config`.
2. Apply normal Worker deployment safeguards. Do not run a D1 migration for
   this release: there is no new migration file.
3. Confirm sign-up, password sign-in, session refresh, sign-out, and the
   enabled OAuth callback with staging credentials. Confirm rate limiting is
   stored in the existing `rateLimit` table.
4. Check the session/current-user/admin-user responses with an intentionally
   invalid legacy `user.image`; each must return `image: null`.
5. Review Workers authentication errors and database errors after rollout. The
   change is configuration and application-code only, so rollback is a Worker
   version rollback; no data rollback is required.

## Cookie and IP policy

Production requires HTTPS for `SERVER_URL` and `WEBSITE_URL`. Cookies are
always `HttpOnly`; `Secure` follows a parsed HTTPS URL, never substring matching.
An explicit configured parent domain is used only when both public hosts are
within it. Otherwise cookies are host-only. Production trusts only
`CF-Connecting-IP`; development/test may also use `X-Real-IP`.

## Avatar policy

Profile input and Better Auth database hooks accept only HTTPS, credential-free
URLs on the exact configured remote-avatar hosts plus the parsed HTTPS Storage
public host. IP literals, loopback names, arbitrary ports, suffix lookalikes,
and unconfigured hosts become `null`. The same policy is applied to all
current-user/session/admin response paths, so old database values cannot escape
the trust boundary. URLs are never fetched or logged by this policy.

## Account-linking review

Account linking is explicitly enabled only for Google and GitHub. It rejects
different-email linking, does not allow removing every account, and does not
overwrite profile data while linking. Enabling another OAuth provider is a
product/security decision: add it to the trusted-provider list, verify its
subject identifier semantics, test the callback/link path, and rerun the
duplicate audit before deployment.

Run the audit only against a local SQLite copy:

```sh
pnpm --filter server audit:auth-accounts -- /absolute/path/to/local.sqlite
```

It is read-only, never loads production credentials, and emits only Provider
IDs plus truncated hashes. `[AUTH_ACCOUNT_DUPLICATES_FOUND]` requires manual
data review before any future uniqueness constraint is considered. Repeated
provider records for one user are warnings, not automatic destructive cleanup.

## Stable production-preflight codes

- `AUTH_PUBLIC_URL_INVALID`
- `AUTH_PRODUCTION_URL_NOT_HTTPS`
- `AUTH_COOKIE_DOMAIN_INVALID`
- `AUTH_COOKIE_DOMAIN_TOO_BROAD`
- `AUTH_AVATAR_HOST_INVALID`
- `AUTH_AVATAR_STORAGE_HOST_NOT_HTTPS`
- `AUTH_ACCOUNT_SCHEMA_MISMATCH`
- `AUTH_ACCOUNT_DUPLICATES_FOUND`

The final two codes come from the local read-only audit. They intentionally do
not make a production deployment command access or inspect a production D1
database.
