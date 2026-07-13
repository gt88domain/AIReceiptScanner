---
name: easystarter-api-route
description: Generate oRPC API routes with CRUD operations
---

# oRPC API Route Generator

Generate a new oRPC API route following the project's established patterns.

## Instructions

When the user asks to create an API route, follow these steps:

1. **Gather Requirements**
   - Ask for the resource name (e.g., "posts", "products", "orders")
   - Ask what operations are needed (list, get, create, update, delete)
   - Ask about any special fields or filters

2. **Create the Router File**

   Location: `apps/server/src/routers/common/{resource}.ts`

   Follow this pattern:

   ```typescript
   import { ORPCError } from "@orpc/server";
   import { and, asc, count, desc, eq, like, or } from "drizzle-orm";
   import { z } from "zod";
   import { {tableName} } from "@/db/schema/{schemaFile}";
   import { protectedProcedure, publicProcedure } from "@/lib/orpc";

   // Input schemas
   const list{Resource}InputSchema = z.object({
     page: z.number().min(1).default(1),
     perPage: z.number().min(1).max(100).default(10),
     search: z.string().optional(),
     sort: z
       .array(
         z.object({
           id: z.enum([/* sortable columns */]),
           desc: z.boolean(),
         }),
       )
       .optional()
       .default([{ id: "createdAt", desc: true }]),
   });

   // Output schemas
   const {resource}Schema = z.object({
     id: z.string(),
     // ... other fields
     createdAt: z.date(),
     updatedAt: z.date(),
   });

   const list{Resource}OutputSchema = z.object({
     data: z.array({resource}Schema),
     pageCount: z.number(),
     total: z.number(),
   });

   export const {resource}Router = {
     list: protectedProcedure
       .input(list{Resource}InputSchema)
       .output(list{Resource}OutputSchema)
       .handler(async ({ context, input }) => {
         const db = context.db;
         const { page, perPage, search, sort } = input;

         // Build where conditions
         const conditions = [];
         if (search) {
           conditions.push(
             or(like({tableName}.name, `%${search}%`)),
           );
         }

         const whereClause =
           conditions.length > 0 ? and(...conditions) : undefined;

         // Build order by
         const columnMap = {
           // map sort ids to columns
         } as const;

         const orderByColumns =
           sort.length > 0
             ? sort.map((s) => {
                 const column = columnMap[s.id];
                 return s.desc ? desc(column) : asc(column);
               })
             : [desc({tableName}.createdAt)];

         // Parallel queries
         const [items, countResult] = await Promise.all([
           db
             .select()
             .from({tableName})
             .where(whereClause)
             .orderBy(...orderByColumns)
             .limit(perPage)
             .offset((page - 1) * perPage),
           db.select({ count: count() }).from({tableName}).where(whereClause),
         ]);

         const total = countResult.at(0)?.count ?? 0;

         return {
           data: items,
           pageCount: Math.ceil(total / perPage),
           total,
         };
       }),

     get: protectedProcedure
       .input(z.object({ id: z.string() }))
       .output({resource}Schema)
       .handler(async ({ context, input }) => {
         const [item] = await context.db
           .select()
           .from({tableName})
           .where(eq({tableName}.id, input.id));

         if (!item) {
           throw new ORPCError("NOT_FOUND", {
             message: context.t("errors.notFound"),
           });
         }

         return item;
       }),

     create: protectedProcedure
       .input(z.object({
         // required fields
       }))
       .output({resource}Schema)
       .handler(async ({ context, input }) => {
         const [item] = await context.db
           .insert({tableName})
           .values({
             id: crypto.randomUUID(),
             ...input,
             createdAt: new Date(),
             updatedAt: new Date(),
           })
           .returning();

         return item;
       }),

     update: protectedProcedure
       .input(z.object({
         id: z.string(),
         // optional fields
       }))
       .output({resource}Schema)
       .handler(async ({ context, input }) => {
         const { id, ...data } = input;
         const [item] = await context.db
           .update({tableName})
           .set({
             ...data,
             updatedAt: new Date(),
           })
           .where(eq({tableName}.id, id))
           .returning();

         if (!item) {
           throw new ORPCError("NOT_FOUND", {
             message: context.t("errors.notFound"),
           });
         }

         return item;
       }),

     delete: protectedProcedure
       .input(z.object({ id: z.string() }))
       .output(z.object({ success: z.boolean() }))
       .handler(async ({ context, input }) => {
         await context.db.delete({tableName}).where(eq({tableName}.id, input.id));
         return { success: true };
       }),
   };
   ```

3. **Register the Router**

   Add to `apps/server/src/routers/index.ts`:

   ```typescript
   import { {resource}Router } from "./common/{resource}";

   export const router = {
     // ... existing routers
     {resource}: {resource}Router,
   };
   ```

4. **Create Database Schema** (if needed)

   See the `/db-schema` skill for creating the Drizzle schema.

## Key Patterns

- Use `protectedProcedure` for authenticated routes
- Use `publicProcedure` for public routes
- Always define input/output schemas with Zod
- Use `context.t()` for i18n error messages
- Use `context.db` for database access
- Use `context.session` for current user info
- Parallel queries with `Promise.all` for list operations
- Return paginated results with `{ data, pageCount, total }`
