import {
  createPlatformComposition,
  productProfiles,
  type ResolvedEmailConfig,
} from "@repo/app-config";
import { env } from "cloudflare:workers";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createApp } from "@/app/create-app";
import {
  registerPublicReadRoutes,
  type PublicReadRouteRegistrar,
} from "@/app/register-public-read-routes";
import type { ServerApp } from "@/app/types";
import * as contextModule from "@/lib/context";
import type { ServerRuntimeConfig } from "@/lib/runtime-config";

const disabledEmail: ResolvedEmailConfig = {
  enabled: false,
  provider: "none",
  capabilities: {
    verification: false,
    passwordReset: false,
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

function request(app: ServerApp, path: string) {
  return app.fetch(new Request(`https://server.test${path}`), env);
}

async function json(app: ServerApp, path: string) {
  return (await request(app, path)).json();
}

describe("default-empty public-read registration", () => {
  it("requires a synchronous undefined registrar return type", () => {
    expectTypeOf<ReturnType<PublicReadRouteRegistrar>>().toEqualTypeOf<undefined>();

    // @ts-expect-error async registrars are forbidden
    const invalidAsyncRegistrar: PublicReadRouteRegistrar = async () => {};
    expect(invalidAsyncRegistrar).toBeTypeOf("function");
  });

  it("keeps every profile default-empty without a public-read route", async () => {
    for (const profile of ["full-saas", "account-app", "directory", "directory-lite"] as const) {
      const app = createApp({ runtimeConfig: runtimeConfig(profile) });

      await expect(request(app, "/")).resolves.toMatchObject({ status: 200 });
      expect(app.routes.map((route) => route.path)).not.toContain(
        "/api/__public-read-contract/probe",
      );
    }
  });

  it("treats an omitted registrar array and an explicit empty array identically", async () => {
    const config = runtimeConfig("directory-lite");
    const omitted = createApp({ runtimeConfig: config });
    const explicitEmpty = createApp({ runtimeConfig: config, publicReadRouteRegistrars: [] });

    for (const path of ["/", "/not-found", "/api/__public-read-contract/missing"]) {
      const [omittedResponse, explicitEmptyResponse] = await Promise.all([
        request(omitted, path),
        request(explicitEmpty, path),
      ]);
      expect(omittedResponse.status).toBe(explicitEmptyResponse.status);
    }

    const [omittedHealth, explicitEmptyHealth] = await Promise.all([
      json(omitted, "/"),
      json(explicitEmpty, "/"),
    ]);
    expect(omittedHealth).toMatchObject({ status: "ok" });
    expect(explicitEmptyHealth).toMatchObject({ status: "ok" });
  });

  it("runs only explicitly supplied registrars during app creation", () => {
    let registrations = 0;
    const registrar: PublicReadRouteRegistrar = (app) => {
      registrations += 1;
      app.get("/api/__public-read-contract/probe", (c) =>
        c.json({ source: "public-read-contract" }),
      );
    };

    createApp({ runtimeConfig: runtimeConfig("directory-lite") });
    expect(registrations).toBe(0);

    createApp({
      runtimeConfig: runtimeConfig("directory-lite"),
      publicReadRouteRegistrars: [registrar],
    });
    expect(registrations).toBe(1);
  });

  it("rejects type-escaped async and non-undefined registrars synchronously", async () => {
    const app = createApp({ runtimeConfig: runtimeConfig("directory-lite") });
    const asyncRegistrar = (async () => undefined) as unknown as PublicReadRouteRegistrar;
    const rejectedAsyncRegistrar = (async () => {
      throw new Error("must not become an unhandled rejection");
    }) as unknown as PublicReadRouteRegistrar;
    const returningApp = (() => app) as unknown as PublicReadRouteRegistrar;
    const returningPromise = (() => Promise.resolve()) as unknown as PublicReadRouteRegistrar;
    const returningValue = (() => "unexpected") as unknown as PublicReadRouteRegistrar;

    for (const registrar of [
      asyncRegistrar,
      rejectedAsyncRegistrar,
      returningApp,
      returningPromise,
      returningValue,
    ]) {
      expect(() => registerPublicReadRoutes(app, [registrar])).toThrowError(
        new TypeError("Public-read route registrars must be synchronous and return undefined."),
      );
    }

    await Promise.resolve();
  });

  it("mounts an explicit public-read route before the API catch-all without creating Context", async () => {
    const registrar: PublicReadRouteRegistrar = (app) => {
      app.get("/api/__public-read-contract/probe", (c) =>
        c.json({ source: "public-read-contract" }),
      );
    };
    const app = createApp({
      runtimeConfig: runtimeConfig("directory-lite"),
      publicReadRouteRegistrars: [registrar],
    });
    const contextSpy = vi.spyOn(contextModule, "createContext");

    const response = await request(app, "/api/__public-read-contract/probe");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ source: "public-read-contract" });
    expect(contextSpy).not.toHaveBeenCalled();

    await app.fetch(new Request("https://server.test/api/healthCheck", { method: "POST" }), env);
    expect(contextSpy).toHaveBeenCalledTimes(1);
    contextSpy.mockRestore();
  });

  it("keeps a registrar's read dependency request-lazy", async () => {
    let repositoryInitializations = 0;
    const registrar: PublicReadRouteRegistrar = (app) => {
      app.get("/api/__public-read-contract/probe", (c) => {
        repositoryInitializations += 1;
        return c.json({ source: "public-read-contract" });
      });
    };
    const app = createApp({
      runtimeConfig: runtimeConfig("directory-lite"),
      publicReadRouteRegistrars: [registrar],
    });

    expect(repositoryInitializations).toBe(0);
    await request(app, "/");
    await request(app, "/not-found");
    expect(repositoryInitializations).toBe(0);

    await request(app, "/api/__public-read-contract/probe");
    expect(repositoryInitializations).toBe(1);
    await request(app, "/api/__public-read-contract/probe");
    expect(repositoryInitializations).toBe(2);
  });

  it("does not expose a test route without a registrar", async () => {
    const response = await request(
      createApp({ runtimeConfig: runtimeConfig("directory-lite") }),
      "/api/__public-read-contract/probe",
    );

    expect(response.status).not.toBe(200);
    await expect(response.text()).resolves.not.toContain("public-read-contract");
  });

  it("exposes exactly one ServerApp parameter to a registrar", () => {
    expectTypeOf<Parameters<PublicReadRouteRegistrar>>().toEqualTypeOf<[ServerApp]>();
    expectTypeOf(registerPublicReadRoutes).toBeFunction();
  });

  it("does not mutate a frozen registrar array", () => {
    const registrar: PublicReadRouteRegistrar = () => undefined;
    const registrars = Object.freeze([registrar]);

    expect(() =>
      createApp({
        runtimeConfig: runtimeConfig("directory-lite"),
        publicReadRouteRegistrars: registrars,
      }),
    ).not.toThrow();
    expect(registrars).toEqual([registrar]);
  });
});
