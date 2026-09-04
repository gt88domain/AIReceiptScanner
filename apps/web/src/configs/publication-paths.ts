import { stripLocalePrefix } from "@repo/i18n";
import { isNonPublicPath } from "./non-public-paths";

type PublicationLocaleConfig = {
  defaultLocale: string;
  supportedLocales: readonly string[];
};

/** Public static pages emitted for every currently published locale. */
export function createPublishedPublicPages(config: PublicationLocaleConfig): string[] {
  return config.supportedLocales.flatMap((locale) => {
    const prefix = locale === config.defaultLocale ? "" : `/${locale}`;
    return [`${prefix}/`, `${prefix}/privacy`, `${prefix}/terms`];
  });
}

export function stripPublishedLocalePrefix(
  path: string,
  supportedLocales: readonly string[],
): string {
  return stripLocalePrefix(path, supportedLocales);
}

export function isNonPublicPublishedPath(
  path: string,
  supportedLocales: readonly string[],
): boolean {
  return isNonPublicPath(stripPublishedLocalePrefix(path, supportedLocales));
}

export function isPrerenderablePath(path: string, supportedLocales: readonly string[]): boolean {
  return !path.includes("#") && !isNonPublicPublishedPath(path, supportedLocales);
}

export function shouldNoIndexResponse(
  status: number,
  path: string,
  supportedLocales: readonly string[],
): boolean {
  return status === 404 || isNonPublicPublishedPath(path, supportedLocales);
}
