# Product ADR: Use Apple Vision Local-First for Receipt OCR

Status: Proposed  
Date: 2026-09-19  
Scope: AIReceiptScanner downstream product only

## Context

AIReceiptScanner is intended to be the first real native app downstream of EasyStarter.

Receipt images may contain sensitive financial and personal information. A cloud-only OCR design would send every scan to an external provider, add per-scan cost, create network dependency and expand privacy/retention obligations.

Apple provides document capture and OCR directly on iOS:

- VisionKit VNDocumentCameraViewController scans physical documents and returns page images.
- Vision RecognizeTextRequest recognizes text and supports automatic language detection/language correction configuration.
- RecognizeDocumentsRequest on newer supported systems can expose richer document structure such as paragraphs, tables and lists.

The open-source project riddleling/iOS-OCR-Server was reviewed as a reference. Its OCR implementation calls Apple's Vision framework directly; its Vapor HTTP layer exposes the phone's OCR to other devices. That network layer is unnecessary when the OCR consumer is the same iOS app.

Expo supports app-specific local native modules for Swift code.

## Decision

AIReceiptScanner SHALL use Apple Vision/VisionKit as the default iOS receipt OCR path.

Product flow:

VisionKit capture → Apple Vision OCR → deterministic receipt parser → user verification → save/export.

A cloud OCR/VLM provider MAY be used only as conditional Cloud Assist after local processing is inadequate and the user's privacy policy allows transmission.

The MVP SHALL implement at most one production cloud fallback provider.

The app SHALL NOT embed a local Vapor/HTTP OCR server.

## Native boundary

Receipt-specific Swift code remains DOWNSTREAM in a local Expo module.

The React Native layer consumes one stable typed result. OS-version-specific APIs are hidden inside Swift.

If the supported deployment target predates the modern Vision Swift API used by the implementation, the native module may use the appropriate older Vision request internally while keeping the same product contract.

Newer structured document recognition is an optional optimization and cannot make older supported devices nonfunctional.

## Why

### Privacy
Normal OCR can complete on-device without uploading the receipt image.

### Cost
Apple local OCR has no third-party per-receipt OCR API charge.

### Reliability
The scan/recognize/review loop remains useful without internet access.

### Latency
The normal path avoids an unnecessary network round trip.

### Security
No local HTTP server, LAN port, multipart upload or local-network permission is needed merely to OCR a receipt inside the app.

### Product fit
Paid value can focus on verification, sync, reports, exports, backup and optional enhanced cloud processing rather than artificial metering of an on-device OCR call.

## Consequences

Positive:
- offline first value;
- smaller cloud bill;
- reduced data transmission;
- less vendor lock-in;
- simpler normal path;
- stronger privacy positioning;
- useful validation of EasyStarter's native foundation.

Negative:
- Apple Vision is not a complete receipt accounting parser;
- deterministic field extraction must be built and benchmarked;
- older/newer iOS paths may require native compatibility work;
- difficult receipts may need review or Cloud Assist;
- quality claims require a controlled corpus.

## Open-source reference policy

riddleling/iOS-OCR-Server:

- classification: REFERENCE;
- runtime dependency: NO;
- server dependency: NO;
- license at review time: MIT;
- useful reference: Vision configuration, language detection, bounding boxes, concurrency, availability gating;
- excluded: Vapor server, LAN HTTP API, server UI/monitoring and OCR-cluster behavior.

If source code is copied rather than independently implemented from platform documentation, applicable MIT copyright/license notice obligations must be preserved.

## Alternatives rejected

### Cloud-only OCR
Not the default because it unnecessarily uploads every receipt and creates cost/network/provider-retention dependency.

### Embedded localhost/LAN OCR server
Rejected because an in-process app can invoke native Vision directly.

### Self-hosted OCR model
Rejected for MVP because Apple already supplies maintained on-device OCR and there is no evidence that training/operating a separate OCR model is necessary.

### Generic multi-provider router
Rejected for MVP because the complexity is not justified before benchmark evidence. One conditional fallback is sufficient.

## Validation

This product decision is validated only when a physical supported iPhone can:

1. scan a physical receipt;
2. operate in airplane mode;
3. run Apple Vision OCR;
4. produce critical field candidates or an explicit review state;
5. allow user correction;
6. preserve draft state across interruption;
7. save the verified receipt later.

Cloud Assist has its own privacy/quality acceptance gates.

## Revisit triggers

Revisit if:

- controlled benchmarks show local OCR plus verification cannot provide an acceptable experience;
- Apple materially changes Vision/VisionKit;
- a different on-device capability materially improves structured receipt extraction;
- cloud economics/privacy materially change;
- Android becomes a first-class launch target.

## Sources reviewed

- https://developer.apple.com/documentation/vision/recognizetextrequest
- https://developer.apple.com/documentation/visionkit/vndocumentcameraviewcontroller
- https://developer.apple.com/documentation/vision/recognizedocumentsrequest
- https://docs.expo.dev/workflow/customizing/
- https://github.com/riddleling/iOS-OCR-Server
