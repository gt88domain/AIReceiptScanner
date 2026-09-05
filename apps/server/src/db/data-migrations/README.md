# Data migrations

Use this directory for versioned transformations between valid data shapes.
Each operation must be idempotent, document its source and target, and include
a verification query or command. Do not change table structure here.

## v5 legacy credit recovery audit

Before enabling recovery processing for a database upgraded from the pre-v5
ledger, run `pnpm --filter server audit:legacy-credit-recoveries -- <sqlite-path>`
against the migration-applied SQLite snapshot. The command is idempotent: it
rebuilds only provable recovery facts, leaves ambiguous orders in
`legacy_review`, and writes a JSON receipt beside the supplied snapshot. Retain
that receipt with the release evidence. A production snapshot must be handled
through the approved export process; the command deliberately does not accept a
remote database URL.
