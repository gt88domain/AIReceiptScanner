import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { DefaultCatchBoundary } from "@/components/feedback/default-catch-boundary";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { webConfig } from "@/configs/web-config";
import { getCurrentLocale } from "@/i18n";
import type { OrpcUtils } from "@/utils/orpc";
import appCss from "../styles/index.css?url";

const DevelopmentDevtools = import.meta.env.DEV
  ? lazy(() => import("@/components/development-devtools"))
  : null;

export interface RouterAppContext {
  orpc: OrpcUtils;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: webConfig.AppName,
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        sizes: "48x48",
        href: "/favicon.ico",
      },
      {
        rel: "icon",
        sizes: "16x16",
        href: "/favicon-16x16.ico",
      },
      {
        rel: "icon",
        sizes: "32x32",
        href: "/favicon-32x32.ico",
      },
    ],
  }),
  component: RootDocument,
  errorComponent: DefaultCatchBoundary,
});

function RootDocument() {
  const locale = getCurrentLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <NavigationProgress />
        <Outlet />
        {DevelopmentDevtools ? (
          <Suspense fallback={null}>
            <DevelopmentDevtools />
          </Suspense>
        ) : null}
        <Scripts />
      </body>
    </html>
  );
}
