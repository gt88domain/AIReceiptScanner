import { z } from "zod";
import {
  type LandingPageComponentKey,
  landingPageComponentKeys,
  landingPageComponentOrderMap,
} from "@/configs/landing-page-component/landing-page-component-registry";
import { webConfig } from "@/configs/web-config";

export type { LandingPageComponentKey } from "@/configs/landing-page-component/landing-page-component-registry";

export const LANDING_PAGE_COMPONENTS: Record<
  LandingPageComponentKey,
  { label: string; group: string; type: string }
> = {
  "hero-section-23": { label: "Shadcn Hero 23", group: "Hero", type: "hero" },
  "hero-section-03": { label: "Shadcn Hero 03", group: "Hero", type: "hero" },
  "features-section-21": {
    label: "Shadcn Features 21",
    group: "Shadcn Studio",
    type: "features",
  },
  "tailark-hero": { label: "Tailark Hero", group: "Hero", type: "hero" },
  "tailark-logo-cloud": {
    label: "Tailark Logo Cloud",
    group: "Tailark",
    type: "logo-cloud",
  },
  "tailark-features": {
    label: "Tailark Features",
    group: "Tailark",
    type: "features",
  },
  "tailark-integrations": {
    label: "Tailark Integrations",
    group: "Tailark",
    type: "integrations",
  },
  "tailark-content": {
    label: "Tailark Content",
    group: "Tailark",
    type: "content",
  },
  "tailark-stats": { label: "Tailark Stats", group: "Tailark", type: "stats" },
  "tailark-pricing": {
    label: "Tailark Pricing",
    group: "Tailark",
    type: "pricing",
  },
  "tailark-faqs": { label: "Tailark FAQs", group: "Tailark", type: "faqs" },
  "tailark-call-to-action": {
    label: "Tailark Call To Action",
    group: "Tailark",
    type: "call-to-action",
  },
  "tailark-testimonials": {
    label: "Tailark Testimonials",
    group: "Tailark",
    type: "testimonials",
  },
};

const LandingPageComponentSchema = z.enum(landingPageComponentKeys);

const isLandingPageComponentKey = (component: string): component is LandingPageComponentKey =>
  component in LANDING_PAGE_COMPONENTS;

const normalizeLandingPageComponents = (
  components: readonly string[],
): LandingPageComponentKey[] => {
  const deduplicated = Array.from(new Set(components)).filter(isLandingPageComponentKey);
  const sorted = deduplicated.sort(
    (a, b) =>
      (landingPageComponentOrderMap.get(a) ?? 0) - (landingPageComponentOrderMap.get(b) ?? 0),
  );
  const usedTypes = new Set<string>();
  return sorted.filter((component) => {
    const componentType = LANDING_PAGE_COMPONENTS[component].type;
    if (usedTypes.has(componentType)) {
      return false;
    }
    usedTypes.add(componentType);
    return true;
  });
};

const defaultLandingPageComponents = (() => {
  const normalizedDefaults = normalizeLandingPageComponents(webConfig.defaultLandingPageComponents);
  if (normalizedDefaults.length > 0) {
    return normalizedDefaults;
  }
  return [landingPageComponentKeys[0]];
})();

export const LANDING_PAGE_COMPOSER_CONFIG = {
  storageKey: `${webConfig.AppName}-landing-page-components`,
  defaultComponents: defaultLandingPageComponents,
};

export const sanitizeLandingPageComponents = (
  components: readonly string[],
): LandingPageComponentKey[] => {
  const withUniqueType = normalizeLandingPageComponents(components);

  if (withUniqueType.length === 0 && components.length > 0) {
    return [...LANDING_PAGE_COMPOSER_CONFIG.defaultComponents];
  }

  return withUniqueType;
};

export const LandingPageComponentsSchema = z
  .array(LandingPageComponentSchema)
  .catch([...LANDING_PAGE_COMPOSER_CONFIG.defaultComponents])
  .transform((components) => sanitizeLandingPageComponents(components));
