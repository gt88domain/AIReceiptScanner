import { resolveServerRuntimeConfig } from "@/lib/runtime-config";

/** One immutable runtime contract shared by default and named Worker entrypoints. */
export const serverRuntimeConfig = resolveServerRuntimeConfig();
