/**
 * Archived zh/jp catalogs (LANG-101, 2026-09-04). Not part of the @repo/i18n
 * build; see README.md for the restore path.
 */
import commonJp from "../messages/common/jp.json";
import commonZh from "../messages/common/zh.json";
import nativeJp from "../messages/native/jp.json";
import nativeZh from "../messages/native/zh.json";
import serverJp from "../messages/server/jp.json";
import serverZh from "../messages/server/zh.json";
import webJp from "../messages/web/jp.json";
import webZh from "../messages/web/zh.json";

export const dormantCatalogs = {
  common: { jp: commonJp, zh: commonZh },
  native: { jp: nativeJp, zh: nativeZh },
  server: { jp: serverJp, zh: serverZh },
  web: { jp: webJp, zh: webZh },
} as const;
