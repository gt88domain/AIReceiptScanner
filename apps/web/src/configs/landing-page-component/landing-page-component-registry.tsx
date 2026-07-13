import type { ReactElement } from "react";
import FeaturesSection21 from "@/components/landing-page/shadcn-studio/features-section-21/features-section-21";
import HeroSection03 from "@/components/landing-page/shadcn-studio/hero-section-03/hero-section-03";
import HeroSection23 from "@/components/landing-page/shadcn-studio/hero-section-23/hero-section-23";
import { CallToAction } from "@/components/landing-page/tailark/call-to-action/call-to-action";
import { ContentSection } from "@/components/landing-page/tailark/content/content";
import { Features as TailarkFeatures } from "@/components/landing-page/tailark/features/features";
import { FAQsSection } from "@/components/landing-page/tailark/fqas/fqas";
import { Hero as TailarkHero } from "@/components/landing-page/tailark/hero/hero";
import { Integrations } from "@/components/landing-page/tailark/integrations/integrations";
import { LogoCloudPage } from "@/components/landing-page/tailark/logo-cloud/logo-cloud";
import { PricingSection } from "@/components/landing-page/tailark/pricing/pricing-section";
import { StatsSection } from "@/components/landing-page/tailark/stats/stats";
import { TestimonialsSection } from "@/components/landing-page/tailark/testimonials/testimonials";

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

export type LandingPageComponentKey = keyof typeof landingPageComponentMap;

export const landingPageComponentKeys = Object.keys(
  landingPageComponentMap,
) as LandingPageComponentKey[];

export const LANDING_PAGE_COMPONENT_ORDER =
  landingPageComponentKeys satisfies readonly LandingPageComponentKey[];

export const landingPageComponentOrderMap = new Map<LandingPageComponentKey, number>(
  LANDING_PAGE_COMPONENT_ORDER.map((key, index) => [key, index]),
);
