import { env } from "cloudflare:workers";
import { ORPCError } from "@orpc/server";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { getVisibleUserName } from "@repo/shared";
import { z } from "zod";
import { account, session, user } from "@/db/schema/auth";
import type { Context } from "@/lib/context";
import { buildDeletedAccountUserUpdate } from "@/lib/auth-session-guard";
import { protectedProcedure, publicProcedure } from "@/lib/orpc";
import {
  getStorageProvider,
  getStoragePublicBaseUrl,
  getUserStoragePrefix,
  parseStoragePublicUrl,
} from "@/storage";

// Output schemas
const userSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  emailVerified: z.boolean(),
  phoneNumber: z.string().nullable(),
  phoneNumberVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

function normalizeUserForOutput(userItem: z.infer<typeof userSchema>) {
  return { ...userItem, name: getVisibleUserName(userItem) };
}

export const usersRouter = {
  getCurrentUser: publicProcedure.handler(({ context }) => getCurrentUserFromContext(context)),
  getPasswordStatus: protectedProcedure
    .output(
      z.object({
        hasPassword: z.boolean(),
        socialProviders: z.array(z.enum(["github", "google"])).optional(),
      }),
    )
    .handler(async ({ context }) => {
      const userId = context.session?.user.id;
      if (!userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: context.t("errors.unauthorized"),
        });
      }

      // Optimized query: only select necessary fields and use conditional logic
      const accounts = await context.db
        .select({
          providerId: account.providerId,
          hasPassword: isNotNull(account.password),
        })
        .from(account)
        .where(eq(account.userId, userId));

      // Extract social providers (non-credential accounts)
      const socialProviders = accounts
        .filter((acc) => acc.providerId !== "credential")
        .map((acc) => acc.providerId)
        .filter(
          (provider): provider is "github" | "google" =>
            provider === "github" || provider === "google",
        );

      // Check if user has password (any credential account with password)
      const hasPassword = accounts.some(
        (acc) => acc.providerId === "credential" && acc.hasPassword,
      );

      return {
        hasPassword,
        socialProviders: socialProviders.length > 0 ? socialProviders : undefined,
      };
    }),

  deleteAccount: protectedProcedure
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ context }) => {
      const userId = context.session?.user.id;
      if (!userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: context.t("errors.unauthorized"),
        });
      }
      const db = context.db;
      const deletedAt = new Date();
      const [currentUser] = await db
        .select({
          email: user.email,
        })
        .from(user)
        .where(eq(user.id, userId));

      if (!currentUser) {
        throw new ORPCError("NOT_FOUND", {
          message: context.t("errors.notFound"),
        });
      }

      const billingStatus = await context.payments.getBillingStatus({ userId });
      if (billingStatus.hasActiveSubscription) {
        throw new ORPCError("BAD_REQUEST", {
          message: context.t("errors.activeSubscriptionDeletion"),
        });
      }

      await db
        .update(user)
        .set(buildDeletedAccountUserUpdate(currentUser, deletedAt))
        .where(eq(user.id, userId));
      await db.delete(session).where(eq(session.userId, userId));
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
        image: z.string().max(500).optional().nullable(),
      }),
    )
    .output(userSchema)
    .handler(async ({ context, input }) => {
      const { db, t } = context;
      const userId = context.session?.user.id;

      if (!userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: t("errors.unauthorized"),
        });
      }

      // If updating avatar, delete the old one first
      if (input.image !== undefined) {
        const [currentUser] = await db
          .select({ image: user.image })
          .from(user)
          .where(eq(user.id, userId));

        if (currentUser?.image) {
          const publicBaseUrl = getStoragePublicBaseUrl(env.SERVER_URL);
          const parsedStorageUrl = parseStoragePublicUrl(publicBaseUrl, currentUser.image);
          if (parsedStorageUrl?.key.startsWith(getUserStoragePrefix("avatar", userId))) {
            const storageProvider = getStorageProvider({
              storage: env.STORAGE,
              provider: parsedStorageUrl.provider,
              aliyunOssEnv: env,
            });
            await storageProvider.delete(parsedStorageUrl.key).catch(() => {
              // Ignore errors if file doesn't exist
            });
          }
        }
      }

      const [updatedUser] = await db
        .update(user)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId))
        .returning();

      if (!updatedUser) {
        throw new ORPCError("NOT_FOUND", {
          message: t("errors.notFound"),
        });
      }

      return normalizeUserForOutput(updatedUser);
    }),
};

export async function getCurrentUserFromContext(context: Context) {
  const sessionUser = context.session?.user;
  if (!sessionUser) return null;

  const [currentUser] = await context.db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber,
      phoneNumberVerified: user.phoneNumberVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(and(eq(user.id, sessionUser.id), isNull(user.deletedAt)));

  return currentUser ? normalizeUserForOutput(currentUser) : null;
}
