# AIReceiptScanner Security & Privacy Plan

Status: REQUIRED DESIGN BASELINE  
Last reviewed: 2026-09-19

Receipt images can contain financial, location, merchant, address and partial payment information. The MVP therefore uses minimum data retention and local processing by default.

## 1. Privacy principles

1. Local first.
2. Collect only what the product needs.
3. Do not silently transmit receipt images to cloud providers.
4. Separate user-visible product data from operational metadata.
5. Never use analytics/crash tooling as a shadow receipt database.
6. User edits are authoritative.
7. Deletion must cover product records, assets, pending jobs and provider obligations.
8. Unknown third-party retention behavior blocks automatic production use.

## 2. Data classification

### Class A — Highly sensitive receipt content

Examples:
- receipt image;
- OCR text;
- merchant/address;
- purchase amount;
- line items;
- tax/tip;
- payment details;
- last4 if retained.

Rules:
- owner-scoped;
- never public;
- never sent to analytics;
- never included in crash attachments/log breadcrumbs;
- cloud transmission only under policy/consent.

### Class B — Structured product data

Examples:
- normalized merchant;
- date;
- currency;
- total;
- category;
- verification status.

Rules:
- owner-scoped;
- stored only as needed for product functionality;
- included in user export;
- deleted according to account/data deletion policy.

### Class C — Operational metadata

Examples:
- extraction source;
- provider/model version;
- duration;
- failure category;
- estimated cost;
- created/completed timestamp.

Rules:
- should not contain raw receipt text;
- useful for reliability/cost monitoring;
- retention may differ from product content but must be documented.

### Class D — Aggregate analytics

Examples:
- scan_started;
- scan_completed;
- local_ocr_failed;
- export_completed.

Rules:
- no merchant;
- no amount;
- no OCR text;
- no address;
- no image URI;
- no payment data.

## 3. Capture and temporary files

The local capture path should use app-private temporary storage.

Rules:
- no public Photos save by default;
- no iCloud/shared backup unless intentionally designed;
- local draft exists only as long as needed to recover user work;
- cleanup must not delete an unsaved draft while the user still expects recovery;
- completed temporary files are removed according to retention setting.

## 4. Original image retention modes

### Mode A — Do not keep original
Recommended default.

After successful verification/save:
- persist structured receipt data;
- remove temporary receipt image after the defined safe point;
- no permanent R2/remote asset is created.

### Mode B — Keep original
User opts in.

Requirements:
- use existing authenticated asset model;
- private object;
- owner authorization before access;
- no raw public URL;
- delete with receipt/account deletion.

The UI must explain that retaining images improves audit/reference capability but increases stored personal data.

## 5. Cloud Assist privacy

Cloud Assist preferences:

- Ask every time — default.
- Automatic only when local extraction is insufficient.
- Never cloud.

The app must be able to prove that "Never" causes zero receipt-provider requests.

First cloud use must state:
- the receipt image will leave the device;
- the purpose is extraction improvement;
- the selected provider category/name when product copy allows;
- where the user can change the preference.

Do not silently fallback to a second provider.

## 6. Provider approval checklist

Before production use, verify from first-party documentation/contract:

- training/model-improvement use;
- default retention;
- abuse/security retention;
- zero-retention option;
- zero-retention eligibility;
- deletion endpoint/control;
- data residency/region when relevant;
- subprocessors as required by product policy;
- security certifications where material;
- incident/availability behavior;
- current pricing and unit.

Mark UNKNOWN explicitly.

Provider approval is invalid if it relies only on old screenshots/blog posts or memory.

## 7. Storage authorization

Receipt image authorization must never be based on knowing an R2/storage key.

Use existing asset/service authorization patterns.

For every file operation prove:
- authenticated user;
- asset belongs to receipt/user;
- requested action is allowed;
- generated signed access expires quickly where used.

Admin UI should show operational state by default, not raw receipt content.

## 8. Server authorization

Every receipt query must be owner-scoped server-side.

Never trust:
- client-supplied userId;
- hidden navigation;
- route visibility;
- mobile UI state.

Test read/update/delete/export and asset access separately.

## 9. Payment data minimization

Do not retain:
- full PAN/card number;
- CVV/CVC;
- magnetic-stripe data;
- PIN;
- raw payment QR credentials.

If product value requires payment method:
- store category/brand;
- optionally last4 only when needed and disclosed.

If OCR output contains full card-like numbers, parser normalization should discard them rather than persist by default.

## 10. Logging policy

Production logs may include:
- receipt record ID;
- user/account opaque ID where allowed by platform policy;
- extraction source;
- status/error category;
- provider code;
- duration;
- retry count.

Production logs must not include:
- receipt OCR text;
- raw provider response;
- merchant/address;
- amount;
- payment number;
- receipt image/body;
- signed/private image URL.

Error helpers must redact before logging provider payloads.

## 11. Crash monitoring

Crash/error SDK configuration must be tested with forced receipt failures.

Disable or scrub:
- screenshots/session replay on sensitive receipt screens unless explicitly proven safe;
- request bodies;
- receipt file paths if paths reveal user content;
- breadcrumbs containing form field values.

Record build/commit/version without receipt content.

## 12. Analytics

Allowed event dimensions should be intentionally enumerated.

Examples:
- local/cloud source;
- pass/review/fail;
- broad failure reason;
- elapsed-time bucket;
- subscription entitlement state;
- export type.

Do not add free-form property spreading from receipt objects into analytics.

## 13. Local OCR privacy claim

Allowed:
- "Receipts are processed on-device by default."
- "Local OCR works without an internet connection."

Do not claim:
- "100% local" for the whole product while Cloud Assist/sync exists;
- "zero data retention" unless every relevant system, backup and provider path actually supports it.

## 14. Data deletion model

Deletion has multiple layers:

1. user-facing receipt records;
2. receipt line items;
3. extraction metadata where not legally/operationally required;
4. private receipt images;
5. generated exports;
6. local cached/draft files;
7. queued/pending extraction work;
8. cloud-provider retained input/result where a deletion mechanism or TTL applies;
9. account/profile product data;
10. backups/history according to infrastructure constraints and policy.

A user-visible deletion request must not be considered complete merely because the primary D1 row disappeared.

## 15. Delayed-job resurrection protection

Deletion creates a barrier against stale work.

A delayed:
- OCR result;
- provider result;
- queue retry;
- export completion;
- asset upload completion

must verify the current receipt/account state before applying.

Deleted data must not be recreated by an old job.

## 16. D1/backups

Infrastructure backup/restore behavior must be reflected in the privacy policy and operational deletion runbook.

If historical restore can temporarily contain previously deleted records, post-restore procedures must reapply deletion/tombstone state before restored data becomes user-accessible.

Do not promise instantaneous physical erasure from every historical backup unless the infrastructure contract proves it.

## 17. Account deletion vs App Store subscription

Product account deletion and App Store subscription renewal are separate concerns.

The user must be allowed to delete the product account even if a store subscription is currently active.

The UI can:
- explain that deleting the app account does not necessarily cancel App Store renewal;
- link to subscription management;
- warn about loss of product data.

It must not block account deletion solely to force cancellation first.

## 18. Privacy export

Provide an export of the user's product data in a usable format.

At minimum include:
- receipt structured fields;
- categories;
- line items;
- creation/update timestamps;
- retained images or image references where export policy permits;
- report/export history only if it is product data.

Do not include internal secrets, authorization metadata or other users' data.

## 19. Abuse/security boundaries

Threats to test:

- guessed receipt IDs;
- modified asset IDs;
- oversized images;
- decompression bombs/extreme dimensions;
- repeated Cloud Assist calls;
- free-trial farming;
- provider callback/retry abuse;
- CSV formula injection;
- prompt injection printed on receipts;
- malicious filenames/MIME mismatch.

Rate limits and image limits should be narrow enough to cap cost/memory while not breaking normal receipt use.

## 20. Provider prompt-injection boundary

OCR/VLM output is untrusted data.

A provider result can suggest fields but cannot:
- invoke tools;
- delete records;
- change billing;
- send mail;
- change account;
- read unrelated receipts.

Printed instructions in a receipt have zero control authority.

## 21. Human/admin access

The solo operator should not need to inspect user receipt images during normal support.

Admin/support default view:
- receipt ID;
- status;
- provider;
- timestamps;
- error class;
- cost/retry metadata.

If privileged content inspection is ever added, it requires:
- explicit product/legal decision;
- audit trail;
- least privilege;
- support reason;
- user disclosure where appropriate.

Do not build it into MVP by default.

## 22. Security Definition of Done

Before public release:

- owner isolation tests pass;
- private asset authorization passes;
- malformed/oversized image tests pass;
- Cloud Never mode proves zero provider traffic;
- analytics payload audit passes;
- crash payload audit passes;
- stale job cannot resurrect deleted data;
- account deletion works with active subscription;
- provider retention/deletion facts are documented;
- production config contains no demo/placeholder endpoints or IDs.

## 23. Current state

Local-first policy: DOCUMENTED  
Production code: NOT IMPLEMENTED  
Provider selected: NO  
Provider privacy approval: NOT DONE  
Deletion implementation review: NOT DONE  
Analytics payload audit: NOT RUN  
Crash payload audit: NOT RUN  
Security tests: NOT RUN
