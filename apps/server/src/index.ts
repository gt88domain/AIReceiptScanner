import { createApp } from "./app/create-app";
import { buildWorkerHandler } from "./lib/worker-handler";
import { createControlReadHttpHandler } from "./modules/control-read/http";
import { createControlReadV1 } from "./modules/control-read";
import { createControlReadDependencies } from "./modules/control-read/dependencies";
import { createFetchHandler } from "./worker/create-fetch-handler";
export { ControlReadEntrypoint } from "./worker/control-read-entrypoint";
import { createJobWorkerHandlers } from "./worker/create-worker-handlers";
import { serverRuntimeConfig } from "./worker/runtime";

const runtimeConfig = serverRuntimeConfig;
const app = createApp({ runtimeConfig });
const jobs = runtimeConfig.composition.modules.jobs
  ? createJobWorkerHandlers(runtimeConfig)
  : undefined;
const controlReadHttpHandler = createControlReadHttpHandler({
  createControl: (env: Cloudflare.Env) =>
    createControlReadV1(createControlReadDependencies(env, runtimeConfig)),
});

export default buildWorkerHandler(runtimeConfig.features, {
  fetch: createFetchHandler(app, runtimeConfig, controlReadHttpHandler),
  ...jobs,
}) satisfies ExportedHandler<Cloudflare.Env>;
