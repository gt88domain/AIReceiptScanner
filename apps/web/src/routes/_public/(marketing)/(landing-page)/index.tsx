import { createFileRoute } from "@tanstack/react-router";
import { DynamicLandingPage } from "@/components/landing-page/dynamic-landing-page";
import { webConfig } from "@/configs/web-config";
import { getCurrentLocale, getMessages } from "@/i18n";
import { buildSeoHead } from "@/utils/seo";

export const Route = createFileRoute("/_public/(marketing)/(landing-page)/")({
  head: () => {
    const locale = getCurrentLocale();
    const messages = getMessages(locale);
    const title = `${webConfig.AppName} | Full-stack TypeScript SaaS Template`;

    return buildSeoHead({
      locale,
      title,
      description: messages.seo.home.description,
      canonicalPath: "/",
      type: "website",
      siteName: webConfig.AppName,
      ldJson: {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: webConfig.AppName,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: locale,
      },
    });
  },
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="flex flex-col">
      <DynamicLandingPage />
    </div>
  );
}
