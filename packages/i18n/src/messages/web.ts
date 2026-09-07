import type { Locale, LocaleRecord } from "../locales";

import webEn from "./web/en.json";

export type WebMessages = typeof webEn;

export const webMessages: LocaleRecord<WebMessages> = {
  en: webEn,
  zh: webEn,
  jp: webEn,
};

export function getWebMessages(locale: Locale): WebMessages {
  return webMessages[locale] ?? webEn;
}
