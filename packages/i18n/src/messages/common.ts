import type { Locale, LocaleRecord } from "../locales";

import commonEn from "./common/en.json";

export type CommonMessages = typeof commonEn;

export const commonMessages: LocaleRecord<CommonMessages> = {
  en: commonEn,
  zh: commonEn,
  jp: commonEn,
};

export function getCommonMessages(locale: Locale): CommonMessages {
  return commonMessages[locale] ?? commonEn;
}
