import { createApp } from "./app/create-app";
import { resolveServerRuntimeConfig } from "./lib/runtime-config";
import { buildWorkerHandler } from "./lib/worker-handler";
import { createFetchHandler } from "./worker/create-fetch-handler";
import { createJobWorkerHandlers } from "./worker/create-worker-handlers";

const runtimeConfig = resolveServerRuntimeConfig();
const app = createApp({ runtimeConfig });
const jobs = createJobWorkerHandlers(runtimeConfig);

export default buildWorkerHandler(runtimeConfig.features, {
  fetch: createFetchHandler(app, runtimeConfig),
  ...jobs,
}) satisfies ExportedHandler<Cloudflare.Env>;
