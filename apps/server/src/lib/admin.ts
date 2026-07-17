/** Parses the comma-separated Worker secret without ever exposing it to clients. */
export function parseAdminEmails(value: string | undefined): ReadonlySet<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined, adminEmails: string | undefined) {
  return Boolean(email && parseAdminEmails(adminEmails).has(email.trim().toLowerCase()));
}
