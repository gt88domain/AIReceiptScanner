import { defineConfig } from "tsdown";

/** Profile proof bundles workspace configuration so its compile-time profile cannot stay external. */
export default defineConfig({
  entry: ["src/index.ts"],
  define: {
    __EASYSTARTER_PROFILE_BUILD__: JSON.stringify(process.env.EASYSTARTER_PROFILE_BUILD ?? ""),
    __EASYSTARTER_BACKOFFICE_PREVIEW_TICKETS__: JSON.stringify(
      process.env.BACKOFFICE_PREVIEW_TICKETS ?? "",
    ),
  },
  external: ["cloudflare:workers"],
  noExternal: [/^@repo\//],
});
