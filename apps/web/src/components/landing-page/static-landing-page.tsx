import FeaturesSection21 from "@/components/landing-page/shadcn-studio/features-section-21/features-section-21";
import HeroSection23 from "@/components/landing-page/shadcn-studio/hero-section-23/hero-section-23";
import { CallToAction } from "@/components/landing-page/tailark/call-to-action/call-to-action";
import { ContentSection } from "@/components/landing-page/tailark/content/content";
import { FAQsSection } from "@/components/landing-page/tailark/fqas/fqas";

/** Stable production landing page. Preview-only sections live in the composer route. */
export function StaticLandingPage() {
  return (
    <>
      <HeroSection23 />
      <FeaturesSection21 />
      <ContentSection />
      <FAQsSection />
      <CallToAction />
    </>
  );
}
