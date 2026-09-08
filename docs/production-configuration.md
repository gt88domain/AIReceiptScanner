# Production configuration

EasyStarter deliberately ships with deployable-looking placeholders, not a deploy target. A production deploy fails until the API and Web Worker identities below are configured consistently.

## Files and ownership

| File                                 | Purpose                                                                                                                                                                | Commit it?                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `apps/server/wrangler.jsonc`         | API Worker identity, D1, R2, Queue bindings, public URLs, OAuth client IDs                                                                                             | Yes, after replacing placeholders |
| `apps/web/wrangler.jsonc`            | Web Worker identity, custom domain, API service binding, public URLs                                                                                                   | Yes, after replacing placeholders |
| `apps/server/.env.production`        | API Worker secrets for the rotation/write path only; **not needed for daily deploys**                                                                                  | No                                |
| `apps/web/.env.production`           | Build-time public URLs; generated from web `wrangler.jsonc` vars at deploy (`apps/web/scripts/sync-production-env.mjs`) — a hand-maintained copy must match those vars | No                                |
| `apps/server/.production-safety.env` | Exact deploy target allowlist                                                                                                                                          | No                                |

For Server local development use `apps/server/.dev.vars` (Wrangler loads it directly). For Web local development use `apps/web/.env.development`. Their `.example` files are safe starter values; production examples contain explicit values that must be replaced.

## Setup

1. Replace every `replace-*`, `*.example`, and all-zero D1 value in both
   `wrangler.jsonc` files and the enabled payment catalogs under
   `packages/app-config/src` with one production target.
2. Create the D1 database, R2 bucket, job queue, and DLQ named by the API Worker configuration. The Queue consumer must point to that DLQ.
3. Create `apps/server/.production-safety.env` from its example and give it exactly the same Worker and host values as the Worker configurations. Create `apps/server/.env.production` only on the machine that rotates secrets.
4. Set runtime secrets in `apps/server/.env.production`. `ADMIN_EMAILS` and `BETTER_AUTH_SECRET` are always required. `EMAIL_FROM` is the verified production sender used by Resend.
5. If app configuration enables a payment provider or OAuth provider, supply
   its production secrets and client identifiers. Stripe needs an `rk_live_` or `sk_live_`
   secret and distinct, non-test production price IDs. Enabled native billing
   and credit purchases need product-owned RevenueCat IDs in
   `app-config.ts` and `product-config.ts`; preflight errors name the unresolved
   path.
6. To challenge Contact and Newsletter submissions, set both `VITE_TURNSTILE_SITE_KEY` in the Web Worker/public build config and `TURNSTILE_SECRET_KEY` in the Server Worker secrets. The preflight rejects either value on its own.
7. Run `pnpm verify:production-config`; only then upload secrets and deploy.

```bash
cp apps/server/.production-safety.example apps/server/.production-safety.env
# Rotation machine only:
cp apps/server/.env.production.example apps/server/.env.production

# After replacing every placeholder in both Worker configurations:
pnpm verify:production-config
pnpm --filter server secrets:push:production   # validates plaintext, then filtered wrangler secret bulk
pnpm deploy
```

`pnpm deploy:server`, `pnpm deploy:web`, and `pnpm deploy` all run the same
validation first. These package scripts are the only approved production
deployment entry points; do not run raw `wrangler deploy`, because it bypasses
the repository preflight. Preview deployment remains isolated behind the
explicit `deploy:preview` scripts and preview Wrangler configurations. There is
no generic development deploy command.

Before the first production launch, adopt the owner, retention, export, and
restore-rehearsal policy in [D1 backup and recovery](./d1-backup-recovery.md).

## Daily deploys need no local secrets

Wrangler cannot read secret values back — that is a security property, not a
limitation to work around. The daily preflight therefore checks **presence, not
plaintext**: it diffs the live Worker's secret names (`wrangler secret list`)
against the required-secret list derived from the product configuration plus
the base `secrets.required` declared in `apps/server/wrangler.jsonc`. Missing
secrets are errors; undeclared live secrets are warnings so removals stay
deliberate.

A machine that only deploys code needs `git clone`, `pnpm install`,
`wrangler login`, and the four-value `.production-safety.env` fuse — nothing
else; the web build env is generated from `apps/web/wrangler.jsonc` during
`pnpm deploy:web`. `apps/server/.env.production` holds plaintext secrets and is
required only on the rotation/write path: `pnpm --filter server
secrets:push:production` runs the plaintext format validation
(`secrets:check:production`) and then a **filtered** `wrangler secret bulk`
that skips empty optional keys and the preflight-only `ENVIRONMENT` marker, so
the next presence check stays clean. Do not use secret bulk as a daily deploy
step; daily deploys ship code and keep the live secrets untouched. If a local
`.env.production` happens to exist, the daily preflight validates it too, so
stale copies fail loudly instead of silently drifting.

## What the guard rejects

- Missing authentication, admin, resource, email, or enabled-provider values.

Wrangler configuration is the source of actual D1, R2, Queue, DLQ, Cron, Worker,
route, and service identities. `.production-safety.env` records only the expected
environment, Worker names, and public hosts; `.env.production` contains secrets
and environment settings, not duplicate resource IDs. `CLOUDFLARE_D1_DATABASE_ID`
is intentionally not a production-preflight input.

The preflight is feature-aware. Disabled Storage does not require R2; disabled
Jobs does not require Queue, DLQ, Cron, or `JOB_QUEUE_DLQ_NAME`; disabled Email
does not require Resend values. Residual disabled resource bindings are reported
as warnings so removals remain deliberate.

- `http`, localhost, `.example`, `example.com`, and `replace-*` production identities.
- All-zero or malformed D1 IDs, template queue/bucket/Worker names, and missing DLQ consumers.
- Web/API public URL disagreement or an `API_SERVICE` that does not target the configured API Worker.
- Stripe test secrets, test/placeholder production prices, and equal test/production Stripe price IDs.
- Template RevenueCat product IDs when native billing or native credit purchases are enabled.
- A production Resend sender on a placeholder or local domain.

The identity checks are intentionally local: CI exercises their failure cases
without requiring production secrets. The live-secret presence check runs
through `wrangler secret list` and requires a logged-in Wrangler on the
deploying machine; plaintext format validation runs only on the rotation path.

## Public form abuse controls

Turnstile is optional and verifies Contact and Newsletter submissions server-side
when both keys are configured. It does not replace rate limiting: the template's
in-process form throttle is per Worker isolate and is only a convenience guard.
Before enabling public forms in production, create Cloudflare WAF rate-limiting
rules for their paths and methods, with thresholds based on observed traffic.
Record the rule owner, exceptions, alert, and review date as described in
[the rate-limiting guide](./rate-limiting.md). Configure WAF rules manually in
the Cloudflare dashboard; this repository intentionally does not create or
mutate account-level WAF resources.
