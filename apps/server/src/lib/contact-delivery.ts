import type { ServerRuntimeConfig } from "./runtime-config";
import { isBackofficePreview } from "./backoffice-preview";

type ContactDeliveryEnv = Pick<Cloudflare.Env, "BACKOFFICE_PREVIEW" | "CONTACT_RECIPIENT">;

/** Safe availability signal for authenticated UI; it never exposes the recipient itself. */
export function isContactDeliveryAvailable(
  runtimeConfig: Pick<ServerRuntimeConfig, "email">,
  env: ContactDeliveryEnv,
) {
  return (
    runtimeConfig.email.enabled &&
    runtimeConfig.email.capabilities.contactForm &&
    !isBackofficePreview(env) &&
    Boolean(env.CONTACT_RECIPIENT?.trim())
  );
}
