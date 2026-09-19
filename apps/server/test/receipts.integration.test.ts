import { env, exports } from "cloudflare:workers";
import { createApiClient } from "@repo/api-client";
import type { AppRouterClient } from "@/routers";
import { describe, expect, it } from "vitest";

type ReceiptRecord = {
  id: string;
  captureId: string;
  merchantName: string;
  purchaseDate: string;
  currency: string;
  totalMinor: number;
  version: number;
};

type ReceiptsClient = {
  create(input: {
    captureId: string;
    merchantName: string;
    purchaseDate: string;
    purchaseTime?: string | null;
    currency: string;
    subtotalMinor?: number | null;
    taxMinor?: number | null;
    tipMinor?: number | null;
    totalMinor: number;
    paymentMethod?: string | null;
    paymentLast4?: string | null;
    category?: string | null;
    extractionSource?: "apple-vision" | "manual" | "cloud";
    localQuality?: "LOCAL_PASS" | "LOCAL_REVIEW" | "LOCAL_FAIL" | null;
    extractionDurationMs?: number | null;
    engineVersion?: string | null;
  }): Promise<ReceiptRecord>;
  get(input: { id: string }): Promise<ReceiptRecord>;
  list(input: { page?: number; perPage?: number }): Promise<{
    data: ReceiptRecord[];
    total: number;
    page: number;
    pageCount: number;
  }>;
  update(input: {
    id: string;
    expectedVersion: number;
    merchantName?: string;
    totalMinor?: number;
  }): Promise<ReceiptRecord>;
  delete(input: { id: string }): Promise<{ success: true }>;
};

function getSessionClient(cookie: string) {
  return createApiClient<AppRouterClient>({
    baseUrl: "https://server.test",
    fetch: (input, init) => exports.default.fetch(input, init),
    getHeaders: () => ({ cookie }),
  });
}

function receiptsClient(client: ReturnType<typeof getSessionClient>) {
  return client.receipts as unknown as ReceiptsClient;
}

async function signUp(email: string) {
  const ip = `198.51.${crypto.getRandomValues(new Uint8Array(1))[0]}.${crypto.getRandomValues(new Uint8Array(1))[0]}`;
  const signUpResponse = await exports.default.fetch("https://server.test/api/auth/sign-up/email", {
    body: JSON.stringify({ email, name: "Receipt Test", password: "test-password-123" }),
    headers: { "CF-Connecting-IP": ip, "Content-Type": "application/json" },
    method: "POST",
  });
  expect(signUpResponse.status).toBe(200);
  await env.DB.prepare("UPDATE user SET email_verified = 1 WHERE email = ?").bind(email).run();

  const response = await exports.default.fetch("https://server.test/api/auth/sign-in/email", {
    body: JSON.stringify({ email, password: "test-password-123" }),
    headers: { "CF-Connecting-IP": ip, "Content-Type": "application/json" },
    method: "POST",
  });
  expect(response.status).toBe(200);
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  return receiptsClient(getSessionClient(cookie));
}

function receiptInput(captureId: string) {
  return {
    captureId,
    merchantName: "ACME MARKET",
    purchaseDate: "2026-09-19",
    currency: "USD",
    subtotalMinor: 1000,
    taxMinor: 80,
    totalMinor: 1080,
    paymentMethod: "Visa",
    paymentLast4: "1234",
    extractionSource: "apple-vision" as const,
    localQuality: "LOCAL_PASS" as const,
    extractionDurationMs: 120,
    engineVersion: "VNRecognizeTextRequest-test",
  };
}

describe("receipts", () => {
  it("keeps receipts owner-scoped and makes capture creation idempotent", async () => {
    const owner = await signUp(`receipt-owner-${crypto.randomUUID()}@example.test`);
    const stranger = await signUp(`receipt-stranger-${crypto.randomUUID()}@example.test`);
    const captureId = `capture-${crypto.randomUUID()}`;

    const created = await owner.create(receiptInput(captureId));
    const repeated = await owner.create(receiptInput(captureId));

    expect(repeated.id).toBe(created.id);
    expect(repeated.version).toBe(1);

    await expect(
      owner.create({ ...receiptInput(captureId), totalMinor: 9999 }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });

    await expect(stranger.get({ id: created.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
    await expect(
      stranger.update({ id: created.id, expectedVersion: 1, merchantName: "Stolen" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    await expect(stranger.delete({ id: created.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });

    await expect(owner.list({})).resolves.toMatchObject({
      total: 1,
      data: [expect.objectContaining({ id: created.id })],
    });
    await expect(stranger.list({})).resolves.toMatchObject({ total: 0, data: [] });
  });

  it("uses optimistic versions so stale edits cannot overwrite newer receipt data", async () => {
    const owner = await signUp(`receipt-version-${crypto.randomUUID()}@example.test`);
    const created = await owner.create(receiptInput(`capture-${crypto.randomUUID()}`));

    const updated = await owner.update({
      id: created.id,
      expectedVersion: created.version,
      merchantName: "ACME MARKET UPDATED",
    });

    expect(updated.version).toBe(2);
    expect(updated.merchantName).toBe("ACME MARKET UPDATED");

    await expect(
      owner.update({
        id: created.id,
        expectedVersion: created.version,
        totalMinor: 5000,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });

    await expect(owner.get({ id: created.id })).resolves.toMatchObject({
      merchantName: "ACME MARKET UPDATED",
      totalMinor: 1080,
      version: 2,
    });

    await expect(owner.delete({ id: created.id })).resolves.toEqual({ success: true });
    await expect(owner.get({ id: created.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });
});
