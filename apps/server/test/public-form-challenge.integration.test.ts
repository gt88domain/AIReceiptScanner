import { env as workerEnv } from "cloudflare:workers";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createNewsletterHandler } from "@/handlers/newsletter";
import type { EmailService } from "@/emails";
import {
  type ChallengeEnvironment,
  type PublicFormChallengeVerifier,
  verifyPublicFormChallenge,
} from "@/security/public-form-challenge";

const env = {
  TURNSTILE_SECRET_KEY: "secret",
  WEBSITE_URL: "https://app.example.test",
} satisfies ChallengeEnvironment;

describe("public form Turnstile protection", () => {
  it("keeps verification disabled without the Worker secret", async () => {
    await expect(
      verifyPublicFormChallenge({ action: "contact", env: { WEBSITE_URL: env.WEBSITE_URL } }),
    ).resolves.toEqual({ ok: true });
  });

  it("rejects missing, invalid-action, hostname-mismatched, and unavailable challenges", async () => {
    await expect(verifyPublicFormChallenge({ action: "contact", env })).resolves.toMatchObject({
      code: "CHALLENGE_REQUIRED",
      ok: false,
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      Response.json({ success: true, action: "newsletter", hostname: "app.example.test" });
    await expect(
      verifyPublicFormChallenge({ action: "contact", env, token: "token" }),
    ).resolves.toMatchObject({ code: "CHALLENGE_REJECTED", ok: false });

    globalThis.fetch = async () =>
      Response.json({ success: true, action: "contact", hostname: "other.example.test" });
    await expect(
      verifyPublicFormChallenge({ action: "contact", env, token: "token" }),
    ).resolves.toMatchObject({ code: "CHALLENGE_REJECTED", ok: false });

    globalThis.fetch = async () => {
      throw new Error("network unavailable");
    };
    await expect(
      verifyPublicFormChallenge({ action: "contact", env, token: "token" }),
    ).resolves.toMatchObject({ code: "CHALLENGE_UNAVAILABLE", ok: false, status: 503 });
    globalThis.fetch = originalFetch;
  });

  it("requires a valid challenge before a public form calls its email provider", async () => {
    let subscriptions = 0;
    const email: EmailService = {
      key: "resend",
      send: async () => undefined,
      subscribeNewsletter: async () => {
        subscriptions += 1;
      },
    };
    const reject: PublicFormChallengeVerifier = async () => ({
      ok: false,
      code: "CHALLENGE_REQUIRED",
      error: "Please complete the verification challenge and try again.",
      status: 400,
    });
    const app = new Hono<{ Bindings: Cloudflare.Env }>();
    app.post("/newsletter", createNewsletterHandler(email, reject));

    const response = await app.fetch(
      new Request("https://server.test/newsletter", {
        body: JSON.stringify({ email: "reader@example.test" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
      workerEnv,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "CHALLENGE_REQUIRED" });
    expect(subscriptions).toBe(0);
  });
});
