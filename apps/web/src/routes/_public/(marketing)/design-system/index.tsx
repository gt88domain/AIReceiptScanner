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
 * the path sits in the shared non-public path list so it can never
 * enter the sitemap, and the head is noindex,nofollow as a final guard. Copy
 * in the gallery documents components for template developers; it is developer
 * documentation, not product content, so it intentionally skips i18n messages.
 *
 * The template Cloudflare preview build (VITE_TEMPLATE_PREVIEW=true, set only
 * by the deploy:preview script and wrangler.preview.jsonc) also exposes the
 * gallery so design work can be reviewed on the preview URL; that deployment
 * is already fully noindexed, robots-disallowed, and backed by a read-only
 * API. Production deploys never set the flag, so the gallery stays dev-only
 * there.
 */
export const Route = createFileRoute("/_public/(marketing)/design-system/")({
  beforeLoad: () => {
    if (import.meta.env.DEV) return;
    if (import.meta.env.VITE_TEMPLATE_PREVIEW === "true") return;
    throw notFound();
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
