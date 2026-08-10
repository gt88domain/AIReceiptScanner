import { resolveCommonConfig, resolveWebCommonConfig } from "@repo/app-config";
import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import templateVersion from "../../../../../template-version.json";
import { billingEvent } from "@/db/schema/payments";
import { adminProcedure } from "@/lib/orpc";
import { countFailedJobEvents } from "@/modules/jobs/job.dead-letter";

const integrationStatusSchema = z.enum(["configured", "disabled", "missing"]);
const integrationSchema = z.object({
  id: z.string(),
  category: z.enum(["infrastructure", "authentication", "payments", "email"]),
  status: integrationStatusSchema,
});

const systemSchema = z.object({
  application: z.object({
    templateVersion: z.string(),
    environment: z.string(),
  }),
  modules: z.array(z.object({ id: z.string(), enabled: z.boolean() })),
  resources: z.array(
    z.object({ id: z.enum(["d1", "r2", "queue"]), status: integrationStatusSchema }),
  ),
  operational: z.object({
    failedJobs: z.number().nullable(),
    pendingWebhooks: z.number().nullable(),
  }),
});

type IntegrationStatus = z.infer<typeof integrationStatusSchema>;

function configurationStatus(enabled: boolean, configured: boolean): IntegrationStatus {
  if (!enabled) return "disabled";
  return configured ? "configured" : "missing";
}

/**
 * Safe admin configuration summary. It deliberately reports only derived
 * states; credentials, bindings, and provider identifiers never leave the Worker.
 */
export const adminSystemRouter = {
  getIntegrations: adminProcedure.output(z.array(integrationSchema)).handler(({ context }) => {
    const features = context.runtimeConfig.features;
    const paymentProvider = resolveWebCommonConfig().payments?.provider;
    const authMethods = resolveCommonConfig().auth.methods;

    return [
      { id: "d1", category: "infrastructure", status: "configured" },
      {
        id: "r2",
        category: "infrastructure",
        status: configurationStatus(features.storage, Boolean(context.storage)),
      },
      {
        id: "queue",
        category: "infrastructure",
        status: configurationStatus(features.jobs, Boolean(context.jobs)),
      },
      {
        id: "github",
        category: "authentication",
        status: configurationStatus(
          authMethods.githubEnabled === true,
          Boolean(context.env.GITHUB_CLIENT_ID && context.env.GITHUB_CLIENT_SECRET),
        ),
      },
      {
        id: "google",
        category: "authentication",
        status: configurationStatus(
          authMethods.googleEnabled === true,
          Boolean(context.env.GOOGLE_CLIENT_ID && context.env.GOOGLE_CLIENT_SECRET),
        ),
      },
      {
        id: "apple",
        category: "authentication",
        status: configurationStatus(
          authMethods.appleEnabled === true,
          Boolean(context.env.APPLE_APP_BUNDLE_IDENTIFIER),
        ),
      },
      {
        id: "stripe",
        category: "payments",
        status: configurationStatus(
          features.web.billing && paymentProvider === "stripe",
          Boolean(context.env.STRIPE_SECRET_KEY && context.env.STRIPE_WEBHOOK_SECRET),
        ),
      },
      {
        id: "creem",
        category: "payments",
        status: configurationStatus(
          features.web.billing && paymentProvider === "creem",
          Boolean(context.env.CREEM_API_KEY && context.env.CREEM_WEBHOOK_SECRET),
        ),
      },
      {
        id: "waffo",
        category: "payments",
        status: configurationStatus(
          features.web.billing && paymentProvider === "waffo",
          Boolean(context.env.WAFFO_MERCHANT_ID && context.env.WAFFO_PRIVATE_KEY),
        ),
      },
      {
        id: "revenuecat",
        category: "payments",
        status: configurationStatus(
          features.native.billing,
          Boolean(context.env.REVENUECAT_WEBHOOK_SECRET),
        ),
      },
      {
        id: "resend",
        category: "email",
        status: configurationStatus(
          context.runtimeConfig.email.enabled,
          context.runtimeConfig.email.enabled && Boolean(context.env.RESEND_API_KEY),
        ),
      },
    ];
  }),

  getSystem: adminProcedure.output(systemSchema).handler(async ({ context }) => {
    const { features } = context.runtimeConfig;
    const [failedJobs, pendingWebhooks] = await Promise.all([
      features.jobs ? countFailedJobEvents(context.db) : Promise.resolve(null),
      features.billing
        ? context.db
            .select({ count: count() })
            .from(billingEvent)
            .where(
              and(
                eq(billingEvent.processingStatus, "pending"),
                isNull(billingEvent.deadLetteredAt),
              ),
            )
            .then((rows) => rows.at(0)?.count ?? 0)
        : Promise.resolve(null),
    ]);

    return {
      application: {
        templateVersion: templateVersion.version,
        environment: context.env.NODE_ENV,
      },
      modules: [
        { id: "auth", enabled: true },
        { id: "admin", enabled: features.admin },
        { id: "billing", enabled: features.billing },
        { id: "credits", enabled: features.credits },
        { id: "storage", enabled: features.storage },
        { id: "jobs", enabled: features.jobs },
      ],
      resources: [
        { id: "d1", status: "configured" },
        { id: "r2", status: configurationStatus(features.storage, Boolean(context.storage)) },
        { id: "queue", status: configurationStatus(features.jobs, Boolean(context.jobs)) },
      ],
      operational: { failedJobs, pendingWebhooks },
    };
  }),
};
