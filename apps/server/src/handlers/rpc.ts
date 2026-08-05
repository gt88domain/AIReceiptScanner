import { type AnyRouter, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

/** Creates a handler for the Worker runtime router; client typing stays on platformContractRouter. */
export function createRpcHandler(router: AnyRouter) {
  return new RPCHandler(router, {
    interceptors: [
      onError((error) => {
        console.error(error);
      }),
    ],
  });
}
