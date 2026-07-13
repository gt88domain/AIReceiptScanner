## 1. Implementation
- [x] 1.1 Add an OpenSpec delta for shared payments semantics, native semantic validation, and unified membership handling.
- [x] 1.2 Add a shared payments semantic module for entitlement, decision, and presentation helpers.
- [x] 1.3 Treat `web.payments.plans` as the semantic source and validate native platform plans against it.
- [x] 1.4 Expose normalized entitlement state from `useNativePayments()` and make native prefer server membership while retaining local RevenueCat fallback.
- [x] 1.5 Remove page-local premium presentation metadata and resolve native premium display data from the shared module.
- [x] 1.6 Make web pricing consume the shared presentation semantics and unify yearly badge copy with native.
- [x] 1.7 Add RevenueCat server-side webhook ingestion and write native purchases into the existing billing model.
- [x] 1.8 Validate the OpenSpec change and run lint/typecheck verification for the touched packages and apps.
