import { env } from "cloudflare:workers";
import { timingSafeEqual } from "node:crypto";
import { HTTPException } from "hono/http-exception";
import type {
  CreateCheckoutInput,
  CreatePortalInput,
  ParsedWebhookEvent,
  PaymentProvider,
  WebhookInput,
} from "../../public/types";
import { PaymentProviderRequestError } from "../../public/types";
import type { RevenueCatWebhookEnvelope } from "./types";

function requireWebhookAuthorization() {
  if (!env.REVENUECAT_WEBHOOK_SECRET) {
    throw new Error("Missing REVENUECAT_WEBHOOK_SECRET");
  }

  return env.REVENUECAT_WEBHOOK_SECRET.trim();
}

function isValidWebhookAuthorization(
  header: string | null | undefined,
  expectedAuthorization: string,
) {
  if (!header) {
    return false;
  }

  const normalizedHeader = header.trim();

  const expectedBearerAuthorization = expectedAuthorization.startsWith("Bearer ")
    ? expectedAuthorization
    : `Bearer ${expectedAuthorization}`;

  const encoder = new TextEncoder();
  return [expectedAuthorization, expectedBearerAuthorization].some((expected) => {
    const actualBytes = encoder.encode(normalizedHeader);
    const expectedBytes = encoder.encode(expected);
    return (
      actualBytes.byteLength === expectedBytes.byteLength &&
      timingSafeEqual(actualBytes, expectedBytes)
    );
  });
}

function parseRevenueCatWebhook(rawBody: string): RevenueCatWebhookEnvelope {
  const payload = JSON.parse(rawBody) as RevenueCatWebhookEnvelope;

  if (!payload?.event?.id || !payload.event.type) {
    throw new Error("Invalid RevenueCat webhook payload");
  }

  return payload;
}

function unsupportedRevenueCatOperation(name: string): never {
  throw new PaymentProviderRequestError(
    `RevenueCat provider does not support ${name} on the server`,
    "definitely_failed",
  );
}

export function createRevenueCatPaymentProvider(): PaymentProvider {
  return {
    key: "revenuecat",
    capabilities: { checkoutIdempotency: "none", subscriptionUpdateIdempotency: "none" },

    async createCheckoutSession(_input: CreateCheckoutInput) {
      unsupportedRevenueCatOperation("createCheckoutSession");
    },

    async createPortalSession(_input: CreatePortalInput) {
      unsupportedRevenueCatOperation("createPortalSession");
    },

    async setSubscriptionCancelAtPeriodEnd() {
      unsupportedRevenueCatOperation("setSubscriptionCancelAtPeriodEnd");
    },

    async updateSubscriptionPlan() {
      unsupportedRevenueCatOperation("updateSubscriptionPlan");
    },

    async parseWebhookEvent(input: WebhookInput): Promise<ParsedWebhookEvent> {
      const requireAuth = requireWebhookAuthorization();
      if (!isValidWebhookAuthorization(input.signature, requireAuth)) {
        throw new HTTPException(401, {
          message: "Invalid RevenueCat webhook authorization",
        });
      }

      const payload = parseRevenueCatWebhook(input.rawBody);

      return {
        providerEventId: payload.event.id,
        type: payload.event.type,
        createdAt: new Date(payload.event.event_timestamp_ms),
        payload,
      };
    },
  };
}
