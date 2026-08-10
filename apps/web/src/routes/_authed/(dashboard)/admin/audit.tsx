import { createFileRoute } from "@tanstack/react-router";
import { AdminAuditLog } from "@/components/dashboard/admin/admin-audit-log";
import { requireAdminRouteAccess } from "@/lib/auth/admin-route";

export const Route = createFileRoute("/_authed/(dashboard)/admin/audit")({
  beforeLoad: requireAdminRouteAccess,
  component: AdminAuditLog,
});
