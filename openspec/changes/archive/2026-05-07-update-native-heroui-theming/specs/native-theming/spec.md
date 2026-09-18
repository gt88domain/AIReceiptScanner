## ADDED Requirements

### Requirement: Native app SHALL expose a single HeroUI token-based theme source
The native application SHALL use HeroUI Native semantic theme tokens as the only page-level color source for its shared layouts and screens.

#### Scenario: Native screen renders with semantic theme tokens
- **WHEN** a native screen renders its background, text, borders, inputs, and buttons
- **THEN** those styles use HeroUI semantic tokens instead of a separate local color constants module

### Requirement: Native app SHALL persist theme preference locally
The native application SHALL support a persisted `system | light | dark` theme preference that is restored on startup.

#### Scenario: User selects dark theme
- **WHEN** the user changes the theme preference to `dark`
- **THEN** the app switches to dark theme immediately and restores dark theme after the app restarts

#### Scenario: User follows system theme
- **WHEN** the user changes the theme preference to `system`
- **THEN** the app follows the current device appearance and reacts to future device theme changes

### Requirement: Profile preferences SHALL expose theme settings
The native Profile area SHALL include a dedicated Theme settings screen for selecting the current theme preference.

#### Scenario: User opens the theme settings screen
- **WHEN** the user taps the Theme entry in Profile preferences
- **THEN** the app navigates to a Theme screen that displays `Follow System`, `Light`, and `Dark` options with the current selection

### Requirement: Native auth and profile surfaces SHALL remain theme-consistent
The native authentication and profile-related screens SHALL update their visible surfaces when the active theme changes.

#### Scenario: Theme changes after a user preference update
- **WHEN** the active theme switches between light and dark
- **THEN** auth forms, profile screens, modal surfaces, shared cards, and tab chrome update to the active semantic theme without hardcoded light-only colors
