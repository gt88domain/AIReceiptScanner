import { receiptsRouter } from "./receipts/router";

/**
 * Product-domain router registry.
 *
 * New product modules register their public oRPC router here. Keep
 * `routers/index.ts` for platform routes and this single registration point.
 */
export const moduleRouters = {
  receipts: receiptsRouter,
};
