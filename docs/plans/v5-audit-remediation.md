# v5 audit remediation

## Goal

Resolve the confirmed v5 candidate audit findings in `docs/reviews/v5-candidate-audit-current.csv`, beginning with the release blocker and money, authorization, webhook, and data-consistency paths.

## Acceptance criteria

- The signup-grant IP, identity, and user-agent limits are atomic under concurrent requests.
- Provider events, billing state, account deletion, ticket writes, Jobs, and credit recovery preserve their declared source of truth and transactional invariants.
- Web and mobile routes no longer expose the confirmed stale-state, dead-end, or incomplete-flow behaviors.
- Product configuration has one runtime source for prices, enabled features, profile resources, and deployment examples.
- Tests are authored only after implementation review, then the applicable workspace checks and test suite pass.

## Phases

1. Money and authorization: signup grants, webhook/provider environment handling, account deletion, payment portal, subscription state, and credit ledger consistency.
2. Operations: Jobs, tickets, control-read, email request limits, storage/config/profile source-of-truth fixes.
3. Web and mobile: auth, billing, dashboard, tickets, public routes, profile, and mobile flows.
4. Implementation review: compare every changed behavior against the audit CSV, source-of-truth rules, and v5 release constraints; fix review findings.
5. Test phase: add focused denial, concurrency, idempotency, route, and UI-state tests. Then run the relevant tests, followed by the requested full checks.

## Deferred test plan

- Credits: concurrent signup grants, fragmented lots, source collision, recovery and expiration cases.
- Payments: Stripe invoice/subscription ordering, RevenueCat environment policy, portal access for delinquent subscriptions, and state refresh.
- Auth: deleted-account subscription and OAuth identity behavior; Expo authorization handoff.
- Jobs and tickets: atomicity, retry/delay, and audit outcomes.
- Web/mobile: auth callback, verification, checkout, error, cache invalidation, and navigation states.
- Configuration/profiles: explicit price environment, profile feature/resource consistency, and deployment template contracts.

## Status

- Implementation review: complete; type errors found during review were corrected before testing.
- Test execution: `pnpm check-types`, `pnpm --filter server test:config`,
  `pnpm --filter server test:integration`, `pnpm --filter @repo/app-config test`,
  and the final full `pnpm test` suite passed (including 32 server integration
  files and 150 server integration tests). Mobile TypeScript checks passed; the
  mobile package script cannot locate its local `oxlint` binary, while the
  repository `pnpm exec oxlint optional/mobile` check passed.

## Money/auth implementation notes

- Account deletion is guarded in the same D1 batch against every non-canceled
  subscription. The batch tombstones the user and removes login accounts and
  sessions together; business records and signup-grant claims are retained.
- Stripe portal authorization uses the authenticated user's Stripe customer;
  delinquent or expired entitlement no longer prevents invoice/payment-method
  access. The current native entitlement provider remains unchanged for upgrade
  policy decisions.
- Invoice events retrieve the Stripe Subscription and delegate to the same
  subscription snapshot writer; they no longer synthesize status or copy stale
  local price/cancellation fields into a newer event watermark.
- RevenueCat uses the existing explicit `PAYMENTS_PRICE_ENV` as the deployment
  environment: `prod` accepts `PRODUCTION`, `test` accepts `SANDBOX`. Mismatches
  have no domain effects. Missing/unknown environments are dead-lettered for
  manual review, including legacy inbox payloads and transfers without an
  environment; dashboard `TEST` events remain harmless no-ops. The provider's
  [field contract](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields)
  defines environment on purchase lifecycle events but only sometimes on transfers.
- RevenueCat credit refunds with no matching original purchase throw into the
  existing inbox retry/dead-letter path; duplicate successful refunds retain the
  existing recovery idempotency.
- Focused deferred cases: past_due/unpaid/paused/incomplete deletion denial;
  canceled/no-subscription deletion allow; batch rollback retaining credentials;
  social re-registration; delinquent Stripe portal allow and foreign-customer
  denial; native-provider upgrade preservation; invoice-first delivery with a
  full current subscription snapshot; paused/trialing snapshot preservation;
  RevenueCat matching/mismatched/missing environments on new and replayed events;
  refund-before-purchase retry then exactly-once recovery.
- Expected focused test files: server auth account-deletion tests, payment
  portal/invoice webhook tests, and RevenueCat webhook environment/refund tests.
  The final verification commands and their results are recorded in the Status
  section above.

## Jobs implementation notes

- Delayed jobs remain in the outbox until due; early legacy Queue/DLQ deliveries
  are parked and acknowledged instead of spending the delivery retry budget.
- Queue payloads carry the existing outbox ID as their generation. Admin retry
  rotates it, and both consumers recheck it at state mutations. Legacy messages
  are accepted only before a generation-aware retry. No schema migration; deploy
  producer and both consumers together to avoid old code bypassing this guard.
- DLQ terminalization, failed history and the incident insert share one D1 batch.
  Already recorded Queue message IDs cannot terminalize a retried job.
- Admin retry commits job/outbox reset, incident resolution, queued history and
  audit together. Publish errors leave a durable pending outbox and return the
  accepted retry outcome, with Cron responsible for later delivery.
- Deferred cases: future jobs beyond the Queue retry horizon, future outbox rows
  preceding due rows, early main/DLQ delivery, old generation after admin retry,
  concurrent retry versus DLQ, duplicate resolved incidents, transaction rollback,
  publish failure with accepted retry and audit, and legacy-message compatibility.
  Verification results are recorded in the Status section above.
