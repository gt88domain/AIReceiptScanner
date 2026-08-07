import type { ServerApp } from "./types";

export type PublicReadRouteRegistrar = (app: ServerApp) => undefined;

const synchronousRegistrarError =
  "Public-read route registrars must be synchronous and return undefined.";

function discardUnexpectedThenableRejection(result: unknown): void {
  if (
    (typeof result !== "object" && typeof result !== "function") ||
    result === null ||
    typeof (result as { then?: unknown }).then !== "function"
  ) {
    return;
  }
  void Promise.resolve(result).catch(() => undefined);
}

/** Registers explicit downstream-owned public-read routes before the generic RPC/API boundary. */
export function registerPublicReadRoutes(
  app: ServerApp,
  registrars: readonly PublicReadRouteRegistrar[],
): void {
  for (const register of registrars) {
    const result: unknown = register(app);
    if (result !== undefined) {
      discardUnexpectedThenableRejection(result);
      throw new TypeError(synchronousRegistrarError);
    }
  }
}
