// https://www.fumadocs.dev/docs/internationalization/tanstack-start#search
import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { parseLocaleCookie } from "@/i18n/client";
import { defaultLocale, isValidLocale, type Locale } from "@/i18n/config";
import { source } from "@/lib/source";
import { webConfig } from "@/configs/web-config";

const searchServer = createFromSource(source, {
  localeMap: {
    en: {
      language: "english",
    },
  },
});

function getSearchLocale(request: Request): Locale {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? url.searchParams.get("lang");
  if (locale && isValidLocale(locale)) return locale;

  const cookieLocale = parseLocaleCookie(request.headers.get("cookie"));
  return cookieLocale ?? defaultLocale;
}

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!webConfig.docsEnabled) {
          return new Response(null, { status: 404 });
        }
        const locale = getSearchLocale(request);
        const url = new URL(request.url);
        url.searchParams.set("locale", locale);
        return searchServer.GET(new Request(url, request));
      },
    },
  },
});
