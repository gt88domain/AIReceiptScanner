import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const JOB_STATUSES = ["pending", "running", "succeeded", "failed", "cancelled"] as const;
export const JOB_OUTBOX_STATUSES = ["pending", "published"] as const;
export const JOB_EVENT_TYPES = ["queued", "started", "succeeded", "failed", "cancelled"] as const;

/** Durable job state. Queue messages contain only this record's id. */
export const job = sqliteTable(
  "job",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "cascade" }),
    status: text("status", { enum: JOB_STATUSES }).notNull().default("pending"),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    result: text("result", { mode: "json" }).$type<Record<string, unknown>>(),
    error: text("error"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runAfter: integer("run_after", { mode: "timestamp" }).notNull(),
    lockedAt: integer("locked_at", { mode: "timestamp" }),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("job_status_run_after_idx").on(table.status, table.runAfter),
    index("job_owner_created_at_idx").on(table.ownerId, table.createdAt),
  ],
);

/** Transactional outbox ensures a committed job is eventually sent to the queue. */
export const jobOutbox = sqliteTable(
  "job_outbox",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    status: text("status", { enum: JOB_OUTBOX_STATUSES }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("job_outbox_job_id_idx").on(table.jobId),
    index("job_outbox_status_created_at_idx").on(table.status, table.createdAt),
  ],
);

/** Append-only operational history for job retries and terminal outcomes. */
export const jobEvent = sqliteTable(
  "job_event",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    type: text("type", { enum: JOB_EVENT_TYPES }).notNull(),
    detail: text("detail"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("job_event_job_created_at_idx").on(table.jobId, table.createdAt)],
);

export type Job = typeof job.$inferSelect;
export type NewJob = typeof job.$inferInsert;
