## 1. Implementation
- [x] 1.1 Update app config types to support platform-scoped payments and remove top-level payments.
- [x] 1.2 Move payments config in `app-config.ts` to `web.payments` and `native.payments`.
- [x] 1.3 Update web/native payments modules to read platform-nested config with fallback defaults.
- [x] 1.4 Update server config consumer to read `appConfig.web.payments` with fallback.
- [x] 1.5 Update config architecture docs to describe nested payments placement.

## 2. Validation
- [x] 2.1 Run repository-wide TypeScript check and resolve all type errors.
