-- Source: jobs created before migration 0014.
-- Target: nullable legacy idempotency fields added by migration 0014.
-- Safe rerun: each update changes only rows that are still NULL.
-- Run after structural migration and before relying on historical job lookups:
-- pnpm -F server exec wrangler d1 execute DB --remote --file src/db/data-migrations/0014-backfill-job-idempotency.sql

UPDATE `job`
SET `idempotency_key` = 'legacy:' || `id`
WHERE `idempotency_key` IS NULL;

UPDATE `job`
SET `payload_hash` = 'legacy:' || `id`
WHERE `payload_hash` IS NULL;

-- Verification: this must return 0 before cutover.
SELECT COUNT(*) AS `remaining_legacy_jobs_without_idempotency`
FROM `job`
WHERE `idempotency_key` IS NULL OR `payload_hash` IS NULL;
