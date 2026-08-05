import type { Context as HonoContext } from "hono";
import { getClientIp, normalizeHeaderValue } from "@repo/shared";
import { createCreditsService } from "../credits";
import { createDb } from "../db";
import { createEmailService } from "../emails";
import { createT, getLocaleFromRequest } from "../i18n";
import { getPaymentService } from "../payments";
import { createCapabilityService } from "../modules/capabilities/capability.service";
import { createJobService } from "../modules/jobs";
import { getAuthSession } from "../auth/adapter";
import { finalizeSoftDeletedSession, getUserDeletedAt } from "./auth-session-guard";
import { resolveJobQueue } from "./jobs-binding";
import type { ServerRuntimeConfig } from "./runtime-config";
import { resolveStorageBinding } from "./storage-binding";
import { getStorageProvider } from "../storage";

export type CreateContextOptions = {
  /** Hono request context with Cloudflare bindings. */
  context: HonoContext<{ Bindings: Cloudflare.Env }>;
  /** Resolved once by the Worker, so every request uses the same module contract. */
  runtimeConfig: ServerRuntimeConfig;
};

/** Creates the per-request server context shared by oRPC procedures. */
export async function createContext({ context, runtimeConfig }: CreateContextOptions) {
  const db = createDb(context.env.DB);
  const headers = new Headers(context.req.raw.headers);
  const rawSession = await getAuthSession(context.env.DB, headers, runtimeConfig, context.env);
  const deletedAt = rawSession ? await getUserDeletedAt(db, rawSession.user.id) : null;
  const session = finalizeSoftDeletedSession(rawSession, deletedAt);
  const authenticatedUser = session?.user ?? null;
  const locale = getLocaleFromRequest(context.req.raw);
  const sessionRequest = rawSession?.session as
    | { ipAddress?: string | null; userAgent?: string | null }
    | undefined;

  const storageBinding = resolveStorageBinding(runtimeConfig.features, context.env);
  const storage = storageBinding
    ? getStorageProvider({
        storage: storageBinding,
        provider: runtimeConfig.storage.provider,
        aliyunOssEnv: context.env,
      })
    : undefined;
  const email = runtimeConfig.email.enabled
    ? createEmailService(runtimeConfig.email, context.env)
    : undefined;
  const payments = getPaymentService(db);
  const capabilities = createCapabilityService(payments);
  const queue = resolveJobQueue(runtimeConfig.features, context.env);
  const jobs = queue ? createJobService(db, queue) : undefined;
  // Credits share the same database and session context as billing and user APIs.
  const credits = createCreditsService(db, {
    signupGrant: {
      hashSecret: context.env.BETTER_AUTH_SECRET,
      ipAddress: getClientIp(headers) ?? sessionRequest?.ipAddress ?? null,
      userAgent:
        normalizeHeaderValue(headers.get("user-agent")) ?? sessionRequest?.userAgent ?? null,
    },
  });

  return {
    // Server-only Worker bindings. Never return this object from an RPC procedure.
    env: context.env,
    runtimeConfig,
    session,
    // This is the only deletion-state check for the request. Procedures reuse it.
    authenticatedUser,
    db,
    locale,
    t: createT(locale),
    storage,
    email,
    payments,
    capabilities,
    jobs,
    credits,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
