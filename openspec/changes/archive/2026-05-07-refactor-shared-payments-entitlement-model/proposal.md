# Change: Refactor shared payments entitlement model

## Why
The web and native apps currently express paid membership state differently. Web code exposes a structured entitlement model, while native screens still rely on coarse flags such as `isSubscribed` and page-local pricing presentation metadata.

This makes it harder to keep membership semantics consistent across platforms and blocks membership unification because native purchases still do not flow into the server billing model.

## What Changes
- Add a shared payments semantic module for entitlement, decision, and presentation helpers under `@repo/app-config/payments/shared`.
- Treat `web.payments.plans` as the canonical semantic source and validate native platform plans against it.
- Expose a normalized entitlement model from native payments state instead of only `isSubscribed`, and make native use server-first membership with local RevenueCat state as a transitional fallback.
- Remove `premium.tsx` page-local pricing presentation metadata and make both native premium and web pricing consume the shared presentation semantics, including unified yearly badge copy.
- Add RevenueCat server-side webhook ingestion so native purchases write into the existing billing model and participate in the unified billing status response.

## Non-Goals
- Do not introduce a new `common.payments.catalog` config source.
- Do not change native checkout to a server-driven purchase flow.
- Do not add a separate native payments API namespace; native will reuse the existing payments status endpoint.

## Impact
- Affected specs: `payments`
- Affected code:
  - `packages/app-config/src/payments/*`
  - `apps/server/src/payments/*`
  - `apps/server/src/index.ts`
  - `apps/native/lib/payments/*`
  - `apps/native/hooks/use-native-payments.ts`
  - `apps/native/app/(tabs)/(profile)/premium.tsx`
  - `apps/web/src/components/landing-page/tailark/pricing/*`
