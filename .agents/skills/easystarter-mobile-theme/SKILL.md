---
name: easystarter-mobile-theme
description: Configure the EasyStarter native theme system. Use when the user says "change theme", "add theme", "custom colors", "dark mode not working", "theme not persisting", "add new color scheme", "Uniwind theme", "HeroUI config", "theme family", "lavender theme", "alpha theme", "customize appearance", "CSS variables", "theme screen", "profile theme settings", "storage keys", or wants to modify, add, or debug native themes.
---

# EasyStarter Mobile Theme

The native theme system uses a two-axis model: **family** (color palette) and **mode** (light/dark). A ThemeProvider reads user preferences from AsyncStorage, resolves the active theme name (e.g., `"alpha-dark"`), and applies it via `Uniwind.setTheme()`. CSS variables in per-family theme files define the actual colors, and HeroUI Native components consume them automatically.

## Decision Tree

- **Customize an existing theme's colors** -> Section 2 (CSS variables in theme files)
- **Add a new theme family** -> Section 3 (full checklist)
- **Fix dark mode / theme not applying** -> Section 5 (common mistakes)
- **Theme not persisting after restart** -> Section 4 (AsyncStorage keys)
- **Change default theme** -> Section 1 (ThemeProvider defaults)
- **Modify HeroUI Native component behavior** -> Section 6 (heroui-native-config.ts)

## Section 1: Theme Architecture

The ThemeProvider at `apps/native/providers/theme-provider.tsx` defines the type system:

```typescript
// apps/native/providers/theme-provider.tsx
export type ThemeModePreference = "system" | "light" | "dark";
export type ThemeFamily = "alpha" | "lavender" | "mint" | "sky";
export type ResolvedThemeMode = "light" | "dark";
export type ActiveThemeName = `${ThemeFamily}-${ResolvedThemeMode}`;

const THEME_MODE_PREFERENCES = ["system", "light", "dark"] as const;
const THEME_FAMILIES = ["alpha", "lavender", "mint", "sky"] as const;
```

The active theme name is a combination: `"alpha-dark"`, `"lavender-light"`, `"mint-dark"`, `"sky-light"`, etc.

**Resolution flow:**

1. On mount, ThemeProvider reads stored preferences from AsyncStorage
2. `themeModePreference` ("system" / "light" / "dark") resolves against the device's color scheme
3. The resolved mode + family produce `activeThemeName` (e.g., `"alpha-dark"`)
4. `Uniwind.setTheme(activeThemeName)` applies the matching CSS variables
5. HeroUI Native components pick up colors from the CSS custom properties

**Defaults** (when no stored preference exists): mode = `"system"`, family = `"alpha"`.

The provider exposes a hook:

```typescript
// apps/native/providers/theme-provider.tsx
export function useThemePreference() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemePreference must be used within a ThemeProvider");
  }
  return context;
}
```

Returns: `{ isReady, themeModePreference, themeFamily, resolvedThemeMode, activeThemeName, setThemeModePreference, setThemeFamily }`

## Section 2: CSS Theme Variables

Each theme family has a CSS file with light and dark variants:

| Family | File |
|--------|------|
| alpha | `apps/native/themes/alpha.css` |
| lavender | `apps/native/themes/lavander.css` |
| mint | `apps/native/themes/mint.css` |
| sky | `apps/native/themes/sky.css` |

These are imported in `apps/native/global.css`:

```css
/* apps/native/global.css */
@import "tailwindcss";
@import "uniwind";
@import "heroui-native/styles";

@import "./themes/alpha.css";
@import "./themes/lavander.css";
@import "./themes/mint.css";
@import "./themes/sky.css";
```

Each theme file uses `@variant` blocks inside `@layer theme`:

```css
/* apps/native/themes/alpha.css — structure */
@layer theme {
  :root {
    @variant alpha-light {
      --background: var(--white);
      --foreground: var(--eclipse);
      --surface: var(--white);
      --accent: var(--color-neutral-950);
      --accent-foreground: var(--snow);
      --danger: oklch(0.6259 0.1908 29.19);
      /* ... all CSS variables for alpha-light ... */
    }

    @variant alpha-dark {
      --background: var(--black);
      --foreground: var(--snow);
      --surface: var(--eclipse);
      --accent: var(--color-neutral-50);
      --accent-foreground: var(--eclipse);
      /* ... all CSS variables for alpha-dark ... */
    }
  }
}
```

**Key CSS variable groups:**
- **Base**: `--background`, `--foreground`
- **Surface**: `--surface`, `--surface-secondary`, `--surface-tertiary` (cards, accordions)
- **Overlay**: `--overlay`, `--backdrop` (modals, popovers)
- **Accent**: `--accent`, `--accent-foreground` (primary action color)
- **Status**: `--success`, `--warning`, `--danger`
- **Fields**: `--field-background`, `--field-foreground`, `--field-placeholder`, `--field-border`
- **Misc**: `--border`, `--separator`, `--focus`, `--link`
- **Shadows**: `--surface-shadow`, `--overlay-shadow`, `--field-shadow`

To customize an existing theme, edit the values inside the relevant `@variant` block.

## Section 3: Adding a New Theme Family

Full checklist -- every step is required:

1. **Create the CSS file** at `apps/native/themes/<family-name>.css` with both `<family>-light` and `<family>-dark` `@variant` blocks. Copy an existing theme file as a starting point.

2. **Import it in global.css** -- add `@import "./themes/<family-name>.css";` alongside the other theme imports in `apps/native/global.css`.

3. **Add to `THEME_FAMILIES` in the ThemeProvider** -- `apps/native/providers/theme-provider.tsx`:

```typescript
// Before:
const THEME_FAMILIES = ["alpha", "lavender", "mint", "sky"] as const;
// After (example adding "coral"):
const THEME_FAMILIES = ["alpha", "lavender", "mint", "sky", "coral"] as const;
```

4. **Update `ThemeFamily` type** -- it derives from `THEME_FAMILIES` automatically via the const assertion, but verify the type union matches:

```typescript
export type ThemeFamily = "alpha" | "lavender" | "mint" | "sky" | "coral";
```

5. **Add the option to the theme selection screen** -- `apps/native/app/(tabs)/(profile)/theme.tsx`:

```typescript
// apps/native/app/(tabs)/(profile)/theme.tsx — themeFamilyOptions array
{
  key: "coral",
  title: t("settings.themeFamilyOptions.coral"),
  description: t("settings.themeFamilyDescriptions.coral"),
},
```

6. **Add i18n strings** -- in `packages/i18n/src/messages/native/<locale>.json` for each locale (en, zh, jp), add keys like `settings.themeFamilyOptions.coral` and `settings.themeFamilyDescriptions.coral`.

7. **Regenerate Uniwind types** -- after adding the new CSS `@variant` blocks, the Uniwind type file at `apps/native/uniwind-types.d.ts` must include the new theme names. This file is auto-generated:

```typescript
// apps/native/uniwind-types.d.ts — auto-generated
declare module 'uniwind' {
    export interface UniwindConfig {
        themes: readonly ['light', 'dark', 'alpha-light', 'alpha-dark', 'lavender-light', 'lavender-dark', 'mint-light', 'mint-dark', 'sky-light', 'sky-dark']
    }
}
```

After adding a new family, regenerate this file so the new variant names (e.g., `'coral-light'`, `'coral-dark'`) are included.

## Section 4: Theme Persistence (AsyncStorage)

Preferences are stored with keys derived from the app name in `apps/native/configs/app-config.ts`:

```typescript
// apps/native/configs/app-config.ts
themePreferenceStorageKey: `${commonConfig.app.name}_theme_preference`,
// Result: "EasyStarter_theme_preference"
themeFamilyStorageKey: `${commonConfig.app.name}_theme_family`,
// Result: "EasyStarter_theme_family"
```

The ThemeProvider reads these on mount:

```typescript
// apps/native/providers/theme-provider.tsx — initializeTheme()
const storedThemeModePreference = await AsyncStorage.getItem(
  appConfig.themePreferenceStorageKey,
);
const storedThemeFamily = await AsyncStorage.getItem(appConfig.themeFamilyStorageKey);
```

And writes on change:

```typescript
const setThemeModePreference = useCallback(
  async (nextThemeModePreference: ThemeModePreference) => {
    setThemeModePreferenceState(nextThemeModePreference);
    await AsyncStorage.setItem(appConfig.themePreferenceStorageKey, nextThemeModePreference);
  }, [],
);

const setThemeFamily = useCallback(async (nextThemeFamily: ThemeFamily) => {
  setThemeFamilyState(nextThemeFamily);
  await AsyncStorage.setItem(appConfig.themeFamilyStorageKey, nextThemeFamily);
}, []);
```

**If you rename the app** (`commonConfig.app.name`), the storage keys change and existing user preferences are lost. Users will see the default theme (alpha/system) after the rename.

## Section 5: Common Mistakes

- **Adding a family to CSS but not to `THEME_FAMILIES`** -- `Uniwind.setTheme("coral-dark")` works (applies CSS), but the `isThemeFamily` guard returns `false` so the ThemeProvider ignores the stored value and falls back to `"alpha"`. The new family must be in the `THEME_FAMILIES` array.

- **Forgetting to regenerate Uniwind types** -- `apps/native/uniwind-types.d.ts` is auto-generated. If the new theme variants aren't listed there, TypeScript won't catch mistakes in theme name strings, and Uniwind may not recognize the theme at runtime.

- **Editing `global.css` but not importing the new theme file** -- the CSS variables won't be available if the import is missing. Uniwind silently falls back to the last valid theme.

- **Missing i18n strings for the new family** -- the theme screen renders `t("settings.themeFamilyOptions.<family>")`. If the key is missing, it shows the raw translation key as the label instead of crashing.

- **Note: `lavander.css` is deliberately spelled without the second "e"** -- the file is `themes/lavander.css`, not `lavender.css`. The CSS `@variant` names are correctly spelled `lavender-light` and `lavender-dark`. Don't rename the file without updating the import in `global.css`.

- **Testing only light mode** -- each theme family has both light and dark variants. A color that looks fine on a light background may be unreadable on dark. Test both modes for every family.

## Section 6: HeroUI Native Config

HeroUI Native component defaults are set in `apps/native/configs/heroui-native-config.ts`:

```typescript
// apps/native/configs/heroui-native-config.ts
import type { HeroUINativeConfig } from "heroui-native";

export const config: HeroUINativeConfig = {
  textProps: {
    minimumFontScale: 0.5,
    maxFontSizeMultiplier: 1.5,
    allowFontScaling: true,
    adjustsFontSizeToFit: false,
  },
  devInfo: {
    stylingPrinciples: false,
  },
  toast: {
    defaultProps: {
      variant: "default",
      placement: "top",
    },
    maxVisibleToasts: 3,
  },
};
```

This controls text scaling behavior (accessibility), toast placement, and dev-mode logging. Colors come from the CSS variables -- this config handles component behavior, not appearance.

## Section 7: Theme Selection Screen

The user-facing theme picker is at `apps/native/app/(tabs)/(profile)/theme.tsx`. It uses `useThemePreference()` to read and write both the mode preference and the family:

```typescript
// apps/native/app/(tabs)/(profile)/theme.tsx
const { setThemeFamily, setThemeModePreference, themeFamily, themeModePreference } =
  useThemePreference();
```

Mode options: System / Light / Dark. Family options: Alpha / Lavender / Mint / Sky.

When adding a new family, add an entry to the `themeFamilyOptions` array in this file (see Section 3, step 5).

## Verification

1. `pnpm dev:native` -- launch the app
2. Navigate to Profile -> Theme settings
3. Switch between all theme families and verify colors change immediately
4. Toggle between System / Light / Dark modes
5. Kill the app completely and relaunch -- verify the chosen theme persists
6. If adding a new family: confirm it appears in the picker, both light and dark variants render correctly, and it persists across restarts
7. `pnpm check-types` after theme code edits
