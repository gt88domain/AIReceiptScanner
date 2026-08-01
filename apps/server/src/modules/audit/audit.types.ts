export type AuditValue =
  | boolean
  | number
  | string
  | null
  | AuditValue[]
  | { [key: string]: AuditValue };

/** JSON-safe state captured immediately before or after an administrative change. */
export type AuditSnapshot = Record<string, AuditValue>;

export type RecordAdminAuditLogInput = {
  actor: { id: string; email: string };
  action: string;
  entity: { type: string; id: string };
  before?: AuditSnapshot;
  after?: AuditSnapshot;
};
