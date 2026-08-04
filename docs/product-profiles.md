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

All three official profiles keep Jobs enabled in v0.4.1. Jobs are not
physically unregistered by a Profile: conditional router/context/Worker
composition is deliberately outside this release. Consequently, production
preflight explicitly rejects `jobs: false` until that runtime work is complete.

Each profile has server and web examples in
[`template-kit/profiles`](../template-kit/profiles). They contain only
`replace-*` identifiers and the zero D1 UUID. Copy them manually and replace
the placeholders only after creating the intended resources. The examples are
not an installer.

Run the repository-only structural check with:

```bash
pnpm profiles:check
```

Production safety validation evaluates only enabled features. For example,
disabled Billing does not require payment-provider secrets, disabled Storage
does not require R2, disabled Mobile does not require RevenueCat, and disabled
Admin does not require `ADMIN_EMAILS`. It still requires the core D1, Worker,
URL, API service, and Better Auth configuration.
