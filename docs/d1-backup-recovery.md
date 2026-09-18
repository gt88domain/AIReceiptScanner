# D1 backup and recovery

This is the minimum production data-safety routine for a solo operator. It is
an operating runbook, not an automated template feature. The template does not
create backup Workers, Workflows, buckets, credentials, or production jobs.

Last verified against Cloudflare documentation: 2026-08-27.

## Recovery policy

| Layer                | Purpose                                                         | Solo-operator policy                                                                                            |
| -------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| D1 Time Travel       | Fast recovery from a bad migration or accidental write          | Primary short-window recovery; always on for production-storage D1 databases                                    |
| Encrypted SQL export | Recovery beyond the Time Travel window and independent evidence | Export weekly during the lowest-traffic window; retain for 90 days                                              |
| Restore rehearsal    | Prove that an export is usable before an incident               | Restore the newest export to a disposable non-production D1 once per quarter and after a material schema change |

Cloudflare currently documents Time Travel retention as 30 days on Workers
Paid and 7 days on Workers Free. Confirm the actual database storage version
and current account limits before relying on that window. Time Travel is not a
substitute for a longer-lived independent export.

Authoritative references:

- [Time Travel and backups](https://developers.cloudflare.com/d1/reference/time-travel/)
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [Import and export data](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [Wrangler D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/)

## Ownership and storage

The product owner is the backup owner and recovery approver. Record the real
database name, Cloudflare account, storage location, last successful export,
last restore rehearsal, and next due date in the private operator notebook—not
in this repository.

A full SQL export contains personal data, password hashes, OAuth records,
payment references, and other production data. Store it only in a private,
access-controlled location with encryption at rest and account MFA. Never put
an export in Git, a public bucket, a shared support folder, or application logs.
Keep the checksum beside the encrypted export, and delete expired copies under
the 90-day policy.

## Initial read-only check

From `apps/server`, inspect the database before adopting this runbook:

```bash
pnpm exec wrangler d1 info <DATABASE_NAME>
```

Confirm that the output names the intended production database. A current
production-storage database supports Time Travel; do not follow legacy alpha
snapshot instructions. This command is read-only, but it still requires the
correct Cloudflare account.

## Weekly export

An export can block other D1 requests while it runs, so use the lowest-traffic
window and avoid migrations, deploys, imports, and bulk writes at the same time.

```bash
pnpm exec wrangler d1 export <DATABASE_NAME> \
  --remote \
  --output=<PRIVATE_BACKUP_DIRECTORY>/<DATABASE_NAME>-YYYYMMDD-HHMMSS.sql

shasum -a 256 <PRIVATE_BACKUP_DIRECTORY>/<DATABASE_NAME>-YYYYMMDD-HHMMSS.sql
```

After the command succeeds:

1. Confirm the file is non-empty and the checksum is recorded.
2. Encrypt or move it into the approved encrypted private location.
3. Record the timestamp and result in the private operator notebook.
4. Apply the 90-day retention policy.

D1 export does not support virtual tables. The current template migrations do
not create an FTS virtual table; re-check this limitation if a downstream
product later adds FTS5 or another virtual table.

## Quarterly restore rehearsal

Never rehearse against production. Create or select a disposable
non-production D1 with no Worker traffic, then import the newest decrypted SQL
export:

```bash
pnpm exec wrangler d1 execute <RESTORE_REHEARSAL_DATABASE> \
  --remote \
  --file=<DECRYPTED_PRIVATE_EXPORT.sql>
```

Verify at minimum:

- the Drizzle migration ledger exists and has the expected latest entry;
- core auth, billing, credit, job, and asset tables can be queried;
- representative row counts are plausible;
- foreign-key validation and the product's read-only smoke checks succeed;
- no production Worker is bound to the rehearsal database.

Record the result and remove the decrypted working copy. Delete the disposable
Cloudflare database only after confirming its exact name and that no Worker is
bound to it. Database creation, import, and deletion are external mutations and
require an explicit operator decision when the rehearsal is performed.

## Incident recovery

1. Stop deploys, migrations, repair scripts, and avoidable writes. Record the
   suspected incident time, timezone, symptoms, and last known good request.
2. If safe, export the current damaged state for forensic comparison. Do not
   treat this export as the recovery copy.
3. Use `wrangler d1 time-travel info <DATABASE_NAME> --timestamp=<RFC3339>` to
   identify a candidate restore point. Start before the suspected damaging
   operation and account for the recorded timezone.
4. Review the target database and timestamp twice. A Time Travel restore
   overwrites the database in place and is destructive.
5. Only after explicit owner approval, run the restore command printed by the
   Time Travel info result or the documented `wrangler d1 time-travel restore`
   command for that exact database and timestamp.
6. Verify the migration ledger, authentication, paid entitlements, credit
   balances, job state, and critical product reads before reopening writes.
7. Prefer a forward fix for code or schema defects. Do not delete applied
   migration files or rewrite migration history.

If the required point predates the Time Travel window, restore an encrypted SQL
export into a new non-production database first. Validate it there, then plan a
reviewed binding cutover. Do not blindly import an old dump into the current
production database.

## Scope boundaries

- D1 recovery does not back up R2 objects. Reconcile asset metadata and R2
  objects separately when a product enables Storage.
- Payment providers remain the authority for provider-side transactions; D1
  recovery must not synthesize a paid entitlement without verified provider
  evidence.
- This runbook does not authorize production migration, restore, secret,
  deployment, database creation, or database deletion during ordinary coding
  work.
