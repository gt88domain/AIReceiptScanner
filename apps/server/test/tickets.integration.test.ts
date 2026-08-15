import { env, exports } from "cloudflare:workers";
import { createApiClient } from "@repo/api-client";
import { createPlatformComposition, createProductFeatures } from "@repo/app-config";
import type { AppRouterClient } from "@/routers";
import { adminAuditLog } from "@/db/schema/audit";
import { createDb } from "@/db";
import { buildRuntimeAppRouter } from "@/routers/runtime-router";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

type TicketDetail = {
  id: string;
  userId: string;
  subject: string;
  status: "open" | "replied" | "closed";
  closedAt: Date | null;
  messages: Array<{ authorRole: "user" | "admin"; body: string }>;
};

type TicketsClient = {
  create(input: {
    subject: string;
    body: string;
    metadata?: Record<string, unknown>;
  }): Promise<TicketDetail>;
  getMine(input: { id: string }): Promise<TicketDetail>;
  reply(input: { ticketId: string; body: string }): Promise<TicketDetail>;
  listAdmin(input: { status?: "open" | "replied" | "closed" }): Promise<Array<TicketDetail>>;
  replyAdmin(input: { ticketId: string; body: string }): Promise<TicketDetail>;
  closeAdmin(input: { ticketId: string }): Promise<TicketDetail>;
};

function getSessionClient(cookie: string) {
  return createApiClient<AppRouterClient>({
    baseUrl: "https://server.test",
    fetch: (input, init) => exports.default.fetch(input, init),
    getHeaders: () => ({ cookie }),
  });
}

function ticketsClient(client: ReturnType<typeof getSessionClient>) {
  return client.tickets as unknown as TicketsClient;
}

async function signUp(email: string) {
  const signUpResponse = await exports.default.fetch("https://server.test/api/auth/sign-up/email", {
    body: JSON.stringify({ email, name: "Tickets Test", password: "test-password-123" }),
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
  return getSessionClient(cookie);
}

describe("tickets", () => {
  it("does not register ticket procedures when the capability is disabled", () => {
    const features = createProductFeatures({
      tickets: false,
      web: { billing: false, credits: false, creditPurchases: false },
      native: { billing: false, credits: false, creditPurchases: false },
    });
    const router = buildRuntimeAppRouter(
      createPlatformComposition({ features, featureCapabilities: {} }),
    );
    expect("tickets" in router).toBe(false);
  });

  it("keeps user tickets private and records administrator replies and closures", async () => {
    const owner = ticketsClient(await signUp("ticket-owner@example.test"));
    const stranger = ticketsClient(await signUp("ticket-stranger@example.test"));
    const item = await owner.create({
      subject: "Need help",
      body: "My account needs assistance.",
      metadata: { untrusted: "<img src=x onerror=alert(1)>" },
    });

    await expect(stranger.getMine({ id: item.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
    await expect(owner.getMine({ id: item.id })).resolves.not.toMatchObject({
      metadata: expect.anything(),
    });
    await expect(stranger.listAdmin({})).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });

    const admin = ticketsClient(await signUp("admin@example.test"));
    await expect(admin.listAdmin({ status: "open" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: item.id, status: "open" })]),
    );

    const previewBindings = env as unknown as { BACKOFFICE_PREVIEW?: string };
    const previousPreview = previewBindings.BACKOFFICE_PREVIEW;
    previewBindings.BACKOFFICE_PREVIEW = "1";
    try {
      await expect(
        admin.replyAdmin({ ticketId: item.id, body: "We are looking into this." }),
      ).resolves.toMatchObject({ status: "replied" });
    } finally {
      previewBindings.BACKOFFICE_PREVIEW = previousPreview;
    }

    const db = createDb(env.DB);
    const [audit] = await db
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.entityId, item.id));
    expect(audit).toMatchObject({ action: "tickets.replied", entityType: "ticket" });

    await expect(admin.closeAdmin({ ticketId: item.id })).resolves.toMatchObject({
      status: "closed",
      closedAt: expect.any(Date),
    });
    await expect(
      owner.reply({ ticketId: item.id, body: "One more question" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });
});
