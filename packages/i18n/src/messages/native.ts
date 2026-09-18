import type { Locale, LocaleRecord } from "../locales";

import nativeEn from "./native/en.json";

export type NativeMessages = typeof nativeEn;

export const nativeMessages: LocaleRecord<NativeMessages> = {
  en: nativeEn,
  zh: nativeEn,
  jp: nativeEn,
};

export function getNativeMessages(locale: Locale): NativeMessages {
  return nativeMessages[locale] ?? nativeEn;
}
