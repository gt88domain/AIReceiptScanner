# AIReceiptScanner Product Documentation

This directory is the product-specific execution contract for AIReceiptScanner.

Repository baseline when created:
- main: 36ad68751e6e0d577f2a5a4b90c3094df6e6782d
- EasyStarter: 5.1.0
- date: 2026-09-19

## Current product decision

iOS first.

Default receipt path:

VisionKit document scan → Apple Vision local OCR → deterministic receipt parser → user verifies → save/export.

Cloud OCR/VLM is conditional Cloud Assist only. It is not the default path.

The reviewed riddleling/iOS-OCR-Server repository is a reference implementation, not a runtime dependency. AIReceiptScanner should call Apple Vision directly through a local Expo Swift module instead of running a LAN/HTTP OCR server inside the app.

## Documents

### Master implementation plan

[../plans/receipt-ios-local-first-mvp.md](../plans/receipt-ios-local-first-mvp.md)

Defines:
- product scope;
- architecture;
- UPSTREAM/DOWNSTREAM/EXTERNAL boundaries;
- native module shape;
- data model;
- implementation phases;
- MVP Definition of Done.

### Execution TODO

[execution-todo.md](./execution-todo.md)

Defines:
- P0/P1/P2/Later;
- Do Not Build;
- dependencies;
- owner classification;
- Definition of Done per major task;
- milestone exit criteria.

### Acceptance & test matrix

[acceptance-matrix.md](./acceptance-matrix.md)

Defines:
- unit;
- integration;
- mobile device;
- offline;
- malformed image;
- security;
- provider failure;
- billing;
- duplicate/idempotency;
- privacy deletion;
- accessibility;
- exact release evidence.

### Provider benchmark

[provider-benchmark.md](./provider-benchmark.md)

Defines:
- Apple local OCR benchmark;
- 300-receipt initial corpus target;
- cloud candidate comparison;
- accuracy/latency/cost/privacy measurements;
- provider selection gate.

### Security & privacy

[security-privacy.md](./security-privacy.md)

Defines:
- data classification;
- local-first privacy;
- image retention;
- Cloud Assist consent;
- storage/auth boundaries;
- analytics/crash redaction;
- deletion/resurrection protection.

### iOS release checklist

[release-checklist.md](./release-checklist.md)

Defines:
- production config;
- App Store;
- physical-device;
- purchase/restore;
- deletion;
- accessibility;
- security;
- No-Go release conditions.

### Product architecture decision

[adr-local-first-apple-vision.md](./adr-local-first-apple-vision.md)

Records why Apple Vision/VisionKit is the default receipt OCR path and why the HTTP OCR-server pattern is deliberately not used inside the app.

## Source references

Primary first-party/current references used for this plan:

- Apple RecognizeTextRequest:
  https://developer.apple.com/documentation/vision/recognizetextrequest
- Apple VNDocumentCameraViewController:
  https://developer.apple.com/documentation/visionkit/vndocumentcameraviewcontroller
- Apple RecognizeDocumentsRequest:
  https://developer.apple.com/documentation/vision/recognizedocumentsrequest
- Expo local native module guidance:
  https://docs.expo.dev/workflow/customizing/
- Reference project:
  https://github.com/riddleling/iOS-OCR-Server

Reference project facts checked on 2026-09-19:
- Swift;
- MIT license;
- latest listed release v1.3.9 published 2026-05-28;
- more than 2,000 GitHub stars at review time;
- OCR code directly imports Apple Vision;
- its server listens as a network service and is therefore not the desired in-app integration pattern.

## Status

Documentation baseline: PREPARED  
Product implementation: NOT STARTED  
Automated tests: NOT AUTHORED  
Automated verification: NOT RUN  
Physical-device validation: NOT RUN  
Cloud provider selected: NO  
Deployment: NOT AUTHORIZED / NOT RUN

## Next implementation slice

Do not begin with cloud providers.

First code slice should prove one native local loop:

1. adopt real mobile product identity/config;
2. enable downstream mobile;
3. add local Expo Swift receipt-vision module;
4. wrap VisionKit document capture;
5. run Apple Vision OCR;
6. normalize recognized lines/geometry;
7. parse merchant/date/currency/total;
8. show verification screen;
9. persist local draft across app interruption.

Exit criterion:

A physical iPhone in airplane mode can scan a paper receipt, extract useful fields, let the user correct them, survive an app restart and return to the draft.

Only after this slice passes review should server persistence and Cloud Assist be implemented.
