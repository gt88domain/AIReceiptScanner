import type { ServerApp } from "../app/types";
import { assertBackofficePreviewNotInProduction } from "../lib/backoffice-preview";
import { validateServerModuleEnvironment } from "../lib/module-config";
import type { ServerRuntimeConfig } from "../lib/runtime-config";

export function createFetchHandler(
  app: ServerApp,
  runtimeConfig: ServerRuntimeConfig,
  handleControlRead: (request: Request, env: Cloudflare.Env) => Promise<Response | null>,
) {
  let productionEnvironmentValidated = false;
  return async (request: Request, env: Cloudflare.Env, ctx: ExecutionContext) => {
    if (env.NODE_ENV === "production" && !productionEnvironmentValidated) {
      assertBackofficePreviewNotInProduction(env);
      validateServerModuleEnvironment(env, { runtimeConfig, requireStorageBinding: true });
      productionEnvironmentValidated = true;
    }
    const controlResponse = await handleControlRead(request, env);
    if (controlResponse) return controlResponse;
    return app.fetch(request, env, ctx);
  };
}
