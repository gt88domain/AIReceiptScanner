import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  controlGetAnalyticsInputSchema,
  controlGetIntegrationsInputSchema,
  controlGetOverviewInputSchema,
  controlGetSnapshotInputSchema,
  controlGetSystemInputSchema,
  controlListAuditInputSchema,
  controlListUsersInputSchema,
  type ControlReadV1,
} from "@repo/shared/control-read";
import { ZodError } from "zod";
import { logSafeError } from "@/lib/safe-error";
import { resolveControlReadHttpConfig, type ControlReadHttpConfig } from "./config";

type ControlReadHttpEnvironment = Readonly<{
  CONTROL_ACCESS_AUD?: string;
  CONTROL_ACCESS_TEAM_DOMAIN?: string;
  CONTROL_READ_HTTP_HOST?: string;
}>;

export type ControlAccessJwtVerifier = (
  assertion: string,
  config: Pick<ControlReadHttpConfig, "audience" | "teamDomain">,
) => Promise<void>;

type CreateControlReadHttpHandlerOptions<Environment extends ControlReadHttpEnvironment> =
  Readonly<{
    createControl: (env: Environment) => ControlReadV1;
    verifyAccessJwt?: ControlAccessJwtVerifier;
  }>;

const controlPrefix = "/__control/v1/";
const controlRoutes = new Set([
  "snapshot",
  "overview",
  "analytics",
  "users",
  "integrations",
  "audit",
  "system",
]);
const jsonHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

function response(status: number, code: string) {
  return Response.json({ error: code }, { headers: jsonHeaders, status });
}

function parseInteger(value: string | null) {
  if (value === null) return undefined;
  if (!/^\d+$/.test(value)) throw new ZodError([]);
  return Number(value);
}

function requireKnownQuery(url: URL, allowed: readonly string[]) {
  const allowedKeys = new Set(allowed);
  for (const [key] of url.searchParams) {
    if (!allowedKeys.has(key) || url.searchParams.getAll(key).length !== 1) throw new ZodError([]);
  }
}

function parseUsersSort(value: string | null) {
  if (value === null) return undefined;
  return value.split(",").map((part) => {
    const [id, direction, extra] = part.split(".");
    if (extra || !id || (direction !== "asc" && direction !== "desc")) throw new ZodError([]);
    return { id, desc: direction === "desc" };
  });
}

function parseInput(path: string, url: URL) {
  switch (path) {
    case "snapshot":
      requireKnownQuery(url, []);
      return { method: "getSnapshot" as const, input: controlGetSnapshotInputSchema.parse({}) };
    case "overview":
      requireKnownQuery(url, []);
      return { method: "getOverview" as const, input: controlGetOverviewInputSchema.parse({}) };
    case "analytics":
      requireKnownQuery(url, ["window"]);
      return {
        method: "getAnalytics" as const,
        input: controlGetAnalyticsInputSchema.parse({ window: url.searchParams.get("window") }),
      };
    case "users":
      requireKnownQuery(url, ["page", "perPage", "name", "sort"]);
      return {
        method: "listUsers" as const,
        input: controlListUsersInputSchema.parse({
          page: parseInteger(url.searchParams.get("page")),
          perPage: parseInteger(url.searchParams.get("perPage")),
          name: url.searchParams.get("name") ?? undefined,
          sort: parseUsersSort(url.searchParams.get("sort")),
        }),
      };
    case "integrations":
      requireKnownQuery(url, []);
      return {
        method: "getIntegrations" as const,
        input: controlGetIntegrationsInputSchema.parse({}),
      };
    case "audit":
      requireKnownQuery(url, ["page", "perPage"]);
      return {
        method: "listAudit" as const,
        input: controlListAuditInputSchema.parse({
          page: parseInteger(url.searchParams.get("page")),
          perPage: parseInteger(url.searchParams.get("perPage")),
        }),
      };
    case "system":
      requireKnownQuery(url, []);
      return { method: "getSystem" as const, input: controlGetSystemInputSchema.parse({}) };
    default:
      return null;
  }
}

export async function verifyCloudflareAccessJwt(
  assertion: string,
  config: Pick<ControlReadHttpConfig, "audience" | "teamDomain">,
) {
  await jwtVerify(
    assertion,
    createRemoteJWKSet(new URL(`${config.teamDomain}/cdn-cgi/access/certs`)),
    { audience: config.audience, issuer: config.teamDomain },
  );
}

/** Handles the opt-in dedicated hostname and returns null for the normal application surface. */
export function createControlReadHttpHandler<Environment extends ControlReadHttpEnvironment>({
  createControl,
  verifyAccessJwt = verifyCloudflareAccessJwt,
}: CreateControlReadHttpHandlerOptions<Environment>) {
  return async (request: Request, env: Environment) => {
    const config = resolveControlReadHttpConfig(env);
    if (!config || new URL(request.url).hostname.toLowerCase() !== config.host) return null;

    const url = new URL(request.url);
    if (!url.pathname.startsWith(controlPrefix)) return response(404, "NOT_FOUND");
    const route = url.pathname.slice(controlPrefix.length);
    if (!controlRoutes.has(route)) return response(404, "NOT_FOUND");
    if (request.method !== "GET") return response(405, "METHOD_NOT_ALLOWED");

    const assertion = request.headers.get("cf-access-jwt-assertion");
    if (!assertion) return response(403, "CONTROL_FORBIDDEN");
    try {
      await verifyAccessJwt(assertion, config);
    } catch {
      return response(403, "CONTROL_FORBIDDEN");
    }

    try {
      const call = parseInput(route, url);
      if (!call) return response(404, "NOT_FOUND");
      const control = createControl(env);
      const result = await control[call.method](call.input as never);
      return Response.json(result, { headers: jsonHeaders });
    } catch (error) {
      if (error instanceof ZodError) return response(400, "CONTROL_INVALID_INPUT");
      logSafeError(`Control HTTP read failed for ${route}`, error);
      return response(503, "CONTROL_UNAVAILABLE");
    }
  };
}
