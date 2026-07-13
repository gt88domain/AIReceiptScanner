---
name: easystarter-db-schema
description: Generate Drizzle ORM database schemas for SQLite/D1
---

# Drizzle Schema Generator

Generate a new Drizzle ORM schema for SQLite (Cloudflare D1) following the project's patterns.

## Instructions

When the user asks to create a database schema, follow these steps:

1. **Gather Requirements**
   - Ask for the table name
   - Ask what fields are needed (name, type, constraints)
   - Ask about relationships to other tables

2. **Create the Schema File**

   Location: `apps/server/src/db/schema/{tableName}.ts`

   Follow this pattern:

   ```typescript
   import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
   import { user } from "./auth";

   export const {tableName} = sqliteTable("{table_name}", {
     // Primary key - always use text for UUID
     id: text("id").primaryKey(),

     // Text fields
     name: text("name").notNull(),
     description: text("description"),
     slug: text("slug").notNull().unique(),

     // Status/enum fields (store as text)
     status: text("status", { enum: ["draft", "published", "archived"] })
       .notNull()
       .default("draft"),

     // Boolean fields
     isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),

     // Numeric fields
     price: integer("price").notNull().default(0),
     quantity: integer("quantity").notNull().default(0),

     // JSON fields (store as text, parse in application)
     metadata: text("metadata", { mode: "json" }).$type<{
       key: string;
       value: string;
     }[]>(),

     // Foreign key - reference to user
     userId: text("user_id")
       .notNull()
       .references(() => user.id, { onDelete: "cascade" }),

     // Timestamps - always include these
     createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
     updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
   });

   // Type exports for use in application
   export type {TypeName} = typeof {tableName}.$inferSelect;
   export type New{TypeName} = typeof {tableName}.$inferInsert;
   ```

3. **Export from Index**

   Add to `apps/server/src/db/schema/index.ts`:

   ```typescript
   export * from "./{tableName}";
   ```

4. **Generate Migration**

   Run:

   ```bash
   cd apps/server && pnpm db:generate
   ```

5. **Push to Database**

   For development:

   ```bash
   cd apps/server && pnpm db:push
   ```

   For production (via migration):

   ```bash
   cd apps/server && pnpm db:migrate
   ```

## Column Type Reference

### Text Types

```typescript
// Required text
name: text("name").notNull(),

// Optional text
description: text("description"),

// Unique text
email: text("email").notNull().unique(),

// Text with default
status: text("status").notNull().default("active"),

// Enum-like text
role: text("role", { enum: ["admin", "user", "guest"] }).notNull(),
```

### Integer Types

```typescript
// Basic integer
count: integer("count").notNull().default(0),

// Boolean (SQLite doesn't have native boolean)
isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),

// Timestamp
createdAt: integer("created_at", { mode: "timestamp" }).notNull(),

// Nullable timestamp
deletedAt: integer("deleted_at", { mode: "timestamp" }),
```

### JSON Type

```typescript
// Typed JSON
settings: text("settings", { mode: "json" }).$type<{
  theme: "light" | "dark";
  notifications: boolean;
}>(),
```

### Foreign Keys

```typescript
// Required foreign key with cascade delete
userId: text("user_id")
  .notNull()
  .references(() => user.id, { onDelete: "cascade" }),

// Optional foreign key
parentId: text("parent_id")
  .references(() => category.id, { onDelete: "set null" }),
```

## Relationship Patterns

### One-to-Many

```typescript
// In parent table (e.g., user)
// No changes needed

// In child table (e.g., post)
userId: text("user_id")
  .notNull()
  .references(() => user.id, { onDelete: "cascade" }),
```

### Many-to-Many (Junction Table)

```typescript
export const postTag = sqliteTable("post_tag", {
  id: text("id").primaryKey(),
  postId: text("post_id")
    .notNull()
    .references(() => post.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tag.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

## Key Patterns

- Always use `text("id").primaryKey()` for IDs (UUID)
- Always include `createdAt` and `updatedAt` timestamps
- Use snake_case for column names in database
- Use camelCase for field names in TypeScript
- Use `{ mode: "boolean" }` for boolean fields
- Use `{ mode: "timestamp" }` for date fields
- Use `{ onDelete: "cascade" }` for required relationships
- Export types with `$inferSelect` and `$inferInsert`
