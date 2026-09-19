# AIReceiptScanner iOS Local-First MVP Plan

Status: APPROVED FOR IMPLEMENTATION PLANNING  
Repository baseline: main @ 36ad68751e6e0d577f2a5a4b90c3094df6e6782d  
EasyStarter baseline: 5.1.0  
Last reviewed: 2026-09-19

## 1. Core goal

Ship the first production-grade native AIReceiptScanner experience around one fast, trustworthy flow:

Open app → scan physical receipt → extract locally on iPhone → user verifies → save → search/export.

The MVP is iOS-first. Basic OCR must work without network access. Cloud OCR/VLM is an optional fallback, not the default path.

Success means a real user can get a useful, verified receipt record quickly without turning the product into bookkeeping software.

## 2. Architectural decision

Default path:

1. VisionKit document capture.
2. Apple Vision local OCR.
3. Deterministic receipt field parser.
4. Verification UI.
5. Save verified structured data.
6. Optional private image retention.
7. Search and export.

Fallback path:

1. Local OCR is empty, materially incomplete, or ambiguous.
2. Apply the user's Cloud Assist preference.
3. If allowed, send only this receipt to one selected cloud provider.
4. Normalize provider output into the same receipt contract.
5. Never overwrite fields already edited or verified by the user.

Do not embed or run a local HTTP OCR server inside the app. The reviewed riddleling/iOS-OCR-Server project is a useful MIT-licensed reference implementation, but its Vapor/LAN layer solves a different problem: exposing an iPhone's Apple Vision OCR to other devices. AIReceiptScanner already runs on the iPhone, so it should call Vision directly through a local Expo native module.

## 3. Verified external basis

As of 2026-09-19:

- Apple Vision RecognizeTextRequest is the native image text-recognition request and exposes automatic language detection, language correction and recognized observations.
- VisionKit VNDocumentCameraViewController provides document-camera capture and returns scanned page images.
- Apple RecognizeDocumentsRequest can understand structured document text, including receipts, tables and lists on supported newer OS versions.
- Expo recommends a local Expo module when custom Swift native code is needed only by one app.
- riddleling/iOS-OCR-Server currently uses Apple Vision directly, is MIT licensed, has more than 2,000 GitHub stars, and its latest listed release is v1.3.9 from 2026-05-28.

Primary references:

- https://developer.apple.com/documentation/vision/recognizetextrequest
- https://developer.apple.com/documentation/visionkit/vndocumentcameraviewcontroller
- https://developer.apple.com/documentation/vision/recognizedocumentsrequest
- https://docs.expo.dev/workflow/customizing/
- https://github.com/riddleling/iOS-OCR-Server

## 4. Scope

### MVP product capabilities

- Native onboarding.
- Camera permission flow.
- VisionKit document scan.
- Photo-library import fallback.
- Apple Vision local OCR.
- Local receipt parser.
- Verification/correction UI.
- Local draft recovery.
- Receipt save/read/update/delete.
- Receipt history.
- Search/filter.
- Categories.
- Possible-duplicate warning.
- CSV export.
- PDF/report export.
- Cloud Assist opt-in fallback.
- RevenueCat subscription and restore.
- Privacy/data export.
- Account deletion.
- Minimal Web companion for authenticated history/export/settings.

### Explicitly out of MVP

- Full bookkeeping ledger.
- Tax filing or tax advice.
- QuickBooks/Xero integration.
- Team approvals.
- Mileage.
- Email ingestion.
- Multi-provider routing.
- Custom OCR model training.
- Receipt-by-receipt manual operations.
- Android production launch.
- iPhone OCR cluster/server feature.

## 5. Product boundaries

### UPSTREAM candidates

Only reusable mobile/platform behavior may later flow back to EasyStarter:

- production mobile config guards;
- generic privacy deletion hooks;
- generic native crash redaction conventions;
- generic upload retry primitives after proven reuse;
- generic native release evidence template;
- generic account deletion and subscription lifecycle fixes.

Do not upstream receipt-specific behavior before at least a second unrelated app proves reuse.

### DOWNSTREAM

Keep product-specific behavior in AIReceiptScanner:

- receipt capture orchestration;
- Apple Vision receipt wrapper;
- receipt parsing rules;
- receipt schema;
- receipt verification UI;
- duplicate heuristics;
- receipt exports;
- OCR benchmark corpus;
- Cloud Assist decision logic;
- image-retention policy for receipts.

### EXTERNAL

- Apple Vision/VisionKit.
- RevenueCat.
- One selected cloud fallback provider.
- App Store / Play Store infrastructure.
- Optional crash/analytics providers already allowed by product policy.

## 6. Proposed code placement

Native:

- optional/mobile/modules/receipt-vision/
- optional/mobile/features/receipts/
- optional/mobile/app/... receipt routes/screens

Server:

- apps/server/src/modules/receipts/

Web:

- apps/web/src/modules/receipts/

Product config:

- packages/app-config/src/product-config.ts and existing product-owned config only.

Do not create microservices.

## 7. Native Vision contract

The JavaScript layer should see one stable contract regardless of iOS API version.

Minimum result:

- engine
- engineVersion
- osVersion
- durationMs
- image width/height
- recognized lines
- line confidence when available
- normalized bounding boxes
- full text

Pass image file URLs/paths across the native boundary. Do not move large receipt images through Base64 strings.

OS-specific implementation details remain inside Swift.

## 8. Receipt semantic contract

Critical fields:

- merchant
- purchase date
- currency
- total

Useful fields:

- purchase time
- subtotal
- tax
- tip
- category
- payment method
- payment last4 where intentionally retained
- line items

Rules:

- money must not use binary floating point for persistence;
- ambiguous dates require verification;
- a dollar sign alone is not sufficient proof of USD;
- arithmetic checks are warnings, not authority;
- line-item failure must not make an otherwise useful receipt unusable;
- full card numbers and CVV are never retained.

## 9. Local quality states

Every local extraction ends in exactly one product state:

- LOCAL_PASS
- LOCAL_REVIEW
- LOCAL_FAIL

The decision must combine multiple signals, not one hardcoded Apple confidence threshold.

Signals may include:

- useful OCR text exists;
- total candidate exists;
- date candidate exists;
- currency ambiguity;
- conflicting totals;
- low-confidence critical lines;
- image/orientation problems;
- parser exception;
- impossible values.

Thresholds are assumptions until calibrated against the benchmark corpus.

## 10. Cloud Assist policy

User preference values:

- Ask every time — default.
- Automatically assist failed/insufficient local scans.
- Never use cloud processing.

A normal local success must not be uploaded to a cloud OCR/VLM provider.

First cloud use must clearly disclose that the receipt image leaves the device for processing.

The app must not market itself as "100% local" while Cloud Assist exists. Preferred wording: "Receipts are processed on-device by default. Cloud processing is optional and clearly disclosed."

MVP implements exactly one cloud fallback provider after benchmark selection.

## 11. User authority and stale results

User-edited or verified values always outrank asynchronous extraction output.

Each extraction attempt should carry:

- receiptId/captureId
- revision
- source
- startedAt
- completedAt

A delayed local/cloud result cannot overwrite a newer user revision.

## 12. Minimal persistence model

Start small.

receipts:

- id
- userId
- captureId
- merchantName
- purchaseDate
- purchaseTime nullable
- currency
- subtotalMinor nullable
- taxMinor nullable
- tipMinor nullable
- totalMinor
- paymentMethod nullable
- paymentLast4 nullable
- category nullable
- verificationStatus
- extractionSource
- imageAssetId nullable
- createdAt
- updatedAt

receipt_items:

- id
- receiptId
- position
- description
- quantity nullable
- unitPriceMinor nullable
- lineTotalMinor nullable

receipt_extractions:

- id
- receiptId
- source
- provider nullable
- providerVersion nullable
- status
- durationMs
- fallbackReason nullable
- estimatedCostMicros nullable
- createdAt

Use the existing asset/storage authorization model rather than raw public storage keys.

## 13. User flow

### First run

Open → Scan first receipt → request camera permission only when needed → VisionKit capture → local OCR → verification.

Do not require account creation before the user sees first value unless a real platform constraint forces it.

After first useful extraction, ask the user to sign in/create an account to save/sync.

### Returning user

Primary home actions:

- Scan receipt
- Receipts
- Reports
- Settings

Do not make the user land on admin-style KPI cards.

### Verification

Show critical fields first:

- merchant
- date
- total
- currency

Then secondary fields.

Highlight uncertainty without requiring the user to inspect every OCR line.

### Payment moment

Do not paywall account deletion, purchase restore, or access to already-owned data.

Initial paid value can include cloud enhancement, sync, reports, larger history/backup and future integrations. Local Apple OCR itself has no per-scan OCR API fee, so do not build the business around artificial local-scan metering before conversion data exists.

## 14. Privacy model

Default goal: minimum data retention.

For a successful local-only scan:

capture → local OCR → verification → save structured data → delete temporary capture according to the user's image-retention setting.

If the user opts to keep original receipt images, store them privately through the existing authorized asset system.

For Cloud Assist:

- send only the selected receipt;
- respect the user's policy;
- record provider/version and reason;
- delete temporary processing assets according to verified provider/server policy;
- do not retain raw provider responses indefinitely by default.

Analytics and crash logs must not contain receipt text, merchant, amount, address, payment data or image URLs.

## 15. Duplicate policy

Use multiple weak signals:

- perceptual image fingerprint;
- merchant;
- date;
- total;
- currency.

The outcome is only "possible duplicate."

Never auto-delete a suspected duplicate.

## 16. Implementation phases

### Phase 0 — documentation and baseline

- approve this plan;
- approve ADR;
- approve execution TODO;
- approve acceptance matrix;
- approve privacy/security rules;
- approve provider benchmark protocol;
- record current product/mobile placeholder state.

### Phase 1 — native local loop

- adopt app identity/config;
- enable downstream mobile;
- create local Expo Swift module;
- VisionKit capture;
- Vision OCR;
- typed result;
- local parser;
- verification UI;
- local draft recovery.

Exit criterion: real iPhone can scan and verify a receipt offline.

### Phase 2 — persisted product loop

- receipt server module;
- schema/migration plan;
- save/read/update/delete;
- owner-scoped authorization;
- history/search;
- duplicate warning;
- CSV/PDF exports.

Exit criterion: verified receipt survives restart and can be found/exported.

### Phase 3 — Cloud Assist

- build benchmark corpus;
- benchmark shortlisted cloud providers;
- select one;
- implement consent/policy;
- implement one adapter;
- add stale-result protection and bounded retries.

Exit criterion: difficult receipt can be improved without violating local-only settings or overwriting user edits.

### Phase 4 — monetization and production hardening

- production RevenueCat config;
- purchase/restore;
- account deletion lifecycle;
- crash/error redaction;
- privacy export/delete;
- production config guards;
- App Store metadata/privacy declarations.

Exit criterion: signed production-like build passes the release checklist.

## 17. Acceptance criteria

The iOS MVP is not complete until a production-like physical iPhone can:

1. install a clean build;
2. open without a pre-existing account;
3. scan a physical receipt;
4. perform OCR in airplane mode;
5. identify critical fields or clearly request review;
6. allow correction;
7. survive app termination without losing the draft;
8. create/sign in to an account;
9. save and reopen the receipt;
10. search for it;
11. export CSV/PDF;
12. use Cloud Assist only when allowed;
13. purchase and restore subscription;
14. export user data;
15. delete the account and business receipt data according to policy.

Passing TypeScript, a simulator demo, or OCR text alone is not MVP completion.

## 18. Planned verification

Implementation review: NOT STARTED  
Test authoring: DEFERRED UNTIL IMPLEMENTATION REVIEW  
Test execution: NOT RUN  
Real-device validation: NOT RUN  
Cloud-provider benchmark: NOT RUN  
App Store submission: NOT RUN

Recommended commands will be recorded per implementation slice. They are not evidence until actually executed against an exact commit/build.

## 19. Related documents

- docs/receipt-scanner/README.md
- docs/receipt-scanner/execution-todo.md
- docs/receipt-scanner/acceptance-matrix.md
- docs/receipt-scanner/provider-benchmark.md
- docs/receipt-scanner/security-privacy.md
- docs/receipt-scanner/release-checklist.md
- docs/adr/0008-use-apple-vision-local-first-for-receipt-ocr.md
