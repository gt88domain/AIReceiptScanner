import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AdminDashboard } from "@/components/dashboard/admin/admin-dashboard";
import { webConfig } from "@/configs/web-config";
import { getAdminAccess } from "@/lib/auth/auth-server";

const searchSchema = z.object({
  page: z.number().optional().default(0),
  size: z.number().optional().default(10),
  search: z.string().optional().default(""),
  sort: z.string().optional().default("createdAt:desc"),
});

export const Route = createFileRoute("/_authed/(dashboard)/admin")({
  beforeLoad: async () => {
    if (!webConfig.adminEnabled) {
      throw redirect({ to: "/dashboard" });
    }
    const { isAdmin } = await getAdminAccess();
    if (!isAdmin) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminDashboard,
  validateSearch: searchSchema,
});
