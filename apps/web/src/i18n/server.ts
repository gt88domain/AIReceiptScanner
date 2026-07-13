/**
 * Server-side i18n utilities
 * Handles locale detection, redirects, and cookie management
 */

import {
  defaultLocale,
  extractLocaleFromPath,
  isValidLocale,
  LOCALE_COOKIE,
  type Locale,
  shouldIgnorePath,
} from "./config";

interface LocaleMiddlewareResult {
  redirect?: Response;
  setCookie?: { name: string; value: string };
  locale: Locale;
}

/**
 * Parse locale from cookie header
 */
function parseLocaleCookie(cookieHeader: string | null): Locale | null {
  if (!cookieHeader) return null;

  const match = new RegExp(`${LOCALE_COOKIE}=([^;]+)`).exec(cookieHeader);
  const locale = match?.[1];
  return locale && isValidLocale(locale) ? locale : null;
}

/**
 * Create Set-Cookie header value
 */
function createCookieHeader(name: string, value: string): string {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

/**
 * Get locale from request (URL or cookie)
 */
export function getLocaleFromRequest(request: Request): Locale {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const cookieHeader = request.headers.get("cookie");

  // For ignored paths, read from cookie
  if (shouldIgnorePath(pathname)) {
    return parseLocaleCookie(cookieHeader) ?? defaultLocale;
  }

  // Public pages: prefer URL locale, fall back to cookie when no prefix exists
  const pathLocale = extractLocaleFromPath(pathname);
  if (pathLocale) return pathLocale;

  return parseLocaleCookie(cookieHeader) ?? defaultLocale;
}

/**
 * Handle locale middleware logic
 * - Redirects /en/* to /* (default locale should not have prefix)
 * - Strips locale prefix from ignored paths
 * - Syncs cookie when URL has explicit locale
 */
export function handleLocaleMiddleware(request: Request): LocaleMiddlewareResult {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const locale = getLocaleFromRequest(request);

  // Skip ignored paths
  if (shouldIgnorePath(pathname)) {
    return { locale };
  }

  // Redirect /en/* to /* (default locale should not have prefix)
  if (pathname.startsWith(`/${defaultLocale}/`) || pathname === `/${defaultLocale}`) {
    const newUrl = new URL(url);
    newUrl.pathname = pathname.replace(`/${defaultLocale}`, "") || "/";
    return {
      redirect: Response.redirect(newUrl.toString(), 301),
      locale: defaultLocale,
    };
  }

  const urlLocale = extractLocaleFromPath(pathname);

  // No locale prefix in URL — redirect to cookie locale prefix if user has a preference
  if (!urlLocale && locale !== defaultLocale) {
    const newUrl = new URL(url);
    newUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return {
      redirect: Response.redirect(newUrl.toString(), 302),
      locale,
    };
  }

  if (urlLocale) {
    // Strip locale prefix from ignored paths
    const strippedPath = pathname.replace(`/${urlLocale}`, "") || "/";
    if (shouldIgnorePath(strippedPath)) {
      const newUrl = new URL(url);
      newUrl.pathname = strippedPath;
      return {
        redirect: Response.redirect(newUrl.toString(), 301),
        locale: urlLocale,
      };
    }

    // Sync cookie when URL has explicit locale
    const cookieLocale = parseLocaleCookie(request.headers.get("cookie"));
    if (urlLocale !== cookieLocale) {
      return {
        setCookie: { name: LOCALE_COOKIE, value: urlLocale },
        locale: urlLocale,
      };
    }
  }

  return { locale };
}

/**
 * Apply middleware result to response
 */
export function applyLocaleMiddleware(
  response: Response,
  result: LocaleMiddlewareResult,
): Response {
  if (result.setCookie) {
    const newResponse = new Response(response.body, response);
    newResponse.headers.append(
      "Set-Cookie",
      createCookieHeader(result.setCookie.name, result.setCookie.value),
    );
    return newResponse;
  }
  return response;
}
