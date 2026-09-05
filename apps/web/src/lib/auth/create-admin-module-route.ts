import { createFileRoute, type FileRoute, type FileRoutesByPath } from "@tanstack/react-router";
import { requireAdminRouteAccess } from "./admin-route";

/** Creates a file route whose admin guard cannot be omitted or overridden by a product module. */
export function createAdminModuleRoute<TFilePath extends keyof FileRoutesByPath>(
  path: TFilePath,
): FileRoute<TFilePath>["createRoute"] {
  const createRoute = createFileRoute(path);
  return ((options = {}) => {
    const moduleBeforeLoad = options.beforeLoad as
      | ((context: unknown) => unknown | Promise<unknown>)
      | undefined;
    return createRoute({
      ...options,
      beforeLoad: (async (context: unknown) => {
        await requireAdminRouteAccess();
        return moduleBeforeLoad?.(context);
      }) as never,
    });
  }) as FileRoute<TFilePath>["createRoute"];
}
