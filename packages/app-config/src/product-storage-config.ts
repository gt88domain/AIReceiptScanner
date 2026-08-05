import { publicRuntimeConfig } from "./public-runtime";
import type { AppCommonConfig } from "./types";

/** Browser-safe product Storage policy. Provider bindings remain server-only. */
export const productStorageConfig = {
  enabled: publicRuntimeConfig.features.storage,
  provider: "r2",
  publicPath: "/api/storage",
  keyPrefixes: { avatar: "avatars" },
  fallbackPrefix: "files",
  allowedTypes: { avatar: ["image/jpeg", "image/png", "image/gif", "image/webp"] },
  maxFileSizes: { avatar: 5 * 1024 * 1024 },
} satisfies AppCommonConfig["storage"];
