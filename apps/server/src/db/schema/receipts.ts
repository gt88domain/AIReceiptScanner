import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const RECEIPT_VERIFICATION_STATUSES = ["verified"] as const;
export const RECEIPT_EXTRACTION_SOURCES = ["apple-vision", "manual", "cloud"] as const;
export const RECEIPT_LOCAL_QUALITIES = ["LOCAL_PASS", "LOCAL_REVIEW", "LOCAL_FAIL"] as const;

export const receipt = sqliteTable(
  "receipt",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    captureId: text("capture_id").notNull(),
    merchantName: text("merchant_name").notNull(),
    purchaseDate: text("purchase_date").notNull(),
    purchaseTime: text("purchase_time"),
    currency: text("currency").notNull(),
    subtotalMinor: integer("subtotal_minor"),
    taxMinor: integer("tax_minor"),
    tipMinor: integer("tip_minor"),
    totalMinor: integer("total_minor").notNull(),
    paymentMethod: text("payment_method"),
    paymentLast4: text("payment_last4"),
    category: text("category"),
    verificationStatus: text("verification_status", {
      enum: RECEIPT_VERIFICATION_STATUSES,
    })
      .notNull()
      .default("verified"),
    extractionSource: text("extraction_source", {
      enum: RECEIPT_EXTRACTION_SOURCES,
    })
      .notNull()
      .default("apple-vision"),
    localQuality: text("local_quality", { enum: RECEIPT_LOCAL_QUALITIES }),
    extractionDurationMs: integer("extraction_duration_ms"),
    engineVersion: text("engine_version"),
    version: integer("version").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("receipt_user_capture_idx").on(table.userId, table.captureId),
    index("receipt_user_purchase_date_idx").on(table.userId, table.purchaseDate),
    index("receipt_user_created_at_idx").on(table.userId, table.createdAt),
  ],
);

export type Receipt = typeof receipt.$inferSelect;
export type NewReceipt = typeof receipt.$inferInsert;
