import { createFileRoute, type FileRoute, type FileRoutesByPath } from "@tanstack/react-router";
import { requireAdminRouteAccess } from "./admin-route";

/** Creates a file route whose admin guard cannot be omitted or overridden by a product module. */
export function createAdminModuleRoute<TFilePath extends keyof FileRoutesByPath>(
  path: TFilePath,
): FileRoute<TFilePath>["createRoute"] {
  const createRoute = createFileRoute(path);
  return ((options) =>
    createRoute({
      ...options,
      beforeLoad: requireAdminRouteAccess as never,
    })) as FileRoute<TFilePath>["createRoute"];
}
