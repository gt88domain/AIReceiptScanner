import type { ProductFeatureOverrides } from "./product-profiles";

/**
 * Browser-safe, product-owned feature choices that may refine an official profile.
 * Keep only boolean capability choices here; provider and product identity config stay private.
 */
export const productFeatureOverrides: Pick<ProductFeatureOverrides, "tickets"> = {};
