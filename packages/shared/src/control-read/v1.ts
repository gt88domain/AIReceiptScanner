import { z } from "zod";

export const controlReadV1SchemaVersion = 1 as const;

const controlDateSchema = z.date();
const controlEmptyInputSchema = z.object({}).strict();
const controlIntegrationStatusSchema = z.enum(["configured", "disabled", "missing"]);

export const controlAnalyticsWindowSchema = z.enum(["7d", "30d", "90d", "all"]);
export const controlGetSnapshotInputSchema = controlEmptyInputSchema;
export const controlGetOverviewInputSchema = controlEmptyInputSchema;
export const controlGetIntegrationsInputSchema = controlEmptyInputSchema;
export const controlGetSystemInputSchema = controlEmptyInputSchema;
export const controlGetAnalyticsInputSchema = z.object({ window: controlAnalyticsWindowSchema });
export const controlListUsersInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(10),
  name: z.string().max(255).optional(),
  sort: z
    .array(z.object({ id: z.enum(["name", "email", "createdAt"]), desc: z.boolean() }))
    .max(3)
    .optional()
    .default([{ id: "createdAt", desc: true }]),
});
export const controlListAuditInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(50),
});

export const controlSnapshotV1Schema = z.object({
  schemaVersion: z.literal(controlReadV1SchemaVersion),
  project: z.object({ id: z.string(), name: z.string() }),
  build: z.object({
    appVersion: z.string().nullable(),
    templateVersion: z.string().nullable(),
    commit: z.string().nullable(),
    profile: z.string().nullable(),
  }),
  status: z.enum(["ok", "warning", "unavailable"]),
  modules: z.object({
    auth: z.boolean(),
    admin: z.boolean(),
    billing: z.boolean(),
    credits: z.boolean(),
    storage: z.boolean(),
    jobs: z.boolean(),
  }),
  counts: z.object({
    users: z.number().int().nonnegative().nullable(),
    failedJobs: z.number().int().nonnegative().nullable(),
    pendingWebhooks: z.number().int().nonnegative().nullable(),
  }),
  generatedAt: z.string().datetime(),
});

export const controlAdminUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  emailVerified: z.boolean(),
  phoneNumber: z.string().nullable(),
  phoneNumberVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: controlDateSchema,
  updatedAt: controlDateSchema,
});
export const controlUserSummaryOutputSchema = z.object({ users: z.number().int().nonnegative() });
export const controlListUsersOutputSchema = z.object({
  data: z.array(controlAdminUserSchema),
  pageCount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const controlAnalyticsOutputSchema = z.object({
  window: controlAnalyticsWindowSchema,
  generatedAt: controlDateSchema,
  users: z.object({ total: z.number(), new: z.number() }),
  billing: z
    .object({ activeSubscriptions: z.number(), successfulPurchases: z.number() })
    .nullable(),
  credits: z
    .object({
      granted: z.number(),
      consumed: z.number(),
      revoked: z.number(),
      restored: z.number(),
    })
    .nullable(),
  operations: z.object({
    jobs: z.object({ pending: z.number(), failed: z.number() }).nullable(),
    webhooks: z.object({ pending: z.number(), deadLettered: z.number() }).nullable(),
  }),
  audit: z.object({ changes: z.number() }),
});

export const controlIntegrationSchema = z.object({
  id: z.string(),
  category: z.enum(["infrastructure", "authentication", "payments", "email"]),
  status: controlIntegrationStatusSchema,
});
export const controlIntegrationsOutputSchema = z.array(controlIntegrationSchema);

export const controlSystemOutputSchema = z.object({
  application: z.object({ templateVersion: z.string(), environment: z.string() }),
  modules: z.array(z.object({ id: z.string(), enabled: z.boolean() })),
  resources: z.array(
    z.object({ id: z.enum(["d1", "r2", "queue"]), status: controlIntegrationStatusSchema }),
  ),
  operational: z.object({
    failedJobs: z.number().nullable(),
    pendingWebhooks: z.number().nullable(),
  }),
});

export const controlBillingOverviewSchema = z.object({
  stats: z.object({
    users: z.number(),
    activeSubscriptions: z.number(),
    successfulPurchases: z.number(),
    pendingWebhooks: z.number(),
  }),
  subscriptions: z.array(
    z.object({
      id: z.string(),
      email: z.string().nullable(),
      provider: z.string(),
      planId: z.string(),
      priceId: z.string(),
      status: z.string(),
      currentPeriodEnd: controlDateSchema.nullable(),
      updatedAt: controlDateSchema,
    }),
  ),
  purchases: z.array(
    z.object({
      id: z.string(),
      email: z.string().nullable(),
      provider: z.string(),
      planId: z.string(),
      priceId: z.string(),
      status: z.string(),
      paidAt: controlDateSchema.nullable(),
      updatedAt: controlDateSchema,
    }),
  ),
  webhooks: z.array(
    z.object({
      id: z.string(),
      provider: z.string(),
      eventType: z.string(),
      processingStatus: z.enum(["pending", "processing", "processed", "dead_letter"]),
      processedAt: controlDateSchema,
      firstReceivedAt: controlDateSchema.nullable(),
      lastAttemptAt: controlDateSchema.nullable(),
      attemptCount: z.number(),
      lastError: z.string().nullable(),
    }),
  ),
});
export const controlOverviewOutputSchema = z.object({
  userSummary: z.object({ users: z.number() }),
  billing: controlBillingOverviewSchema.nullable(),
});

export const controlAuditLogSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actorEmail: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  createdAt: controlDateSchema,
});
export const controlListAuditOutputSchema = z.object({
  data: z.array(controlAuditLogSchema),
  pageCount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const controlReadV1MethodNames = [
  "getSnapshot",
  "getOverview",
  "getAnalytics",
  "listUsers",
  "getIntegrations",
  "listAudit",
  "getSystem",
] as const;

export const controlReadErrorCodes = [
  "CONTROL_UNAVAILABLE",
  "CONTROL_FORBIDDEN",
  "CONTROL_INVALID_INPUT",
  "CONTROL_MODULE_DISABLED",
] as const;

export type ControlReadV1 = {
  getSnapshot(input?: z.input<typeof controlGetSnapshotInputSchema>): Promise<ControlSnapshotV1>;
  getOverview(input?: z.input<typeof controlGetOverviewInputSchema>): Promise<ControlOverviewV1>;
  getAnalytics(input: z.input<typeof controlGetAnalyticsInputSchema>): Promise<ControlAnalyticsV1>;
  listUsers(input: z.input<typeof controlListUsersInputSchema>): Promise<ControlUsersV1>;
  getIntegrations(
    input?: z.input<typeof controlGetIntegrationsInputSchema>,
  ): Promise<ControlIntegrationsV1>;
  listAudit(input: z.input<typeof controlListAuditInputSchema>): Promise<ControlAuditV1>;
  getSystem(input?: z.input<typeof controlGetSystemInputSchema>): Promise<ControlSystemV1>;
};

export type ControlSnapshotV1 = z.infer<typeof controlSnapshotV1Schema>;
export type ControlAnalyticsV1 = z.infer<typeof controlAnalyticsOutputSchema>;
export type ControlUsersV1 = z.infer<typeof controlListUsersOutputSchema>;
export type ControlIntegrationsV1 = z.infer<typeof controlIntegrationsOutputSchema>;
export type ControlSystemV1 = z.infer<typeof controlSystemOutputSchema>;
export type ControlOverviewV1 = z.infer<typeof controlOverviewOutputSchema>;
export type ControlAuditV1 = z.infer<typeof controlListAuditOutputSchema>;
export type ControlAnalyticsInputV1 = z.output<typeof controlGetAnalyticsInputSchema>;
export type ControlUsersInputV1 = z.output<typeof controlListUsersInputSchema>;
export type ControlAuditInputV1 = z.output<typeof controlListAuditInputSchema>;
