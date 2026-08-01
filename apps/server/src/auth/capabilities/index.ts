/**
 * Stable, server-enforced capabilities. These are not database roles and are
 * never granted by client input or payment events.
 */
export const capabilities = {
  adminRead: "admin:read",
  adminWrite: "admin:write",
} as const;

export type Capability = (typeof capabilities)[keyof typeof capabilities];
