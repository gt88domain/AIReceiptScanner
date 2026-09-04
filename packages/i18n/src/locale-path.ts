import { defaultLocale, isValidLocale, localeCookieName, type PublishedLocale } from "./locales.ts";

const localePrefixPattern = /^\/([a-z]{2})(?:\/|$)/;

export function parseLocaleCookieString(cookieString: string | null): PublishedLocale | null {
  if (!cookieString) return null;
  const locale = new RegExp(`${localeCookieName}=([^;]+)`).exec(cookieString)?.[1];
  return isValidLocale(locale) ? locale : null;
}

export function extractLocalePrefix(pathname: string): PublishedLocale | null {
  const locale = localePrefixPattern.exec(pathname)?.[1];
  return locale && isValidLocale(locale) && locale !== defaultLocale ? locale : null;
}

export function stripLocalePrefix(path: string, locales: readonly string[]): string {
  const pathname = path.split(/[?#]/)[0] || "/";
  const locale = localePrefixPattern.exec(pathname)?.[1];
  return locale && locales.includes(locale) ? pathname.slice(3) || "/" : pathname;
}
