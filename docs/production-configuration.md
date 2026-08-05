# Production configuration

EasyStarter deliberately ships with deployable-looking placeholders, not a deploy target. A production deploy fails until the API and Web Worker identities below are configured consistently.

## Files and ownership

| File | Purpose | Commit it? |
| --- | --- | --- |
| `apps/server/wrangler.jsonc` | API Worker identity, D1, R2, Queue bindings, public URLs, OAuth client IDs | Yes, after replacing placeholders |
| `apps/web/wrangler.jsonc` | Web Worker identity, custom domain, API service binding, public URLs | Yes, after replacing placeholders |
| `apps/server/.env.production` | API Worker secrets and a local copy of resource identities for the preflight | No |
| `apps/web/.env.production` | Build-time public URLs; must match Web Worker variables | No |
| `apps/server/.production-safety.env` | Exact deploy target allowlist | No |

For Server local development use `apps/server/.dev.vars` (Wrangler loads it directly). For Web local development use `apps/web/.env.development`. Their `.example` files are safe starter values; production examples contain explicit values that must be replaced.

## Setup

1. Replace every `replace-*`, `*.example`, and all-zero D1 value in both `wrangler.jsonc` files with one production target.
2. Create the D1 database, R2 bucket, job queue, and DLQ named by the API Worker configuration. The Queue consumer must point to that DLQ.
3. Create the three untracked files from their examples and give all shared identifiers exactly the same values as the Worker configuration.
4. Set runtime secrets in `apps/server/.env.production`. `ADMIN_EMAILS` and `BETTER_AUTH_SECRET` are always required. `EMAIL_FROM` is the verified production sender used by Resend.
5. If app configuration enables a payment provider or OAuth provider, supply its production secrets and client identifiers. Stripe needs an `sk_live_` secret and distinct, non-test production price IDs.
6. To challenge Contact and Newsletter submissions, set both `VITE_TURNSTILE_SITE_KEY` in the Web Worker/public build config and `TURNSTILE_SECRET_KEY` in the Server Worker secrets. The preflight rejects either value on its own.
7. Run `pnpm verify:production-config`; only then upload secrets and deploy.

```bash
cp apps/server/.env.production.example apps/server/.env.production
cp apps/server/.production-safety.example apps/server/.production-safety.env
cp apps/web/.env.production.example apps/web/.env.production

# After replacing every placeholder in both Worker configurations and env files:
pnpm verify:production-config
pnpm --filter server secrets:bulk:production
pnpm deploy
```

`pnpm deploy:server`, `pnpm deploy:web`, and `pnpm deploy` all run the same validation first. Development deploy commands remain intentionally separate.

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
- A production Resend sender on a placeholder or local domain.

The check is intentionally local: CI exercises its failure cases without requiring production secrets. Run it from an approved deploy environment that has the real, untracked values.

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
