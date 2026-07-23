import { createFileRoute } from "@tanstack/react-router";
import { LandingPageComposer } from "@/components/features/landing-page-composer";
import { DynamicLandingPage } from "@/components/landing-page/dynamic-landing-page";
import { LandingPageComposerProvider } from "@/components/providers/landing-page-composer-provider";
import { webConfig } from "@/configs/web-config";
import { getCurrentLocale, getMessages } from "@/i18n";
import { buildSeoHead } from "@/utils/seo";

export const Route = createFileRoute("/_public/(marketing)/templates/landing-composer")({
  head: () => {
    const locale = getCurrentLocale();
    const messages = getMessages(locale);
    return buildSeoHead({
      locale,
      title: `${messages.listingTemplate.title} | ${webConfig.AppName}`,
      description: messages.listingTemplate.description,
      canonicalPath: "/templates/landing-composer",
      siteName: webConfig.AppName,
      robots: "noindex,nofollow",
      alternates: false,
    });
  },
  component: LandingComposerPage,
});

function LandingComposerPage() {
  return (
    <LandingPageComposerProvider>
      <div className="fixed top-24 right-4 z-40 rounded-lg border bg-background p-1 shadow-sm">
        <LandingPageComposer />
      </div>
      <DynamicLandingPage />
    </LandingPageComposerProvider>
  );
}
