import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { defaultLocale, supportedLocales, type Locale, type LocaleRecord } from "@repo/i18n";
import { nativeMessages, type NativeMessages } from "@repo/i18n/messages";
import { nativeLanguageDetector, persistLocale } from "./language-detector";
import { resolveLocale } from "./locale-utils";

const resources = {
  en: { translation: nativeMessages.en },
  zh: { translation: nativeMessages.zh },
  jp: { translation: nativeMessages.jp },
} satisfies LocaleRecord<{ translation: NativeMessages }>;

if (!i18n.isInitialized) {
  i18n
    .use(nativeLanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: defaultLocale,
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
}

export function getCurrentLocale(): Locale {
  return resolveLocale(i18n.resolvedLanguage ?? i18n.language);
}

export async function changeLanguage(locale: Locale) {
  await i18n.changeLanguage(locale);
  await persistLocale(locale);
}

export { defaultLocale, supportedLocales, type Locale };
export default i18n;
