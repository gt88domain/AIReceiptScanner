## Context
The native app already imports `heroui-native/styles` and wraps the tree with `HeroUINativeProvider`, but its pages still use hardcoded color classes and a leftover Expo-style color constants file. Theme behavior needs to become a single native concern owned by HeroUI tokens and Uniwind.

## Goals / Non-Goals
- Goals:
  - Provide one token-driven native theme source.
  - Support persisted `system | light | dark` theme preference.
  - Expose a first-class theme settings screen in Profile.
- Non-Goals:
  - Add server-side theme sync.
  - Change the web app theme model.

## Decisions
- Decision: Use a dedicated native `ThemeProvider` to own `themePreference`, `resolvedTheme`, persistence, and `Uniwind.setTheme(...)`.
- Decision: Persist the preference in `AsyncStorage` under an app-prefixed storage key.
- Decision: Use HeroUI Native semantic tokens in `global.css` and UI classes instead of keeping a parallel `Colors` object.

## Risks / Trade-offs
- Native tab and stack chrome must be explicitly styled to avoid mismatches when a user overrides the system theme.
- Persisted theme restoration is asynchronous, so the provider gates rendering until the stored preference has been loaded.
