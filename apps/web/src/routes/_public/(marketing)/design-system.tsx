import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { webConfig } from "@/configs/web-config";
import { buildNoIndexHead } from "@/utils/seo";

const DesignSystemGallery = lazy(() =>
  import("@/components/design-system/gallery").then((module) => ({
    default: module.DesignSystemGallery,
  })),
);

/**
 * Dev-only component gallery for template developers. The file-based route
 * exists in every build, but beforeLoad throws notFound() outside development,
 * the path sits in the vite.config.ts nonPublicPrefixes list so it can never
 * enter the sitemap, and the head is noindex,nofollow as a final guard. Copy
 * in the gallery documents components for template developers; it is developer
 * documentation, not product content, so it intentionally skips i18n messages.
 */
export const Route = createFileRoute("/_public/(marketing)/design-system")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () =>
    buildNoIndexHead({
      title: `Design system | ${webConfig.AppName}`,
      description: "Dev-only gallery of shared public components and skins.",
      canonicalPath: "/design-system",
      siteName: webConfig.AppName,
    }),
  component: DesignSystemPage,
});

function DesignSystemPage() {
  return (
    <Suspense fallback={null}>
      <DesignSystemGallery />
    </Suspense>
  );
}
