import { resolveCommonConfig } from "@repo/app-config/config";

export function isStorageEnabled(): boolean {
  return resolveCommonConfig().storage.enabled === true;
}
