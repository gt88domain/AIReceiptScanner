import { beforeEach, describe, expect, it } from "vitest";
import { createResendEmailProvider } from "@/emails/providers/resend";
import { Resend } from "./stubs/resend";

describe("newsletter consent", () => {
  beforeEach(() => Resend.reset());

  it("creates new contacts as subscribed without updating an existing subscription", async () => {
    const provider = createResendEmailProvider({ apiKey: "test" });

    await provider.subscribeNewsletter("new@example.test");
    await provider.subscribeNewsletter("new@example.test");

    expect(Resend.getContact("new@example.test")).toEqual({ unsubscribed: false });
    expect(Resend.updates).toBe(0);
  });

  it("preserves a prior unsubscribe without exposing that state to callers", async () => {
    Resend.setContact("opted-out@example.test", true);
    const provider = createResendEmailProvider({ apiKey: "test" });

    await expect(provider.subscribeNewsletter("opted-out@example.test")).resolves.toBeUndefined();

    expect(Resend.getContact("opted-out@example.test")).toEqual({ unsubscribed: true });
    expect(Resend.updates).toBe(0);
  });
});
