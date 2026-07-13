---
name: easystarter-web-theme
description: Configure the EasyStarter Web theme system. Use when the user mentions theme, colors, dark mode, light mode, CSS variables, theme presets, fonts, border radius, ThemeProvider, theme switcher, custom theme, change colors, brand colors, or asks "how do I change the theme", "add a new theme", "customize colors", "change fonts", or "FOUC on page load".
---

# EasyStarter Web Theme

The theme system uses **presets** that define complete light/dark CSS variable sets. Presets are defined in `theme-presets.ts`, the first key in the presets object becomes the default, and `ThemeProvider` persists the user's choice to localStorage. The same CSS variables apply to both the landing page and dashboard -- they share one variable namespace.

## Decision Tree

- **Change the default theme** -> Section 1 (reorder presets or change `defaultThemePresetKey`)
- **Add a new theme preset** -> Section 2 (preset structure) + Section 3 (required variables)
- **Change fonts** -> Section 2 (font variables in preset) + ensure font imports in `index.css`
- **Fix FOUC (flash of unstyled content)** -> Section 4 (FOUC prevention script)
- **Modify existing theme colors** -> Edit the preset's `light`/`dark` objects in `theme-presets.ts`

## Section 1: Default Theme Selection

The default theme preset is the **first key** in the `themePresets` object:

```typescript
// apps/web/src/configs/web-config.ts
const defaultThemePresetKey =
  (Object.keys(themePresets)[0] as ThemePresetKey | undefined) ?? fallbackThemePresetKey;
```

The fallback is `"clean-slate"`. To change the default, reorder the keys in `themePresets` so the desired preset comes first. Or override `defaultThemePresetKey` directly.

Current presets (in order):
1. `"clean-slate"` -- Slate blue, Raleway + Oxanium fonts, 0.45rem radius
2. `"warm-stone"` -- Warm amber, Outfit font, 1rem radius
3. `"lime-graphite"` -- Lime green on dark graphite, Inter font, 1rem radius
4. `"chakra-lime"` -- Lime accent, Chakra Petch font, 0.2rem radius
5. `"terminal-moss"` -- Moss green, JetBrains Mono, 0rem radius (sharp corners)

## Section 2: Preset Structure

Each preset has a `label` and `styles` with `light` and `dark` objects:

```typescript
// apps/web/src/configs/theme-presets.ts
export const themePresets = {
  "clean-slate": {
    label: "Clean Slate",
    styles: {
      light: {
        background: "oklch(1 0 0)",
        foreground: "oklch(0.148 0.004 228.8)",
        primary: "oklch(0.218 0.008 223.9)",
        "primary-foreground": "oklch(0.987 0.002 197.1)",
        // ... all required variables
        radius: "0.45rem",
        "font-sans": "'Raleway Variable', sans-serif",
        "font-heading": "'Oxanium Variable', sans-serif",
        "font-serif": 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
        "font-mono": 'ui-monospace, SFMono-Regular, Menlo, Monaco, ...',
      },
      dark: {
        // Same variable names, dark-mode values
      },
    },
  },
} satisfies Record<string, ThemePreset>;
```

**New themes must have ALL the same variable names** in both `light` and `dark` objects. The `ThemeProvider` applies every key-value pair as `--{key}` CSS custom properties on the root element. Missing variables will cause visual gaps.

## Section 3: Required CSS Variables

Every preset must define these variables (used by `index.css` Tailwind theme mapping):

**Colors** (oklch values):
`background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `destructive-foreground`, `border`, `input`, `ring`, `chart-1` through `chart-5`, `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`

**Typography**:
`font-sans`, `font-heading`, `font-serif`, `font-mono`

**Layout**:
`radius`

**Optional (some presets include)**: `shadow-*` variants, `tracking-normal`, `spacing`

The variables are mapped to Tailwind in `apps/web/src/styles/index.css`:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  /* ... all color mappings ... */
  --font-sans: var(--font-sans);
  --font-heading: var(--font-heading);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

When adding **custom fonts**, also add the font import to `apps/web/src/styles/index.css`:

```css
@import "@fontsource-variable/raleway";
@import "@fontsource-variable/oxanium";
/* Add your font import here */
```

## Section 4: How ThemeProvider Works

`ThemeProvider` wraps the app and manages theme state:

```typescript
// apps/web/src/components/providers/theme-provider.tsx
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [userTheme, setUserTheme] = useState<UserTheme>(getStoredUserTheme);
  const [preset, setPresetState] = useState<ThemePresetKey>(getStoredPreset);
  // ...
}
```

It persists to localStorage using keys derived from the app name:

```typescript
// apps/web/src/configs/theme-config.ts
storageKeys: {
  userTheme: `${webConfig.AppName}-ui-theme`,       // "light" | "dark" | "system"
  preset: `${webConfig.AppName}-ui-preset`,          // preset key name
  presetStyles: `${webConfig.AppName}-ui-preset-styles`, // cached preset for FOUC prevention
},
```

**FOUC prevention**: An inline script in `theme-config.ts` runs before React hydration. It reads the stored theme from localStorage and applies CSS variables immediately to prevent a flash of the default theme:

```typescript
// The themeScript is injected via <ScriptOnce>{themeScript}</ScriptOnce>
// It reads localStorage, applies the mode class, and sets CSS variables
// before React mounts.
```

If the app name changes, the storage keys change too, which resets all users to the default theme. This is intentional but worth noting.

## Section 5: Consuming Theme in Components

Use the `useTheme` hook to access and change theme:

```typescript
import { useTheme } from "@/components/providers/theme-provider";

function MyComponent() {
  const { userTheme, appTheme, preset, setTheme, setPreset, presets } = useTheme();
  // userTheme: "light" | "dark" | "system"
  // appTheme: "light" | "dark" (resolved system preference)
  // preset: current preset key
  // presets: all available presets
}
```

For component styling, use Tailwind classes that reference the CSS variables:
```
bg-background text-foreground border-border
bg-primary text-primary-foreground
bg-card text-card-foreground
```

Do not use hard-coded colors in components. Always use the CSS variable-backed Tailwind classes.

## Verification

1. `pnpm dev:web`
2. Check the landing page -- colors should match the first preset
3. Toggle light/dark mode via the theme switcher
4. Switch presets if the switcher UI is available
5. Refresh the page -- no FOUC should occur (theme loads instantly)
6. Check both landing page and dashboard use the same color scheme

## Common Mistakes

- **Adding a preset with missing CSS variables** -- If a preset omits `sidebar-primary` or any other variable, components referencing it will fall through to the browser default (usually transparent). Copy all variables from an existing preset as a starting template.
- **Hard-coding colors in components** -- Use `bg-primary`, `text-muted-foreground`, etc. Hard-coded hex/oklch values bypass the theme system and break when users switch presets.
- **Changing app name without considering localStorage keys** -- The storage keys include the app name. Changing `common.app.name` in app-config resets all users' theme preferences to default.
- **Adding font imports in the preset but not in `index.css`** -- The preset `font-sans` value references a font family name, but the actual font file must be imported in `apps/web/src/styles/index.css`. Without the `@import`, the browser falls back to the generic family.
- **Creating a theme with poor contrast** -- Ensure `foreground` on `background`, `primary-foreground` on `primary`, etc. have sufficient contrast in both light and dark modes. Test with both modes.
