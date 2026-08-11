import {
  createControlReadHttpHandler,
  type ControlAccessJwtVerifier,
} from "@/modules/control-read/http";
import { createControlReadDependencies } from "@/modules/control-read/dependencies";
import { ControlReadEntrypoint } from "@/worker/control-read-entrypoint";
import {
  createPlatformComposition,
  productProfiles,
  type ResolvedEmailConfig,
} from "@repo/app-config";
import { controlSnapshotV1Schema } from "@repo/shared/control-read";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";

const control = {
  getSnapshot: vi.fn(async () => ({ snapshot: true })),
  getOverview: vi.fn(async () => ({ overview: true })),
  getAnalytics: vi.fn(async (input: { window: string }) => input),
  listUsers: vi.fn(async (input: { page: number; perPage: number }) => input),
  getIntegrations: vi.fn(async () => []),
  listAudit: vi.fn(async (input: { page: number; perPage: number }) => input),
  getSystem: vi.fn(async () => ({ system: true })),
};

const accessEnv = {
  CONTROL_ACCESS_AUD: "control-audience",
  CONTROL_ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
  CONTROL_READ_HTTP_HOST: "control.example.com",
};

function request(path: string, init?: RequestInit) {
  return new Request(`https://control.example.com${path}`, init);
}

function handler(verifyAccessJwt: ControlAccessJwtVerifier = async () => undefined) {
  return createControlReadHttpHandler({ createControl: () => control as never, verifyAccessJwt });
}

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

describe("Control read transports", () => {
  it("exposes exactly the seven read methods through the RPC entrypoint", () => {
    expect(Object.getOwnPropertyNames(ControlReadEntrypoint.prototype).sort()).toEqual([
      "constructor",
      "getAnalytics",
      "getIntegrations",
      "getOverview",
      "getSnapshot",
      "getSystem",
      "listAudit",
      "listUsers",
    ]);
    expect(ControlReadEntrypoint.toString()).not.toMatch(/\bdb\.(?:select|insert|update|delete)/i);
  });

  it("uses the shared ControlReadV1 facade through the live named RPC entrypoint", async () => {
    const rpc = exports.ControlReadEntrypoint;
    const snapshot = await rpc.getSnapshot();
    expect(controlSnapshotV1Schema.parse(snapshot)).toEqual(snapshot);
    await expect(rpc.getAnalytics({ window: "30d" })).resolves.toMatchObject({ window: "30d" });
    await expect(
      rpc.listUsers({ page: 1, perPage: 10, sort: [{ id: "createdAt", desc: true }] }),
    ).resolves.toMatchObject({
      data: expect.any(Array),
    });
    await expect(rpc.listAudit({ page: 1, perPage: 10 })).resolves.toMatchObject({
      data: expect.any(Array),
    });
    await expect(rpc.getIntegrations()).resolves.toEqual(expect.any(Array));
    await expect(rpc.getSystem()).resolves.toMatchObject({ modules: expect.any(Array) });
  });

  it("does not initialize optional bindings for directory-lite reads", () => {
    const composition = createPlatformComposition({
      features: productProfiles["directory-lite"].features,
      featureCapabilities: {},
    });
    const dependencies = createControlReadDependencies(env, {
      composition,
      features: composition.features,
      storage: {
        enabled: false,
        provider: "r2",
        publicPath: "/api/storage",
        maxFileSizes: { avatar: 5 * 1024 * 1024 },
      },
      email: disabledEmail,
    });

    expect(dependencies.storage).toBeUndefined();
    expect(dependencies.jobs).toBeUndefined();
  });

  it("keeps HTTP disabled without a configured exact host", async () => {
    await expect(handler()(request("/__control/v1/snapshot"), {})).resolves.toBeNull();
  });

  it("only accepts the exact configured hostname and fail-closes its dedicated host", async () => {
    const transport = handler();
    for (const hostname of [
      "evil.control.example.com",
      "control.example.com.evil.com",
      "example.com",
      "localhost",
      "127.0.0.1",
    ]) {
      await expect(
        transport(new Request(`https://${hostname}/__control/v1/snapshot`), accessEnv),
      ).resolves.toBeNull();
    }
    await expect(transport(request("/dashboard"), accessEnv)).resolves.toMatchObject({
      status: 404,
    });
  });

  it("permits only GET and requires a verified Access assertion", async () => {
    const transport = handler();
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      await expect(
        transport(request("/__control/v1/snapshot", { method }), accessEnv),
      ).resolves.toMatchObject({
        status: 405,
      });
    }
    await expect(
      transport(
        request("/__control/v1/snapshot", {
          headers: {
            "CF-Access-Client-Id": "forged-id",
            "CF-Access-Client-Secret": "forged-secret",
          },
        }),
        accessEnv,
      ),
    ).resolves.toMatchObject({ status: 403 });
  });

  it("returns only fixed schema-bound read results with no-store caching", async () => {
    const verifyAccessJwt = vi.fn<ControlAccessJwtVerifier>(async () => undefined);
    const transport = handler(verifyAccessJwt);
    const response = await transport(
      request("/__control/v1/analytics?window=30d", {
        headers: { "Cf-Access-Jwt-Assertion": "valid-access-jwt" },
      }),
      accessEnv,
    );

    expect(response!.status).toBe(200);
    expect(response!.headers.get("cache-control")).toBe("no-store");
    expect(response!.headers.get("content-type")).toContain("application/json");
    await expect(response!.json()).resolves.toEqual({ window: "30d" });
    expect(verifyAccessJwt).toHaveBeenCalledWith("valid-access-jwt", {
      audience: "control-audience",
      host: "control.example.com",
      teamDomain: "https://team.cloudflareaccess.com",
    });

    for (const path of [
      "/__control/v1/snapshot",
      "/__control/v1/overview",
      "/__control/v1/users?page=1&perPage=10&sort=createdAt.desc",
      "/__control/v1/integrations",
      "/__control/v1/audit?page=1&perPage=10",
      "/__control/v1/system",
    ]) {
      const fixedRouteResponse = await transport(
        request(path, { headers: { "Cf-Access-Jwt-Assertion": "valid-access-jwt" } }),
        accessEnv,
      );
      expect(fixedRouteResponse!.status).toBe(200);
    }
  });

  it("rejects invalid JWTs and malformed or unknown read inputs without echoing credentials", async () => {
    const token = "private-access-token";
    for (const reason of ["signature", "issuer", "audience", "expired", "not-before"]) {
      const forbidden = await handler(async () => {
        throw new Error(`${reason} ${token}`);
      })(
        request("/__control/v1/snapshot", { headers: { "Cf-Access-Jwt-Assertion": token } }),
        accessEnv,
      );
      expect(forbidden!.status).toBe(403);
      await expect(forbidden!.text()).resolves.not.toContain(token);
    }

    const validTransport = handler();
    for (const path of [
      "/__control/v1/analytics?window=arbitrary",
      "/__control/v1/users?perPage=101",
      "/__control/v1/users?sort=invalid",
      "/__control/v1/audit?page=0",
      "/__control/v1/snapshot?unknown=value",
    ]) {
      await expect(
        validTransport(
          request(path, { headers: { "Cf-Access-Jwt-Assertion": "valid-access-jwt" } }),
          accessEnv,
        ),
      ).resolves.toMatchObject({ status: 400 });
    }
  });
});
