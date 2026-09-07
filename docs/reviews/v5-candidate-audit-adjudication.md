# v5 candidate audit adjudication

This correction pass updates the CSV to match the current worktree after `c353fba`.

- `signup-grant-limits` remains P0 and blocks release: the IP claim count and insert are not protected by a unique or conditional database constraint.
- `expo-oauth` is P1, not P0: it is a mobile-gated login-CSRF/session-replacement risk; the endpoint does not issue or expose a session cookie.
- `price-environment` is retained only as a P2 configuration decision: server-side credits already pass `PAYMENTS_PRICE_ENV` explicitly.
- `ledger-consumption` is P2: the intentional 40-lot ceiling returns `too fragmented`, not a false insufficient-balance error.
- Ticket atomicity now excludes `replyAdmin`, which `c353fba` already moved into a batch. The remaining create, user-reply, and close-admin paths remain independently written.
- The CSV evidence paths were corrected for jobs, tickets, control-read, dashboard routes, users hooks, the admin route helper, and reset-password.
