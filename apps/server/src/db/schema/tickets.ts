import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const ticketStatusValues = ["open", "replied", "closed"] as const;
export const ticketAuthorRoleValues = ["user", "admin"] as const;

export const ticket = sqliteTable(
  "ticket",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    status: text("status", { enum: ticketStatusValues }).notNull().default("open"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown> | null>(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    closedAt: integer("closed_at", { mode: "timestamp" }),
  },
  (table) => [
    index("ticket_user_idx").on(table.userId),
    index("ticket_status_idx").on(table.status),
  ],
);

export const ticketMessage = sqliteTable(
  "ticket_message",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    authorRole: text("author_role", { enum: ticketAuthorRoleValues }).notNull(),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("ticket_message_ticket_idx").on(table.ticketId)],
);
