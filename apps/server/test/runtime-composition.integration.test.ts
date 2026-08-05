import {
  createPlatformComposition,
  productProfiles,
  type ResolvedEmailConfig,
} from "@repo/app-config";
import { env } from "cloudflare:workers";
import { createApp } from "@/app/create-app";
import type { ServerRuntimeConfig } from "@/lib/runtime-config";
import { buildRuntimeAppRouter } from "@/routers/runtime-router";
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

function nestedRouter(router: object, namespace: string): object {
  const value: unknown = Object.getOwnPropertyDescriptor(router, namespace)?.value;
  if (typeof value !== "object" || value === null) throw new Error(`${namespace} is not a router`);
  return value;
}

describe("runtime platform composition", () => {
  it("keeps the full SaaS Worker surface", () => {
    const router = buildRuntimeAppRouter(runtimeConfig("full-saas").composition);
    expect(Object.hasOwn(router, "storage")).toBe(true);
    expect(Object.hasOwn(router, "payments")).toBe(true);
    expect(Object.hasOwn(router, "credits")).toBe(true);
    expect(Object.hasOwn(nestedRouter(router, "web"), "payments")).toBe(true);
    expect(Object.hasOwn(nestedRouter(router, "web"), "credits")).toBe(true);
  });

  it("omits commercial endpoints and admin operations from directory-lite", async () => {
    const config = runtimeConfig("directory-lite");
    const router = buildRuntimeAppRouter(config.composition);
    const app = createApp({ runtimeConfig: config });

    expect(Object.hasOwn(router, "storage")).toBe(false);
    expect(Object.hasOwn(router, "payments")).toBe(false);
    expect(Object.hasOwn(router, "credits")).toBe(false);
    expect(Object.hasOwn(nestedRouter(router, "web"), "payments")).toBe(false);
    expect(Object.hasOwn(nestedRouter(router, "admin"), "listFailedJobs")).toBe(false);
    expect(Object.hasOwn(nestedRouter(router, "admin"), "getPaymentProviderHealth")).toBe(false);
    await expect(
      app.fetch(new Request("https://server.test/api/webhooks/stripe", { method: "POST" }), env),
    ).resolves.toMatchObject({ status: 404 });
  });

  it("keeps jobs admin operations for the jobs-on directory profile", () => {
    const router = buildRuntimeAppRouter(runtimeConfig("directory").composition);
    expect(Object.hasOwn(nestedRouter(router, "admin"), "listFailedJobs")).toBe(true);
    expect(Object.hasOwn(nestedRouter(router, "admin"), "getPaymentProviderHealth")).toBe(false);
  });
});
