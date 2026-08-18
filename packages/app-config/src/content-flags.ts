/**
 * Browser-safe content surface flags. Downstream products toggle the literal
 * booleans here to enable the docs/blog capability.
 *
 * This file is the ONLY content-flag source of truth. It must stay free of
 * secrets, pricing, resolvers, and computed logic so the web build can inline
 * it directly (vite.config imports it) without leaking product configuration
 * into the browser bundle. Runtime product configuration reads the same values
 * through product-config.ts.
 */
export const contentSurfaceFlags = {
  docs: false,
  blog: false,
} as const;

export type ContentSurface = keyof typeof contentSurfaceFlags;
