# Apps

Workspace applications.

- `web`: TanStack Start public/authenticated web app.
- `server`: Hono Cloudflare Worker API.

Add product-specific code under `web/src/modules/<domain>/` and
`server/src/modules/<domain>/`. Keep route and router entry points thin, and do
not put downstream product behavior into reusable template core.

See [`../docs/repo-map.md`](../docs/repo-map.md) before choosing an owner.
