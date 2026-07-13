import * as Localization from "expo-localization";
import { defaultLocale, isValidLocale, type Locale } from "@repo/i18n";

export function normalizeLocale(locale: string | null | undefined): Locale | null {
	if (!locale) return null;

	const direct = locale.toLowerCase();
	if (isValidLocale(direct)) {
		return direct;
	}

	const fromTag = direct.split("-")[0];
	if (fromTag && isValidLocale(fromTag)) {
		return fromTag;
	}

	return null;
}

export function resolveLocale(locale: string | null | undefined): Locale {
	return normalizeLocale(locale) ?? defaultLocale;
}

export function getDeviceLocale(): Locale {
	const locales = Localization.getLocales();
	const primary = locales[0];

	return (
		normalizeLocale(primary?.languageCode) ?? normalizeLocale(primary?.languageTag) ?? defaultLocale
	);
}
