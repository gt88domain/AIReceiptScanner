# Receipt OCR Provider Benchmark Protocol

Status: PLANNED — NO PROVIDER SELECTED  
Last reviewed: 2026-09-19

The provider decision must be made from the same controlled receipt corpus. Marketing claims, vendor demos and memory-based assumptions are not acceptance evidence.

## 1. Question being tested

Can Apple Vision plus deterministic local parsing provide a safe enough default receipt experience, and when it cannot, which single cloud provider gives the best combination of critical-field accuracy, privacy, latency and cost?

The benchmark compares three product strategies:

A. Apple Vision local-only + user review.  
B. Cloud/VLM-only.  
C. Apple Vision local-first + conditional cloud fallback.

The benchmark must not assume C wins before testing.

## 2. Corpus

Initial target: at least 300 legally usable receipts.

Split:

- development set for parser iteration;
- validation set for threshold tuning;
- unseen final set for release-gate evaluation.

Never repeatedly tune against the final set.

Recommended coverage:

- restaurant with tip;
- restaurant with service charge;
- grocery;
- retail;
- hotel;
- taxi/rideshare;
- fuel;
- pharmacy;
- refund;
- cash receipt;
- card receipt;
- long receipt;
- faded thermal paper;
- wrinkles;
- perspective;
- glare;
- low light;
- rotation;
- multiple currencies;
- multiple date formats;
- tax included;
- tax excluded;
- discount/coupon;
- no tax;
- multiple total-like numbers.

Languages may only be advertised after the corresponding sample coverage is tested.

## 3. Ground truth

Ground truth is manually verified and independent from provider output.

Minimum ground truth per sample:

- merchant;
- date;
- time when visible;
- currency;
- subtotal when visible;
- tax when visible;
- tip/service fee when visible;
- total;
- payment method when intentionally in scope;
- line items when benchmarked.

Unknown/unreadable values remain null. Do not force a value simply because a provider emitted one.

## 4. Local Apple benchmark

Record per receipt:

- device;
- iOS version;
- build/commit;
- Apple API path used;
- capture/import source;
- OCR duration;
- line count;
- confidence distribution where available;
- parser duration;
- LOCAL_PASS/LOCAL_REVIEW/LOCAL_FAIL;
- each field prediction;
- user-review warning reasons.

Primary metrics:

- merchant exact/normalized accuracy;
- date accuracy;
- currency accuracy;
- total accuracy;
- critical-field joint accuracy;
- silent critical error count;
- empty OCR rate;
- p50/p95 latency;
- crash/failure rate.

The product should prefer review over wrong-but-confident critical values.

## 5. Cloud candidate benchmark

Only candidates with current official documentation, commercial use terms and acceptable privacy/retention are eligible.

Candidate families may include:

- dedicated receipt/document APIs;
- one or more general multimodal models with structured output.

For every candidate record:

- official product/model name;
- API/model version;
- pricing unit;
- minimum monthly commitment;
- field/schema behavior;
- supported languages;
- request/file limits;
- timeout/failure behavior;
- retention policy;
- training/data-use policy;
- deletion controls;
- region/data-residency options where material;
- SDK/API quality;
- vendor-lock-in risk.

Unknown facts must be marked UNKNOWN rather than inferred.

## 6. Same-input rule

All candidates receive the same normalized test image for a given benchmark run.

Do not compare:

- one provider on raw camera photos;
- another on VisionKit-corrected photos;
- another on hand-picked images.

If preprocessing is part of the strategy, benchmark that strategy separately and label it.

## 7. Cost calculation

For each candidate record:

- attempted requests;
- successful usable results;
- retries;
- pages/documents billed;
- input/output token counts when applicable;
- fixed monthly minimum;
- variable usage;
- currency;
- observed cost;
- estimated effective cost per successful receipt.

Report:

- FACT: vendor-published unit price/terms;
- ESTIMATE: calculated cost from benchmark traffic;
- ASSUMPTION: future-user behavior or volume.

Do not confuse a document, page, credit and token.

## 8. Privacy gate

A provider cannot be production-selected until these are verified from current first-party terms/docs:

- whether API data is used to train/improve models;
- default retention duration;
- abuse/security log retention;
- optional zero-retention controls;
- whether zero-retention requires approval/enterprise status;
- deletion API/control;
- region/data-residency options where relevant;
- subprocessors where required for policy work.

If a required fact remains UNKNOWN, that provider is not approved for silent/automatic Cloud Assist.

## 9. Latency and reliability

Record:

- p50 latency;
- p95 latency;
- timeout rate;
- 429 rate;
- 5xx rate;
- invalid schema rate;
- empty usable result rate.

Test poor-network conditions separately.

Cloud latency does not block the local manual-review path.

## 10. Structured-output safety

Provider output must be normalized and validated.

Reject or mark review when:

- currency invalid/unknown;
- amount malformed;
- impossible date;
- total absent;
- output schema mismatch;
- provider returns prose instead of expected structure;
- line items exceed sane bounds;
- data types are inconsistent.

A valid JSON response is not equivalent to a correct receipt.

## 11. Prompt-injection test

Corpus includes visible text attempting to instruct an AI model.

Provider output is data only.

No cloud provider receives tool authority. Output cannot directly:

- delete data;
- pay;
- email;
- modify account;
- change subscription;
- read another receipt.

## 12. Selection matrix

Score evidence separately, not as one unexplained total:

- critical-field accuracy;
- silent critical errors;
- line-item quality;
- language coverage;
- p95 latency;
- effective cost/success;
- retention/privacy;
- deletion controls;
- API quality;
- operational burden;
- vendor lock-in.

A single overall winner may be selected only after the underlying measurements are visible.

## 13. Decision rules

Prefer no cloud fallback if local OCR + review produces an acceptable user outcome and cloud improvement is marginal.

Prefer one dedicated receipt/document provider when it materially improves critical fields and its privacy/economics are acceptable.

Prefer a VLM when the same corpus shows materially better useful extraction, schema stability is adequate and privacy/cost are acceptable.

Do not implement a generic provider router for MVP.

## 14. Initial benchmark shortlist

This document intentionally does not lock a final provider. Current research candidates include:

- Veryfi;
- Mindee;
- Google Document AI;
- AWS Textract AnalyzeExpense;
- Azure Document Intelligence Receipt;
- one current low-cost multimodal model from OpenAI/Google/Anthropic if eligible.

Before benchmark execution, refresh pricing, model/version, license/terms and retention facts from first-party documentation.

## 15. Benchmark output artifact

Produce a dated report containing:

- corpus summary;
- device/iOS/build;
- provider/model versions;
- raw aggregate metrics;
- critical-field confusion/error examples;
- latency percentiles;
- actual/estimated cost;
- privacy/retention evidence links;
- selected MVP provider or decision to ship local-only;
- explicit rejected alternatives and reasons.

## 16. Current state

Corpus: NOT BUILT  
Apple local benchmark: NOT RUN  
Cloud candidates refreshed: NOT RUN  
Cloud benchmark: NOT RUN  
Provider selected: NO  
Production credentials purchased/configured: NO
