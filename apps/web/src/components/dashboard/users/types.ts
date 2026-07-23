import type { AppRouterClient } from "@server/routers";

// Infer User type from oRPC client response
type UsersListResponse = Awaited<ReturnType<AppRouterClient["admin"]["listUsers"]>>;
export type User = UsersListResponse["data"][number];
