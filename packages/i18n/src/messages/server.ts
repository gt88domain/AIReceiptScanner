import type { Locale, LocaleRecord } from "../locales";

import serverEn from "./server/en.json";

export type ServerMessages = typeof serverEn;

export const serverMessages: LocaleRecord<ServerMessages> = {
  en: serverEn,
  zh: serverEn,
  jp: serverEn,
};

export function getServerMessages(locale: Locale): ServerMessages {
  return serverMessages[locale] ?? serverEn;
}
