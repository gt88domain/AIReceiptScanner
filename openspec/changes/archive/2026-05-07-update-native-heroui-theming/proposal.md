# Change: Update native HeroUI theming

## Why
The native app currently mixes HeroUI Native token classes with hardcoded Expo template colors, which prevents a consistent design system and makes dark mode incomplete. It also lacks a persisted theme preference, so users cannot explicitly choose light, dark, or follow-system behavior.

## What Changes
- Add a native theme preference provider with `system | light | dark` states and local persistence.
- Extend the Profile area with a dedicated Theme settings screen.
- Replace hardcoded native page colors with HeroUI Native semantic tokens.
- Remove the legacy native color constants and helper hook.

## Impact
- Affected specs: `native-theming`
- Affected code: `apps/native` providers, layouts, auth/profile screens, and `packages/i18n` native messages
