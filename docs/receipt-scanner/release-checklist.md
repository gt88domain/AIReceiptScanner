# AIReceiptScanner iOS Release Checklist

Status: RELEASE GATE — NOT EXECUTED  
Last reviewed: 2026-09-19

Use this checklist only against an exact release candidate commit/build. A checked item requires evidence.

## 1. Release identity

- [ ] App name is AIReceiptScanner or approved shipping name.
- [ ] iOS bundle identifier is final.
- [ ] URL scheme is final and product-owned.
- [ ] Apple Team ID is configured.
- [ ] EAS project ID is real.
- [ ] Production server URL is real.
- [ ] Production web URL is real.
- [ ] App Store URL/product record exists where required.
- [ ] No demo.aiarticles.com remains in shipping config.
- [ ] No com.example.yourapp remains.
- [ ] No YOUR_EAS_PROJECT_ID remains.
- [ ] No your-app-scheme remains.
- [ ] No placeholder RevenueCat product IDs remain.

Evidence:
- exact config files;
- production preflight output;
- build metadata.

## 2. Native application baseline

- [ ] mobile feature intentionally enabled.
- [ ] production build uses a development-client-independent native binary.
- [ ] Apple Sign In works if offered.
- [ ] Google Sign In works if offered.
- [ ] deep-link auth return works on physical device.
- [ ] secure session storage works across restart.
- [ ] logout clears app/account-sensitive cached state.
- [ ] account switch cannot reveal previous user's receipt cache.
- [ ] Expo Updates policy is understood and tested.
- [ ] production build can be rolled back/replaced operationally.

## 3. Camera and local OCR

- [ ] camera permission copy describes receipt scanning.
- [ ] photo permission copy is product-appropriate, not avatar-template text.
- [ ] camera denied path is usable.
- [ ] photo import path is usable.
- [ ] VisionKit scanner works on physical device.
- [ ] scanner cancellation works.
- [ ] scanner error works.
- [ ] Apple Vision OCR works in airplane mode.
- [ ] normalized OCR contract includes geometry.
- [ ] local OCR failure is explicit.
- [ ] legacy/modern Vision path is verified for every supported OS band.
- [ ] iOS 26 enhanced path, if enabled, is availability-gated.

## 4. Receipt correctness

- [ ] merchant can be reviewed/edited.
- [ ] date can be reviewed/edited.
- [ ] currency can be reviewed/edited.
- [ ] total can be reviewed/edited.
- [ ] ambiguous date does not silently commit.
- [ ] ambiguous currency does not silently commit.
- [ ] multiple total candidates produce review where necessary.
- [ ] tax-included receipt works.
- [ ] tip/service charge receipt works.
- [ ] refund/negative receipt works.
- [ ] zero-decimal currency handling is defined.
- [ ] no binary floating-point persistence bug for money.
- [ ] line-item failure does not block otherwise usable receipt.

## 5. Draft/lifecycle reliability

- [ ] draft survives app kill after capture.
- [ ] draft survives app kill during OCR/review according to policy.
- [ ] app restart does not create duplicate saved receipt.
- [ ] retry is idempotent.
- [ ] user edit wins over delayed local result.
- [ ] user edit wins over delayed cloud result.
- [ ] verified receipt cannot be overwritten by stale extraction.

## 6. Server/data authorization

- [ ] receipt create is authenticated where required.
- [ ] receipt list is owner-scoped.
- [ ] receipt detail is owner-scoped.
- [ ] receipt update is owner-scoped.
- [ ] receipt delete is owner-scoped.
- [ ] receipt export is owner-scoped.
- [ ] private asset access is owner-scoped.
- [ ] guessed UUID test passes.
- [ ] guessed/modified asset reference test passes.
- [ ] client-supplied userId is never authorization authority.

## 7. Cloud Assist

- [ ] selected provider is documented.
- [ ] current pricing is documented.
- [ ] current retention/data-use terms are documented.
- [ ] provider/model version is recorded.
- [ ] first-use consent copy is approved.
- [ ] Ask Every Time works.
- [ ] Automatic Failed/Insufficient Only works.
- [ ] Never Cloud produces zero provider requests.
- [ ] normal local success is not uploaded.
- [ ] timeout is bounded.
- [ ] 429 handling works.
- [ ] 5xx handling works.
- [ ] invalid schema handling works.
- [ ] empty result handling works.
- [ ] provider result cannot directly perform tools/actions.
- [ ] no hidden second provider fallback exists.
- [ ] provider cost anomaly threshold/alert is defined.

## 8. Storage and privacy

- [ ] default original-image retention mode is approved.
- [ ] local temporary-image cleanup works.
- [ ] unsaved recoverable drafts are not prematurely deleted.
- [ ] "do not keep original" creates no permanent remote image.
- [ ] "keep original" uses private authorized storage.
- [ ] signed/private access expires where applicable.
- [ ] receipt images are not public.
- [ ] raw provider responses are not retained indefinitely by default.
- [ ] full card numbers are discarded.
- [ ] CVV is never retained.
- [ ] payment last4 is retained only if product policy requires it.
- [ ] privacy policy describes local-first plus optional cloud accurately.

## 9. Analytics/crash/logging

- [ ] analytics contains no receipt text.
- [ ] analytics contains no merchant.
- [ ] analytics contains no amount.
- [ ] analytics contains no address.
- [ ] analytics contains no payment data.
- [ ] analytics contains no image URI.
- [ ] crash reports contain no receipt body/text.
- [ ] server logs contain no raw receipt/provider body.
- [ ] forced-error network/payload audit completed.
- [ ] build/version/commit diagnostics remain available.

## 10. Search and history

- [ ] empty receipt history state is useful.
- [ ] loading state is useful.
- [ ] error state is useful.
- [ ] pagination is bounded.
- [ ] merchant search works.
- [ ] date filter works.
- [ ] category filter works.
- [ ] currency filter works.
- [ ] possible duplicate warning works.
- [ ] possible duplicate never auto-deletes.

## 11. Export

### CSV
- [ ] Unicode works.
- [ ] commas/quotes/newlines work.
- [ ] spreadsheet formula-injection policy verified.
- [ ] currency is explicit.
- [ ] multiple currencies are not silently merged.

### PDF/report
- [ ] long merchant names work.
- [ ] long line items work if included.
- [ ] Unicode works.
- [ ] image-not-retained mode works.
- [ ] retained-image mode works where included.
- [ ] multiple currencies are labeled/separated.

## 12. Billing

- [ ] RevenueCat iOS SDK key is production-correct.
- [ ] entitlement ID is correct.
- [ ] product IDs match App Store products.
- [ ] monthly purchase works if shipped.
- [ ] annual purchase works if shipped.
- [ ] paywall cancellation works.
- [ ] server webhook verifies authorization.
- [ ] duplicate webhook is idempotent.
- [ ] out-of-order webhook handling is safe.
- [ ] refund behavior is defined.
- [ ] expiration behavior is defined.
- [ ] restore purchase works.
- [ ] reinstall then restore works.
- [ ] logout/login identity sync works.
- [ ] purchase does not permanently grant server entitlement solely from client state.

## 13. Account/data controls

- [ ] export data is accessible.
- [ ] delete account is accessible in-app.
- [ ] active App Store subscription does not block product-account deletion.
- [ ] subscription-management guidance is separate.
- [ ] receipt records are deleted according to policy.
- [ ] receipt assets are deleted according to policy.
- [ ] generated exports are deleted according to policy.
- [ ] pending jobs respect deletion barrier.
- [ ] delayed provider response cannot recreate deleted receipt.
- [ ] infrastructure backup limitations are documented honestly.

## 14. Accessibility

- [ ] VoiceOver scan flow.
- [ ] VoiceOver verification flow.
- [ ] VoiceOver paywall/settings.
- [ ] Dynamic Type at large sizes.
- [ ] dark mode.
- [ ] light mode.
- [ ] high contrast.
- [ ] uncertainty not communicated by color only.
- [ ] tappable controls meet practical touch-target expectations.

## 15. Device/OS matrix

Record actual tested devices.

- [ ] minimum-supported physical iPhone.
- [ ] current mainstream physical iPhone.
- [ ] recent Pro-class iPhone when available.
- [ ] minimum supported iOS.
- [ ] modern Vision API iOS version.
- [ ] current public iOS.
- [ ] iOS 26 structured document path if feature enabled.

Simulator-only evidence cannot satisfy this section.

## 16. Performance evidence

- [ ] local OCR p50 measured.
- [ ] local OCR p95 measured.
- [ ] parser p50/p95 measured.
- [ ] verification-ready latency measured.
- [ ] cloud p50/p95 measured.
- [ ] memory behavior observed on minimum-supported device.
- [ ] large image behavior bounded.
- [ ] benchmark report references exact build.

## 17. Security/adversarial

- [ ] zero-byte image.
- [ ] corrupt JPEG.
- [ ] corrupt HEIC.
- [ ] MIME spoof.
- [ ] extreme dimensions.
- [ ] provider prompt injection printed on receipt.
- [ ] repeated Cloud Assist abuse/rate limit.
- [ ] direct receipt-ID guessing.
- [ ] direct asset-ID guessing.
- [ ] CSV formula injection.
- [ ] stale job after deletion.
- [ ] stale job after account switch.

## 18. App Store submission

- [ ] App Store Connect app record.
- [ ] app privacy answers reflect real SDK/data flows.
- [ ] privacy policy URL valid.
- [ ] terms URL valid.
- [ ] support URL valid.
- [ ] account deletion path described for review.
- [ ] subscription products ready.
- [ ] restore mechanism visible.
- [ ] review notes explain login/test account if needed.
- [ ] screenshots match the real current UI.
- [ ] camera/photo usage description accurate.
- [ ] optional cloud processing description consistent with policy.
- [ ] signed build uploaded from exact approved commit/build.

## 19. Release evidence header

Fill before approval:

Release candidate commit: NOT SET  
Branch: NOT SET  
Build number: NOT SET  
EAS build URL/ID: NOT SET  
TestFlight build: NOT SET  
Primary device: NOT SET  
Primary iOS version: NOT SET  
OCR benchmark report: NOT SET  
Cloud provider benchmark: NOT SET  
Security review: NOT SET  
Final decision: NO-GO UNTIL COMPLETED

## 20. Automatic No-Go

Do not submit/release if:

- template identity/placeholders remain;
- local receipt can be silently lost;
- wrong critical values are routinely accepted without review;
- owner isolation is not proven;
- Never Cloud still transmits receipt images;
- user edits can be overwritten;
- provider retention terms are unknown;
- account deletion is blocked by active subscription;
- receipt content leaks into analytics/crash logs;
- purchase/restore has not been exercised;
- no physical-device evidence exists;
- release candidate cannot be tied to one exact commit/build.
