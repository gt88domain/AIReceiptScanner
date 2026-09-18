# Backoffice preview

Run the isolated acceptance preview from the repository root:

```sh
pnpm preview:backoffice
```

The command creates or reuses only `apps/server/.wrangler/backoffice-preview`, applies local D1 migrations, resets the two preview accounts, starts the local API at `http://localhost:3101`, starts the web app at `http://localhost:3100`, and prints every acceptance URL.

Use either account with the password printed for that run:

- `user-preview@local.test` — ordinary user
- `admin-preview@local.test` — administrator through the local-only `ADMIN_EMAILS` allowlist

The password is generated for each command invocation. It is never stored in source control or production configuration.

## Safety boundary

This command is deliberately pinned to a local Worker named `easystarter-backoffice-preview` and its dedicated local D1 identity. It requires `BACKOFFICE_PREVIEW=1`, always passes Wrangler `--local`, and refuses production `NODE_ENV`, any other Worker name, or any other D1 identity.

Preview keeps the Billing and Credits read models enabled so their pages can be accepted. Email delivery, payment checkout, customer portal, subscription upgrade, and credit checkout are explicitly blocked. Jobs receive only a local Wrangler Queue binding required by the existing Billing contract; the preview has no R2 binding, routes, cron trigger, remote D1, or remote Queue.

This is an acceptance environment, not a seed for a deployment. Never copy its local database or credentials into another environment.
