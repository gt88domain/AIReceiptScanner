import { resolveCommonConfig } from "./app-config";
import type { EmailCapabilities, EmailProviderKey } from "./types";

export type ResolvedEmailConfig = Readonly<{
  enabled: boolean;
  provider: EmailProviderKey;
  capabilities: EmailCapabilities;
  defaultFrom: string;
}>;

function allCapabilitiesDisabled(capabilities: EmailCapabilities) {
  return Object.values(capabilities).every((enabled) => !enabled);
}

/** Resolves and validates the one server-side outbound-email contract. */
export function resolveEmailConfig(common = resolveCommonConfig()): ResolvedEmailConfig {
  const { email } = common;
  const config: ResolvedEmailConfig = Object.freeze({
    enabled: email.enabled,
    provider: email.provider,
    capabilities: Object.freeze({ ...email.capabilities }),
    defaultFrom: `${common.app.name} <${email.from.localPart}@${email.from.domain}>`,
  });

  if (
    !config.enabled &&
    (config.provider !== "none" || !allCapabilitiesDisabled(config.capabilities))
  ) {
    throw new Error(
      "[email:DISABLED_CONFIG] Disabled email requires provider=none and no capabilities.",
    );
  }
  if (config.enabled && config.provider === "none") {
    throw new Error("[email:PROVIDER_MISSING] Enabled email requires a provider.");
  }
  if (common.auth.methods.emailOtpEnabled && !config.capabilities.emailOtp) {
    throw new Error("[email:OTP_CAPABILITY_REQUIRED] Email OTP requires the emailOtp capability.");
  }
  return config;
}

export type { EmailCapabilities } from "./types";
