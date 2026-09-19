# AIReceiptScanner Engineering Progress

Last updated: 2026-09-19

This file tracks implementation status against the approved product documents. A status of CODED does not mean tested or release-ready.

| Module | Planned PR | Status | Automated tests | Physical device | Notes |
| --- | --- | --- | --- | --- | --- |
| Documentation baseline | #2 | DRAFT | n/a | n/a | Plan, TODO, acceptance, privacy, benchmark, release gates |
| iOS local receipt vision | #3 | CODED / REVIEWING | NOT RUN | NOT RUN | VisionKit + Apple Vision local module, functional scan screen |
| Local receipt parser + verify | #4 | CODED / REVIEWING | AUTHORED / NOT RUN | NOT RUN | deterministic parser, recoverable local draft, functional Verify UI |
| Receipt server/domain persistence | #5 | NOT STARTED | NOT RUN | n/a | D1 schema, owner-scoped CRUD, idempotency |
| History/search/export | #6 | NOT STARTED | NOT RUN | NOT RUN | native/web history, CSV/PDF, duplicate warnings |
| Cloud Assist | #7 | NOT STARTED | NOT RUN | NOT RUN | benchmark harness + one provider adapter after selection |
| Billing/privacy hardening | #8 | NOT STARTED | NOT RUN | NOT RUN | RevenueCat lifecycle, export/delete, redaction |
| Production/App Store readiness | #9 | NOT STARTED | NOT RUN | NOT RUN | signed build, device matrix, submission evidence |

## Current engineering boundary

PR #4 builds on PR #3 and intentionally stops before server persistence.

Its observable target is:

1. local OCR becomes merchant/date/currency/amount candidates;
2. ambiguous dates/currencies are review states rather than guesses;
3. money normalization avoids binary floating-point arithmetic;
4. the user can edit and explicitly verify critical receipt fields;
5. draft image + fields survive normal app interruption using app-private storage;
6. suspected full card-number/CVV text is redacted from persisted OCR draft text;
7. delayed server/cloud persistence is still out of scope until PR #5.

## Current evidence

Implementation review: IN PROGRESS  
Automated test authoring: AUTHORED FOR PURE PARSER CONTRACT  
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
