# Public signup policy

## Core goal

Give each downstream product one product-owned switch that controls whether new
public accounts may be created. The server is the authority; Web visibility is
only a matching user experience.

## Acceptance criteria

- `publicSignupEnabled` defaults to `true`, preserving existing template and
  downstream behavior until a product opts out.
- When disabled, Better Auth rejects new email/password and social-provider
  account creation while existing users can still sign in.
- Email/password availability follows the existing method switch instead of
  being hard-coded on the server.
- Web and optional-mobile sign-up routes and visible sign-up links are
  unavailable when public signup is disabled.
- No AI Answers-specific domain, route, provider, or policy is added upstream.

## Implementation phases

1. **Configuration contract** — add the product-owned setting to
   `packages/app-config` and expose the browser-safe value through `webConfig`.
2. **Server enforcement** — derive one signup policy and apply it to Better
   Auth email/password and social providers.
3. **Client alignment** — gate Web and optional-mobile sign-up routes and links,
   including the starter landing CTA, with the same public setting.
4. **Core-goal review** — inspect the actual diff for default compatibility,
   server-side denial, existing-user sign-in, and product/platform boundaries.
5. **Deferred test authoring** — only after phase 4 passes, add the focused
   automated coverage below.

## Deferred test plan

- App config: default public signup is enabled and is exposed to Web config.
- Server policy allow path: public signup enabled leaves account creation open.
- Server policy denial paths: a product opt-out or Backoffice Preview disables
  account creation; disabling email/password also disables that Better Auth
  method.
- Client policy: closed signup does not expose Web or optional-mobile sign-up
  route/link contracts.
- Expected files: focused tests beside app config, server signup policy, and Web
  config or auth UI as needed.
- Recommended commands after authoring: focused Vitest targets, then `pnpm test`.

## Status

- Implementation: complete
- Core-goal review: complete; confirmed server authority, default compatibility,
  existing-user sign-in, and Web/mobile entry-point alignment
- Test authoring: complete
- Test execution: not requested; pending CI after PR
