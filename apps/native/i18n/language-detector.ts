import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LanguageDetectorAsyncModule } from "i18next";
import type { Locale } from "@repo/i18n";
import { getDeviceLocale, normalizeLocale } from "./locale-utils";

export const LOCALE_STORAGE_KEY = "locale";

export async function persistLocale(locale: Locale) {
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export const nativeLanguageDetector: LanguageDetectorAsyncModule = {
  type: "languageDetector",
  async: true,
  detect: (callback) => {
    (async () => {
      try {
        const storedLocale = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        callback(normalizeLocale(storedLocale) ?? getDeviceLocale());
      } catch {
        callback(getDeviceLocale());
      }
    })();
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    const locale = normalizeLocale(language);
    if (!locale) return;
    await persistLocale(locale);
  },
};
