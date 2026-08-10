import { env, exports } from "cloudflare:workers";
import {
  createPlatformComposition,
  productProfiles,
  type ResolvedEmailConfig,
} from "@repo/app-config";
import { createApiClient } from "@repo/api-client";
import {
  controlGetAnalyticsInputSchema,
  controlListAuditInputSchema,
  controlListUsersInputSchema,
  controlReadV1MethodNames,
  controlSnapshotV1Schema,
} from "@repo/shared/control-read";
import { createDb } from "@/db";
import { user } from "@/db/schema/auth";
import { resolveServerRuntimeConfig, type ServerRuntimeConfig } from "@/lib/runtime-config";
import { createControlReadV1, type ControlReadDependencies } from "@/modules/control-read";
import { recordAdminAuditLog } from "@/modules/audit";
import type { AppRouterClient } from "@/routers";
import { describe, expect, it } from "vitest";

const disabledEmail: ResolvedEmailConfig = {
  enabled: false,
  provider: "none",
  capabilities: {
    verification: false,
    passwordReset: false,
    emailOtp: false,
    newsletter: false,
    contactForm: false,
    operationalAlerts: false,
  },
  defaultFrom: "Template <noreply@example.test>",
};

function runtimeConfig(profile: keyof typeof productProfiles): ServerRuntimeConfig {
  const composition = createPlatformComposition({
    features: productProfiles[profile].features,
    featureCapabilities: {},
  });
  return {
    composition,
    features: composition.features,
    storage: {
      enabled: composition.modules.storage,
      provider: "r2",
      publicPath: "/api/storage",
      maxFileSizes: { avatar: 5 * 1024 * 1024 },
    },
    email: disabledEmail,
  };
}

function dependencies(profile: keyof typeof productProfiles): ControlReadDependencies {
  return {
    db: createDb(env.DB),
    env,
    runtimeConfig: runtimeConfig(profile),
    storage: undefined,
    jobs: undefined,
  };
}

function getSessionClient(cookie: string) {
  return createApiClient<AppRouterClient>({
    baseUrl: "https://server.test",
    fetch: (input, init) => exports.default.fetch(input, init),
    getHeaders: () => ({ cookie }),
  });
}

async function signUp(email: string) {
  const signUpResponse = await exports.default.fetch("https://server.test/api/auth/sign-up/email", {
    body: JSON.stringify({ email, name: "Control Test", password: "test-password-123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(signUpResponse.status).toBe(200);
  await env.DB.prepare("UPDATE user SET email_verified = 1 WHERE email = ?").bind(email).run();
  const response = await exports.default.fetch("https://server.test/api/auth/sign-in/email", {
    body: JSON.stringify({ email, password: "test-password-123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(response.status).toBe(200);
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  expect(cookie).not.toBe("");
  return getSessionClient(cookie);
}

describe("ControlReadV1", () => {
  it("defines only the fixed read-only method set and bounded inputs", () => {
    expect(controlReadV1MethodNames).toEqual([
      "getSnapshot",
      "getOverview",
      "getAnalytics",
      "listUsers",
      "getIntegrations",
      "listAudit",
      "getSystem",
    ]);
    expect(controlReadV1MethodNames).not.toContainEqual(
      expect.stringMatching(/create|update|delete|retry|replay|refund|grant|revoke|execute|query/i),
    );
    expect(controlGetAnalyticsInputSchema.safeParse({ window: "arbitrary" }).success).toBe(false);
    expect(controlListUsersInputSchema.safeParse({ perPage: 101 }).success).toBe(false);
    expect(controlListUsersInputSchema.safeParse({ name: "x".repeat(256) }).success).toBe(false);
    expect(controlListAuditInputSchema.safeParse({ perPage: 101 }).success).toBe(false);
  });

  it("returns a PII-free aggregate snapshot and excludes deleted users", async () => {
    const db = createDb(env.DB);
    const now = new Date();
    await db.insert(user).values([
      {
        id: crypto.randomUUID(),
        name: "Visible control user",
        email: "control-visible@example.test",
        emailVerified: true,
        phoneNumber: "+15550001111",
        phoneNumberVerified: true,
        image: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: crypto.randomUUID(),
        name: "Deleted control user",
        email: "control-deleted@example.test",
        emailVerified: true,
        phoneNumber: "+15550002222",
        phoneNumberVerified: true,
        image: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: now,
      },
    ]);

    const snapshot = await createControlReadV1(dependencies("directory-lite")).getSnapshot();
    const serialized = JSON.stringify(snapshot);
    expect(controlSnapshotV1Schema.parse(snapshot)).toMatchObject({ schemaVersion: 1 });
    expect(snapshot.counts.users).toBe(1);
    expect(snapshot.counts.failedJobs).toBeNull();
    expect(snapshot.counts.pendingWebhooks).toBeNull();
    expect(snapshot.modules).toMatchObject({
      billing: false,
      credits: false,
      storage: false,
      jobs: false,
    });
    expect(serialized).not.toContain("control-visible@example.test");
    expect(serialized).not.toContain("+15550001111");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("token");
  });

  it("keeps all official profiles aggregate-only and module-aware", async () => {
    for (const profile of ["full-saas", "account-app", "directory", "directory-lite"] as const) {
      const config = runtimeConfig(profile);
      const snapshot = await createControlReadV1(dependencies(profile)).getSnapshot();
      expect(snapshot.modules).toEqual({
        auth: true,
        admin: config.composition.modules.admin.core,
        billing: config.composition.modules.billing,
        credits: config.composition.modules.credits,
        storage: config.composition.modules.storage,
        jobs: config.composition.modules.jobs,
      });
      expect(snapshot.counts.failedJobs).toEqual(
        config.composition.modules.jobs ? expect.any(Number) : null,
      );
      expect(snapshot.counts.pendingWebhooks).toEqual(
        config.composition.modules.billing ? expect.any(Number) : null,
      );
    }
  });

  it("shares authoritative results with existing admin reads", async () => {
    const client = await signUp("admin@example.test");
    const db = createDb(env.DB);
    const actor = await env.DB.prepare("SELECT id FROM user WHERE email = ?")
      .bind("admin@example.test")
      .first<{ id: string }>();
    expect(actor?.id).toBeTruthy();
    await recordAdminAuditLog(db, {
      actor: { id: actor!.id, email: "admin@example.test" },
      action: "control.parity.checked",
      entity: { type: "control", id: "v1" },
      after: { safe: true },
    });

    const defaultRuntimeConfig = resolveServerRuntimeConfig();
    const control = createControlReadV1({
      db,
      env,
      runtimeConfig: defaultRuntimeConfig,
      storage: undefined,
      jobs: {} as never,
    });
    const [analytics, users, integrations, audit, system, userSummary, billing] = await Promise.all(
      [
        control.getAnalytics({ window: "30d" }),
        control.listUsers({ page: 1, perPage: 10 }),
        control.getIntegrations(),
        control.listAudit({ page: 1, perPage: 10 }),
        control.getSystem(),
        client.admin.getUserSummary(),
        client.admin.overview(),
      ],
    );
    const adminAnalytics = await client.admin.getAnalytics({ window: "30d" });
    const adminUsers = await client.admin.listUsers({ page: 1, perPage: 10 });
    const adminIntegrations = await client.admin.getIntegrations();
    const adminAudit = await client.admin.listAuditLog({ page: 1, perPage: 10 });
    const adminSystem = await client.admin.getSystem();

    expect({ ...analytics, generatedAt: undefined }).toEqual({
      ...adminAnalytics,
      generatedAt: undefined,
    });
    expect(users).toEqual(adminUsers);
    expect(integrations).toEqual(adminIntegrations);
    expect(audit).toEqual(adminAudit);
    expect(system).toEqual(adminSystem);
    await expect(control.getOverview()).resolves.toEqual({ userSummary, billing });
  });
});
