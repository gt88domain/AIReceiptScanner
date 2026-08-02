# Add a D1 schema change

Follow the migration playbook, modify schema only in `apps/server/src/db/schema`,
generate a structural migration, and keep data migration/backfill/repair
separate. Document forward-fix and compatibility behavior, then run
`pnpm db:check`, local migration tests, and production preflight. Never edit an
applied migration or create migrations in Web.
