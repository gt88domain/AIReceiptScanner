# Product Profiles

Product Profiles are additive, provider-secret-free feature starting points for
new EasyStarter products. They do not modify `appConfig`, remove source files,
create Cloudflare resources, generate Wrangler configuration, or deploy a
Worker. Existing projects can continue to call `resolveProductFeatures()`.

```ts
import { createProductProfile } from "@repo/app-config";

const features = createProductProfile("directory", { storage: true });
```

The override is always checked by the same dependency matrix as direct
configuration. The matrix enforces Billing → Jobs, purchases → Credits and
Billing on the same platform, and native capabilities → Mobile. Free Credits
without Billing remain valid; Storage, Admin, and Jobs may be used separately.

| Profile | Intended use | Enabled infrastructure |
| --- | --- | --- |
| `full-saas` | AI SaaS, subscriptions, Credits, uploads | D1, R2, Queue, DLQ, Cron |
| `account-app` | accounts, saved/private content, uploads | D1, R2, Queue, DLQ, Cron |
| `directory` | directory, content, SEO, administration | D1, Queue, DLQ, Cron |
| `directory-lite` | directory or content with Admin and no async work | D1 |

`directory` intentionally remains Jobs-on for imports and maintenance.
`directory-lite` is the supported Jobs-off profile: it does not require a
Queue, DLQ, Cron trigger, Jobs SQL, or a Job Service. The Worker exports only
`fetch` in that mode, and Jobs Admin operations fail closed without reading a
Jobs table. Existing job tables are not removed or migrated.

The resource list is derived from the feature contract: every profile requires
D1; Storage adds R2; Jobs adds Queue, DLQ, and Cron. Profiles publish that
derived list as metadata but never create resources.

Each profile has server and web examples in
[`template-kit/profiles`](../template-kit/profiles). They contain only
`replace-*` identifiers and the zero D1 UUID. Copy them manually and replace
the placeholders only after creating the intended resources. The examples are
not an installer.

Run the repository-only structural check with:

```bash
pnpm profiles:check
```

Run production build proof for all four profiles with:

```bash
pnpm profiles:build
```

Each profile build receives `EASYSTARTER_PROFILE_BUILD` only at bundle time,
writes output to a system temporary directory, prints its descriptor checksum,
and cleans that directory after completion. The matrix builds the Server with
workspace configuration bundled, builds Web with the same profile feature gates,
and enforces the unchanged public-entry gzip budgets. It then runs Wrangler
`deploy --dry-run` against each profile's Server and Web example, using the
compiled temporary Worker output. It does not deploy, create Cloudflare
resources, change a profile file, or modify `product-config.ts`.

Production safety validation evaluates only enabled features. Disabled Jobs does
not require Queue, DLQ, Cron, `JOB_QUEUE`, or `JOB_QUEUE_DLQ_NAME`; stale Jobs
bindings produce a warning. Disabled Billing does not require payment-provider
secrets, disabled Storage does not require R2, disabled Mobile does not require
RevenueCat, and disabled Admin does not require `ADMIN_EMAILS`. It still
requires the core D1, Worker, URL, API service, and Better Auth configuration.

Profiles describe infrastructure Features only. Product-facing metadata, auth
method selection, email capabilities, storage selection, membership, and credit
catalogs live in `packages/app-config/src/product-config.ts`. Resolver types,
feature dependency rules, and profiles remain protected platform code. Email is
independent of the profile resource list: disable it with the documented email
contract when a product has no outbound-mail need.

Web build verification is deliberately separate from infrastructure profiles.
`apps/web/content-surface.profile.json` declares whether a product emits a
static or runtime sitemap and whether it retains the template's development
gallery. A runtime sitemap still needs a product-owned deployed smoke check;
the repository check cannot validate D1-backed URLs from build artifacts.
