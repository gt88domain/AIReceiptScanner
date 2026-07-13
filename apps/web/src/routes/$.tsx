import { createFileRoute } from "@tanstack/react-router";
import { NotFound404 } from "@/components/feedback/404/not-found-404";
import { webConfig } from "@/configs/web-config";
import { getCurrentLocale } from "@/i18n";
import { buildNoIndexHead } from "@/utils/seo";

/**
 * Splat route that catches all unmatched paths (e.g., /a/b/c).
 * Renders 404 within the normal route tree to ensure proper styling and hydration.
 * This approach avoids issues with notFoundComponent which renders outside RootDocument.
 */
export const Route = createFileRoute("/$")({
  head: () =>
    buildNoIndexHead({
      locale: getCurrentLocale(),
      title: `Page Not Found | ${webConfig.AppName}`,
      noIndexPage: "notFound",
      canonicalPath: "/404",
      siteName: webConfig.AppName,
    }),
  component: NotFound404,
});
