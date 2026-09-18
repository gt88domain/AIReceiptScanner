import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminUsersTableContainer } from "@/components/dashboard/users";
import { AdminPageHeader } from "@/components/dashboard/admin/admin-page-header";
import { requireAdminRouteAccess } from "@/lib/auth/admin-route";

const searchSchema = z.object({
  page: z.coerce.number().int().min(0).catch(0),
  size: z.coerce.number().int().min(1).max(100).catch(10),
  search: z.string().optional().default(""),
  sort: z.string().optional().default("createdAt:desc"),
});

export const Route = createFileRoute("/_authed/(dashboard)/admin/users")({
  beforeLoad: requireAdminRouteAccess,
  component: AdminUsers,
  validateSearch: searchSchema,
});

function AdminUsers() {
  return (
    <div className="space-y-6">
      <AdminPageHeader description="Registered application users." title="Users" />
      <AdminUsersTableContainer />
    </div>
  );
}
