---
name: easystarter-web-landing-page
description: Configure the EasyStarter Web landing page layout and sections. Use when the user mentions landing page, homepage, marketing page, hero section, pricing section, FAQ section, testimonials, landing page components, section order, landing page customization, CTA, features section, or asks "how do I customize the landing page", "change landing page sections", "add a section", "remove a section", "reorder sections", or "replace the hero".
---

# EasyStarter Web Landing Page

The landing page uses a **component registry pattern**: all available section components are registered in a map, and the active sections are configured as an ordered array in `web-config.ts`. The composition system enforces **one section per type** (e.g. only one hero, one pricing), deduplicates, and sorts by registry order. Users can also customize sections via a localStorage-backed composer UI.

## Decision Tree

- **Change which sections appear** -> Section 1 (defaultLandingPageComponents array)
- **Swap one section variant for another** (e.g. different hero) -> Section 1 (replace the key)
- **Add a new custom section** -> Section 3 (register in both config and registry)
- **Change section content/copy** -> Edit i18n files in `packages/i18n/src/messages/web/` or the component directly
- **Understand how the composer works** -> Section 2 (deduplication and type enforcement)

## Section 1: Default Landing Page Sections

The default sections are configured in `apps/web/src/configs/web-config.ts`:

```typescript
// apps/web/src/configs/web-config.ts
const defaultLandingPageComponents = [
  "hero-section-23",
  "tailark-logo-cloud",
  "features-section-21",
  "tailark-integrations",
  "tailark-content",
  "tailark-stats",
  "tailark-pricing",
  "tailark-faqs",
  "tailark-call-to-action",
  "tailark-testimonials",
] as const satisfies readonly LandingPageComponentKey[];
```

To change the landing page, edit this array. The order in this array determines the display order (after registry-order normalization).

## Section 2: Available Components and Type Enforcement

All registered components and their types are defined in the config:

```typescript
// apps/web/src/configs/landing-page-component/landing-page-component-config.ts
export const LANDING_PAGE_COMPONENTS: Record<
  LandingPageComponentKey,
  { label: string; group: string; type: string }
> = {
  "hero-section-23":     { label: "Shadcn Hero 23",        group: "Hero",          type: "hero" },
  "hero-section-03":     { label: "Shadcn Hero 03",        group: "Hero",          type: "hero" },
  "tailark-hero":        { label: "Tailark Hero",          group: "Hero",          type: "hero" },
  "features-section-21": { label: "Shadcn Features 21",    group: "Shadcn Studio", type: "features" },
  "tailark-logo-cloud":  { label: "Tailark Logo Cloud",    group: "Tailark",       type: "logo-cloud" },
  "tailark-features":    { label: "Tailark Features",      group: "Tailark",       type: "features" },
  "tailark-integrations":{ label: "Tailark Integrations",  group: "Tailark",       type: "integrations" },
  "tailark-content":     { label: "Tailark Content",       group: "Tailark",       type: "content" },
  "tailark-stats":       { label: "Tailark Stats",         group: "Tailark",       type: "stats" },
  "tailark-pricing":     { label: "Tailark Pricing",       group: "Tailark",       type: "pricing" },
  "tailark-faqs":        { label: "Tailark FAQs",          group: "Tailark",       type: "faqs" },
  "tailark-call-to-action": { label: "Tailark Call To Action", group: "Tailark",   type: "call-to-action" },
  "tailark-testimonials":{ label: "Tailark Testimonials",  group: "Tailark",       type: "testimonials" },
};
```

**Type enforcement**: Only one component per `type` is allowed. If the defaults list includes both `"hero-section-23"` and `"tailark-hero"` (both type `"hero"`), the normalization keeps only the first one encountered after registry-order sorting:

```typescript
// landing-page-component-config.ts — normalization logic
const usedTypes = new Set<string>();
return sorted.filter((component) => {
  const componentType = LANDING_PAGE_COMPONENTS[component].type;
  if (usedTypes.has(componentType)) {
    return false;
  }
  usedTypes.add(componentType);
  return true;
});
```

**To swap hero variants**: replace `"hero-section-23"` with `"hero-section-03"` or `"tailark-hero"` in the defaults array. Do not include multiple heroes -- only the first (by registry order) survives normalization.

## Section 3: The Component Registry

Components are mapped to their React render functions here:

```typescript
// apps/web/src/configs/landing-page-component/landing-page-component-registry.tsx
export const landingPageComponentMap = {
  "hero-section-23": () => <HeroSection23 />,
  "hero-section-03": () => <HeroSection03 />,
  "tailark-hero": () => <TailarkHero />,
  "features-section-21": () => <FeaturesSection21 />,
  "tailark-logo-cloud": () => <LogoCloudPage />,
  "tailark-features": () => <TailarkFeatures />,
  "tailark-integrations": () => <Integrations />,
  "tailark-content": () => <ContentSection />,
  "tailark-stats": () => <StatsSection />,
  "tailark-pricing": () => <PricingSection />,
  "tailark-faqs": () => <FAQsSection />,
  "tailark-call-to-action": () => <CallToAction />,
  "tailark-testimonials": () => <TestimonialsSection />,
} satisfies Record<string, () => ReactElement>;
```

**To add a new section**:
1. Create the component in `apps/web/src/components/landing-page/`
2. Import it and add a key in `landingPageComponentMap` in the registry
3. Add the metadata entry in `LANDING_PAGE_COMPONENTS` in the config (with a unique `type` string, or share a type if it should be mutually exclusive with another)
4. Add the key to `defaultLandingPageComponents` in `web-config.ts`

## Section 4: localStorage Composer

The composition system also supports user customization via localStorage:

```typescript
// landing-page-component-config.ts
export const LANDING_PAGE_COMPOSER_CONFIG = {
  storageKey: `${webConfig.AppName}-landing-page-components`,
  defaultComponents: defaultLandingPageComponents,
};
```

If `localStorage` has a saved component list (from a composer UI), it overrides the defaults. The saved list goes through the same normalization (dedup, type enforcement, registry-order sort).

Clearing the localStorage key resets to `defaultLandingPageComponents`.

## Verification

1. `pnpm dev:web`
2. Navigate to `/` -- the landing page should render the configured sections in order
3. Verify each section renders correctly with theme CSS variables
4. Test with different locales if i18n content was changed
5. `pnpm check-types` after editing config or registry files

## Common Mistakes

- **Including two components of the same type** -- e.g. both `"hero-section-23"` and `"tailark-hero"` (both type `"hero"`). The normalization silently drops the second one. Only include one per type.
- **Adding a key to defaults but not the registry** -- The normalization filters out unrecognized keys. If the key is not in `landingPageComponentMap`, it is silently dropped and the section does not appear.
- **Adding a key to the registry but not the config metadata** -- The component renders but the composer UI cannot display its label, group, or type. Both `landingPageComponentMap` and `LANDING_PAGE_COMPONENTS` must have the key.
- **Editing marketing copy in component files instead of i18n** -- Section text should come from `packages/i18n/src/messages/web/` so all locales stay aligned. Hard-coding English text in components breaks i18n.
- **Pricing section using hard-coded prices** -- The `tailark-pricing` component reads plan data from app-config. Do not hard-code `$10/mo` text -- it will drift from the actual configured prices.
