/** Translation catalogs kept in the repository. */
export const availableLocales = ["en", "zh", "jp"] as const;

export type Locale = (typeof availableLocales)[number];

/** Locales published by the current product. Keep dormant catalogs out of routes and SEO. */
export const supportedLocales = ["en"] as const satisfies readonly Locale[];
export type PublishedLocale = (typeof supportedLocales)[number];

export const defaultLocale = "en" satisfies PublishedLocale;
export const localeCookieName = "locale";

/**
 * Locale to human-readable display name mapping.
 * Used in locale switchers and language menus.
 */
export const localeDisplayNames: LocaleRecord<string> = {
  en: "English",
  zh: "中文",
  jp: "日本語",
};

/**
 * Locale to Open Graph locale mapping.
 * Used for og:locale meta tags.
 */
export const localeToOpenGraph: LocaleRecord<string> = {
  en: "en_US",
  zh: "zh_CN",
  jp: "ja_JP",
};

/**
 * Locale to BCP 47 language tag mapping.
 * Used for Intl formatting APIs.
 */
export const localeToDateFormat: LocaleRecord<string> = {
  en: "en-US",
  zh: "zh-CN",
  jp: "ja-JP",
};

export function isValidLocale(locale: string | undefined): locale is PublishedLocale {
  return supportedLocales.includes(locale as PublishedLocale);
}

/**
 * Type helper to ensure all locales are covered in a record.
 * Usage: const messages: LocaleRecord<typeof en> = { en, zh };
 */
export type LocaleRecord<T> = Record<Locale, T>;
