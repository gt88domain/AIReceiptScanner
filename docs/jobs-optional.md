# Optional Jobs

Jobs are enabled by default. When `features.jobs` is `true`, EasyStarter needs
a real Queue producer, main Queue consumer, DLQ consumer, Cron trigger, and
`JOB_QUEUE_DLQ_NAME`; delivery remains at-least-once and handlers must remain
idempotent.

When `features.jobs` is `false`, EasyStarter does not read `JOB_QUEUE` or
`JOB_QUEUE_DLQ_NAME`, does not initialize the Job Service, and exports neither
the Queue nor Scheduled Worker handlers. It does not query or write Jobs
tables, and it never substitutes a fake/no-op Queue. The stable Web client keeps
the Admin Jobs namespace for compatibility, but the runtime Router omits those
operations entirely; a legacy call against a configured Jobs-off runtime fails
closed before Jobs database access. Admin Core stays available.

Jobs-off does not change migration history and does not delete an existing Job
table. It only removes the runtime requirement for that table. Billing remains
Jobs-on: `billing: true` with `jobs: false` is an invalid feature contract.

For a Jobs-off starting point, use `directory-lite` and its non-deployable
Wrangler examples. Do not apply examples automatically or create resources
from a profile.
