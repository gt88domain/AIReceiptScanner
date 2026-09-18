# Feature development

## Allowed

- Keep route files thin and place product behavior in named web/server modules.
- Consume API contracts, authorization guards, capabilities, assets, jobs, and
  configuration from their public template boundaries.

## Forbidden

- Do not add a new product domain to `routers/`, `components/`, or `lib/` as a
  dumping ground.
- Do not bypass the API from web code to access D1, R2, queues, or secrets.

## Example

An AI generator belongs in `modules/generation`; its web page calls its API
procedure and its long-running work uses the jobs module.
