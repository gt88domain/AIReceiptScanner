# Backoffice product modules

The template discovers product modules at build time. They are trusted source code in the same
repository, not runtime plugins. The upstream template registers none, so its navigation remains
unchanged.

## Register a module

Add `apps/web/src/modules/<domain>/backoffice.ts`:

```ts
import type { BackofficeModule } from "@/modules/backoffice";

export const backoffice: BackofficeModule = {
  id: "urls-submit",
  userApp: { titleKey: "urls.nav.submit", routeId: "/submit" },
  adminModule: { titleKey: "urls.admin.submit", routeId: "/admin/urls" },
  requiresFeature: "billing",
};
```

`id` is globally unique and determines stable alphabetical navigation order. Add the matching
i18n keys. `requiresFeature` may be `billing`, `credits`, or `tickets`; if disabled, neither
entry is shown. A manifest only controls navigation and visibility—it does not create a route or
grant authorization.

## Add the thin routes

Add a user route under `apps/web/src/routes/` that renders the module page entry point.

For an admin route, add a thin file below
`apps/web/src/routes/_authed/(dashboard)/admin/(modules)/`. Parentheses make this a pathless
directory, so `urls.tsx` still serves `/admin/urls`:

```tsx
import { createAdminModuleRoute } from "@/lib/auth/create-admin-module-route";
import { UrlsAdminPage } from "@/modules/urls/urls-admin-page";

export const Route = createAdminModuleRoute("/_authed/(dashboard)/admin/(modules)/urls")({
  component: UrlsAdminPage,
});
```

Do not import `createFileRoute` in an admin module route. The repository boundary check enforces
this directory rule; `createAdminModuleRoute` always installs `requireAdminRouteAccess`.

Keep product components, loaders, and view models in `modules/<domain>/`. Server modules and
oRPC composition continue to follow the existing server-module conventions; this manifest does
not dynamically register server APIs.

## Verify

Run `pnpm test`, `pnpm check-types`, and `pnpm check:boundaries`. Add a focused manifest contract
test whenever the shared resolver behavior changes.
