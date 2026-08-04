# v0.4.2 public entry performance

Base: `v0.4.1` (`c3ce2a28a22989d1ffb42ae6a8631b738625eecd`). Measurements use a clean production Web build and gzip the emitted assets with Node's standard library.

| Metric | v0.4.1 | v0.4.2 | Change |
| --- | ---: | ---: | ---: |
| Common entry raw | 941,406 B | 730,724 B | -22.4% |
| Common entry gzip | 267,563 B | 202,119 B | -24.5% |
| Global CSS raw | 266,920 B | 171,331 B | -35.8% |
| Global CSS gzip | 53,490 B | 25,976 B | -51.4% |

`pnpm perf:bundle` rebuilds and writes bundle reports. `pnpm perf:homepage` writes the production entry's static request graph. `pnpm perf:budget` is the CI gate; it uses fixed limits in `apps/web/performance-budget.json` and rejects optional Docs, Search, Admin, Billing, Credits, Composer, alternate-theme, and lazy Docs assets in that graph.

The local browser runtime available during this change did not permit localhost network capture, so timing/HAR data is intentionally non-blocking and is not fabricated. The deterministic entry graph remains the release gate.

The global Toaster remains mounted because it is needed immediately after auth and checkout redirects. Tooltip was removed from the global provider tree; components own the provider scope they require. Analytics now initializes after browser idle when configured.
