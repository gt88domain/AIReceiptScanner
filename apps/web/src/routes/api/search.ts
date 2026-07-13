// https://www.fumadocs.dev/docs/internationalization/tanstack-start#search
import { createTokenizer as createJapaneseTokenizer } from "@orama/tokenizers/japanese";
import { createTokenizer as createMandarinTokenizer } from "@orama/tokenizers/mandarin";
import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { parseLocaleCookie } from "@/i18n/client";
import { defaultLocale, isValidLocale, type Locale } from "@/i18n/config";
import { source } from "@/lib/source";

const searchServer = createFromSource(source, {
  localeMap: {
    en: {
      language: "english",
    },
    zh: {
      components: {
        tokenizer: createMandarinTokenizer(),
      },
      search: {
        threshold: 0,
        tolerance: 0,
      },
    },
    jp: {
      components: {
        tokenizer: createJapaneseTokenizer(),
      },
      search: {
        threshold: 0,
        tolerance: 0,
      },
    },
  } satisfies Record<Locale, object>,
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
        const locale = getSearchLocale(request);
        const url = new URL(request.url);
        url.searchParams.set("locale", locale);
        return searchServer.GET(new Request(url, request));
      },
    },
  },
});
