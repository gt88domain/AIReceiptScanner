# Golden path: directory

Use this path for a searchable catalog or content directory.

1. Complete the migration playbook before importing an existing catalog.
2. Model the catalog in a server domain module with explicit repositories,
   services, policies, and router contract.
3. Keep web routes thin; they call the Server Worker through the API client.
4. Use data migrations for imports and backfills, never structural migrations.
5. Add exports or long imports as idempotent Jobs when they exceed request time.

The directory's taxonomy, editorial workflow, and source data are product
ownership, not template capabilities.
