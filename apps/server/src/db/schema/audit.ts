import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { AuditSnapshot } from "@/modules/audit/audit.types";

/** Immutable history of administrative changes to product-domain entities. */
export const adminAuditLog = sqliteTable(
  "admin_audit_log",
  {
    id: text("id").primaryKey(),
    // Keep identity snapshots even if an account is later deleted or anonymized.
    actorId: text("actor_id").notNull(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: text("before", { mode: "json" }).$type<AuditSnapshot | null>(),
    after: text("after", { mode: "json" }).$type<AuditSnapshot | null>(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("admin_audit_log_entity_created_at_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    index("admin_audit_log_actor_created_at_idx").on(table.actorId, table.createdAt),
  ],
);

export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLog.$inferInsert;
