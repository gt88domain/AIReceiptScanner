# AIReceiptScanner Execution TODO

Status: PLANNED  
Last reviewed: 2026-09-19

This is the execution backlog for the iOS-first MVP. A checkbox means implementation status only when backed by repository evidence. Research, code, tests and execution evidence are separate states.

Legend:

- UPSTREAM: reusable EasyStarter capability, only if genuinely cross-product.
- DOWNSTREAM: AIReceiptScanner product behavior.
- EXTERNAL: Apple/App Store/RevenueCat/cloud provider configuration or evidence.
- DoD: Definition of Done.

## P0 — Architecture, privacy and first offline value

### P0-001 — Freeze product scope
Owner: DOWNSTREAM  
Depends on: none

Do:
- confirm iOS-first;
- confirm local-first OCR;
- confirm no accounting/tax scope;
- confirm one cloud fallback maximum for MVP.

DoD:
- master plan and ADR approved;
- no conflicting plan document says cloud-only or complete bookkeeping.

Evidence:
- exact commit containing approved docs.

### P0-002 — Adopt native app identity
Owner: DOWNSTREAM  
Depends on: P0-001

Do:
- replace template app name;
- bundle identifier;
- scheme;
- EAS project configuration;
- support URLs;
- App Store URL placeholder policy;
- production server/web URLs;
- permission copy.

DoD:
- production build configuration contains no template identity such as com.example.yourapp, demo.aiarticles.com, YOUR_EAS_PROJECT_ID or your-app-scheme;
- development and production identities are documented.

### P0-003 — Enable mobile product composition
Owner: DOWNSTREAM  
Depends on: P0-002

Do:
- enable the existing opt-in mobile capability using current product-owned configuration;
- do not move mobile dependencies into root workspaces.

DoD:
- product config intentionally enables mobile;
- server/mobile production checks reflect the feature;
- no unrelated upstream architecture change.

### P0-004 — Create local Expo receipt-vision module
Owner: DOWNSTREAM  
Depends on: P0-003

Do:
- create a local Expo module in the mobile app;
- Swift implementation only for iOS MVP;
- expose typed document scan and OCR functions.

DoD:
- module autolinks in a development build;
- JS imports a stable typed contract;
- no HTTP/LAN server is involved.

### P0-005 — Implement VisionKit document capture
Owner: DOWNSTREAM / EXTERNAL Apple framework  
Depends on: P0-004

Do:
- wrap VNDocumentCameraViewController;
- handle finish/cancel/failure;
- check isSupported;
- write scanned image to a local temporary file;
- return file URI and dimensions.

DoD:
- physical iPhone scans a paper receipt;
- cancel returns safely;
- unsupported device path is explicit;
- no Base64 image transport.

### P0-006 — Implement Apple Vision OCR
Owner: DOWNSTREAM / EXTERNAL Apple framework  
Depends on: P0-004

Do:
- use modern RecognizeTextRequest where supported;
- preserve a legacy VNRecognizeTextRequest path if minimum iOS remains below the modern API availability;
- accurate recognition;
- language auto-detection;
- language correction where appropriate;
- line confidence and normalized bounds.

DoD:
- airplane-mode OCR succeeds on a physical iPhone;
- OCR result contains text plus geometry;
- failure returns a typed error rather than fake success.

### P0-007 — Optional iOS 26 structured-document experiment
Owner: DOWNSTREAM / EXTERNAL Apple framework  
Depends on: P0-006
Priority note: experiment only; not a launch blocker.

Do:
- evaluate RecognizeDocumentsRequest;
- compare paragraphs/tables/lists against the normal OCR path.

DoD:
- documented benchmark result;
- feature remains availability-gated;
- app still works on older supported iOS.

### P0-008 — Define receipt domain contract
Owner: DOWNSTREAM  
Depends on: P0-001

Do:
- define critical and secondary receipt fields;
- define local extraction state;
- define verification state;
- define extraction source metadata.

DoD:
- one canonical TypeScript/domain contract exists;
- UI/provider adapters do not invent parallel schemas.

### P0-009 — Deterministic critical-field parser
Owner: DOWNSTREAM  
Depends on: P0-006, P0-008

Do:
- merchant candidates;
- date candidates and ambiguity handling;
- currency evidence;
- subtotal/tax/tip/total candidate ranking;
- payment method/last4 when intentionally retained;
- amount validation warnings.

DoD:
- parser produces candidate values plus reasons/confidence signals;
- ambiguous dates/currency stay reviewable;
- parser never changes amounts merely to force arithmetic consistency.

### P0-010 — Monetary representation
Owner: DOWNSTREAM  
Depends on: P0-008

Do:
- choose integer minor units or an explicit decimal representation;
- define currency exponent behavior;
- define unknown currency handling.

DoD:
- no persisted financial amount depends on binary floating-point accumulation;
- tests planned for zero-decimal and standard decimal currencies.

### P0-011 — Verification screen
Owner: DOWNSTREAM  
Depends on: P0-009

Do:
- show merchant/date/total/currency first;
- secondary fields below;
- indicate uncertain fields;
- allow correction;
- distinguish local result from Cloud Assist suggestion.

DoD:
- user can save a correct receipt without viewing raw OCR;
- uncertainty is not communicated by color alone;
- edited values are explicitly marked as user-owned.

### P0-012 — Local draft persistence
Owner: DOWNSTREAM  
Depends on: P0-005, P0-011

Do:
- persist an in-progress capture locally;
- define cleanup and expiry;
- survive app termination during capture/OCR/review.

DoD:
- kill/reopen test recovers the draft;
- no phantom saved server record is created before intended save.

### P0-013 — Stale extraction/revision fencing
Owner: DOWNSTREAM  
Depends on: P0-008

Do:
- captureId;
- receipt revision;
- source/start/completion metadata;
- conditional application of asynchronous results.

DoD:
- delayed OCR/cloud response cannot overwrite newer user edits or verified fields.

### P0-014 — Receipt server module
Owner: DOWNSTREAM  
Depends on: P0-008

Do:
- create apps/server/src/modules/receipts;
- thin router;
- service;
- repository only where useful;
- mount via existing module index.

DoD:
- no new microservice;
- business data remains owned by the API Worker;
- all user routes use standard auth guard.

### P0-015 — Receipt schema and migration plan
Owner: DOWNSTREAM  
Depends on: P0-014

Do:
- receipts;
- optional receipt_items;
- receipt_extractions;
- owner indexes;
- unique userId/captureId;
- deletion model;
- asset reference rather than raw public URL.

DoD:
- schema plan reviewed before migration creation;
- migration has forward-fix/rollback strategy;
- no duplication of auth/billing/storage tables.

### P0-016 — Owner-scoped CRUD
Owner: DOWNSTREAM  
Depends on: P0-014, P0-015

Do:
- create;
- list;
- read;
- update;
- delete;
- owner scope at repository/query boundary.

DoD:
- User A cannot access User B receipt by guessed UUID;
- update/delete are equally protected;
- API does not trust client userId.

### P0-017 — Image retention setting
Owner: DOWNSTREAM  
Depends on: P0-012, P0-016

Modes:
- do not permanently keep original image;
- keep original image privately.

DoD:
- default is explicit;
- local-only path does not create a permanent remote image when retention is off;
- kept images use the existing authorized asset model.

### P0-018 — Privacy-safe analytics/crash rules
Owner: UPSTREAM candidate for generic redaction contract, DOWNSTREAM policy now  
Depends on: P0-008

Do:
- event whitelist;
- sensitive-field blacklist;
- log redaction;
- crash attachment restrictions.

DoD:
- merchant, amount, OCR text, address, payment data and receipt image URI are absent from analytics/crash payload tests.

### P0-019 — Build OCR benchmark corpus
Owner: DOWNSTREAM  
Depends on: P0-008

Do:
- minimum target 300 legally usable receipts;
- development/validation/unseen-final split;
- ground truth critical fields;
- difficult image and receipt categories.

DoD:
- corpus manifest exists;
- personally sensitive fixtures have documented handling;
- final set is not used for iterative tuning.

### P0-020 — Benchmark local Apple path
Owner: DOWNSTREAM  
Depends on: P0-006, P0-009, P0-019

Measure:
- OCR latency;
- empty OCR rate;
- field accuracy;
- LOCAL_PASS/REVIEW/FAIL rates;
- silent critical errors;
- memory/crash behavior.

DoD:
- benchmark report tied to device/iOS/build/commit;
- no unsupported accuracy claims.

### P0-021 — Benchmark cloud fallback candidates
Owner: DOWNSTREAM / EXTERNAL  
Depends on: P0-019

Do:
- same corpus;
- same ground truth;
- accuracy/latency/failure/cost/privacy;
- verify provider retention and deletion terms.

DoD:
- evidence-based provider matrix;
- exactly one MVP provider selected or cloud fallback intentionally deferred.

### P0-022 — Cloud Assist consent/policy
Owner: DOWNSTREAM  
Depends on: P0-021

Preferences:
- ask every time;
- automatic only for insufficient local scans;
- never cloud.

DoD:
- first transmission has clear consent;
- "never" produces zero provider requests;
- normal local success is not uploaded.

### P0-023 — One fallback provider adapter
Owner: DOWNSTREAM / EXTERNAL  
Depends on: P0-021, P0-022

Do:
- one adapter only;
- timeout;
- bounded retry;
- normalized output;
- provider/version/cost metadata;
- no provider result directly mutates authoritative user fields.

DoD:
- provider failures remain reviewable;
- no infinite retry;
- no multi-provider router.

### P0-024 — Idempotent fallback/save boundary
Owner: DOWNSTREAM  
Depends on: P0-013, P0-023

Do:
- logical scan/request idempotency;
- duplicate queue/request handling;
- charge/accounting idempotency if credits are later used.

DoD:
- retries do not create duplicate receipts or duplicate paid effects.

### P0-025 — Account deletion compatibility
Owner: UPSTREAM candidate because cross-product  
Depends on: existing auth/billing behavior

Do:
- separate product-account deletion from App Store subscription renewal;
- do not block account deletion merely because a store subscription remains active;
- preserve legally required billing records separately from product data.

DoD:
- active-subscription deletion scenario passes;
- delayed jobs cannot recreate deleted receipt data.

## P1 — Full useful product loop

### P1-001 — Receipt history
Owner: DOWNSTREAM

DoD:
- paginated owner-scoped list;
- verified/pending status visible;
- stable empty/loading/error states.

### P1-002 — Search and filters
Owner: DOWNSTREAM

Scope:
- merchant;
- date range;
- category;
- currency;
- verification status.

DoD:
- filters are composable;
- no cross-user leakage;
- no unbounded list query.

### P1-003 — Categories
Owner: DOWNSTREAM

DoD:
- small default set;
- user can change;
- category is never presented as tax advice.

### P1-004 — Possible duplicate detection
Owner: DOWNSTREAM

Signals:
- perceptual fingerprint;
- merchant/date/total/currency.

DoD:
- warning only;
- user decides;
- same-value genuine receipts are not auto-deleted.

### P1-005 — CSV export
Owner: DOWNSTREAM

DoD:
- Unicode;
- quotes/newlines;
- formula-injection policy;
- explicit currency;
- user-owned data only.

### P1-006 — PDF/report export
Owner: DOWNSTREAM

DoD:
- critical fields readable;
- multiple currencies not silently summed;
- long merchant/item text handled;
- output does not require a new always-on rendering service.

### P1-007 — Web companion
Owner: DOWNSTREAM

Routes:
- authenticated receipt history;
- receipt detail/review;
- reports/export;
- billing/settings/privacy.

DoD:
- web reuses server receipt domain;
- no second receipt backend;
- desktop experience focuses on review/export, not camera capture.

### P1-008 — RevenueCat product configuration
Owner: DOWNSTREAM / EXTERNAL

DoD:
- real product IDs;
- entitlement mapping;
- purchase;
- restore;
- reinstall/restore;
- server webhook authority;
- no placeholder product IDs.

### P1-009 — Paywall
Owner: DOWNSTREAM

DoD:
- first value is demonstrated before an aggressive paywall;
- already-owned data, restore purchase, privacy export and account deletion are not held hostage.

### P1-010 — Data export
Owner: UPSTREAM hook + DOWNSTREAM receipt exporter

DoD:
- user can request/export product data;
- exported receipt data is complete enough to migrate away.

### P1-011 — Privacy deletion orchestration
Owner: UPSTREAM generic hook candidate + DOWNSTREAM receipt cleanup

DoD:
- D1 product records;
- private receipt assets;
- pending extraction jobs;
- generated exports;
- external provider deletion/TTL obligations where applicable;
- deletion state is observable and retryable.

### P1-012 — Native crash/error monitoring
Owner: UPSTREAM optional capability candidate

DoD:
- opt-in/provider config production-ready;
- receipt content redacted;
- release/build IDs available in diagnostics.

### P1-013 — Accessibility
Owner: DOWNSTREAM/UI + reusable component fixes when generic

DoD:
- VoiceOver;
- Dynamic Type;
- dark/light;
- high contrast;
- uncertainty not color-only;
- actionable controls have labels.

### P1-014 — Native E2E
Owner: DOWNSTREAM

DoD:
- clean install → scan → offline OCR → verify → save → reopen → search → export → paywall → restore → data export/delete.

### P1-015 — Production build evidence
Owner: EXTERNAL/EAS/App Store

DoD:
- signed production-like iOS build;
- exact commit/build number recorded;
- physical-device acceptance evidence.

## P2 — After launch evidence

- P2-001: iOS 26 structured-document optimization.
- P2-002: better line-item parser.
- P2-003: merchant-specific rules only after sufficient verified examples.
- P2-004: batch photo import.
- P2-005: annual plan after price testing.
- P2-006: configurable report presets.
- P2-007: remote config only for genuinely operational switches.
- P2-008: monthly close reminder.
- P2-009: App Store screenshot/ASO experiments.
- P2-010: optional retained-image backup controls.

Each P2 item requires evidence that it solves a real retention, conversion or reliability problem.

## Later

- Android launch.
- QuickBooks.
- Xero.
- Gmail/email receipt ingestion.
- Teams/approvals.
- Mileage.
- Tax workflows.
- Corporate cards.
- Advanced accounting automation.
- On-device semantic/structured models if Apple-native parsing proves insufficient.

## Do Not Build

- full accounting suite in MVP;
- tax filing/advice;
- custom OCR model training;
- embedded Vapor/LAN OCR server;
- local network HTTP endpoint;
- OCR cluster;
- generic multi-provider routing framework;
- automatic deletion of suspected duplicates;
- public receipt image URLs;
- manual human receipt processing as an operational dependency;
- lifetime unlimited cloud extraction promise.

## Milestone exit criteria

### M0 — Plan ready
- plan/ADR/TODO/acceptance/privacy/provider/release docs exist;
- implementation/test execution explicitly marked not run.

### M1 — Offline native value
- real iPhone;
- airplane mode;
- VisionKit capture;
- Apple Vision OCR;
- local parser;
- verify UI;
- draft recovery.

### M2 — Persisted product
- owner-scoped CRUD;
- history/search;
- exports;
- duplicate warning;
- privacy-safe image behavior.

### M3 — Optional cloud
- benchmark complete;
- one provider;
- explicit consent;
- no-cloud mode proven;
- stale-result protection.

### M4 — Paid release candidate
- RevenueCat purchase/restore;
- privacy export/delete;
- crash/log redaction;
- accessibility;
- signed production-like build;
- release checklist green.

## Verification state

Implementation: NOT STARTED  
Implementation review: NOT STARTED  
Automated tests: NOT AUTHORED  
Automated tests executed: NOT RUN  
Physical-device validation: NOT RUN  
Provider benchmark: NOT RUN  
Production deploy: NOT AUTHORIZED / NOT RUN
