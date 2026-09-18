# Mobile package refactor

## Purpose

The template's default product is Web SaaS: `apps/web`, `apps/server`, and
`packages/*`. React Native is an opt-in capability and must not be installed,
built, or checked by default core commands.

## Structure change

| Before | After |
| --- | --- |
| `apps/native` in the root pnpm workspace | `optional/mobile` in its own pnpm workspace |
| root `pnpm-lock.yaml` includes Expo and React Native | `optional/pnpm-lock.yaml` owns Expo and React Native |
| `pnpm dev:native` and native device aliases | `pnpm mobile:*` commands |
| core Quality workflow runs `expo-doctor` | a path-scoped Mobile workflow runs optional mobile checks |

`optional/pnpm-workspace.yaml` intentionally includes only mobile and the four
shared source packages it consumes: `api-client`, `app-config`, `i18n`, and
`shared`. It must not include `apps/web` or `apps/server` as a runtime package
dependency.

## Migration steps for template adopters

1. Replace `apps/native` paths with `optional/mobile` in local scripts, EAS,
   editor launch settings, and CI.
2. Run `pnpm install --frozen-lockfile` from the repository root for core work.
3. Install the mobile workspace only when needed:

   ```bash
   pnpm --dir optional install --frozen-lockfile
   pnpm mobile:check
   ```

4. Use `pnpm mobile:dev` or explicit `mobile:eas:build:*` commands for mobile
   work. There is deliberately no generic `mobile:build` or `mobile:test`
   command until a deterministic Expo build or test contract exists.

## Risks and safeguards

- Mobile continues to import the API router type for end-to-end oRPC typing;
  this is type-only and never gives it database or Worker bindings.
- The mobile CI workflow installs core first so that this type contract is
  checked without making Expo a core dependency.
- `optional/pnpm-lock.yaml` is a separate reviewed dependency graph. Keep its
  supply-chain overrides aligned with the root workspace; do not disable
  pnpm's minimum-release-age policy to refresh it.
- This PR changes workspace boundaries only. Mobile configuration, RevenueCat
  enablement, and optional Better Auth settings are handled by the following
  configuration-boundary PR.
