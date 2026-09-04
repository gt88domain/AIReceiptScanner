import type { ProviderPriceEnvironment } from "@repo/app-config";

type PriceEnvironmentBindings = Pick<Cloudflare.Env, "NODE_ENV" | "PAYMENTS_PRICE_ENV">;

/** Selects provider price IDs explicitly and prevents production from using test prices. */
export function resolveProviderPriceEnvironment(
  bindings: PriceEnvironmentBindings,
): ProviderPriceEnvironment {
  const value = bindings.PAYMENTS_PRICE_ENV;
  if (value !== "test" && value !== "prod") {
    throw new Error('PAYMENTS_PRICE_ENV must be explicitly set to "test" or "prod".');
  }
  if (bindings.NODE_ENV === "production" && value !== "prod") {
    throw new Error('PAYMENTS_PRICE_ENV must be "prod" when NODE_ENV is "production".');
  }
  return value;
}
