import { describe, expect, it } from "vitest";
import { createProductFeatures, type ResolvedEmailConfig } from "@repo/app-config";
import { ORPCError } from "@orpc/server";
import { createApp } from "@/app/create-app";
import { createEmailService } from "@/emails";
import { requireEmailService } from "@/lib/email-access";
import { type ServerRuntimeConfig } from "@/lib/runtime-config";
import { requireStorageService } from "@/lib/storage-access";
import { resolveStorageBinding } from "@/lib/storage-binding";

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
const storageOffFeatures = createProductFeatures({
  jobs: false,
  storage: false,
  web: { billing: false, credits: false, creditPurchases: false },
  native: { billing: false, credits: false, creditPurchases: false },
});
const storageOffRuntime: ServerRuntimeConfig = {
  features: storageOffFeatures,
  storage: { enabled: false, provider: "r2", publicPath: "/api/storage" },
  email: disabledEmail,
};

describe("optional Storage and Email capabilities", () => {
  it("does not read disabled provider bindings", () => {
    const storageEnv: Pick<Cloudflare.Env, "STORAGE"> = {
      get STORAGE(): R2Bucket {
        throw new Error("STORAGE must not be accessed");
      },
    };
    const emailEnv: Pick<Cloudflare.Env, "RESEND_API_KEY" | "EMAIL_FROM"> = {
      get RESEND_API_KEY(): string {
        throw new Error("RESEND_API_KEY must not be accessed");
      },
      get EMAIL_FROM(): string {
        throw new Error("EMAIL_FROM must not be accessed");
      },
    };
    expect(resolveStorageBinding(storageOffFeatures, storageEnv)).toBeUndefined();
    expect(createEmailService(disabledEmail, emailEnv)).toBeUndefined();
  });

  it("keeps disabled HTTP routes physically absent", () => {
    const app = createApp({ runtimeConfig: storageOffRuntime });
    const routes = app.routes.map((route) => route.path);
    expect(routes).toContain("/");
    expect(routes).not.toContain("/api/storage/*");
    expect(routes).not.toContain("/api/newsletter/subscribe");
    expect(routes).not.toContain("/api/contact");
  });

  it("fails closed with stable optional-capability codes", () => {
    expect(() => requireStorageService({ storage: undefined })).toThrowError(ORPCError);
    try {
      requireStorageService({ storage: undefined });
    } catch (error) {
      expect(error).toBeInstanceOf(ORPCError);
      if (error instanceof ORPCError) expect(error.data?.code).toBe("FEATURE_DISABLED");
    }
    try {
      requireEmailService({ email: undefined, runtimeConfig: storageOffRuntime }, "newsletter");
    } catch (error) {
      expect(error).toBeInstanceOf(ORPCError);
      if (error instanceof ORPCError) expect(error.data?.code).toBe("EMAIL_DISABLED");
    }
  });
});
