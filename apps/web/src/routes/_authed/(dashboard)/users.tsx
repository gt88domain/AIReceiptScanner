import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { UsersTableContainer } from "@/components/dashboard/users";

const searchSchema = z.object({
  page: z.number().optional().default(0),
  size: z.number().optional().default(10),
  search: z.string().optional().default(""),
  sort: z.string().optional().default("createdAt:desc"),
});

export const Route = createFileRoute("/_authed/(dashboard)/users")({
  component: UsersTableContainer,
  validateSearch: searchSchema,
});
