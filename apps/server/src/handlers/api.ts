import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { type AnyRouter, onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

/** Creates an OpenAPI handler for the physically registered Worker API surface. */
export function createApiHandler(router: AnyRouter) {
  return new OpenAPIHandler(router, {
    plugins: [new OpenAPIReferencePlugin({ schemaConverters: [new ZodToJsonSchemaConverter()] })],
    interceptors: [
      onError((error) => {
        console.error(error);
      }),
    ],
  });
}
