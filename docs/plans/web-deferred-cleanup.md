# Deferred Web review cleanup

## Core goal

Resolve the demonstrable Web findings from WEB-101, WEB-102, WEB-104, WEB-105,
WEB-110, and WEB-111 without freezing the content stack, inventing product
behavior, or masking uncertainty with defensive code.

## Decisions and implementation status

| ID | Decision | Status |
| --- | --- | --- |
| WEB-101 | Listing components are gallery-only; compose the retained gallery from UI primitives and remove the unused framework | Implemented and statically reviewed |
| WEB-102 | Add an explicit CSP for current first-party API, GA, OpenPanel, and Turnstile sources; strengthen HSTS | Implemented and statically reviewed; browser review pending |
| WEB-104 | Both contact and newsletter call the shared server verifier before rate limiting or delivery; production without a secret fails closed | Code complete, real-key verification deferred |
| WEB-105 | Keep prerender disabled until public content and user-state behavior are accepted; the page inventory also drives sitemap behavior and is not deleted | No code change by design |
| WEB-110 | Remove only five dependencies proven to have no Web source or configuration references | Implemented and lockfile committed |
| WEB-111 | Pass the documented failed Query object through the shared client callback and refetch only its query hash | Implemented and statically reviewed |

Fumadocs, Orama, blog, and the design-system gallery remain active. This change
does not enable prerendering or introduce a new listing abstraction.

## Deferred test plan

Focused tests were updated after implementation and core-goal review to cover:

- the exact CSP directives and HSTS `includeSubDomains` value;
- server rendering/hydration with the CSP present;
- GA, OpenPanel, and Turnstile loading under the policy;
- contact and newsletter rejection for missing and fake Turnstile tokens with
  production configuration;
- a Query Cache error retry refetching only the failed query hash;
- no imports from the removed listing directory or removed dependencies;
- the design-system gallery rendering at desktop and mobile widths;
- sitemap behavior remaining unchanged while prerender stays disabled.

Recommended commands, not run:

```sh
pnpm --filter web check-types
pnpm --filter web test:integration
pnpm --filter web build
pnpm check:brand-safety
```

Manual verification with real non-production keys remains required for
Turnstile, GA, and OpenPanel. No test, build, browser check, or deployment is
authorized in this phase.

## Review and test-authoring status

- Core-goal review: passed by two independent static reviewers.
- Review findings: no actionable defects; CSP nonce/hash hardening remains a
  future option rather than part of this finding.
- Test authoring: implemented after core review.
- Test execution: not authorized and not run.
