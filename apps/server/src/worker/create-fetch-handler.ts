import type { ServerApp } from "../app/types";
import { validateServerModuleEnvironment } from "../lib/module-config";
import type { ServerRuntimeConfig } from "../lib/runtime-config";

export function createFetchHandler(app: ServerApp, runtimeConfig: ServerRuntimeConfig) {
  return (request: Request, env: Cloudflare.Env, ctx: ExecutionContext) => {
    if (env.NODE_ENV === "production") {
      validateServerModuleEnvironment(env, { runtimeConfig, requireStorageBinding: true });
    }
    return app.fetch(request, env, ctx);
  };
}
