# Database rules

## Allowed

- Define schema in `apps/server/src/db/schema` and generate one structural
  Drizzle migration for each schema change.
- Use separate data migrations, seeds, backfills, and repairs as documented in
  `apps/server/src/db/README.md`.

## Forbidden

- Do not write SQL or migrations in web/mobile code.
- Do not edit an applied migration, mix a backfill into structural migration,
  or delete production data as a rollback shortcut.

## Example

Adding a catalog status column creates a schema change and migration; populating
historical statuses is a separately named backfill.
