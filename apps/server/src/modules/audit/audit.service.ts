import type { Database } from "@/db";
import { createAdminAuditLog } from "./audit.repository";
import type { AuditSnapshot, AuditValue, RecordAdminAuditLogInput } from "./audit.types";

const SENSITIVE_AUDIT_FIELD =
  /password|secret|token|authorization|cookie|api.?key|credential|private.?key/i;

function redactAuditValue(value: AuditValue): AuditValue {
  if (Array.isArray(value)) return value.map(redactAuditValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        SENSITIVE_AUDIT_FIELD.test(key) ? "[redacted]" : redactAuditValue(child),
      ]),
    );
  }
  return value;
}

/** Removes credentials from snapshots before append-only audit persistence. */
export function redactAuditSnapshot(snapshot: AuditSnapshot | undefined) {
  return snapshot ? (redactAuditValue(snapshot) as AuditSnapshot) : null;
}

/**
 * Records one explicit administrative mutation. Call this from the domain service
 * after its write succeeds; never include secrets or unbounded external payloads.
 */
export function recordAdminAuditLog(db: Database, input: RecordAdminAuditLogInput) {
  return createAdminAuditLog(db, {
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    action: input.action,
    entityType: input.entity.type,
    entityId: input.entity.id,
    before: redactAuditSnapshot(input.before),
    after: redactAuditSnapshot(input.after),
  });
}
