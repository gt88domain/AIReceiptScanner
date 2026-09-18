import { count, desc } from "drizzle-orm";
import type { Database } from "@/db";
import { adminAuditLog, type AdminAuditLog } from "@/db/schema/audit";
import type { AuditSnapshot } from "./audit.types";

export async function createAdminAuditLog(
  db: Database,
  input: {
    actorId: string;
    actorEmail: string;
    action: string;
    entityType: string;
    entityId: string;
    before: AuditSnapshot | null;
    after: AuditSnapshot | null;
  },
) {
  const { record, command } = createAdminAuditLogCommand(db, input);
  await command;
  return record;
}

export function createAdminAuditLogCommand(
  db: Database,
  input: {
    actorId: string;
    actorEmail: string;
    action: string;
    entityType: string;
    entityId: string;
    before: AuditSnapshot | null;
    after: AuditSnapshot | null;
  },
  now = new Date(),
) {
  const record: AdminAuditLog = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: now,
  };
  return { record, command: db.insert(adminAuditLog).values(record) };
}

export async function listAdminAuditLogs(db: Database, input: { limit: number; offset: number }) {
  return db
    .select()
    .from(adminAuditLog)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(input.limit)
    .offset(input.offset);
}

export async function countAdminAuditLogs(db: Database) {
  const [row] = await db.select({ count: count() }).from(adminAuditLog);
  return row?.count ?? 0;
}
