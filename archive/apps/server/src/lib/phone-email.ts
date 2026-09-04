import { createHmac } from "node:crypto";
import {
  normalizePhoneDigits,
  PHONE_COMPATIBILITY_EMAIL_DIGEST_LENGTH,
  PHONE_COMPATIBILITY_EMAIL_DOMAIN,
  PHONE_COMPATIBILITY_EMAIL_PREFIX,
} from "@repo/shared";

export function buildPhoneCompatibilityEmail(phoneNumber: string, secret: string): string {
  if (!secret) {
    throw new Error("buildPhoneCompatibilityEmail requires a non-empty secret");
  }
  const digest = createHmac("sha256", secret)
    .update(normalizePhoneDigits(phoneNumber))
    .digest("hex")
    .slice(0, PHONE_COMPATIBILITY_EMAIL_DIGEST_LENGTH);
  return `${PHONE_COMPATIBILITY_EMAIL_PREFIX}${digest}@${PHONE_COMPATIBILITY_EMAIL_DOMAIN}`;
}
