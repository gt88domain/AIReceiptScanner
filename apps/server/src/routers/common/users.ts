import { ORPCError } from "@orpc/server";
import { and, eq, exists, isNotNull, isNull, ne, notExists } from "drizzle-orm";
import { getVisibleUserName } from "@repo/shared";
import { z } from "zod";
import { account, session, user } from "@/db/schema/auth";
import { billingSubscription } from "@/db/schema/payments";
import type { Context } from "@/lib/context";
import { buildDeletedAccountUserUpdate } from "@/lib/auth-session-guard";
import { isContactDeliveryAvailable } from "@/lib/contact-delivery";
import { protectedProcedure, publicProcedure } from "@/lib/orpc";
import { getStoragePublicBaseUrl, parseStoragePublicUrl } from "@/storage";
import { findOwnedAssetByStorageKey } from "@/modules/assets/repository";
import { backfillCurrentAvatarAsset, deleteAsset } from "@/modules/assets/service";
import {
  normalizeAvatarForOutput,
  normalizeAvatarUrl,
  resolveAllowedRemoteAvatarHosts,
} from "@/auth/avatar-policy";

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

function normalizeUserForOutput(userItem: z.infer<typeof userSchema>, serverUrl: string) {
  const normalized = normalizeAvatarForOutput(userItem, serverUrl);
  return { ...normalized, name: getVisibleUserName(normalized) };
}

async function deleteTrackedAvatar(context: Context, userId: string, image: string) {
  if (!context.storage) return;
  const publicBaseUrl = getStoragePublicBaseUrl(context.env.SERVER_URL);
  const parsedStorageUrl = parseStoragePublicUrl(publicBaseUrl, image);
  if (!parsedStorageUrl) return;
  const record = await findOwnedAssetByStorageKey(context.db, parsedStorageUrl.key, userId);
  if (!record) return;

  await deleteAsset(context.db, context.storage, { assetId: record.id, ownerId: userId }).catch(
    (error) => {
      console.error("Failed to delete unused avatar", {
        error: error instanceof Error ? error.message : "Unknown error",
        assetId: record.id,
        userId,
      });
    },
  );
}

export const usersRouter = {
  getCurrentUser: publicProcedure.handler(({ context }) => getCurrentUserFromContext(context)),
  getContactAvailability: protectedProcedure
    .output(z.object({ available: z.boolean() }))
    .handler(({ context }) => ({
      available: isContactDeliveryAvailable(context.runtimeConfig, context.env),
    })),
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

      // Entitlement loss does not end the provider's ability to renew or collect debt.
      // Guard the mutation itself so a concurrent subscription update cannot bypass it.
      const noUnsettledSubscription = context.payments
        ? notExists(
            db
              .select({ id: billingSubscription.id })
              .from(billingSubscription)
              .where(
                and(
                  eq(billingSubscription.userId, userId),
                  ne(billingSubscription.status, "canceled"),
                ),
              ),
          )
        : undefined;
      const accountWasDeleted = exists(
        db
          .select({ id: user.id })
          .from(user)
          .where(and(eq(user.id, userId), eq(user.deletedAt, deletedAt))),
      );
      const [deletion] = await db.batch([
        db
          .update(user)
          .set(buildDeletedAccountUserUpdate(currentUser, deletedAt))
          .where(and(eq(user.id, userId), isNull(user.deletedAt), noUnsettledSubscription)),
        // Release provider identities and credentials together with the old sessions.
        // Billing records and signup-grant claims remain attached to the tombstoned user.
        db.delete(account).where(and(eq(account.userId, userId), accountWasDeleted)),
        db.delete(session).where(and(eq(session.userId, userId), accountWasDeleted)),
      ]);
      if (deletion.meta.changes !== 1) {
        throw new ORPCError("BAD_REQUEST", {
          message: context.t("errors.activeSubscriptionDeletion"),
        });
      }
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
      const normalizedInput =
        input.image === undefined
          ? input
          : {
              ...input,
              image: normalizeAvatarUrl(
                input.image,
                resolveAllowedRemoteAvatarHosts(context.env.SERVER_URL),
              ),
            };

      if (!userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: t("errors.unauthorized"),
        });
      }

      const [currentUser] =
        normalizedInput.image === undefined
          ? []
          : await db.select({ image: user.image }).from(user).where(eq(user.id, userId));

      const stagedAvatar =
        typeof normalizedInput.image === "string" && normalizedInput.image !== currentUser?.image
          ? normalizedInput.image
          : null;
      let updatedUser: typeof user.$inferSelect | undefined;
      try {
        if (currentUser?.image && currentUser.image !== normalizedInput.image && context.storage) {
          await backfillCurrentAvatarAsset(context.db, context.storage, {
            ownerId: userId,
            publicBaseUrl: getStoragePublicBaseUrl(context.env.SERVER_URL),
          });
        }

        [updatedUser] = await db
          .update(user)
          .set({
            ...normalizedInput,
            updatedAt: new Date(),
          })
          .where(eq(user.id, userId))
          .returning();

        if (!updatedUser) {
          throw new ORPCError("NOT_FOUND", {
            message: t("errors.notFound"),
          });
        }
      } catch (error) {
        if (stagedAvatar) {
          await deleteTrackedAvatar(context, userId, stagedAvatar);
        }
        throw error;
      }

      if (currentUser?.image && currentUser.image !== updatedUser.image) {
        await deleteTrackedAvatar(context, userId, currentUser.image);
      }

      return normalizeUserForOutput(updatedUser, context.env.SERVER_URL);
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

  return currentUser ? normalizeUserForOutput(currentUser, context.env.SERVER_URL) : null;
}
