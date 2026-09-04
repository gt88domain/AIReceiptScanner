import {
  extractLocalePrefix,
  isValidLocale,
  localeCookieName,
  localeDisplayNames,
  type Locale,
  defaultLocale as sharedDefaultLocale,
  supportedLocales,
} from "@repo/i18n";
import { isNonPublicPath } from "@/configs/non-public-paths";

/**
 * i18n configuration
 * Locale definitions are imported from @repo/i18n (single source of truth)
 */

export const defaultLocale = sharedDefaultLocale;
export const LOCALE_COOKIE = localeCookieName;

export { isValidLocale, localeDisplayNames, stripLocalePrefix, supportedLocales, type Locale };

export function shouldIgnorePath(pathname: string): boolean {
  return isNonPublicPath(pathname);
}

/**
 * Extract locale from URL path
 * e.g., /zh/about -> zh, /about -> null
 */
export function extractLocaleFromPath(pathname: string): Locale | null {
  return extractLocalePrefix(pathname);
}
  stripLocalePrefix,
