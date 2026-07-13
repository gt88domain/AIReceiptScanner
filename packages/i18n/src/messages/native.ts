import type { Locale, LocaleRecord } from "../locales";

import nativeEn from "./native/en.json";
import nativeJp from "./native/jp.json";
import nativeZh from "./native/zh.json";

export type NativeMessages = typeof nativeEn;

export const nativeMessages: LocaleRecord<NativeMessages> = {
	en: nativeEn,
	zh: nativeZh,
	jp: nativeJp,
};

export function getNativeMessages(locale: Locale): NativeMessages {
	return nativeMessages[locale];
}
