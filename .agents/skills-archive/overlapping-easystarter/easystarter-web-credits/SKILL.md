---
name: easystarter-web-credits
description: Configure the EasyStarter Web credit system. Use when the user mentions credits, credit balance, credit packages, credit consumption, idempotency key, signup grant, free credits, credit checkout, credit transactions, credit ledger, credit expiration, credit purchase, buy credits, use credits, consume credits, or asks "how do I set up credits", "enable credits", "add a credit package", "track credit usage", "credit consumption not working", or "credits expiring".
---

# EasyStarter Web Credits

Credits are a ledger-backed virtual currency system with three components: **grants** (signup bonus or purchases), **consumption** (idempotent usage), and **expiration** (daily cron job). Purchases flow through Stripe. The credit system has its own DB schema, oRPC routes, and React Query hooks.

## Decision Tree

- **Enable credits from scratch** -> Section 1 (config) + Section 2 (DB migration) + Section 3 (verify)
- **Add or change a credit package** -> Section 1 (packages config) + create matching price/product in payment provider dashboard
- **Wire credit consumption into a feature** -> Section 4 (consume API)
- **Understand signup grant** -> Section 1 (signupGrant config)
- **Debug credit issues** -> Section 5 (common mistakes)

## Section 1: Credit Config in App-Config

Credit settings live in `packages/app-config/src/app-config.ts` under `web.credits`:

```typescript
// packages/app-config/src/app-config.ts
web: {
  credits: {
    enabled: true,  // Controls credit routes and sidebar entries
    signupGrant: {
      enabled: true,
      amount: 100,           // Free credits on signup
      expiresInDays: 30,     // Grant expires after 30 days
    },
    packages: [
      {
        id: "starter",        // Stable internal ID -- orders and i18n depend on it
        amount: 100,           // Credits delivered after purchase
        web: {
          provider: "stripe",  // Must match web.payments.provider
          test: { providerPriceId: "price_1TciCP4uQgMehpGv3EK50HN9" },
          prod: { providerPriceId: "price_1TciCP4uQgMehpGv3EK50HN9" },
          currency: "usd",
          amountCents: 499,    // $4.99
          status: "active",    // "active" or "inactive"
        },
      },
      {
        id: "growth",
        amount: 500,
        web: {
          provider: "stripe",
          test: { providerPriceId: "price_1TciCw4uQgMehpGvxyfhVKud" },
          prod: { providerPriceId: "price_1TciCw4uQgMehpGvxyfhVKud" },
          currency: "usd",
          amountCents: 1999,   // $19.99
          status: "active",
        },
      },
    ],
  },
},
```

**Package IDs must be stable** -- they are stored in credit orders and referenced in i18n message files. Renaming a package ID breaks existing orders and translations.

**Signup grant** runs once per user when they first sign in. It is gated by IP/fingerprint hashing to prevent abuse:

```typescript
// credits/application/service.ts — SignupGrantRequestContext
type SignupGrantRequestContext = {
  hashSecret?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};
```

## Section 2: Database Schema

Credits use three main tables defined in `apps/server/src/db/schema/credits.ts`:

```typescript
// Ledger account with running balance
export const creditAccount = sqliteTable("credit_account", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  totalGranted: integer("total_granted").notNull().default(0),
  totalConsumed: integer("total_consumed").notNull().default(0),
  totalExpired: integer("total_expired").notNull().default(0),
  totalRevoked: integer("total_revoked").notNull().default(0),
  // ...
});

// Immutable ledger entries with remaining amounts
export const creditTransaction = sqliteTable("credit_transaction", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  amount: integer("amount").notNull(),           // Positive for grants, negative for usage
  remainingAmount: integer("remaining_amount"),   // Tracks spendable balance per grant
  sourceProvider: text("source_provider").notNull(),
  sourceType: text("source_type", { enum: CREDIT_SOURCE_TYPES }).notNull(),
  sourceId: text("source_id").notNull(),          // Idempotency key
  packageId: text("package_id"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  // ...
});
```

Source types: `"signup_grant"`, `"purchase"`, `"refund"`, `"usage"`, `"expiration"`.

After enabling credits for the first time, run the migration:
```bash
pnpm db:generate
pnpm db:push          # Dev/staging
# or
pnpm db:migrate:local # Local D1
```

## Section 3: API Routes

Credits have two sets of oRPC routes:

**Common routes** (shared by web and native) in `apps/server/src/routers/common/credits.ts`:
- `credits.listPackages({ platform: "web" })` -- list available packages
- `credits.getBalance({})` -- current account balance
- `credits.listTransactions({ page, perPage, sourceType? })` -- ledger history
- `credits.listOrders({ page, perPage })` -- purchase orders
- `credits.consume({ amount, idempotencyKey, metadata? })` -- spend credits

**Web-only routes** in `apps/server/src/routers/web/credits.ts`:
- `webCredits.createCheckoutSession({ packageId, returnUrl, provider? })` -- start purchase checkout

React Query hooks in `apps/web/src/hooks/use-credits.ts`:

```typescript
// apps/web/src/hooks/use-credits.ts
export function useCreditBalanceQuery() {
  return useQuery({
    queryKey: ["credits", "balance"],
    queryFn: () => orpc.credits.getBalance.call({}),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreditPackagesQuery() {
  return useQuery({
    queryKey: ["credits", "packages", "web"],
    queryFn: () => orpc.credits.listPackages.call({ platform: "web" }),
    staleTime: 5 * 60_000,
  });
}
```

## Section 4: Consuming Credits

Credit consumption uses an **idempotency key** to prevent double-charging:

```typescript
// Common credits router — consume endpoint
const consumeInputSchema = z.object({
  amount: z.number().int().positive(),
  idempotencyKey: z.string().min(8).max(120),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
```

**To wire consumption into a feature**:

```typescript
// Example: consume 10 credits for an AI generation
const result = await orpc.credits.consume.call({
  amount: 10,
  idempotencyKey: `ai-gen-${generationId}`,  // Unique per action
  metadata: { feature: "ai-generation", promptId: "xxx" },
});
// result.balance contains the updated balance
```

The idempotency key must be unique per logical action. If the same key is sent twice, the second call is a no-op (returns the existing transaction). This prevents double-charging on retries.

**Never subtract credits directly in UI code or by manually updating the DB.** Always use the `consume` endpoint.

## Section 5: Expiration and Maintenance

A daily cron job (configured in `apps/server/wrangler.jsonc`) runs credit maintenance:

```jsonc
// apps/server/wrangler.jsonc
"triggers": {
  "crons": ["10 16 * * *"]  // Daily at 16:10 UTC
}
```

The `runCreditMaintenance` function expires stale grants and cleans up expired orders. Signup grants expire after `expiresInDays`. Purchased credits **never expire** (their `expiresAt` is null).

## Verification

1. Ensure `web.credits.enabled: true` in app-config
2. Run DB migration if first time: `pnpm db:push`
3. Verify payment provider price IDs match actual Stripe products
4. `pnpm dev:web+server`
5. Sign up a new user -- check that signup grant credits appear
6. Navigate to credits/purchase -- buy a package via test checkout
7. Consume credits via a feature or direct API call
8. Check credits/transactions page for ledger history

## Common Mistakes

- **Renaming package IDs** -- Package IDs (`"starter"`, `"growth"`) are stored in credit orders and used as i18n keys. Renaming them breaks existing orders and translation lookups. Add new packages instead.
- **Mismatched payment provider** -- The `web.provider` in each credit package must be `"stripe"` and match `web.payments.provider`.
- **Forgetting the idempotency key in consumption** -- The `consume` endpoint requires an `idempotencyKey` (8-120 chars). Without it, the request fails validation. The key should be unique per logical action to prevent double-charging.
- **Subtracting credits in UI code** -- Never directly modify the balance in client code. Always call `orpc.credits.consume`. The server handles balance validation, ledger entries, and idempotency.
- **Missing DB migration** -- Credit tables (`credit_account`, `credit_transaction`, `credit_order`, `credit_signup_grant_claim`) must exist. If credits are enabled but the migration has not been run, all credit operations fail with table-not-found errors.
- **Forgetting to update i18n for new packages** -- Package labels and descriptions in the purchase UI come from i18n. Adding a new package ID without corresponding i18n entries shows raw keys in the UI.
- **Disabling cron in wrangler.jsonc** -- The daily cron expires stale grants and orders. Without it, expired signup grants remain spendable indefinitely and abandoned orders stay in `pending` status.
