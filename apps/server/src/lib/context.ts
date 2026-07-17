import type { Context as HonoContext } from "hono";
import { getClientIp, normalizeHeaderValue } from "@repo/shared";
import { createCreditsService } from "../credits";
import { createDb } from "../db";
import { getEmailProvider } from "../emails";
import { createT, getLocaleFromRequest } from "../i18n";
import { getPaymentService } from "../payments";
import { getStorageProvider } from "../storage";
import {
  FRESH_AUTH_SESSION_QUERY,
  finalizeSoftDeletedSession,
  getUserDeletedAt,
} from "./auth-session-guard";
import { createAuth } from "./auth";

export type CreateContextOptions = {
  /** Hono request context with Cloudflare bindings. */
  context: HonoContext<{ Bindings: Cloudflare.Env }>;
};

/** Creates the per-request server context shared by oRPC procedures. */
export async function createContext({ context }: CreateContextOptions) {
  const db = createDb(context.env.DB);
  const auth = createAuth(context.env.DB);
  const headers = new Headers(context.req.raw.headers);
  const rawSession = await auth.api.getSession({
    headers,
    query: FRESH_AUTH_SESSION_QUERY,
  });
  const deletedAt = rawSession ? await getUserDeletedAt(db, rawSession.user.id) : null;
  const session = finalizeSoftDeletedSession(rawSession, deletedAt);
  const locale = getLocaleFromRequest(context.req.raw);
  const sessionRequest = rawSession?.session as
    | { ipAddress?: string | null; userAgent?: string | null }
    | undefined;

  // Create storage provider
  const storage = getStorageProvider({
    storage: context.env.STORAGE,
    aliyunOssEnv: context.env,
  });

  // Email provider and service
  const emailProvider = getEmailProvider();
  const payments = getPaymentService(db);
  // Credits share the same database and session context as billing and user APIs.
  const credits = createCreditsService(db, {
    signupGrant: {
      hashSecret: context.env.BETTER_AUTH_SECRET,
      ipAddress: getClientIp(headers) ?? sessionRequest?.ipAddress ?? null,
      userAgent: normalizeHeaderValue(headers.get("user-agent")) ?? sessionRequest?.userAgent ?? null,
    },
  });

  return {
    // Server-only Worker bindings. Never return this object from an RPC procedure.
    env: context.env,
    session,
    db,
    auth,
    locale,
    t: createT(locale),
    storage,
    email: emailProvider,
    payments,
    credits,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
