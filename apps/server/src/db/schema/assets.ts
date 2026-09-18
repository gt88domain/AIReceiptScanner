import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const ASSET_VISIBILITIES = ["private", "public"] as const;

/** Metadata and ownership for one object stored in the configured storage provider. */
export const asset = sqliteTable(
  "asset",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    visibility: text("visibility", { enum: ASSET_VISIBILITIES }).notNull().default("private"),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("asset_storage_key_idx").on(table.storageKey),
    index("asset_owner_created_at_idx").on(table.ownerId, table.createdAt),
  ],
);

export type Asset = typeof asset.$inferSelect;
export type NewAsset = typeof asset.$inferInsert;
