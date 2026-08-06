# Better Auth 1.6.26 schema audit

## Scope and exact tooling

- Repository baseline: `v0.4.9` (`676281ab42355d2f64e6247f49142866fe148e67`).
- Runtime package before/after: `better-auth` `1.6.23` → `1.6.26`.
- CLI package: `auth` (not `@better-auth/cli`). `pnpm view` confirms that both
  `auth@1.6.23` and `auth@1.6.26` publish `auth` and `better-auth` binaries.
- `better-auth-localization@3.0.0` declares `better-auth: ^1.5.0`, so it
  remains unchanged. Existing `drizzle-orm ^0.45.2` satisfies both Better Auth
  versions' `^0.45.2` peer range.

The exact commands were:

```sh
pnpm dlx auth@1.6.23 generate --cwd apps/server --config ../../.tmp/better-auth-schema/schema-audit-config.ts --output .tmp/better-auth-schema/1.6.23/schema.ts --yes
pnpm dlx auth@1.6.26 generate --cwd apps/server --config ../../.tmp/better-auth-schema/schema-audit-config.ts --output .tmp/better-auth-schema/1.6.26/schema.ts --yes
```

The CLI parses `--config` from the supplied cwd but writes `--output` relative
to its invocation cwd. The first output was at
`.tmp/better-auth-schema/1.6.23/schema.ts`; the second was emitted at
`apps/server/.tmp/better-auth-schema/1.6.26/schema.ts`. Both directories and
the config are temporary and are removed after this audit. The audit config
calls the production `createAuth` factory with a query-free fake D1 binding,
so it uses the same Drizzle adapter, plugins, and database options without
calling a provider or D1.

## Official schema results

The 1.6.23 and 1.6.26 generated Drizzle SQLite schemas are byte-for-byte
identical. Both define `user`, `session`, `account`, `verification`, and the
database rate-limit table. Core foreign keys are `session.userId` and
`account.userId` to `user.id`, both cascade on delete. The generated relations
cover user/session/account. The generated indexes are ordinary indexes on
`session.userId`, `account.userId`, and `verification.identifier`; the only
generated unique fields are email, session token, and rate-limit key.

Critically, neither official output defines a compound index or unique index on
`account(providerId, accountId)`.

## Repository comparison and protected customizations

`apps/server/src/db/schema/auth.ts` deliberately differs from the generic CLI
output:

- User adds `phoneNumber`, `phoneNumberVerified`, and `deletedAt`.
- The rate limiter is the existing `rateLimit` model/table with its historical
  field names and `rate_limit_key_idx`, rather than the CLI's generic
  `rate_limit` suggestion.
- Existing timestamp defaults, verification nullability, and index names are
  immutable repository schema decisions; the running Drizzle adapter receives
  the repository schema explicitly.
- The repository keeps its current account index `account_user_idx`; it has no
  compound account identity index, matching the official output's absence of
  one.

The CLI output is evidence, not a file to overwrite. Replacing the repository
schema with it would remove product fields and is prohibited.

## OAuth identity contract and duplicate audit

Better Auth 1.6.26's internal adapter calls `findOAuthUser(email, accountId,
providerId)`, which looks up `account` with both `accountId` and `providerId`.
OAuth creation/linking subsequently writes those values. This is a lookup
contract, not an official schema declaration of uniqueness: the exact CLI
result and runtime schema metadata do not mark the pair unique.

The repeatable, read-only duplicate audit query is:

```sql
SELECT
  provider_id,
  account_id,
  COUNT(*) AS duplicate_count,
  COUNT(DISTINCT user_id) AS owner_count
FROM account
GROUP BY provider_id, account_id
HAVING COUNT(*) > 1;
```

It must run against the target local/production copy before any future account
constraint decision. It must report only a safe hash of provider/account IDs,
row count, and owner count; it must not print OAuth tokens or mutate data.

## Migration decision

No migration is required, and no `0021` exists. The patch-level official
schema diff is empty. In particular, the required evidence for a
`UNIQUE(provider_id, account_id)` index is absent, so adding one would violate
the repository's migration policy. A future Better Auth 1.7 audit must repeat
the exact CLI, runtime-contract, duplicate-audit, and upgrade-fixture checks.

## Relevant upstream patch notes

- 1.6.24 fixes `get-session` cache control, SQLite rate-limit migration type
  recognition, a Cloudflare/serverless request-state race, and Drizzle CLI
  generation issues.
- 1.6.25 fixes Apple OAuth PKCE and adapter model-name routing.
- 1.6.26 fixes database rate-limit cleanup and includes session/OAuth fixes;
  it does not introduce an account identity schema change.

Release-note sources: `v1.6.23...v1.6.24`, `v1.6.24...v1.6.25`, and
`v1.6.25...v1.6.26` in the upstream Better Auth GitHub release history.
