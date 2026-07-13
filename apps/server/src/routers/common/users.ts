import { env } from "cloudflare:workers";
import { ORPCError } from "@orpc/server";
import { and, asc, count, desc, eq, isNotNull, isNull, like, or } from "drizzle-orm";
import { getVisibleUserName, isPhoneUser } from "@repo/shared";
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

// Input schemas
const listUsersInputSchema = z.object({
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(10),
  name: z.string().optional(),
  sort: z
    .array(
      z.object({
        id: z.enum(["name", "email", "createdAt"]),
        desc: z.boolean(),
      }),
    )
    .optional()
    .default([{ id: "createdAt", desc: true }]),
});

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

const listUsersOutputSchema = z.object({
  data: z.array(userSchema),
  pageCount: z.number(),
  total: z.number(),
});

type UserListItem = z.infer<typeof userSchema>;

// Demo-safe identity pool used for deterministic masking.
const MASK_FIRST_NAMES = [
  "Alex",
  "Jordan",
  "Taylor",
  "Casey",
  "Riley",
  "Morgan",
  "Avery",
  "Quinn",
] as const;

const MASK_LAST_NAMES = [
  "Smith",
  "Johnson",
  "Brown",
  "Davis",
  "Miller",
  "Wilson",
  "Moore",
  "Clark",
] as const;

const MASK_EMAIL_DOMAIN = "example.test";

// FNV-1a hash for stable pseudo-identities from the same real input.
function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function toBase36(value: number, minLength: number): string {
  return value.toString(36).padStart(minLength, "0");
}

// Keep output schema unchanged while replacing PII with deterministic fake values.
// This allows pagination/sorting/search to stay driven by real DB queries.
function maskUser(userItem: UserListItem): UserListItem {
  const primarySeed = hashString(`${env.BETTER_AUTH_SECRET}:${userItem.id}`);
  const secondarySeed = hashString(`${userItem.email}:${userItem.createdAt.toISOString()}`);
  const firstName = MASK_FIRST_NAMES[primarySeed % MASK_FIRST_NAMES.length];
  const lastName = MASK_LAST_NAMES[secondarySeed % MASK_LAST_NAMES.length];
  const token = toBase36(primarySeed, 8);
  const suffix = toBase36(secondarySeed, 6).slice(-4).toUpperCase();
  const fakePhoneNumber = `+8613${(secondarySeed % 1_000_000_000).toString().padStart(9, "0")}`;
  const fakePhoneEmailDigest = `${primarySeed.toString(16).padStart(8, "0")}${secondarySeed
    .toString(16)
    .padStart(8, "0")}`;

  return {
    ...userItem,
    id: `usr_${token}${toBase36(secondarySeed, 4)}`,
    name: `${firstName} ${lastName} ${suffix}`,
    email: isPhoneUser(userItem)
      ? `phone-${fakePhoneEmailDigest}@phone-auth.invalid`
      : `user-${token}@${MASK_EMAIL_DOMAIN}`,
    phoneNumber: userItem.phoneNumber ? fakePhoneNumber : null,
    image: null,
  };
}

function normalizeUserForOutput(userItem: UserListItem): UserListItem {
  return {
    ...userItem,
    name: getVisibleUserName(userItem),
  };
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

  list: protectedProcedure
    .input(listUsersInputSchema)
    .output(listUsersOutputSchema)
    .handler(async ({ context, input }) => {
      const db = context.db;
      const { page, perPage, name, sort } = input;

      // Build where conditions
      const conditions = [];

      // Name filter (search by name, email, or phone number)
      if (name) {
        conditions.push(
          or(
            like(user.name, `%${name}%`),
            like(user.email, `%${name}%`),
            like(user.phoneNumber, `%${name}%`),
          ),
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Build order by conditions
      const columnMap = {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      } as const;

      const orderByColumns =
        sort.length > 0
          ? sort.map((s) => {
              const column = columnMap[s.id];
              return s.desc ? desc(column) : asc(column);
            })
          : [desc(user.createdAt)];

      // Parallel queries for better performance
      const [users, countResult] = await Promise.all([
        db
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
          .where(whereClause)
          .orderBy(...orderByColumns)
          .limit(perPage)
          .offset((page - 1) * perPage),
        db.select({ count: count() }).from(user).where(whereClause),
      ]);

      const total = countResult.at(0)?.count ?? 0;
      const shouldMaskUserData = env.NODE_ENV === "production";

      return {
        // Production: protect user privacy in template/demo deployments.
        // Non-production: keep real values for debugging and local development.
        // Template adopters should replace this with role-based access control
        // once they have a trusted admin model and compliance policy.
        data: (shouldMaskUserData ? users.map(maskUser) : users).map(normalizeUserForOutput),
        pageCount: Math.ceil(total / perPage),
        total,
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
