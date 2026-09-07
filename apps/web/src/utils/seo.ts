import { localeToOpenGraph } from "@repo/i18n";
import type { WebMessages } from "@repo/i18n/messages";
import { isAbsoluteUrl, normalizePath, toAbsoluteUrl, trimTrailingSlash } from "@repo/shared";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getCurrentLocale, getMessages, type Locale } from "@/i18n";
import { defaultLocale, supportedLocales } from "@/i18n/config";

type JsonLdPrimitive = string | number | boolean | null;
type JsonLdValue = JsonLdPrimitive | JsonLdObject | JsonLdValue[];
export type JsonLdObject = {
  [key: string]: JsonLdValue | undefined;
};

export type BreadcrumbJsonLdItem = {
  href?: string;
  name: string;
};

type SeoMetaTag = React.JSX.IntrinsicElements["meta"] | { title: string };

type SeoLinkTag = React.JSX.IntrinsicElements["link"];
type SeoScriptTag = React.JSX.IntrinsicElements["script"];

export interface SeoOptions {
  title: string;
  description?: string;
  keywords?: string | string[];
  canonicalPath: string;
  locale?: Locale;
  robots?: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  siteName?: string;
  twitterSite?: string;
  alternates?: boolean;
  ldJson?: JsonLdObject;
}

export interface SeoHead {
  meta: SeoMetaTag[];
  links: SeoLinkTag[];
  scripts?: SeoScriptTag[];
}

export type NoIndexPageKey = keyof WebMessages["seo"]["noIndex"]["pages"];

export interface NoIndexSeoOptions extends Omit<
  SeoOptions,
  "robots" | "alternates" | "description"
> {
  description?: string;
  noIndexPage?: NoIndexPageKey;
}

const getRuntimeOrigin = createIsomorphicFn()
  .server(() => {
    try {
      const request = getRequest();
      return new URL(request.url).origin;
    } catch {
      return "";
    }
  })
  .client(() => window.location.origin);

/** Whether the current route carries query parameters that should not be indexed. */
export const hasSearchParams = createIsomorphicFn()
  .server(() => {
    try {
      return new URL(getRequest().url).search.length > 0;
    } catch {
      return false;
    }
  })
  .client(() => window.location.search.length > 0);

function stripLocalePrefix(path: string): string {
  for (const locale of supportedLocales) {
    const prefix = `/${locale}`;
    if (path === prefix) {
      return "/";
    }
    if (path.startsWith(`${prefix}/`)) {
      return path.slice(prefix.length) || "/";
    }
  }
  return path;
}

function applyLocalePrefix(path: string, locale: Locale): string {
  if (locale === defaultLocale) {
    return path;
  }
  return `/${locale}${path === "/" ? "" : path}`;
}

function resolveOrigin(): string {
  const configuredOrigin = trimTrailingSlash(import.meta.env.VITE_APP_URL ?? "");
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const runtimeOrigin = trimTrailingSlash(getRuntimeOrigin());
  if (runtimeOrigin) {
    return runtimeOrigin;
  }

  return "http://localhost:3000";
}

/**
 * Site origin for structured-data builders that must emit absolute URLs
 * (schema.org image/url fields, breadcrumb items, sitemap links).
 */
export function resolveSiteOrigin(): string {
  return resolveOrigin();
}

/**
 * Routes pass this value to buildSeoHead({ ldJson }). Breadcrumb labels and
 * paths remain product-owned so they cannot drift from the visible hierarchy.
 */
export function buildBreadcrumbListJsonLd(
  items: readonly BreadcrumbJsonLdItem[],
): JsonLdObject | undefined {
  if (items.length < 2) return undefined;

  const origin = resolveOrigin();

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: toAbsoluteUrl(item.href, origin) } : {}),
    })),
  };
}

function resolveCanonicalPath(path: string, locale: Locale): string {
  if (isAbsoluteUrl(path)) {
    return path;
  }

  const normalizedPath = normalizePath(path);
  const localeNeutralPath = stripLocalePrefix(normalizedPath);
  return applyLocalePrefix(localeNeutralPath, locale);
}

function resolveOgLocale(locale: Locale): string {
  return localeToOpenGraph[locale];
}

function buildAlternateLinks(canonicalPath: string, origin: string): Array<SeoLinkTag> {
  if (isAbsoluteUrl(canonicalPath)) {
    return [];
  }

  const localeNeutralPath = stripLocalePrefix(normalizePath(canonicalPath));
  const alternates: SeoLinkTag[] = supportedLocales.map((locale) => {
    const localizedPath = applyLocalePrefix(localeNeutralPath, locale);
    return {
      rel: "alternate",
      hrefLang: locale,
      href: toAbsoluteUrl(localizedPath, origin),
    };
  });

  alternates.push({
    rel: "alternate",
    hrefLang: "x-default",
    href: toAbsoluteUrl(localeNeutralPath, origin),
  });

  return alternates;
}

function normalizeKeywords(keywords?: string | string[]): string | undefined {
  if (!keywords) {
    return undefined;
  }
  if (Array.isArray(keywords)) {
    return keywords.join(", ");
  }
  return keywords;
}

function serializeJsonLd(value: JsonLdObject): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function applyTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => values[key] ?? "");
}

export function resolveNoIndexDescription(
  page: NoIndexPageKey,
  locale: Locale = getCurrentLocale(),
): string {
  const messages = getMessages(locale);
  const template = messages.seo.noIndex.descriptionTemplate;
  const pageLabel = messages.seo.noIndex.pages[page];
  return applyTemplate(template, { page: pageLabel });
}

// https://tanstack.com/start/v0/docs/framework/react/guide/seo
export function buildSeoHead(options: SeoOptions): SeoHead {
  const locale = options.locale ?? getCurrentLocale();
  const origin = resolveOrigin();
  const canonicalPath = resolveCanonicalPath(options.canonicalPath, locale);
  const canonicalUrl = toAbsoluteUrl(canonicalPath, origin);
  const description = options.description;
  const keywords = normalizeKeywords(options.keywords);
  const robots = options.robots ?? "index,follow";
  const type = options.type ?? "website";
  const twitterSite = options.twitterSite ?? canonicalUrl;

  const defaultOgImage = "/og/og.png";
  const imageSource = options.image ?? defaultOgImage;

  const imageUrl = toAbsoluteUrl(imageSource, origin);

  const twitterCard = imageUrl ? "summary_large_image" : "summary";

  const meta: SeoMetaTag[] = [
    { title: options.title },
    { name: "robots", content: robots },
    { property: "og:type", content: type },
    { property: "og:title", content: options.title },
    { property: "og:url", content: canonicalUrl },
    { property: "og:locale", content: resolveOgLocale(locale) },
    { name: "twitter:card", content: twitterCard },
    { name: "twitter:title", content: options.title },
    { name: "twitter:url", content: canonicalUrl },
    { name: "twitter:site", content: twitterSite },
  ];

  if (description) {
    meta.push(
      { name: "description", content: description },
      { property: "og:description", content: description },
      { name: "twitter:description", content: description },
    );
  }

  if (keywords) {
    meta.push({ name: "keywords", content: keywords });
  }

  if (options.siteName) {
    meta.push({ property: "og:site_name", content: options.siteName });
  }

  if (imageUrl) {
    meta.push(
      { property: "og:image", content: imageUrl },
      { name: "twitter:image", content: imageUrl },
    );
  }

  if (imageUrl && options.imageAlt) {
    meta.push({ property: "og:image:alt", content: options.imageAlt });
  }

  const links: SeoLinkTag[] = [
    { rel: "canonical", href: canonicalUrl },
    ...(options.alternates === false ? [] : buildAlternateLinks(canonicalPath, origin)),
  ];

  const scripts = options.ldJson
    ? [
        {
          type: "application/ld+json",
          children: serializeJsonLd(options.ldJson),
        } satisfies SeoScriptTag,
      ]
    : undefined;

  return {
    meta,
    links,
    scripts,
  };
}

export function buildNoIndexHead(options: NoIndexSeoOptions): SeoHead {
  const locale = options.locale ?? getCurrentLocale();
  const { noIndexPage, description, ...seoOptions } = options;

  const resolvedDescription =
    description ?? (noIndexPage ? resolveNoIndexDescription(noIndexPage, locale) : undefined);

  return buildSeoHead({
    ...seoOptions,
    locale,
    description: resolvedDescription,
    robots: "noindex,nofollow",
    alternates: false,
  });
}
