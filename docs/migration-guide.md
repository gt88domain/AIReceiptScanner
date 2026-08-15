# Downstream migration guide

This guide plans a legacy EasyStarter adoption. It is not permission to deploy,
write production data, or delete a product workflow. Read it before the required
[`docs/migration/`](./migration/) playbook; it does not replace its six stages.

## Audit before choosing a route

In the downstream repository, record the current release or commit, enabled
capabilities, production data owner, existing `/admin` and account flows, and
every business operation that must survive. Classify each item:

| Existing concern | Target |
| --- | --- |
| Auth, billing, credits, Jobs, storage, generic account pages | Template core/platform capability |
| Overview, Analytics, Users, Audit, System | Template administration workspace |
| Payments | Admin only with web billing or credit purchases |
| Support | Admin only with Tickets |
| Product workflow or business management page | Downstream `apps/*/src/modules/<domain>` module |
| User product action | Downstream user App in `backoffice.ts` |
| Contact/enquiry | Help, or Tickets when a message lifecycle is needed |

The administration workspace supplies Overview, Analytics, Users, Audit, and
System. Payments and Support are conditional. It does not replace Domains,
Quotes, Submit, or other product operations.

Use an **in-place upgrade** when the downstream has a usable template remote
and `.template/source.json`, protected differences are small and recorded, and
D1 migration history can move forward continuously. It preserves deployment
identity and data, but needs deliberate conflict resolution.

Use a **new template baseline plus product-module move** when the legacy
repository has broad, unrecorded core edits, no credible upstream baseline, or
product code is already separable. A fresh repository still needs a data-owner,
cutover, and rollback decision; it is never permission to recreate data.

Compare protected-core overlap and `MOD-xxxx` records, product-versus-copied
template code, D1 migration continuity, and the cost of keeping two production
entry points during rollback. There is no safe automatic threshold.

For a normal in-place adoption, consume a released tag, not `template/main`:

```bash
git remote add template https://github.com/gt88domain/easystarter-template.git
git fetch template --tags
pnpm template:upgrade-check --from <current-tag> --to v0.11.0
git checkout -b chore/adopt-easystarter-v0.11.0
git merge --no-ff v0.11.0
```

`template:upgrade-check` is read-only. A missing manifest or migration conflict
is a stop signal, not a clean result. Follow [`upstream-sync.md`](./upstream-sync.md).

## Capability checklist

Resolve capabilities through application configuration. Browser hiding never
grants access.

| Capability | Enable only when | Visible effect | Runtime consequence |
| --- | --- | --- | --- |
| `admin` | A server `ADMIN_EMAILS` allowlist exists | Admin navigation for allowlisted users | Server guards remain mandatory |
| `web.billing` | Supported provider and real plans exist | Billing, Purchases, Payments | Billing needs Jobs and verified webhooks |
| `web.credits` | The product has a real credit ledger | Credits | Does not itself sell credits |
| `web.creditPurchases` | Credits are sold through web billing | Credit purchase and Payments | Requires web Credits and Billing |
| `tickets` | A user/admin message thread is needed | My Tickets and Support | Default-off; routes fail closed while disabled |
| `storage` | Product assets need authorization | No generic navigation | R2 and the assets access model required |
| `jobs` | Retryable asynchronous work is used | No generic navigation | Queue, DLQ, Cron required; Billing depends on it |

Ticket tables can be present after structural migration `0021` while Tickets is
disabled. That is immutable migration history; the runtime capability stays off.

## Product modules

Product conditions do not belong in the global sidebar. Add
`apps/web/src/modules/<domain>/backoffice.ts`, then add thin routes. User Apps
use normal routes; admin routes live below
`routes/_authed/(dashboard)/admin/(modules)/` and use
`createAdminModuleRoute()`. See [`backoffice-modules.md`](./backoffice-modules.md).

Planning examples, not migration facts:

- **url-next:** audit first. Quote, submit, review, or paid-submit workflows
  may become product modules only after their tables, data owner, and acceptance
  conditions are known.
- **AIBranding:** Domains is a likely admin module. Offers is a candidate for a
  later Offers-to-Tickets migration with fields in `metadata`; it needs a field
  map, reconciliation, and owner approval before any data change.

Never copy `aibranding-v5` code into an adoption.

## Data lifecycle and governance

Use the separation in [`apps/server/src/db/README.md`](../apps/server/src/db/README.md):

| Intent | Location | Rule |
| --- | --- | --- |
| Table/index shape | `db/migrations/` | Structural changes only |
| Valid-shape transformation | `db/data-migrations/` | Idempotent, scoped, verification query |
| Local/demo data | `db/seeds/` | Rebuildable; no production secrets |
| Derived-field population | `db/backfills/` | Resumable, remaining-row count |
| Known bad-data correction | `db/repairs/` | Incident scope, approval, before/after checks |

For every production data slice, complete:

`00-audit → 01-data-owner → 02-domain-model → 03-schema-plan → 04-security-check → 05-cutover`

Name the owner, source/target tables, safe rerun behaviour, verification query,
traffic rollback or forward fix, and cutover decision before any write. Applied
structural migrations are immutable.

Update `.template/source.json` only after the released tag is adopted and
validation passes. Each protected Core/Platform deviation needs one active
`MOD-xxxx` record. Put product behaviour in a module, not an undocumented core fork.

## Acceptance and cutover

Before a downstream PR is ready, run:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm check-types
pnpm test
pnpm build
```

`pnpm preview:backoffice` uses local D1, local accounts, and blocks email,
payments, Queue, and R2 external actions. It is a UI/authorization acceptance
aid, not a production migration test. Check intentional navigation visibility,
product module routes, and conditional Payments or Support. See
[`v0.9.0-backoffice-preview.md`](./prompts/v0.9.0-backoffice-preview.md).

Production cutover is separately owner-approved: run the downstream safety
preflight, reconcile real data, and have a rollback/forward-fix plan.

## Template delivery record

The tracked template execution packages are complete at `v0.11.0`:

| Milestone | Outcome |
| --- | --- |
| v0.9 Backoffice preview | Isolated local D1 acceptance flow |
| v1.0 Backoffice IA | User/admin navigation and visibility decisions |
| v1.1 Tickets | Optional capability-gated ticket workflow |
| v1.2 Apps/Modules | Build-time product navigation and guarded admin routes |

Downstream adoption prompts are separate planning inputs. This guide introduces
no Central work, runtime plugins, remote module loading, generic write proxy,
RBAC system, or observability product.
