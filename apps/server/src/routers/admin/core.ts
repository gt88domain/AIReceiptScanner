import { and, asc, count, desc, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { user } from "@/db/schema/auth";
import { isAdminEmail } from "@/lib/admin";
import { adminProcedure, protectedProcedure } from "@/lib/orpc";

const listUsersInputSchema = z.object({
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(10),
  name: z.string().max(255).optional(),
  sort: z
    .array(z.object({ id: z.enum(["name", "email", "createdAt"]), desc: z.boolean() }))
    .optional()
    .default([{ id: "createdAt", desc: true }]),
});

const adminUserSchema = z.object({
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

/** Admin access and user management do not depend on Jobs, Billing, or Storage. */
export const adminCoreRouter = {
  getAccess: protectedProcedure.handler(({ context }) => ({
    isAdmin:
      context.runtimeConfig.features.admin &&
      isAdminEmail(context.session?.user.email, context.env.ADMIN_EMAILS),
  })),

  listUsers: adminProcedure
    .input(listUsersInputSchema)
    .output(z.object({ data: z.array(adminUserSchema), pageCount: z.number(), total: z.number() }))
    .handler(async ({ context, input }) => {
      const whereClause = and(
        isNull(user.deletedAt),
        input.name
          ? or(
              sql`instr(lower(${user.name}), lower(${input.name})) > 0`,
              sql`instr(lower(${user.email}), lower(${input.name})) > 0`,
              sql`instr(lower(${user.phoneNumber}), lower(${input.name})) > 0`,
            )
          : undefined,
      );
      const columnMap = { name: user.name, email: user.email, createdAt: user.createdAt } as const;
      const orderBy = input.sort.map((sort) =>
        sort.desc ? desc(columnMap[sort.id]) : asc(columnMap[sort.id]),
      );
      const [users, countResult] = await Promise.all([
        context.db
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
          .orderBy(...orderBy)
          .limit(input.perPage)
          .offset((input.page - 1) * input.perPage),
        context.db.select({ count: count() }).from(user).where(whereClause),
      ]);
      const total = countResult.at(0)?.count ?? 0;
      return { data: users, pageCount: Math.ceil(total / input.perPage), total };
    }),
};
