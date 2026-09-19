# AIReceiptScanner Engineering Progress

Last updated: 2026-09-19

This file tracks implementation status against the approved product documents. A status of CODED does not mean tested or release-ready.

| Module | Planned PR | Status | Automated tests | Physical device | Notes |
| --- | --- | --- | --- | --- | --- |
| Documentation baseline | #2 | DRAFT | n/a | n/a | Plan, TODO, acceptance, privacy, benchmark, release gates |
| iOS local receipt vision | #3 | CODED / REVIEWING | NOT RUN | NOT RUN | VisionKit + Apple Vision local module, functional scan screen |
| Local receipt parser + verify | #4 | CODED / REVIEWING | AUTHORED / NOT RUN | NOT RUN | deterministic parser, recoverable local draft, functional Verify UI |
| Receipt server/domain persistence | #5 | CODED / REVIEWING | AUTHORED / NOT RUN | n/a | D1 migration, owner-scoped CRUD, create idempotency, optimistic update versions |
| History/search/export | #6 | NOT STARTED | NOT RUN | NOT RUN | native/web history, CSV/PDF, duplicate warnings |
| Cloud Assist | #7 | NOT STARTED | NOT RUN | NOT RUN | benchmark harness + one provider adapter after selection |
| Billing/privacy hardening | #8 | NOT STARTED | NOT RUN | NOT RUN | RevenueCat lifecycle, export/delete, redaction |
| Production/App Store readiness | #9 | NOT STARTED | NOT RUN | NOT RUN | signed build, device matrix, submission evidence |

## Current engineering boundary

PR #5 builds on PR #4 and intentionally stops before history/search/export UI.

Its observable target is:

1. a verified mobile draft can be persisted through the typed receipt RPC;
2. the API Worker is the sole D1 business-data owner;
3. every get/update/delete/list query is owner-scoped;
4. identical create retries reuse one receipt by (userId, captureId);
5. changed payload under the same captureId fails with CONFLICT;
6. stale updates fail through optimistic version checks;
7. successful server save clears the local draft only after protected-image cleanup succeeds.

## Current evidence

Implementation review: IN PROGRESS  
Automated test authoring: AUTHORED FOR PARSER + SERVER TRUST/IDEMPOTENCY  
Automated test execution: NOT RUN  
Native build: NOT RUN  
Physical iPhone scan: NOT RUN  
Deployment: NOT RUN

## External blockers not to fake

- Apple Team ID
- EAS project ID
- App Store application/product IDs
- RevenueCat production project/keys
- real physical iPhone acceptance evidence

These remain explicit external adoption steps and must not be replaced with invented values.
